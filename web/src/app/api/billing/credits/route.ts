import { NextRequest, NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { getCreditBalance } from "@/lib/credit-ledger";

// 用户积分余额 + 最近流水
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const user = await requireCurrentUser(req);
        if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

        const url = new URL(req.url);
        const take = Math.min(100, Math.max(1, Number(url.searchParams.get("take")) || 20));

        const [balance, transactions] = await Promise.all([
            getCreditBalance(prisma as never, user.id),
            prisma.creditTransaction.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                take,
            }),
        ]);

        return NextResponse.json(
            {
                balance,
                transactions,
            },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        console.error("[billing/credits]", error);
        return NextResponse.json({ error: "获取积分失败" }, { status: 500 });
    }
}
