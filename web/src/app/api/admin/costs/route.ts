import { NextRequest, NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";

// 对账：积分充值收入（paid 订单） vs 平台成本估算（GenerationJob.costCents）→ 毛利
export const dynamic = "force-dynamic";

type DayRow = { day: string; revenueCents: number; costCents: number };

function dayKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const url = new URL(req.url);
        const days = Math.min(90, Math.max(7, Number(url.searchParams.get("days")) || 30));
        const since = new Date();
        since.setDate(since.getDate() - days);

        const [paidOrders, jobs] = await Promise.all([
            prisma.order.findMany({
                where: { status: "paid", createdAt: { gte: since } },
                select: { amount: true, createdAt: true },
            }),
            prisma.generationJob.findMany({
                where: { costCents: { not: null }, createdAt: { gte: since } },
                select: { costCents: true, createdAt: true },
            }),
        ]);

        const byDay = new Map<string, DayRow>();
        for (const order of paidOrders) {
            const key = dayKey(order.createdAt);
            const row = byDay.get(key) || { day: key, revenueCents: 0, costCents: 0 };
            row.revenueCents += order.amount;
            byDay.set(key, row);
        }
        for (const job of jobs) {
            const key = dayKey(job.createdAt);
            const row = byDay.get(key) || { day: key, revenueCents: 0, costCents: 0 };
            row.costCents += job.costCents ?? 0;
            byDay.set(key, row);
        }

        const rows = Array.from(byDay.values()).sort((a, b) => (a.day < b.day ? -1 : 1));
        const totalRevenueCents = rows.reduce((sum, row) => sum + row.revenueCents, 0);
        const totalCostCents = rows.reduce((sum, row) => sum + row.costCents, 0);
        const marginCents = totalRevenueCents - totalCostCents;
        const marginRate = totalRevenueCents > 0 ? marginCents / totalRevenueCents : null;

        return NextResponse.json({
            summary: { totalRevenueCents, totalCostCents, marginCents, marginRate, days },
            byDay: rows,
        });
    } catch (error) {
        console.error("[admin/costs]", error);
        return NextResponse.json({ error: "获取对账数据失败" }, { status: 500 });
    }
}
