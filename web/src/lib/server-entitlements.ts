import { activateSubscription, ensureDefaultPlans } from "@/lib/billing";
import { prisma } from "@/lib/ic-prisma";

export type ServerEntitlements = {
    planId: string;
    projects: number | null;
    storageGb: number | null;
    concurrentJobs: number | null;
    dailyGenerations: number | null;
    hdExport: boolean;
    privateCharacters: number | null;
    teamMembers: number | null;
};

const FREE_DAILY_GENERATION_LIMIT = 3;

export function parseEntitlementLimit(value?: string | null) {
    if (!value || value === "custom" || value === "unlimited") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export async function getActiveSubscription(userId: string) {
    if (!prisma) throw new Error("Database unavailable");
    await ensureDefaultPlans();

    let subscription = await prisma.subscription.findFirst({
        where: { userId, status: "active" },
        include: { plan: { include: { entitlements: true } } },
        orderBy: { createdAt: "desc" },
    });

    // 到期自动失效：付费订阅在 currentPeriodEnd 之后不再生效，回落到免费版。
    // 否则一次性开通的付费套餐会永久有效，未续费用户持续白嫖权益。
    const now = new Date();
    if (subscription?.currentPeriodEnd && subscription.currentPeriodEnd < now) {
        await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: "expired", autoRenew: false },
        });
        subscription = null;
    }

    if (!subscription) {
        subscription = await activateSubscription({
            userId,
            planId: "free",
            cycle: "monthly",
            provider: "manual",
        });
    }

    return subscription;
}

export async function getServerEntitlements(userId: string): Promise<ServerEntitlements> {
    const subscription = await getActiveSubscription(userId);
    const byKey = new Map(subscription.plan?.entitlements.map((item) => [item.key, item.value]) || []);

    return {
        planId: subscription.planId,
        projects: parseEntitlementLimit(byKey.get("projects")),
        storageGb: parseEntitlementLimit(byKey.get("storage_gb")),
        concurrentJobs: parseEntitlementLimit(byKey.get("concurrent_jobs")),
        dailyGenerations: parseEntitlementLimit(byKey.get("daily_generations")) ?? (subscription.planId === "free" ? FREE_DAILY_GENERATION_LIMIT : null),
        hdExport: byKey.get("hd_export") === "true",
        privateCharacters: parseEntitlementLimit(byKey.get("private_characters")),
        teamMembers: parseEntitlementLimit(byKey.get("team_members")),
    };
}

export function dailyPeriod(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function nextDayStart(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

// 通用每日配额（非生成类消耗，如 Agent Lab / 体验官聊天）。
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
