import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/ic-prisma";
import { refundCredits } from "@/lib/credit-ledger";
import { archiveGenerationMedia } from "./server-media-storage.server";
import { resultMediaPath } from "./generation-result";
import { shouldRefundGeneration } from "./generation-refund-policy";
import { hasKeptArtifact } from "./generation-envelope";
import { isCredentialTargetAllowed, resolvePlatformCredential } from "@/lib/credential-store.server";
import { fetchSafely } from "@/lib/url-safety";
import { elapsedMs, formatBytes, logGenerationTiming, sinceMs } from "./generation-timing.server";

const MAX_ATTEMPTS = 240;
const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;

/** 轮询器认领任务时需要的那几列（只列用到字段，避免整行透传给纯函数） */
type ReplicateJobRow = {
    id: string;
    userId: string;
    updatedAt: Date;
    pollAttempts: number;
    creditsCost: number;
    requestKey: string;
    providerModel: string | null;
    externalGetUrl: string | null;
    nextPollAt?: Date | null;
    /** 成品归档留痕：关账时用来判「这一次是不是已经把货交到用户手上了」（见 generation-refund-policy） */
    resultData?: unknown;
};

export async function pollReplicateJobs(limit = 10) {
    if (!prisma) return { processed: 0 };
    const now = new Date();
    const jobs = await (prisma.generationJob as any).findMany({ where: { provider: "replicate", status: "running", externalGetUrl: { not: null }, OR: [{ nextPollAt: null }, { nextPollAt: { lte: now } }] }, orderBy: { createdAt: "asc" }, take: limit });
    let processed = 0;
    for (const job of jobs) {
        if (await pollReplicateJob(job as ReplicateJobRow)) processed += 1;
    }
    return { processed };
}

/**
 * 单任务轮询 —— 客户端正在事件流上等结果时由事件流驱动（见 api/generation/jobs/[id]/events）。
 *
 * 为什么需要这个入口：cron 兜底最快也是一分钟一轮，用户在页面上等出图不能等那么久。
 * 事件流本来就每 2 秒读一次任务行，顺手把轮询推一步，出图时间就贴近上游真实耗时。
 * 与批量扫描共用同一份取件逻辑：乐观锁（updatedAt）+ nextPollAt 节流，
 * 两个入口同时跑也不会对同一次预测重复取件。
 *
 * ⚠️ 只认领 provider=replicate 的任务 —— 别的通道（ai-genvideo 等）的外链是「客户端取件」，
 * 轮询它们会在上游多建一次调用。
 */
export async function pollReplicateJobById(jobId: string) {
    if (!prisma) return false;
    const job = await (prisma.generationJob as any).findFirst({ where: { id: jobId, provider: "replicate", status: "running", externalGetUrl: { not: null } } });
    if (!job) return false;
    // 节流：批量扫描靠 where 过滤，单任务入口要自己让路，否则事件流每 2 秒都会打一次上游
    if (job.nextPollAt && new Date(job.nextPollAt).getTime() > Date.now()) return false;
    return pollReplicateJob(job as ReplicateJobRow);
}

/** 上游预测报文的形状（只列我们用到的字段） */
export type ReplicatePrediction = {
    id?: unknown;
    status?: string;
    output?: unknown;
    error?: unknown;
    completed_at?: unknown;
    metrics?: { predict_time?: unknown };
};

/**
 * 上游已经有结论（succeeded / failed / canceled）时把它落库：取件、归档、结账。
 *
 * 抽出来是因为现在有**两个入口**会拿到结论：我们主动轮询（cron 与事件流），以及上游通过
 * webhook 主动推给我们（见 api/generation/webhooks/replicate）。两者必须共用同一段落库代码 ——
 * 各写一套的下场是「谁先到」决定了任务状态长什么样，而这条链路上钱是按状态结的。
 *
 * 认领用乐观锁（guard.externalStatus = 自己那次的租约值），两个入口同时跑也不会重复取件。
 * 返回 processing 时不落任何结论：那是轮询自己的节奏问题（次数上限、下次什么时候再问）。
 */
export async function applyReplicatePrediction(job: ReplicateJobRow, prediction: ReplicatePrediction, guard: { externalStatus?: string } = {}): Promise<"succeeded" | "failed" | "cancelled" | "processing"> {
    if (!prisma) return "processing";
    const claim = { id: job.id, status: "running", ...(guard.externalStatus ? { externalStatus: guard.externalStatus } : {}) };
    if (prediction.status === "succeeded") {
        const urls = extractUrls(prediction.output);
        const items = [];
        const archiveStartedAt = Date.now();
        let archivedBytes = 0;
        for (let index = 0; index < urls.length; index += 1) {
            const mediaUrl = new URL(urls[index]);
            if (mediaUrl.protocol !== "https:" || mediaUrl.username || mediaUrl.password) throw new Error("Replicate 输出地址不安全");
            const media = await fetchSafely(mediaUrl.toString(), { signal: AbortSignal.timeout(120_000) });
            if (!media.ok) throw new Error(`归档媒体失败: ${media.status}`);
            const contentLength = Number(media.headers.get("content-length") || 0);
            if (contentLength > MAX_ARCHIVE_BYTES) throw new Error("Replicate 输出媒体过大");
            const body = await media.arrayBuffer();
            if (body.byteLength > MAX_ARCHIVE_BYTES) throw new Error("Replicate 输出媒体过大");
            const mimeType = media.headers.get("content-type") || "application/octet-stream";
            const archiveKey = `replicate/${job.id}/${index}`;
            await archiveGenerationMedia(archiveKey, body);
            archivedBytes += body.byteLength;
            items.push({ archiveKey, mimeType, bytes: body.byteLength });
        }
        if (!items.length) throw new Error("Replicate 没有返回可归档结果");
        // 取件地址与其它通道共用同一份构造（resultMediaPath）：别再手写带 /canvas 前缀的字符串，
        // 那个前缀早就不存在了，写错了只有后台预览会破图
        const archiveMs = elapsedMs(archiveStartedAt);
        const settleStartedAt = Date.now();
        await (prisma.generationJob as any).updateMany({
            where: claim,
            data: { status: "succeeded", resultData: { items }, resultUrl: resultMediaPath(job.id, 0), externalStatus: prediction.status, finishedAt: new Date(), nextPollAt: null },
        });
        logGenerationTiming(job.id, "Replicate 出件", [
            sinceMs(prediction.completed_at) === null ? "上游没给 completed_at" : `上游完成→我们结账 ${sinceMs(prediction.completed_at)}ms`,
            `取件归档 ${archiveMs}ms（${items.length} 份 ${formatBytes(archivedBytes)}）`,
            `结账 ${elapsedMs(settleStartedAt)}ms`,
            typeof prediction.metrics?.predict_time === "number" ? `上游生成 ${Math.round(prediction.metrics.predict_time * 1000)}ms` : null,
            guard.externalStatus ? `认领方 ${guard.externalStatus.split(":")[0]}` : null,
            `第 ${job.pollAttempts + 1} 次查询`,
        ]);
        return "succeeded";
    }
    if (prediction.status === "failed" || prediction.status === "canceled") {
        // 失败/取消照现行退款政策办（2026-09-20 起：没拿到成品就退，见 generation-refund-policy）；
        // 成品已归档的那一次不退。quotaRefunded 记的是「这笔退没退」，不是「是不是失败」。
        const status = prediction.status === "canceled" ? "cancelled" : "failed";
        const refund = shouldRefundGeneration(status, hasKeptArtifact(job.resultData)) && job.creditsCost > 0;
        await prisma.$transaction(async (tx) => {
            const closed = await (tx.generationJob as any).updateMany({
                where: claim,
                data: { status, error: String(prediction.error || "Replicate 任务失败"), externalStatus: prediction.status, quotaRefunded: refund, finishedAt: new Date(), nextPollAt: null },
            });
            if (closed.count && refund) await refundCredits(tx, job.userId, job.creditsCost, job.requestKey, "Replicate 任务失败退款");
        });
        return status;
    }
    return "processing";
}

async function pollReplicateJob(job: ReplicateJobRow): Promise<boolean> {
    if (!prisma) return false;
    {
        const now = new Date();
        const lease = randomUUID();
        const pollingStatus = `polling:${lease}`;
        const claimed = await (prisma.generationJob as any).updateMany({
            where: { id: job.id, status: "running", updatedAt: job.updatedAt },
            data: { updatedAt: now, nextPollAt: new Date(now.getTime() + 60_000), pollAttempts: { increment: 1 }, externalStatus: pollingStatus },
        });
        if (!claimed.count) return false;
        try {
            const credential = await resolvePlatformCredential({ targetUrl: job.externalGetUrl!, provider: "replicate", model: job.providerModel || undefined });
            if (!credential) throw new Error("Replicate 平台凭证不可用");
            if (!isCredentialTargetAllowed(credential.baseUrl, job.externalGetUrl!)) throw new Error("Replicate 轮询地址不在白名单内");
            const response = await fetchSafely(job.externalGetUrl!, { headers: { Authorization: `Bearer ${credential.apiKey}` }, signal: AbortSignal.timeout(30_000) });
            if (!response.ok) throw new Error(`Replicate polling failed: ${response.status}`);
            const prediction = (await response.json()) as ReplicatePrediction;
            // 「上游完成 → 我们发现」只有这里量得到：上游给了 completed_at，我们直到这一拍才知道
            const outcome = await applyReplicatePrediction(job, prediction, { externalStatus: pollingStatus });
            if (outcome === "processing") {
                if (job.pollAttempts + 1 >= MAX_ATTEMPTS) {
                    const refund = shouldRefundGeneration("failed", hasKeptArtifact(job.resultData)) && job.creditsCost > 0;
                    await prisma.$transaction(async (tx) => {
                        const closed = await (tx.generationJob as any).updateMany({
                            where: { id: job.id, status: "running", externalStatus: pollingStatus },
                            data: { status: "failed", error: "Replicate 轮询超时", quotaRefunded: refund, finishedAt: new Date(), nextPollAt: null },
                        });
                        if (closed.count && refund) await refundCredits(tx, job.userId, job.creditsCost, job.requestKey, "Replicate 轮询超时退款");
                    });
                } else {
                    await (prisma.generationJob as any).update({ where: { id: job.id }, data: { externalStatus: prediction.status || "processing", nextPollAt: new Date(Date.now() + 5_000) } });
                }
            }
            return true;
        } catch (error) {
            await (prisma.generationJob as any)
                .updateMany({
                    where: { id: job.id, status: "running", externalStatus: pollingStatus },
                    data: { externalStatus: "poll_error", error: error instanceof Error ? error.message.slice(0, 1000) : "轮询失败", nextPollAt: new Date(Date.now() + 30_000) },
                })
                .catch(() => undefined);
            return false;
        }
    }
}

function extractUrls(value: unknown, results: string[] = []): string[] {
    if (typeof value === "string" && /^https?:\/\//i.test(value)) results.push(value);
    else if (Array.isArray(value)) value.forEach((item) => extractUrls(item, results));
    else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach((item) => extractUrls(item, results));
    return Array.from(new Set(results));
}
