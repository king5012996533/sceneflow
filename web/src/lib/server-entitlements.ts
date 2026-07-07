import { activateSubscription, ensureDefaultPlans } from "@/lib/billing";
import { prisma } from "@/lib/ic-prisma";

export type ServerEntitlements = {
    projects: number | null;
    storageGb: number | null;
    concurrentJobs: number | null;
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
        projects: parseEntitlementLimit(byKey.get("projects")),
        storageGb: parseEntitlementLimit(byKey.get("storage_gb")),
        concurrentJobs: parseEntitlementLimit(byKey.get("concurrent_jobs")),
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

export async function reserveGenerationUsage(userId: string, count: number) {
    if (!prisma) throw new Error("Database unavailable");
    const safeCount = Math.max(1, Math.min(50, Math.floor(count || 1)));
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === "admin") {
        return { allowed: true, used: 0, reserved: safeCount, remaining: -1, limit: null };
    }

    const entitlements = await getServerEntitlements(userId);
    const generationLimit = entitlements.projects !== null && entitlements.projects <= 3 ? FREE_DAILY_GENERATION_LIMIT : null;

    if (generationLimit === null) {
        return { allowed: true, used: 0, reserved: safeCount, remaining: -1, limit: null };
    }

    const period = dailyPeriod();
    const metric = "generations";

    const current = await prisma.usageRecord.upsert({
        where: { userId_metric_period: { userId, metric, period } },
        update: {},
        create: {
            userId,
            metric,
            period,
            used: 0,
            limit: generationLimit,
            resetAt: nextDayStart(),
        },
    });

    const updatedCount = await prisma.usageRecord.updateMany({
        where: { id: current.id, used: { lte: generationLimit - safeCount } },
        data: { used: { increment: safeCount }, limit: generationLimit, resetAt: nextDayStart() },
    });

    if (!updatedCount.count) {
        const latest = await prisma.usageRecord.findUnique({ where: { id: current.id } });
        return {
            allowed: false,
            used: latest?.used ?? current.used,
            reserved: 0,
            remaining: Math.max(0, generationLimit - (latest?.used ?? current.used)),
            limit: generationLimit,
        };
    }

    const updated = await prisma.usageRecord.findUniqueOrThrow({ where: { id: current.id } });

    return {
        allowed: true,
        used: updated.used,
        reserved: safeCount,
        remaining: Math.max(0, generationLimit - updated.used),
        limit: generationLimit,
    };
}
