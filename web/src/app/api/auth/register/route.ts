// POST /api/auth/register — 注册
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/ic-prisma";
import { hashPassword, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "邮箱已注册" }, { status: 409 });
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password: hashed, name: name || email.split("@")[0] },
    });

    const token = signToken({ userId: user.id, email: user.email });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
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
    console.error("Register error:", err);
    if (err?.code === "P1008" || String(err?.message || "").includes("timed out")) {
      return NextResponse.json({ error: "数据库连接超时，请检查数据库服务、安全组或白名单" }, { status: 503 });
    }
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
