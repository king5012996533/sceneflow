import { prisma } from "@/lib/ic-prisma";

import { extractArtifacts, resultSources } from "./generation-result";
import { archiveResultSources, storeGenerationResults } from "./generation-result.server";
import { hasKeptArtifact } from "./generation-envelope";
import { decideRescueAction } from "./generation-recovery";
import { takeClientGaveUp } from "./upstream-inflight";

/**
 * 代理侧的成品抢救。
 *
 * 2026-09-18 线上账：7 天 374 条图片/视频任务判「成功」，其中 370 条服务器上什么都没有。
 * 原因是成品一直只存在于两处不属于我们的地方——上游的临时直链，和用户浏览器的内存：
 *   - OpenAI 兼容通道 response_format=b64_json → 成品是内联字节，客户端上报只收 http(s) 直链，直接丢掉；
 *   - 用户标签页一关/一断/一刷新 → 上游已出图并计费，我们手里什么都没有，只能退款，成本全在平台。
 *
 * 但成品其实**每个字节都经过我们自己的代理进程**（app/api/proxy 是全部上游调用的唯一出口，
 * 且 JSON 响应是整段读进来的）。所以这里在上游一产出成品的当下就把它留下：
 * 先认领任务（判成功，抢在客户端把它关成失败、退款出手之前），再后台落盘归档。
 *
 * 判成功 vs 归档 的顺序刻意分开：能不能收用户这笔钱，只看「上游有没有产出」；
 * 归档失败只意味着我们少一份本地副本，不该让这笔账跟着乱。
 */

/** 只有会产出成品的通道需要抢救（文本/工具调用的输出不落盘） */
const RESCUABLE_KINDS = new Set(["image", "video"]);

/**
 * 从上游原始报文里抢救成品。返回是否成功认领（true = 这次报文里确实有成品、任务已改判成功）。
 * 认领是一次快写，归档在后台继续：调用方（代理路由）等的是认领，不是落盘。
 *
 * 用户取消的任务走「保图不保账」：不改状态、不再收费，只把成品归档留下
 * （原因见 generation-recovery 的 isCanceledArtifactKeepable）。
 */
export async function salvageGenerationArtifacts(input: { userId: string; jobId: string; payload: unknown; source: string }): Promise<boolean> {
    if (!prisma || !input.jobId) return false;

    // 先看报文里到底有没有成品：任务制通道每 3 秒轮询一次，绝大多数轮询是空手，
    // 那些轮询不该为了一次「有没有成品」去查库。
    const sources = resultSources(extractArtifacts(input.payload));
    if (!sources.length) return false;

    const job = await prisma.generationJob.findFirst({
        where: { id: input.jobId, userId: input.userId },
        select: { id: true, kind: true, status: true, finishedAt: true, resultData: true },
    });
    if (!job || !RESCUABLE_KINDS.has(job.kind)) return false;

    // 三种处置：
    //   claim         —— 还在跑，或客户端跑赢了登记、后来才到（见 isLateRescueClaimable）：改判成功并归档；
    //   keep-artifact —— 用户取消，上游停不下来照样出图：只保图（不改状态、不再收费，见 isCanceledArtifactKeepable）；
    //   skip          —— 保不住（太久以前的结账），但**必须留痕**：有成品却悄悄丢掉，2026-09-18 那个取消口子就是这么藏住的。
    const action = decideRescueAction({ status: job.status, finishedAt: job.finishedAt });

    if (action === "skip") {
        // 先分清「这份成品是重复到达」还是「真的丢了」。
        // dropped 标记的口径只有一条：**上游出了图，而这条任务手上一份成品都没有**（日报的
        // 「有成品却没留下」按它统计，目标值 0）。任务已经有归档成品时，后来这一份只是重复报文
        // —— 例如补发与在跑的服务端调用撞车（2026-09-19 线上真踩过），后到的那份被判「已结且超窗」。
        // 这时候打 dropped 会让日报凭空多一次告警，把「重复到达」误报成「又白烧了一次钱」。
        if (hasKeptArtifact(job.resultData)) {
            console.log(`[generation-rescue] 任务 ${job.id} 报文里有 ${sources.length} 份成品，但任务已结为 ${job.status} 且手上已有归档成品：这一次是重复到达，丢弃（来源 ${input.source}）`);
            return false;
        }
        console.warn(`[generation-rescue] 任务 ${job.id} 报文里有 ${sources.length} 份成品，但任务已结为 ${job.status} 且超出可保留窗口：这一次成品没能留下（来源 ${input.source}）`);
        // 打标记：日报按 externalStatus='dropped' 统计「有成品却没留下」，目标值 0
        await prisma.generationJob.updateMany({ where: { id: job.id, userId: input.userId }, data: { externalStatus: "dropped" } }).catch(() => undefined);
        return false;
    }

    // —— 认领路径：还在跑，或客户端跑赢了登记、成品后来才到（见 isLateRescueClaimable）——
    // 先认领后归档：这笔账怎么结只看上游有没有产出，不看我们有没有落盘。
    if (action === "claim") {
        const lateClaim = job.status !== "running";
        const claimed = await prisma.generationJob.updateMany({
            where: { id: job.id, userId: input.userId, status: lateClaim ? "failed" : "running" },
            data: { status: "succeeded", quotaRefunded: lateClaim, finishedAt: new Date(), ...(lateClaim ? { externalStatus: "recovered" } : {}) },
        });
        if (!claimed.count) return false;

        // 认领成功即定论：把可能存在的「客户端已放弃」记录丢掉，
        // 免得它留到下一个调用结束时反过来把这条已经成功的任务结为失败（见 settleDeferredClientFailure）。
        takeClientGaveUp(job.id);

        if (lateClaim) {
            console.log(`[generation-rescue] 任务 ${job.id} 已按客户端原因结为失败并退款，上游成品随后到达：补认领为成功并归档（本次不向用户收费）`);
        } else {
            console.log(`[generation-rescue] 任务 ${job.id} 上游已产出 ${sources.length} 份成品（${input.source}），改判成功并开始归档`);
        }
        void archiveResultSources(job.id, sources)
            .then((items) => storeGenerationResults(input.userId, job.id, items))
            .then((items) => {
                const archived = items.filter((item) => "archiveKey" in item).length;
                console.log(`[generation-rescue] 任务 ${job.id} 归档完成 ${archived}/${sources.length}`);
            })
            .catch((error) => console.error("[generation-rescue] 归档失败", job.id, error instanceof Error ? error.message : error));
        return true;
    }

    // —— 保图路径：用户取消，上游停不下来照样出图（见 isCanceledArtifactKeepable）——
    // 不改状态、不再收费（退款已经出手），只把成品留下：钱都付给上游了，扔掉是纯亏。
    console.log(`[generation-rescue] 任务 ${job.id} 已被用户取消，上游仍产出 ${sources.length} 份成品：保图不保账，归档留存（本次不向用户收费）`);
    await prisma.generationJob.updateMany({ where: { id: job.id, userId: input.userId }, data: { externalStatus: "recovered" } }).catch(() => undefined);
    void archiveResultSources(job.id, sources)
        .then((items) => storeGenerationResults(input.userId, job.id, items))
        .then((items) => {
            const archived = items.filter((item) => "archiveKey" in item).length;
            console.log(`[generation-rescue] 任务 ${job.id} 归档完成 ${archived}/${sources.length}（已取消，图保留）`);
        })
        .catch((error) => console.error("[generation-rescue] 归档失败", job.id, error instanceof Error ? error.message : error));
    return false;
}
