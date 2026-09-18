import { resolvePlatformCredential, platformAuthHeaders } from "@/lib/credential-store.server";
import { parseImageTaskState } from "@/services/api/image-task";
import { fetchSafely } from "@/lib/url-safety";
import { prisma } from "@/lib/ic-prisma";
import { archiveGenerationResults } from "./generation-result.server";
import { isArchivedResultItem, resultMediaPath, type ResultItem } from "./generation-result";
import { RECOVERY_TASK_TIMEOUT_MS, decideRecovery, isRecoveryEligible, isRecoveryExpired } from "./generation-recovery";

/**
 * 超时任务的服务端补取件（2026-09-18 事故：判了超时退款，上游其实出了图）。
 *
 * 图片通道的任务会留下上游任务号（externalId）与取件地址（externalGetUrl），
 * 所以清扫时可以先问一句「那个任务到底出了没有」：
 *   - 出了 → 服务端自己把成品取回来归档，任务改判成功，积分照收（不再退款）；
 *   - 还在跑 → 这一轮不动它，十分钟后再问；
 *   - 失败 / 查不到 / 过了补取件窗口 → 交回清扫按失败关闭并退款。
 *
 * 凭证用平台统一配置的那把（与浏览器走的是同一把，见 platformAuthHeaders），
 * 所以补取件不依赖任何用户在场。
 */

export type RecoveryOutcome = "archived" | "refund" | "wait" | "ineligible";

type RecoveryJob = {
    id: string;
    userId: string;
    externalId: string | null;
    externalGetUrl: string | null;
    providerModel: string | null;
    startedAt: Date;
};

export async function recoverStaleGenerationJob(job: RecoveryJob, now = Date.now()): Promise<RecoveryOutcome> {
    if (!prisma || !isRecoveryEligible(job)) return "ineligible";
    const url = String(job.externalGetUrl);
    const credential = await resolvePlatformCredential({ targetUrl: url, model: job.providerModel ?? undefined });
    if (!credential) {
        console.warn(`[generation-recovery] 任务 ${job.id} 没有可用于取件的平台凭证，按老办法处理`);
        return "ineligible";
    }

    let state;
    try {
        const response = await fetchSafely(url, {
            method: "GET",
            headers: { ...platformAuthHeaders(credential, url), Accept: "application/json" },
            signal: AbortSignal.timeout(RECOVERY_TASK_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`上游任务查询失败: ${response.status}`);
        state = parseImageTaskState(await response.json());
    } catch (error) {
        // 查不到不代表上游没产出（可能只是这一跳网络不好）：没到窗口就下一轮再试
        console.warn(`[generation-recovery] 任务 ${job.id} 查询上游失败：${error instanceof Error ? error.message : error}`);
        return isRecoveryExpired(job.startedAt, now) ? "refund" : "wait";
    }

    const decision = decideRecovery(state, { expired: isRecoveryExpired(job.startedAt, now) });
    if (decision === "wait") return "wait";
    if (decision === "refund") return "refund";

    const items = await archiveGenerationResults(job.id, state.urls);
    const archived = items.filter(isArchivedResultItem);
    if (!archived.length) {
        // 上游说完成、地址也拿到了，但一份都没下下来：先别急着退款，下一轮再试（可能只是 CDN 一时抽风）
        console.warn(`[generation-recovery] 任务 ${job.id} 成品下载全部失败，本轮不结算`);
        return "wait";
    }

    // 认领：只改还在 running 的任务；并发下（用户自己刚好结算了）不覆盖别人的结果
    const claimed = await prisma.generationJob.updateMany({
        where: { id: job.id, status: "running" },
        data: {
            status: "succeeded",
            resultData: { items: items as ResultItem[] },
            resultUrl: resultMediaPath(job.id, 0),
            error: null,
            finishedAt: new Date(),
            quotaRefunded: false,
            externalStatus: "recovered",
        },
    });
    if (!claimed.count) return "wait";
    console.log(`[generation-recovery] 任务 ${job.id} 补取件成功，已归档 ${archived.length}/${state.urls.length}（不退款）`);
    return "archived";
}
