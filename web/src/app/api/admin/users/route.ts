import { NextRequest, NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const url = new URL(req.url);
        const q = url.searchParams.get("q")?.trim();

        const users = await prisma.user.findMany({
            where: q
                ? {
                      OR: [
                          { email: { contains: q, mode: "insensitive" } },
                          { name: { contains: q, mode: "insensitive" } },
                          { phone: { contains: q } },
                      ],
                  }
                : undefined,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                bannedAt: true,
                banReason: true,
                createdAt: true,
                subscriptions: {
                    where: { status: "active" },
                    include: { plan: true },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error("[admin/users:get]", error);
        return NextResponse.json({ error: "获取用户失败" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const body = await req.json();
        const userId = String(body.userId || "");
        const action = String(body.action || "");

        if (!userId) return NextResponse.json({ error: "缺少用户 ID" }, { status: 400 });
        if (userId === admin.id && (action === "ban" || action === "role")) {
            return NextResponse.json({ error: "不能直接封禁或降权自己" }, { status: 400 });
        }

        let user;
        if (action === "ban") {
            user = await prisma.user.update({
                where: { id: userId },
                data: { bannedAt: new Date(), banReason: String(body.reason || "管理员封禁") },
            });
        } else if (action === "unban") {
            user = await prisma.user.update({
                where: { id: userId },
                data: { bannedAt: null, banReason: null },
            });
        } else if (action === "role") {
            const role = String(body.role || "user");
            if (!["user", "pro", "admin"].includes(role)) return NextResponse.json({ error: "角色无效" }, { status: 400 });
            user = await prisma.user.update({ where: { id: userId }, data: { role } });
        } else {
            return NextResponse.json({ error: "操作无效" }, { status: 400 });
        }

        await prisma.adminAuditLog.create({
            data: {
                actorId: admin.id,
                action,
                target: "user",
                targetId: userId,
                metadata: body,
            },
        });

        return NextResponse.json({ user });
    } catch (error) {
        console.error("[admin/users:patch]", error);
        return NextResponse.json({ error: "更新用户失败" }, { status: 500 });
    }
}
