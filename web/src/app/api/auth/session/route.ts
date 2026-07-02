// GET /api/auth/session — 获取当前用户会话
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/ic-prisma";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    if (!prisma) return NextResponse.json({ user: null });

    const token = req.cookies.get("ic_token")?.value;
    if (!token) {
      return NextResponse.json({ user: null });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
