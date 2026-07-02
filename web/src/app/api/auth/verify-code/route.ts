// POST /api/auth/verify-code — 校验验证码，返回临时 token
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { verifyCode } from "@/lib/verification-code";
import { checkSmsVerifyCode } from "@/lib/sms";

const VERIFY_TOKEN_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "infinite-canvas-secret-key";
const VERIFY_TOKEN_EXPIRY = "10m";

export async function POST(req: NextRequest) {
  try {
    const { target, method, code } = await req.json();

    if (!target || !method || !code) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    let valid = false;

    if (method === "email") {
      valid = await verifyCode(target, "email", code);
    } else if (method === "phone") {
      // 优先用阿里云服务端校验
      const hasAliyun = !!process.env.ALIYUN_SMS_ACCESS_KEY_ID;
      if (hasAliyun) {
        const result = await checkSmsVerifyCode(target, code);
        valid = result.ok;
      } else {
        valid = await verifyCode(target, "phone", code);
      }
    } else {
      return NextResponse.json({ error: "不支持的验证方式" }, { status: 400 });
    }

    if (!valid) {
      return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
    }

    // 签发临时验证 token（10分钟有效）
    const token = jwt.sign(
      { target, method, purpose: "register" },
      VERIFY_TOKEN_SECRET,
      { expiresIn: VERIFY_TOKEN_EXPIRY },
    );

    return NextResponse.json({ ok: true, token });
  } catch (err: unknown) {
    console.error("verify-code error:", err);
    return NextResponse.json({ error: "校验失败" }, { status: 500 });
  }
}
