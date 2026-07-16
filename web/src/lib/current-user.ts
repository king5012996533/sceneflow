import type { NextRequest } from "next/server";

import { prisma } from "@/lib/ic-prisma";
import { AUTH_COOKIE_NAME, verifyToken } from "@/lib/auth";

export async function getCurrentUser(req: NextRequest) {
    if (!prisma) return null;

    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    return prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            avatarUrl: true,
            bannedAt: true,
        },
    });
}

export async function requireCurrentUser(req: NextRequest) {
    const user = await getCurrentUser(req);
    if (!user || user.bannedAt) return null;
    return user;
}

export async function requireAdminUser(req: NextRequest) {
    const user = await requireCurrentUser(req);
    if (!user || user.role !== "admin") return null;
    return user;
}
