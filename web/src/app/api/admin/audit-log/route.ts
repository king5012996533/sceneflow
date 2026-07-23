import { NextRequest, NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const url = new URL(req.url);
        const take = Math.min(Number(url.searchParams.get("take") || 50), 200);
        const skip = Number(url.searchParams.get("skip") || 0);
        const target = url.searchParams.get("target") || undefined;
        const action = url.searchParams.get("action") || undefined;

        const where = {
            ...(target ? { target } : {}),
            ...(action ? { action: { contains: action, mode: "insensitive" as const } } : {}),
        };

        const [logs, total] = await Promise.all([
            prisma.adminAuditLog.findMany({
                where,
                include: { actor: { select: { id: true, email: true, name: true } } },
                orderBy: { createdAt: "desc" },
                skip,
                take,
            }),
            prisma.adminAuditLog.count({ where }),
        ]);

        return NextResponse.json({ logs, total, skip, take });
    } catch (error) {
        console.error("[admin/audit-log]", error);
        return NextResponse.json({ error: "获取审计日志失败" }, { status: 500 });
    }
}
