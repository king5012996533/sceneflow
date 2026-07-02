// POST /api/auth/login — 登录（支持密码登录 + 手机验证码登录）
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/ic-prisma";
import { comparePassword, signToken } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyCode } from "@/lib/verification-code";
import { checkSmsVerifyCode } from "@/lib/sms";

const PHONE_REGEX = /^1\d{10}$/;
const VERIFY_TOKEN_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "infinite-canvas-secret-key";

export async function POST(req: NextRequest) {
  try {
    if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

    const body = await req.json();
    const { email, phone, password, code } = body;

    // 限流：同一 IP 60秒内最多5次登录
    const ip = getClientIp(req);
    const allowed = await checkRateLimit(`auth:login:${ip}`, { windowMs: 60_000, maxRequests: 5 });
    if (!allowed) {
      return NextResponse.json({ error: "登录太频繁，请稍后再试" }, { status: 429 });
    }

    // 手机号 + 验证码登录
    if (phone && code) {
      if (!PHONE_REGEX.test(phone)) {
        return NextResponse.json({ error: "手机号格式不正确" }, { status: 400 });
      }

      let valid = false;
      const hasAliyun = !!process.env.ALIYUN_SMS_ACCESS_KEY_ID;
      if (hasAliyun) {
        const result = await checkSmsVerifyCode(phone, code);
        valid = result.ok;
      } else {
        valid = await verifyCode(phone, "phone", code);
      }

      if (!valid) {
        return NextResponse.json({ error: "验证码错误或已过期" }, { status: 401 });
      }

      // 查找用户（手机号可能绑定在 phone 字段）
      let user = await prisma.user.findFirst({ where: { phone } });
      if (!user) {
        // 自动注册（手机号登录 = 自动创建账号）
        user = await prisma.user.create({
          data: {
            email: `${phone}@phone.local`,
            phone,
            name: phone.slice(-4),
            phoneVerified: new Date(),
          },
        });
      }

      const token = signToken({ userId: user.id, email: user.email });
      const response = NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl },
      });
      response.cookies.set("ic_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 604800,
        path: "/",
      });
      return response;
    }

    // 邮箱 + 密码登录
    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "账号不存在" }, { status: 401 });
    }

    if (!user.password) {
      return NextResponse.json({ error: "该账号使用第三方登录，请使用 GitHub 登录" }, { status: 401 });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    const token = signToken({ userId: user.id, email: user.email });
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatarUrl: user.avatarUrl },
    });
    response.cookies.set("ic_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 604800,
      path: "/",
    });
    return response;
  } catch (err: any) {
    console.error("Login error:", err?.message, err?.code);
    if (err?.code === "P1008" || String(err?.message || "").includes("timed out")) {
      return NextResponse.json({ error: "数据库连接超时" }, { status: 503 });
    }
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}
