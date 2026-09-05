import { NextRequest, NextResponse } from "next/server";

import { applyPrivateNoStore } from "@/lib/auth";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { REFERRAL_FIRST_TOPUP_PERCENT, REFERRAL_REFEREE_BONUS_PERCENT, REFERRAL_REF_TYPES, REFERRAL_TOPUP_PERCENT, ensureReferralCode } from "@/lib/referral";

/**
 * 我的邀请信息：邀请码（老用户首次访问自动补发）、已邀请人数、累计返利。
 * 比例随响应下发，前端展示与结算规则单一来源（lib/referral.ts）。
 */
export async function GET(req: NextRequest) {
    try {
        if (!prisma) return applyPrivateNoStore(NextResponse.json({ error: "数据库不可用" }, { status: 503 }));
        const user = await requireCurrentUser(req);
        if (!user) return applyPrivateNoStore(NextResponse.json({ error: "请先登录" }, { status: 401 }));

        const referralCode = await prisma.$transaction((tx) => ensureReferralCode(tx, user.id));
        const [invited, earned] = await Promise.all([
            prisma.user.count({ where: { referredById: user.id } }),
            prisma.creditTransaction.aggregate({
                where: { userId: user.id, refType: { in: [...REFERRAL_REF_TYPES] } },
                _sum: { amount: true },
            }),
        ]);

        return applyPrivateNoStore(
            NextResponse.json({
                referralCode,
                invitedCount: invited,
                totalEarned: earned._sum.amount || 0,
                percents: {
                    firstTopup: Math.round(REFERRAL_FIRST_TOPUP_PERCENT * 100),
                    topup: Math.round(REFERRAL_TOPUP_PERCENT * 100),
                    refereeBonus: Math.round(REFERRAL_REFEREE_BONUS_PERCENT * 100),
                },
            }),
        );
    } catch (error) {
        console.error("[referral/summary:get]", error);
        return applyPrivateNoStore(NextResponse.json({ error: "获取邀请信息失败" }, { status: 500 }));
    }
}
