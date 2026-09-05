import { NextRequest, NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { REFERRAL_REF_TYPES } from "@/lib/referral";

/**
 * 邀请返利报表（admin）：
 * - leaderboard：按邀请人聚合——已邀请人数 + 累计返利积分
 * - recent：最近返利流水明细（含邀请人/被邀请人/订单号）
 */
export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });
        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const [rewardRows, invitedGroups] = await Promise.all([
            prisma.creditTransaction.findMany({
                where: { refType: { in: [...REFERRAL_REF_TYPES] } },
                orderBy: { createdAt: "desc" },
                take: 100,
                include: { user: { select: { id: true, email: true, name: true } } },
            }),
            prisma.user.groupBy({ by: ["referredById"], where: { referredById: { not: null } }, _count: { _all: true } }),
        ]);

        // 按邀请人聚合返利总额
        const earnedByReferrer = new Map<string, number>();
        for (const row of rewardRows) {
            earnedByReferrer.set(row.userId, (earnedByReferrer.get(row.userId) || 0) + row.amount);
        }

        // 明细补充被邀请人（refId=orderId → order.userId）
        const orderIds = [...new Set(rewardRows.map((row) => row.refId).filter(Boolean))] as string[];
        const orders = orderIds.length ? await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true, userId: true, user: { select: { email: true, name: true } } } }) : [];
        const orderById = new Map(orders.map((order) => [order.id, order]));

        const referrerIds = [...new Set([...earnedByReferrer.keys(), ...invitedGroups.map((group) => group.referredById || "").filter(Boolean)])];
        const referrers = referrerIds.length ? await prisma.user.findMany({ where: { id: { in: referrerIds } }, select: { id: true, email: true, name: true } }) : [];
        const referrerById = new Map(referrers.map((user) => [user.id, user]));

        const invitedCountByReferrer = new Map(invitedGroups.map((group) => [group.referredById || "", group._count._all]));

        const leaderboard = referrers
            .map((user) => ({
                id: user.id,
                email: user.email,
                name: user.name,
                invited: invitedCountByReferrer.get(user.id) || 0,
                earned: earnedByReferrer.get(user.id) || 0,
            }))
            .sort((a, b) => b.earned - a.earned || b.invited - a.invited);

        const recent = rewardRows.map((row) => {
            const order = row.refId ? orderById.get(row.refId) : undefined;
            return {
                id: row.id,
                createdAt: row.createdAt,
                type: row.refType,
                amount: row.amount,
                referrer: { email: row.user.email, name: row.user.name },
                referee: order ? { email: order.user.email, name: order.user.name } : null,
                orderNo: order?.orderNo || row.refId || "-",
            };
        });

        return NextResponse.json({ leaderboard, recent });
    } catch (error) {
        console.error("[admin/referrals:get]", error);
        return NextResponse.json({ error: "获取邀请报表失败" }, { status: 500 });
    }
}
