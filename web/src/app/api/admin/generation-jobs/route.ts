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
        const status = url.searchParams.get("status") || undefined;
        const userId = url.searchParams.get("userId") || undefined;

        const where = {
            ...(status ? { status } : {}),
            ...(userId ? { userId } : {}),
        };

        const [jobs, total] = await Promise.all([
            prisma.generationJob.findMany({
                where,
                include: { user: { select: { id: true, email: true, name: true } } },
                orderBy: { createdAt: "desc" },
                skip,
                take,
            }),
            prisma.generationJob.count({ where }),
        ]);

        return NextResponse.json({ jobs, total, skip, take });
    } catch (error) {
        console.error("[admin/generation-jobs]", error);
        return NextResponse.json({ error: "获取生成记录失败" }, { status: 500 });
    }
}
