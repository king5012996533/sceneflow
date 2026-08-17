import { Prisma } from "@/generated/ic-prisma/client";

/**
 * 积分台账（平台统一 Key + 积分制的核心账本）。
 *
 * - 所有操作必须在事务内执行（调用方传入 tx），保证余额与流水原子一致
 * - 扣减用 updateMany balance >= cost 原子守卫，禁止读-改-写
 * - 退款按 (refType, refId) 幂等，配合 GenerationJob.quotaRefunded 双保险
 * - 余额单位：整数积分
 */

type Db = Prisma.TransactionClient;

export type CreditDeductResult = { allowed: boolean; balance: number; cost: number };

function dailyPeriodKey(date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

async function ensureCreditBalance(client: Db, userId: string): Promise<void> {
    await client.creditBalance.upsert({
        where: { userId },
        update: {},
        create: { userId, balance: 0 },
    });
}

export async function getCreditBalance(client: Db, userId: string): Promise<number> {
    const row = await client.creditBalance.findUnique({ where: { userId } });
    return row?.balance ?? 0;
}

/**
 * 原子扣减积分。余额不足返回 allowed:false（不写流水），余额足够则扣减并记 consume 流水。
 */
export async function deductCredits(client: Db, userId: string, amount: number, refId: string, note?: string): Promise<CreditDeductResult> {
    if (amount <= 0) return { allowed: true, balance: await getCreditBalance(client, userId), cost: 0 };
    await ensureCreditBalance(client, userId);
    const updated = await client.creditBalance.updateMany({
        where: { userId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
    });
    if (!updated.count) {
        return { allowed: false, balance: await getCreditBalance(client, userId), cost: amount };
    }
    const balance = await getCreditBalance(client, userId);
    await client.creditTransaction.create({
        data: { userId, type: "consume", amount: -amount, balanceAfter: balance, refType: "generation_job", refId, note },
    });
    return { allowed: true, balance, cost: amount };
}

/**
 * 入账（充值/赠送/手动调整）。amount 为正。
 */
export async function grantCredits(client: Db, userId: string, amount: number, type: "purchase" | "grant" | "adjust", refType: string, refId?: string, note?: string): Promise<number> {
    if (amount <= 0) return getCreditBalance(client, userId);
    await ensureCreditBalance(client, userId);
    await client.creditBalance.update({ where: { userId }, data: { balance: { increment: amount } } });
    const balance = await getCreditBalance(client, userId);
    await client.creditTransaction.create({
        data: { userId, type, amount, balanceAfter: balance, refType, refId, note },
    });
    return balance;
}

/**
 * 退款（生成失败/超时），按 (generation_job, refId, refund) 幂等——重复回调不会重复退。
 */
export async function refundCredits(client: Db, userId: string, amount: number, refId: string, note?: string): Promise<number> {
    if (amount <= 0) return getCreditBalance(client, userId);
    const existing = await client.creditTransaction.findFirst({
        where: { userId, refType: "generation_job", refId, type: "refund" },
        select: { id: true },
    });
    if (existing) return getCreditBalance(client, userId);
    await ensureCreditBalance(client, userId);
    await client.creditBalance.update({ where: { userId }, data: { balance: { increment: amount } } });
    const balance = await getCreditBalance(client, userId);
    await client.creditTransaction.create({
        data: { userId, type: "refund", amount, balanceAfter: balance, refType: "generation_job", refId, note },
    });
    return balance;
}

/**
 * 每日赠送积分（免费策略 D1）：按自然日幂等，一天只送一次。
 * 在生成前调用，保证免费用户始终有基础额度。
 */
export async function ensureDailyCreditGrant(client: Db, userId: string, dailyAmount: number): Promise<number> {
    if (dailyAmount <= 0) return getCreditBalance(client, userId);
    const refId = dailyPeriodKey();
    const existing = await client.creditTransaction.findFirst({
        where: { userId, refType: "daily_grant", refId },
        select: { id: true },
    });
    if (existing) return getCreditBalance(client, userId);
    return grantCredits(client, userId, dailyAmount, "grant", "daily_grant", refId, "每日赠送积分");
}

export { dailyPeriodKey };
