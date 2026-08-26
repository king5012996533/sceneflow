import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/ic-prisma";
import { refundCredits } from "@/lib/credit-ledger";
import { archiveGenerationMedia } from "./server-media-storage.server";
import { isCredentialTargetAllowed, resolvePlatformCredential } from "@/lib/credential-store.server";
import { fetchSafely } from "@/lib/url-safety";

const MAX_ATTEMPTS = 240;
const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;

export async function pollReplicateJobs(limit = 10) {
    if (!prisma) return { processed: 0 };
    const now = new Date();
    const jobs = await (prisma.generationJob as any).findMany({ where: { provider: "replicate", status: "running", externalGetUrl: { not: null }, OR: [{ nextPollAt: null }, { nextPollAt: { lte: now } }] }, orderBy: { createdAt: "asc" }, take: limit });
    let processed = 0;
    for (const job of jobs) {
        const lease = randomUUID();
        const pollingStatus = `polling:${lease}`;
        const claimed = await (prisma.generationJob as any).updateMany({ where: { id: job.id, status: "running", updatedAt: job.updatedAt }, data: { updatedAt: now, nextPollAt: new Date(now.getTime() + 60_000), pollAttempts: { increment: 1 }, externalStatus: pollingStatus } });
        if (!claimed.count) continue;
        try {
            const credential = await resolvePlatformCredential({ targetUrl: job.externalGetUrl!, provider: "replicate", model: job.providerModel || undefined });
            if (!credential) throw new Error("Replicate 平台凭证不可用");
            if (!isCredentialTargetAllowed(credential.baseUrl, job.externalGetUrl!)) throw new Error("Replicate 轮询地址不在白名单内");
            const response = await fetchSafely(job.externalGetUrl!, { headers: { Authorization: `Bearer ${credential.apiKey}` }, signal: AbortSignal.timeout(30_000) });
            if (!response.ok) throw new Error(`Replicate polling failed: ${response.status}`);
            const prediction = await response.json() as { status?: string; output?: unknown; error?: unknown };
            if (prediction.status === "succeeded") {
                const urls = extractUrls(prediction.output);
                const items = [];
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
                    items.push({ archiveKey, mimeType, bytes: body.byteLength });
                }
                if (!items.length) throw new Error("Replicate 没有返回可归档结果");
                await (prisma.generationJob as any).updateMany({ where: { id: job.id, status: "running", externalStatus: pollingStatus }, data: { status: "succeeded", resultData: { items }, resultUrl: `/canvas/api/generation/jobs/${job.id}/media/0`, externalStatus: prediction.status, finishedAt: new Date(), nextPollAt: null } });
            } else if (prediction.status === "failed" || prediction.status === "canceled") {
                await prisma.$transaction(async (tx) => { const closed = await (tx.generationJob as any).updateMany({ where: { id: job.id, status: "running", externalStatus: pollingStatus }, data: { status: prediction.status === "canceled" ? "cancelled" : "failed", error: String(prediction.error || "Replicate 任务失败"), externalStatus: prediction.status, quotaRefunded: true, finishedAt: new Date(), nextPollAt: null } }); if (closed.count) await refundCredits(tx, job.userId, job.creditsCost, job.requestKey, "Replicate 任务失败退款"); });
            } else if (job.pollAttempts + 1 >= MAX_ATTEMPTS) {
                await prisma.$transaction(async (tx) => { const closed = await (tx.generationJob as any).updateMany({ where: { id: job.id, status: "running", externalStatus: pollingStatus }, data: { status: "failed", error: "Replicate 轮询超时", quotaRefunded: true, finishedAt: new Date(), nextPollAt: null } }); if (closed.count) await refundCredits(tx, job.userId, job.creditsCost, job.requestKey, "Replicate 轮询超时退款"); });
            } else {
                await (prisma.generationJob as any).update({ where: { id: job.id }, data: { externalStatus: prediction.status || "processing", nextPollAt: new Date(Date.now() + 5_000) } });
            }
            processed += 1;
        } catch (error) {
            await (prisma.generationJob as any).updateMany({ where: { id: job.id, status: "running", externalStatus: pollingStatus }, data: { externalStatus: "poll_error", error: error instanceof Error ? error.message.slice(0, 1000) : "轮询失败", nextPollAt: new Date(Date.now() + 30_000) } }).catch(() => undefined);
        }
    }
    return { processed };
}

function extractUrls(value: unknown, results: string[] = []): string[] {
    if (typeof value === "string" && /^https?:\/\//i.test(value)) results.push(value);
    else if (Array.isArray(value)) value.forEach((item) => extractUrls(item, results));
    else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach((item) => extractUrls(item, results));
    return Array.from(new Set(results));
}
