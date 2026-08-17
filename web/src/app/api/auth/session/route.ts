// GET /api/auth/session — 获取当前用户会话
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/ic-prisma";
import { applyPrivateNoStore, AUTH_COOKIE_NAME, clearAuthCookie, verifyToken } from "@/lib/auth";
import { ensureLoginCreditMigration } from "@/lib/credit-migration";

function sessionResponse(body: unknown, clearCookie = false) {
  const response = NextResponse.json(body);
  return clearCookie ? clearAuthCookie(response) : applyPrivateNoStore(response);
}

export async function GET(req: NextRequest) {
  try {
    if (!prisma) return sessionResponse({ user: null });

    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return sessionResponse({ user: null });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return sessionResponse({ user: null }, true);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true },
    });

    if (!user) {
      return sessionResponse({ user: null }, true);
    }

    // 存量迁移（Phase 6）：积分账户 + 新手赠送 + 付费订阅折算补偿（幂等，失败不影响会话）
    await ensureLoginCreditMigration(prisma, user.id).catch((err: unknown) => {
      console.warn("[auth/session] credit migration failed:", err instanceof Error ? err.message : err);
    });

    return sessionResponse({ user });
  } catch {
    return sessionResponse({ user: null }, true);
  }
}
