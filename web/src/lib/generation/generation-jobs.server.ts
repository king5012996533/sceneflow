import { dailyPeriod, getServerEntitlements, nextDayStart } from "@/lib/server-entitlements";
import { prisma } from "@/lib/ic-prisma";
import { Prisma } from "@/generated/ic-prisma/client";

const FREE_DAILY_GENERATION_LIMIT = 3;
const STALE_JOB_MS = 30 * 60 * 1000;

export type GenerationKind = "image" | "video" | "audio" | "text" | "tool";

type BeginGenerationInput = {
    requestKey: string;
    kind: GenerationKind;
    count?: number;
    metadata?: Record<string, unknown>;
};

export async function beginGenerationJob(userId: string, input: BeginGenerationInput) {
    if (!prisma) throw new Error("Database unavailable");

    const count = Math.max(1, Math.min(50, Math.floor(Number(input.count) || 1)));
    const existing = await prisma.generationJob.findUnique({ where: { requestKey: input.requestKey } });
    if (existing) {
        if (existing.userId !== userId) throw new Error("请求标识已被占用");
        return { job: existing, reused: true };
    }

    const [user, entitlements] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
        getServerEntitlements(userId),
    ]);
    const isAdmin = user?.role === "admin";
    const generationLimit = !isAdmin && entitlements.projects !== null && entitlements.projects <= 3 ? FREE_DAILY_GENERATION_LIMIT : null;
    const staleBefore = new Date(Date.now() - STALE_JOB_MS);

    return prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
        const lockedExisting = await tx.generationJob.findUnique({ where: { requestKey: input.requestKey } });
        if (lockedExisting) {
            if (lockedExisting.userId !== userId) throw new GenerationPolicyError("请求标识已被占用", 409);
            return { job: lockedExisting, reused: true };
        }

        const staleJobs = await tx.generationJob.findMany({
            where: { userId, status: "running", startedAt: { lt: staleBefore } },
        });
        for (const staleJob of staleJobs) {
            await tx.generationJob.update({
                where: { id: staleJob.id },
                data: { status: "failed", error: "任务超时自动关闭", quotaRefunded: true, finishedAt: new Date() },
            });
            await tx.usageRecord.updateMany({
                where: { userId, metric: "generations", period: dailyPeriod(staleJob.startedAt), used: { gte: staleJob.count } },
                data: { used: { decrement: staleJob.count } },
            });
        }

        if (!isAdmin && entitlements.concurrentJobs !== null) {
            const running = await tx.generationJob.aggregate({
                where: { userId, status: "running" },
                _sum: { count: true },
            });
            if ((running._sum.count || 0) + count > entitlements.concurrentJobs) {
                throw new GenerationPolicyError(`当前套餐最多同时运行 ${entitlements.concurrentJobs} 个生成任务`, 429);
            }
        }

        if (generationLimit !== null) {
            const period = dailyPeriod();
            const metric = "generations";
            const usage = await tx.usageRecord.upsert({
                where: { userId_metric_period: { userId, metric, period } },
                update: {},
                create: { userId, metric, period, used: 0, limit: generationLimit, resetAt: nextDayStart() },
            });
            const reserved = await tx.usageRecord.updateMany({
                where: { id: usage.id, used: { lte: generationLimit - count } },
                data: { used: { increment: count }, limit: generationLimit, resetAt: nextDayStart() },
            });
            if (!reserved.count) {
                throw new GenerationPolicyError(`今日免费生成次数已用完（${generationLimit} 次/天）`, 403);
            }
        }

        const job = await tx.generationJob.create({
            data: {
                userId,
                requestKey: input.requestKey,
                kind: input.kind,
                count,
                metadata: input.metadata as Prisma.InputJsonValue | undefined,
            },
        });
        return { job, reused: false };
    });
}

export async function finishGenerationJob(userId: string, jobId: string, status: "succeeded" | "failed" | "cancelled", error?: string, resultUrl?: string) {
    if (!prisma) throw new Error("Database unavailable");

    return prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
        const job = await tx.generationJob.findFirst({ where: { id: jobId, userId } });
        if (!job) throw new GenerationPolicyError("生成任务不存在", 404);
        if (job.status !== "running") return job;

        if (status !== "succeeded" && !job.quotaRefunded) {
            const period = dailyPeriod(job.startedAt);
            await tx.usageRecord.updateMany({
                where: { userId, metric: "generations", period, used: { gte: job.count } },
                data: { used: { decrement: job.count } },
            });
        }

        return tx.generationJob.update({
            where: { id: job.id },
            data: {
                status,
                error: error?.slice(0, 1000),
                resultUrl: resultUrl || undefined,
                quotaRefunded: status !== "succeeded",
                finishedAt: new Date(),
            },
        });
    });
}

export class GenerationPolicyError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
    }
}
