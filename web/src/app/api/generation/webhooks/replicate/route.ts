import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/ic-prisma";
import { applyReplicatePrediction, type ReplicatePrediction } from "@/lib/generation/replicate-poller.server";
import { verifyReplicateWebhookSignature } from "@/lib/generation/replicate-webhook.server";
import { logGenerationTiming } from "@/lib/generation/generation-timing.server";

export const runtime = "nodejs";

/**
 * 上游主动推结果：Replicate 预测一进终态（succeeded / failed / canceled）就 POST 到这里。
 *
 * 比轮询快在哪：轮询是「我们隔一会儿问一次」，页面上有人时 2 秒、没人时 15 秒（cron）——
 * 实测上游完成后我们平均还要 7.5 秒才结账。这条路径让上游一完成就找人，那一段归零。
 *
 * 三个约定：
 *   1. **鉴权靠地址里的签名**（jobId + HMAC，见 replicate-webhook.server.ts），不依赖账号级密钥配置；
 *   2. **认领用乐观锁**，与轮询共用 applyReplicatePrediction：谁先到谁结账，后到的认领不到就安静退出，
 *      不会重复取件、也不会把已经结好的账再翻一遍（上游对非 2xx 会重试，重复到达是常态）；
 *   3. **立刻回 200，重活挂后台**（取件可能要几十 MB）。回慢了对上游就是失败重试，而重试并不会更快。
 */
export async function POST(req: NextRequest) {
    const jobId = req.nextUrl.searchParams.get("job") || "";
    const signature = req.nextUrl.searchParams.get("sig") || "";
    if (!jobId || !verifyReplicateWebhookSignature(jobId, signature)) {
        // 不回「哪里不对」的细节，避免给探测者任何提示；但服务端要留痕，签名错通常是配置漂移
        console.warn("[generation-webhook] 签名校验不通过", jobId ? jobId.slice(0, 12) : "(缺任务号)");
        return NextResponse.json({ error: "未授权" }, { status: 401 });
    }
    const prediction = (await req.json().catch(() => null)) as ReplicatePrediction | null;
    if (!prediction || typeof prediction !== "object") return NextResponse.json({ error: "报文无法解析" }, { status: 400 });
    if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

    const job = await (prisma.generationJob as any).findFirst({
        where: { id: jobId, provider: "replicate" },
        select: { id: true, userId: true, updatedAt: true, pollAttempts: true, creditsCost: true, requestKey: true, providerModel: true, externalGetUrl: true, externalId: true, status: true, resultData: true },
    });
    if (!job) {
        console.warn("[generation-webhook] 找不到对应任务", jobId);
        return NextResponse.json({ ok: false, reason: "任务不存在" });
    }
    // 上游给的预测号必须与建单时记下的一致：地址里的签名只保证「这是给这个任务的」，
    // 报文是不是这条预测的还得自己对一次，否则一个错配的报文能把别的任务结掉。
    const bodyId = typeof prediction.id === "string" ? prediction.id : "";
    if (!job.externalId || !bodyId || job.externalId !== bodyId) {
        console.warn("[generation-webhook] 预测号不匹配", job.id, `库里=${job.externalId} 报文=${bodyId}`);
        return NextResponse.json({ ok: false, reason: "预测号不匹配" });
    }
    // 已经结过的任务：上游重试、或轮询抢先 → 直接认账走人（幂等）
    if (job.status !== "running") return NextResponse.json({ ok: true, reason: `任务已是 ${job.status}` });

    // 认领（乐观锁）：拿到租约的这一次才继续取件，避免与轮询/上游重试重复下载
    const lease = `webhook:${randomUUID()}`;
    const claimed = await (prisma.generationJob as any).updateMany({
        where: { id: job.id, status: "running", updatedAt: job.updatedAt },
        // 顺带把轮询往后推 2 分钟：取件要十几秒，这期间别让 cron 再来问一遍同一件事
        data: { updatedAt: new Date(), externalStatus: lease, nextPollAt: new Date(Date.now() + 120_000) },
    });
    if (!claimed.count) return NextResponse.json({ ok: true, reason: "已有别的入口在处理" });

    logGenerationTiming(job.id, "上游推送", [`状态 ${prediction.status || "?"}`, `租约 ${lease.split(":")[0]}`]);
    // 不 await：取件（尤其几十 MB 的视频）要十几秒，上游等不起会重试，而重试不会更快
    void applyReplicatePrediction(job, prediction, { externalStatus: lease })
        .then((outcome) => {
            if (outcome === "processing") console.log(`[generation-webhook] 任务 ${job.id} 报文状态是 ${prediction.status || "未知"}，交给轮询继续问`);
        })
        .catch((error) => console.error("[generation-webhook] 结账失败", job.id, error instanceof Error ? error.message : error));
    return NextResponse.json({ ok: true, accepted: true });
}
