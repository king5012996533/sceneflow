import { randomBytes } from "node:crypto";

import type { Prisma } from "@/generated/ic-prisma/client";
import { grantCredits } from "@/lib/credit-ledger";

/**
 * 老带新邀请返利。
 *
 * - 归属：注册时一次性绑定 referredById，终身不变（register 接口写入）
 * - 结算：订单置 paid 的同一事务内调用 settleReferralForOrder（支付回调 + admin 手动确认两条路径）
 * - 首充：被邀请人第一笔 paid 订单 → 邀请人拿 20%，同时被邀请人加成 +5%（双向激励）
 * - 常规：之后每笔 paid 订单 → 邀请人拿 10%
 * - 幂等：grantCredits 按 (userId, type, refType, refId) 唯一约束防重，同一订单不会重复发奖
 * - 防刷：邀请人被封禁即停发；返的是站内积分只能消费，风险封顶
 */

type Db = Prisma.TransactionClient;

export const REFERRAL_FIRST_TOPUP_PERCENT = 0.2; // 邀请人：被邀请人首充返 20%
export const REFERRAL_TOPUP_PERCENT = 0.1; // 邀请人：后续每单返 10%
export const REFERRAL_REFEREE_BONUS_PERCENT = 0.05; // 被邀请人：经邀请注册首充加成 5%

// 返利流水的 refType（CreditTransaction 审计口径）
export const REFERRAL_REF_TYPES = ["referral_first_topup", "referral_topup"] as const;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉易混淆的 I/O/0/1

export function generateReferralCode(): string {
    const bytes = randomBytes(8);
    let code = "";
    for (let i = 0; i < 8; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    return code;
}

/** 老用户首次使用时补发邀请码，唯一冲突自动重试 */
export async function ensureReferralCode(client: Db, userId: string): Promise<string> {
    const user = await client.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    if (!user) throw new Error("用户不存在");
    if (user.referralCode) return user.referralCode;
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const code = generateReferralCode();
            await client.user.update({ where: { id: userId }, data: { referralCode: code } });
            return code;
        } catch (error) {
            if ((error as { code?: string })?.code !== "P2002") throw error;
        }
    }
    throw new Error("邀请码生成失败，请稍后再试");
}

/** 校验邀请码 → 可用的邀请人（封禁用户不可邀请）；无效返回 null（不阻断注册） */
export async function resolveReferralCode(client: Db, code: string): Promise<{ id: string; name: string } | null> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return null;
    const user = await client.user.findUnique({ where: { referralCode: normalized }, select: { id: true, name: true, bannedAt: true } });
    if (!user || user.bannedAt) return null;
    return { id: user.id, name: user.name };
}

/**
 * 订单支付成功后的邀请返利结算（必须在订单置 paid 的同一事务内调用）。
 * packageCredits：本单到账积分（credits + bonusCredits），返利按到账积分计。
 */
export async function settleReferralForOrder(tx: Db, orderId: string, packageCredits: number) {
    if (packageCredits <= 0) return;
    const order = await tx.order.findUnique({ where: { id: orderId }, select: { userId: true } });
    if (!order) return;
    // 按买家加锁串行化结算，保证同一用户并发支付时「首充」判定唯一
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`referral:${order.userId}`}))`;
    const buyer = await tx.user.findUnique({
        where: { id: order.userId },
        select: { id: true, referredById: true, referredBy: { select: { id: true, bannedAt: true } } },
    });
    const inviterId = buyer?.referredById;
    if (!buyer || !inviterId || buyer.referredBy?.bannedAt) return;

    // 首充判定：此前（不含本单）没有任何已支付订单
    const priorPaid = await tx.order.count({ where: { userId: order.userId, status: "paid", id: { not: orderId } } });
    const isFirstTopup = priorPaid === 0;

    const referrerPercent = isFirstTopup ? REFERRAL_FIRST_TOPUP_PERCENT : REFERRAL_TOPUP_PERCENT;
    const referrerReward = Math.floor(packageCredits * referrerPercent);
    if (referrerReward > 0) {
        await grantCredits(
            tx,
            inviterId,
            referrerReward,
            "grant",
            isFirstTopup ? "referral_first_topup" : "referral_topup",
            orderId,
            isFirstTopup ? `邀请好友首充返利 ${Math.round(referrerPercent * 100)}%` : `邀请好友充值返利 ${Math.round(referrerPercent * 100)}%`,
        );
    }
    if (isFirstTopup) {
        const refereeBonus = Math.floor(packageCredits * REFERRAL_REFEREE_BONUS_PERCENT);
        if (refereeBonus > 0) {
            await grantCredits(tx, order.userId, refereeBonus, "grant", "referral_referee_bonus", orderId, `邀请注册首充加成 ${Math.round(REFERRAL_REFEREE_BONUS_PERCENT * 100)}%`);
        }
    }
}
