import { prisma } from "@/lib/ic-prisma";

// 套餐系统已下线：不再有 Plan/Entitlement/Subscription，生成类额度限制全部移除，
// 积分是唯一收费门槛。本文件只保留通用的每日配额工具（Agent Lab 聊天等非生成类消耗防滥用）。

export function dailyPeriod(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function nextDayStart(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

// 通用每日配额（非生成类消耗，如 Agent Lab 聊天）。
// 数据库不可用时保守拒绝（fail-closed）——宁可暂时不可用，也不能无限制消耗服务器 API Key。
export async function reserveDailyUsage(userId: string, metric: string, limit: number): Promise<{ allowed: boolean; remaining: number; limit: number | null }> {
    if (!prisma) return { allowed: false, remaining: 0, limit: null };
    const period = dailyPeriod();
    const current = await prisma.usageRecord.upsert({
        where: { userId_metric_period: { userId, metric, period } },
        update: {},
        create: {
            userId,
            metric,
            period,
            used: 0,
            limit,
            resetAt: nextDayStart(),
        },
    });

    const updatedCount = await prisma.usageRecord.updateMany({
        where: { id: current.id, used: { lte: limit - 1 } },
        data: { used: { increment: 1 }, limit, resetAt: nextDayStart() },
    });

    if (!updatedCount.count) {
        return { allowed: false, remaining: 0, limit };
    }

    const updated = await prisma.usageRecord.findUniqueOrThrow({ where: { id: current.id } });
    return { allowed: true, remaining: Math.max(0, limit - updated.used), limit };
}
