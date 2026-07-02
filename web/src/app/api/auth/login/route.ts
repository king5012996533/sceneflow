// POST /api/auth/login — 登录
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/ic-prisma";
import { comparePassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "账号不存在" }, { status: 401 });
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
    console.error("Login error:", err?.message, err?.code, err?.stack?.slice(0, 200));
    if (err?.code === "P1008" || String(err?.message || "").includes("timed out")) {
      return NextResponse.json({ error: "数据库连接超时，请检查数据库服务、安全组或白名单" }, { status: 503 });
    }
    return NextResponse.json({ error: "登录失败: " + (err?.message || "unknown") }, { status: 500 });
  }
}
