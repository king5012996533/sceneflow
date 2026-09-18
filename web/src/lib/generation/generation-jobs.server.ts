import { prisma } from "@/lib/ic-prisma";
import { Prisma } from "@/generated/ic-prisma/client";
import { deductCredits, ensureDailyCreditGrant, refundCredits } from "@/lib/credit-ledger";
import { estimateGenerationCostCents, generationModel, getGenerationCreditsCost, type GenerationKind } from "@/lib/credit-pricing";
import { resolveConfiguredPricing } from "@/lib/credential-store.server";
import { normalizeGenerationMetadata } from "@/lib/generation/generation-config";
import { getOperationNumber, getPricingDefaults } from "@/lib/operation-config";
import { STALE_JOB_MS } from "./generation-stale";
import { isUpstreamCallInFlight, noteClientGaveUp, takeClientGaveUp } from "./upstream-inflight";

// 超时阈值与「超时后怎么关账」的规则收在 generation-stale.ts：懒清扫（本文件）与
// 全局清扫（generation-sweep.server.ts）必须共用同一份数字，否则两套标准会漂移。

// 套餐系统已下线：不再有并发权益。保留固定并发守卫防止单用户打爆上游（防滥用常量，非权益概念，可调）。
const MAX_CONCURRENT_JOBS = 8;

/**
 * 会产出成品、值得等上游把话说完的通道（与 generation-rescue 的 RESCUABLE_KINDS 同一批）。
 * 文本/工具调用不落盘，客户端说失败就是失败，没有等的必要。
 */
const DEFERRABLE_KINDS = new Set<GenerationKind>(["image", "video"]);

/** 客户端放弃、上游仍在飞：写进 error 的占位文案（真正的失败原因在结算时代入） */
const AWAITING_UPSTREAM_NOTE = "客户端连接中断，上游仍在生成，等待上游结果";

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
    // 积分制：非 admin 按「模型 × 类型」扣积分；定价三层：后台逐模型配置 > 运营配置全局默认 > 内置草案
    // （图片每张 / 视频每条 / 音频每次 / 文本每次）。计费前先把客户端 metadata 按服务端口径规范化（时长 clamp、模型去空白），计费与落库都基于规范化结果（H-6 服务端确权）
    const normalizedMetadata = normalizeGenerationMetadata(input.metadata) as Record<string, unknown> | undefined;
    const configuredPricing = !isAdmin ? await resolveConfiguredPricing(generationModel(normalizedMetadata)) : null;
    const pricingDefaults = !isAdmin ? await getPricingDefaults() : undefined;
    const creditsCost = !isAdmin ? getGenerationCreditsCost(input.kind, normalizedMetadata, configuredPricing ?? undefined, pricingDefaults) : 0;
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

        // 客户端放弃 ≠ 上游没产出（2026-09-18 黑洞的最后一环）。
        //
        // 浏览器那条长连接一断，客户端会立刻报失败退款；但我们发往上游的请求**还在飞**
        // —— 代理里的 AbortController 只挂自家 900s 超时，不跟随客户端信号
        // （app/api/proxy/route.ts）。上游随后带着成品回来时任务已经 failed，抢救只能空手而归：
        // 钱付了、图丢了、额度还退了。所以这里先不结账，只把「客户端已放弃」记在登记簿上，
        // 谁看见真相谁定论：上游出成品 → 抢救认领成功（积分照收，成品进归档）；
        // 上游确认没成品 → 代理调用结束时代为结账退款（settleDeferredClientFailure）。
        if (status === "failed" && DEFERRABLE_KINDS.has(job.kind as GenerationKind) && isUpstreamCallInFlight(job.id)) {
            noteClientGaveUp(job.id, error);
            console.log(`[generation-settle] 任务 ${job.id} 客户端报失败，但我们的上游调用仍在飞：暂不结账，等上游结果`);
            return tx.generationJob.update({ where: { id: job.id }, data: { error: AWAITING_UPSTREAM_NOTE } });
        }

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

/**
 * 代理侧为「客户端已放弃、上游仍在飞」的任务代为结账。
 *
 * 只有真正看见上游结果的人才能定论，而这里就是那个时刻：调用已经结束、成品也没有被抢救认领，
 * 说明这一次上游确实什么都没给出来 —— 这时候才退款，不会冤枉任何一种「上游还在跑」的情形。
 *
 * 拿不准的一律不动：还有别的调用在飞、任务已经被认领（不再 running）、
 * 或者手上已经握着上游任务号（那属于「补取件」的活，generation-sweep 会按任务号去问上游要成品，
 * 见 generation-recovery.ts），都原样留着，等更清楚的一方来处理。
 */
export async function settleDeferredClientFailure(userId: string, jobId: string): Promise<"settled" | "kept" | "none"> {
    if (!prisma) return "none";
    if (isUpstreamCallInFlight(jobId)) return "none";

    // 取走即视为已处理：同一条放弃记录只认领一次，避免下一个调用结束时重复结账
    const reason = takeClientGaveUp(jobId);
    if (!reason) return "none";

    const job = await prisma.generationJob.findFirst({ where: { id: jobId, userId }, select: { id: true, status: true, externalId: true } });
    if (!job || job.status !== "running") return "none";
    if (job.externalId) return "kept";

    await finishGenerationJob(userId, jobId, "failed", reason);
    console.log(`[generation-settle] 任务 ${jobId} 上游调用已结束且未产出成品：按客户端原因结为失败并退款（${reason.slice(0, 60)}）`);
    return "settled";
}

/** 读一条任务（供客户端在被暂缓结账后轮询状态：成品到了就照常取图） */
export async function getGenerationJob(userId: string, jobId: string) {
    if (!prisma) throw new Error("Database unavailable");
    const job = await prisma.generationJob.findFirst({
        where: { id: jobId, userId },
        select: { id: true, kind: true, status: true, error: true, resultUrl: true, resultData: true, quotaRefunded: true, finishedAt: true },
    });
    if (!job) throw new GenerationPolicyError("生成任务不存在", 404);
    return job;
}

export async function bindExternalGenerationJob(userId: string, jobId: string, input: { provider: string; model: string; externalId: string; externalGetUrl: string; externalStatus?: string }) {
    if (!prisma) throw new Error("Database unavailable");
    return (prisma.generationJob as any).updateMany({
        where: { id: jobId, userId, status: "running", externalId: null },
        data: { provider: input.provider, providerModel: input.model, externalId: input.externalId, externalGetUrl: input.externalGetUrl, externalStatus: input.externalStatus || "starting", nextPollAt: new Date() },
    });
}

/**
 * 记录上游任务号（图片等「客户端提交、客户端取件」的通道用）。
 *
 * 与 bindExternalGenerationJob 的区别：这里不设 nextPollAt —— 这类任务没有服务端轮询器
 * 认领（轮询器只挑 provider=replicate），超时兜底由全局清扫（generation-sweep.server.ts）负责。
 * 只写 status=running 且还没绑定过外部的任务，重复调用无副作用。
 */
export async function recordGenerationUpstream(userId: string, jobId: string, input: { provider: string; model: string; externalId: string; externalGetUrl?: string }) {
    if (!prisma) throw new Error("Database unavailable");
    return prisma.generationJob.updateMany({
        where: { id: jobId, userId, status: "running", externalId: null },
        data: { provider: input.provider, providerModel: input.model, externalId: input.externalId, externalGetUrl: input.externalGetUrl ?? null, externalStatus: "submitted" },
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
