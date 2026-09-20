import { prisma } from "@/lib/ic-prisma";
import { Prisma } from "@/generated/ic-prisma/client";
import { deductCredits, ensureDailyCreditGrant, refundCredits } from "@/lib/credit-ledger";
import { estimateGenerationCostCents, generationModel, getGenerationCreditsCost, type GenerationKind } from "@/lib/credit-pricing";
import { resolveConfiguredImageMaxCount, resolveConfiguredPricing } from "@/lib/credential-store.server";
import { normalizeGenerationMetadata } from "@/lib/generation/generation-config";
import { getOperationNumber, getPricingDefaults } from "@/lib/operation-config";
import { STALE_JOB_MS } from "./generation-stale";
import { hasKeptArtifact, hasResendPending, readEnvelope, readResendState, resolveReplayConfig } from "./generation-envelope";
import { isUpstreamCallInFlight, noteClientGaveUp, takeClientGaveUp } from "./upstream-inflight";
import { shouldRefundGeneration } from "./generation-refund-policy";

// 超时阈值与「超时后怎么关账」的规则收在 generation-stale.ts：懒清扫（本文件）与
// 全局清扫（generation-sweep.server.ts）必须共用同一份数字，否则两套标准会漂移。

// 套餐系统已下线：不再有并发权益。保留固定并发守卫防止单用户打爆上游（防滥用常量，非权益概念，可调）。
const MAX_CONCURRENT_JOBS = 8;

/**
 * 会产出成品、值得等上游把话说完的通道（与 generation-rescue 的 RESCUABLE_KINDS 同一批）。
 * 文本/工具调用不落盘，客户端说失败就是失败，没有等的必要。
 */
const DEFERRABLE_KINDS = new Set<GenerationKind>(["image", "video"]);

type BeginGenerationInput = {
    requestKey: string;
    kind: GenerationKind;
    count?: number;
    metadata?: Record<string, unknown>;
};

export async function beginGenerationJob(userId: string, input: BeginGenerationInput) {
    if (!prisma) throw new Error("Database unavailable");

    const requestedCount = Math.max(1, Math.min(50, Math.floor(Number(input.count) || 1)));
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
    // 张数按模型标定的上限夹一次：count 由客户端发来、直接乘进扣费，面板那句「只显示 1 张」拦不住
    // 「换了模型直接点生成、没打开参数面板」这条路径（画布节点默认 3 张 = 3 倍钱换 1 张图）。
    const capabilityMaxCount = input.kind === "image" ? await resolveConfiguredImageMaxCount(generationModel(normalizedMetadata)) : null;
    const count = capabilityMaxCount ? Math.min(requestedCount, capabilityMaxCount) : requestedCount;
    const configuredPricing = !isAdmin ? await resolveConfiguredPricing(generationModel(normalizedMetadata)) : null;
    const pricingDefaults = !isAdmin ? await getPricingDefaults() : undefined;
    const creditsCost = !isAdmin ? getGenerationCreditsCost(input.kind, normalizedMetadata, configuredPricing ?? undefined, pricingDefaults) : 0;
    // 估算成本（分）：文本类会把后台配的 token 成本价带进去，否则那边永远只有内置草案
    const costCents = estimateGenerationCostCents(input.kind, normalizedMetadata, configuredPricing ?? undefined);
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
            // 超时关闭也走现行退款政策（2026-09-20 起：没拿到成品就退，见 generation-refund-policy）。
            // 成品已经归档在我们手上的这一次不退——用户能取到货，钱不能连货一起还。
            // quotaRefunded 记的是「这笔到底退没退」，不是「是不是失败」，历史已退的不会被改写。
            const refund = shouldRefundGeneration("failed", hasKeptArtifact(staleJob.resultData)) && !staleJob.quotaRefunded && staleJob.creditsCost > 0;
            await tx.generationJob.update({
                where: { id: staleJob.id },
                data: { status: "failed", error: "任务超时自动关闭", quotaRefunded: staleJob.quotaRefunded || refund, finishedAt: new Date() },
            });
            if (refund) await refundCredits(tx, userId, staleJob.creditsCost, staleJob.requestKey, "任务超时自动关闭");
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

/**
 * 结账。`options.holdForResend` 只由**客户端上报失败**那条路径传 true：
 * 那种「失败」只是浏览器这侧的观感，服务端手上可能还留着一份能补发的信封（见下方注释）。
 * 服务端自己看见上游答复之后判的失败（补发/服务端执行/清扫）不传，因为那已经是结论。
 */
export async function finishGenerationJob(userId: string, jobId: string, status: "succeeded" | "failed" | "cancelled", error?: string, resultUrl?: string, options?: { holdForResend?: boolean }) {
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
        // 上游确认没成品 → 代理调用结束时代为结账（settleDeferredClientFailure）。
        //
        // 2026-09-20 起失败又退积分了（见 generation-refund-policy），这段「等真相」的意义反而更重：
        // 客户端那一句「失败」如果当场结账退款，而上游随后带着成品回来，就是钱退了、图也送了
        // ——先问清楚再定论，才既不多收也不白送。
        //
        // 「还在飞」只是第一种情形。第二种是**补发还有机会**（hasResendPending + 调用方声明这是
        // 客户端上报的失败）：部署重启之后进程内的在飞登记簿是空的（新进程什么都没登记），
        // 可服务端手上明明留着一份能重放的信封。这时候客户端那句「失败」如果照旧结账，
        // 补发就永远等不到一条 running 的任务 —— 阶段 1 那套补发等于白做
        // （远端进程死了、客户端立刻报失败，正是它要救的场景）。
        const resendPending = status === "failed" && options?.holdForResend === true && DEFERRABLE_KINDS.has(job.kind as GenerationKind) && !isUpstreamCallInFlight(job.id) && hasResendPendingForJob(job);
        if (status === "failed" && DEFERRABLE_KINDS.has(job.kind as GenerationKind) && (isUpstreamCallInFlight(job.id) || resendPending)) {
            noteClientGaveUp(job.id, error);
            console.log(resendPending ? `[generation-settle] 任务 ${job.id} 客户端报失败，但服务端还留着一份可补发的信封：暂不结账，等补发把成品带回来` : `[generation-settle] 任务 ${job.id} 客户端报失败，但我们的上游调用仍在飞：暂不结账，等上游结果`);
            // 刻意不动 error：任务还是 running，客户端看到 running 就知道该等；
            // 而「客户端连接中断」这句话如果落库，等上游真出了图、任务改判成功之后
            // 就会挂成一条自相矛盾的失败说明（记录页会照原样展示）。原因留在日志与内存登记簿里，
            // 真失败时代为结账那一刻再写进 error。
            return job;
        }

        // 失败/取消/超时：按现行退款政策结算。2026-09-20 起政策是「没拿到成品就退」——
        // 上游整类拒单（参数校验 400、本地预检就拦下）时一分钱没收到，我们再照收就是白收用户的钱
        // （见 generation-refund-policy）。成品已经归档在我们手上的那一次不退。
        // 退款调用留着，幂等由 credit-ledger 保证。
        const refund = shouldRefundGeneration(status, hasKeptArtifact(job.resultData)) && !job.quotaRefunded && job.creditsCost > 0;
        if (refund) {
            await refundCredits(tx, userId, job.creditsCost, job.requestKey, `生成任务${status === "cancelled" ? "已取消" : "失败"}退款`);
        }

        return tx.generationJob.update({
            where: { id: job.id },
            data: {
                status,
                error: error?.slice(0, 1000),
                resultUrl: resultUrl ?? undefined,
                quotaRefunded: job.quotaRefunded || refund,
                finishedAt: new Date(),
            },
        });
    });
}

/**
 * 代理侧为「客户端已放弃、上游仍在飞」的任务代为结账。
 *
 * 只有真正看见上游结果的人才能定论，而这里就是那个时刻：调用已经结束、成品也没有被抢救认领，
 * 说明这一次上游确实什么都没给出来 —— 这时候才结账关掉，不会冤枉任何一种「上游还在跑」的情形。
 * 至于关账时退不退积分，由当时的退款政策定（2026-09-19 起不退，见 generation-refund-policy）。
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

    const job = await prisma.generationJob.findFirst({ where: { id: jobId, userId } });
    if (!job || job.status !== "running") return "none";
    if (job.externalId) return "kept";
    // 还留着能补发的信封：这一段交给补发那条路走完（它拿不到成品时自己会结账）
    if (hasResendPendingForJob(job)) return "kept";

    await finishGenerationJob(userId, jobId, "failed", reason);
    console.log(`[generation-settle] 任务 ${jobId} 上游调用已结束且未产出成品：按客户端原因结为失败并关账（退款政策：${shouldRefundGeneration("failed", hasKeptArtifact(job.resultData)) ? "退" : "不退"}）（${reason.slice(0, 60)}）`);
    return "settled";
}

/** 这条任务还留着「可以重放一次」的信封吗（结账侧用来决定「先别判死」） */
function hasResendPendingForJob(job: { id: string; status: string; metadata?: unknown; resultData?: unknown; externalId?: string | null; provider?: string | null }): boolean {
    const config = resolveReplayConfig();
    if (!config.hosts.length && !config.providers.length) return false;
    return hasResendPending({
        status: job.status,
        hasArtifact: hasKeptArtifact(job.resultData),
        envelope: readEnvelope(job.metadata),
        attempts: readResendState(job.metadata).attempts,
        externalId: job.externalId,
        provider: job.provider,
        config,
    });
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
