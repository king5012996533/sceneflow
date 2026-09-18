import { prisma } from "@/lib/ic-prisma";
import { refundCredits } from "@/lib/credit-ledger";
import { isSweepExcluded, resolveSweepWindow } from "./generation-stale";

/**
 * 超时任务的全局兜底清扫（2026-09-18 事故：7 条 running 挂着 24 积分没人退）。
 *
 * 积分是先扣后结：扣费发生在 beginGenerationJob，退款只在任务被「关掉」时发生。
 * 关掉这条记录的活原本只有两个主人——浏览器（生成结束后 PATCH 结算）和
 * beginGenerationJob 里那次「同一用户下次生成」的懒清扫。浏览器消失（关标签页、
 * 刷新、切后台、断网）就没人关账，懒清扫又只扫自己那一行，人一不回来就永远挂着。
 *
 * 这里做的是全库清扫，不依赖任何用户回来。三条铁律：
 *   1) 只关 status=running 且已超时的任务，认领用条件更新（updateMany where status=running），
 *      并发的懒清扫 / 重复调用只有一个能把 running 改成 failed；
 *   2) 退款一律走 credit-ledger 的幂等退款（(userId, generation_job, requestKey, refund) 唯一），
 *      不自己改余额，也就不可能重复退；
 *   3) 有服务端轮询器认领的任务跳过（isSweepExcluded），那种任务归轮询器自己的超时逻辑管。
 */

const SWEEP_ERROR = "任务超时自动关闭（服务端清扫）";
const SWEEP_NOTE = "任务超时自动关闭（服务端清扫）";

export type SweptJob = { id: string; userId: string; kind: string; creditsCost: number; ageMinutes: number };
export type SweepResult = { scanned: number; skipped: number; closed: number; refundedCredits: number; jobs: SweptJob[] };

export async function sweepStaleGenerationJobs(input: { olderThanMs?: number | null; limit?: number | null; now?: number } = {}): Promise<SweepResult> {
    const result: SweepResult = { scanned: 0, skipped: 0, closed: 0, refundedCredits: 0, jobs: [] };
    if (!prisma) return result;
    const window = resolveSweepWindow(input);
    // 先按「超时窗口」粗筛（最老的优先），再由 isSweepExcluded 决定跳过——跳过规则只有一份，写在纯模块里
    const candidates = await prisma.generationJob.findMany({
        where: { status: "running", startedAt: { lt: window.cutoff } },
        orderBy: { startedAt: "asc" },
        take: window.limit,
        select: { id: true, userId: true, kind: true, requestKey: true, creditsCost: true, startedAt: true, provider: true, externalGetUrl: true },
    });
    result.scanned = candidates.length;

    for (const job of candidates) {
        if (isSweepExcluded(job)) {
            result.skipped += 1;
            continue;
        }
        try {
            const closed = await prisma.$transaction(async (tx) => {
                const claimed = await tx.generationJob.updateMany({
                    where: { id: job.id, status: "running" },
                    data: { status: "failed", error: SWEEP_ERROR, quotaRefunded: true, finishedAt: new Date() },
                });
                if (!claimed.count) return false;
                await refundCredits(tx, job.userId, job.creditsCost, job.requestKey, SWEEP_NOTE);
                return true;
            });
            if (!closed) continue;
            result.closed += 1;
            result.refundedCredits += job.creditsCost;
            result.jobs.push({
                id: job.id,
                userId: job.userId,
                kind: job.kind,
                creditsCost: job.creditsCost,
                ageMinutes: Math.max(0, Math.round((Date.now() - job.startedAt.getTime()) / 60_000)),
            });
        } catch (error) {
            console.error("[generation-sweep] 关闭超时任务失败", job.id, error instanceof Error ? error.message : error);
        }
    }
    return result;
}
