import { prisma } from "@/lib/ic-prisma";
import { Prisma } from "@/generated/ic-prisma/client";
import { deductCredits, ensureDailyCreditGrant, refundCredits } from "@/lib/credit-ledger";
import { estimateGenerationCostCents, generationModel, getGenerationCreditsCost, type GenerationKind } from "@/lib/credit-pricing";
import { resolveConfiguredPricing } from "@/lib/credential-store.server";
import { normalizeGenerationMetadata } from "@/lib/generation/generation-config";
import { getOperationNumber } from "@/lib/operation-config";

const STALE_JOB_MS = 30 * 60 * 1000;

// 套餐系统已下线：不再有并发权益。保留固定并发守卫防止单用户打爆上游（防滥用常量，非权益概念，可调）。
const MAX_CONCURRENT_JOBS = 3;

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

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const isAdmin = user?.role === "admin";
    // 积分制：非 admin 按「模型 × 类型」扣积分；定价优先取后台逐模型配置（图片每张 / 视频每秒），未配置退回内置草案
    // 计费前先把客户端 metadata 按服务端口径规范化（时长 clamp、模型去空白），计费与落库都基于规范化结果（H-6 服务端确权）
    const normalizedMetadata = normalizeGenerationMetadata(input.metadata) as Record<string, unknown> | undefined;
    const configuredPricing = !isAdmin ? await resolveConfiguredPricing(generationModel(normalizedMetadata)) : null;
    const creditsCost = !isAdmin ? getGenerationCreditsCost(input.kind, normalizedMetadata, configuredPricing ?? undefined) : 0;
    const costCents = estimateGenerationCostCents(input.kind, normalizedMetadata);
    // 每日赠送积分在事务外读取（操作配置走进程内缓存，避免在事务内发起独立连接）
    const dailyGrant = !isAdmin ? await getOperationNumber("daily_credit_grant", 3) : 0;
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
            await refundCredits(tx, userId, staleJob.creditsCost, staleJob.requestKey, "任务超时自动关闭");
        }

        if (!isAdmin) {
            const runningJobs = await tx.generationJob.count({
                where: { userId, status: "running" },
            });
            if (runningJobs + 1 > MAX_CONCURRENT_JOBS) {
                throw new GenerationPolicyError(`同时运行的任务数已达上限（${MAX_CONCURRENT_JOBS}），请等待已有任务完成`, 429);
            }
        }

        // 免费策略：每日赠送积分（幂等，一天一次）
        if (dailyGrant > 0) {
            await ensureDailyCreditGrant(tx, userId, dailyGrant);
        }

        // 原子扣积分（余额不足时守卫拦截，不写流水）
        const totalCost = creditsCost * count;
        if (totalCost > 0) {
            const deducted = await deductCredits(tx, userId, totalCost, input.requestKey, `生成任务扣费（${input.kind}${count > 1 ? ` ×${count}` : ""}）`);
            if (!deducted.allowed) {
                throw new GenerationPolicyError(`积分不足：本次生成需要 ${totalCost} 积分，当前余额 ${deducted.balance} 积分。可前往定价页充值或等待每日赠送。`, 403);
            }
        }

        const job = await tx.generationJob.create({
            data: {
                userId,
                requestKey: input.requestKey,
                kind: input.kind,
                count,
                creditsCost,
                costCents,
                metadata: normalizedMetadata as Prisma.InputJsonValue | undefined,
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

        // 失败/取消/超时：退还积分（幂等，重复结算不会重复退）
        if (status !== "succeeded" && !job.quotaRefunded && job.creditsCost > 0) {
            await refundCredits(tx, userId, job.creditsCost, job.requestKey, `生成任务${status === "cancelled" ? "已取消" : "失败"}退款`);
        }

        return tx.generationJob.update({
            where: { id: job.id },
            data: {
                status,
                error: error?.slice(0, 1000),
                resultUrl: resultUrl ?? undefined,
                quotaRefunded: status !== "succeeded",
                finishedAt: new Date(),
            },
        });
    });
}

export class GenerationPolicyError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
    }
}
