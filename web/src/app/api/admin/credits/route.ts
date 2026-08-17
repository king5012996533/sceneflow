import { NextRequest, NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { adjustCredits } from "@/lib/credit-ledger";

// 积分管理：流水查询（GET）+ 手动充/扣（POST）
export const dynamic = "force-dynamic";

const TX_TYPES = new Set(["purchase", "grant", "consume", "refund", "adjust", "expire"]);

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const url = new URL(req.url);
        const userId = url.searchParams.get("userId") || undefined;
        const type = url.searchParams.get("type") || undefined;
        const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take")) || 50));

        const where: Record<string, unknown> = {};
        if (userId) where.userId = userId;
        if (type && TX_TYPES.has(type)) where.type = type;

        const [transactions, totalBalance] = await Promise.all([
            prisma.creditTransaction.findMany({
                where,
                include: { user: { select: { id: true, email: true, name: true } } },
                orderBy: { createdAt: "desc" },
                take,
            }),
            prisma.creditBalance.aggregate({ _sum: { balance: true } }),
        ]);

        return NextResponse.json({ transactions, totalBalance: totalBalance._sum.balance || 0 });
    } catch (error) {
        console.error("[admin/credits:get]", error);
        return NextResponse.json({ error: "获取积分流水失败" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const body = await req.json();
        const userId = String(body.userId || "");
        const amount = Number(body.amount);
        const note = String(body.note || "").slice(0, 200);

        if (!userId) return NextResponse.json({ error: "缺少用户" }, { status: 400 });
        if (!Number.isInteger(amount) || amount === 0) return NextResponse.json({ error: "调整积分数必须为非零整数" }, { status: 400 });
        if (Math.abs(amount) > 1_000_000) return NextResponse.json({ error: "单次调整上限 100 万积分" }, { status: 400 });

        const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true } });
        if (!target) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

        const result = await prisma.$transaction(async (tx) => {
            const adjust = await adjustCredits(tx as never, userId, amount, note || `管理员调整${amount > 0 ? "充值" : "扣减"}`);
            if (!adjust.allowed) throw new Error("用户余额不足，无法扣减");
            return adjust;
        });

        await prisma.adminAuditLog.create({
            data: {
                actorId: admin.id,
                action: "credits.adjust",
                target: "user",
                targetId: userId,
                metadata: { amount, note, balanceAfter: result.balance },
            },
        });

        return NextResponse.json({ balance: result.balance, user: target });
    } catch (error) {
        console.error("[admin/credits:post]", error);
        const message = error instanceof Error ? error.message : "调整积分失败";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
