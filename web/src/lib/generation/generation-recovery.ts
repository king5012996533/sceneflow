/**
 * 超时任务的「补取件」判定（纯逻辑：不碰数据库、不触网，便于在 Node 下直接单测）。
 *
 * 2026-09-18 线上：任务被判超时并退款，而上游其实还在跑、过几分钟就出图了
 * —— 用户手里什么都没有（退款了），上游的钱却已经花掉，差价全由平台承担。
 * 图片通道现在会留下上游任务号（externalId + 取件地址），所以清扫时可以先问一句
 * 「那个任务到底出了没有」，而不是一律退款：
 *
 *   上游已产出  → 把成品取回来归档，任务改判成功，积分照收（用户之后从历史里能拿到）
 *   上游还在跑  → 这一轮先不动（既不关也不退），十分钟后再问
 *   上游失败/查不到 → 照旧关闭并退款
 *
 * 「先不动」必须有尽头，否则用户的积分会被无限期挂着：超过 RECOVERY_WINDOW_MS
 * 之后一律按失败处理、退款。窗口比正常生成时长宽得多，只用来兜住「上游排队特别久」
 * 这种真实存在的情形。
 */

/** 超过这个时长还没补到成品，就不再等：按失败关闭并退款（用户的钱不能被无限期挂着） */
export const RECOVERY_WINDOW_MS = 6 * 60 * 60 * 1000;

/** 查询上游任务状态的时限（补取件在后台跑，不能让一次查询拖住整轮清扫） */
export const RECOVERY_TASK_TIMEOUT_MS = 30_000;

/** 上游任务状态：与 parseImageTaskState 的返回一致（pending = 上游还在跑） */
export type RecoveryTaskState = { status: "completed" | "pending" | "failed"; urls: string[] };

export type RecoveryDecision = "archive" | "wait" | "refund";

/** 有上游任务号 + 取件地址才补得了件；缺一个就只能按老办法关闭退款 */
export function isRecoveryEligible(job: { externalId?: string | null; externalGetUrl?: string | null }): boolean {
    return Boolean(job.externalId && job.externalGetUrl);
}

/** 是否已过补取件窗口（过了就不再等上游，按失败处理） */
export function isRecoveryExpired(startedAt: Date | number | string | null | undefined, now = Date.now()): boolean {
    const started = startedAt instanceof Date ? startedAt.getTime() : new Date(startedAt ?? 0).getTime();
    if (!Number.isFinite(started) || started <= 0) return true;
    return now - started > RECOVERY_WINDOW_MS;
}

/**
 * 该对这条任务做什么。规则全部收在这里，清扫只负责照着执行。
 *
 * 「上游说完成但没给出地址」和「上游还在跑」都算 wait：前者多半是这家中转站的报文结构
 * 我们还没解析出来，再过十分钟问一次，比对用户直接退款划算；窗口一过就按失败处理，
 * 不会一直挂着。上游明确失败/取消，以及结构完全无法识别（parseImageTaskState 判 failed），
 * 照旧退款——与没有补取件能力时的行为一致，不会更差。
 */
export function decideRecovery(state: RecoveryTaskState, options: { expired: boolean }): RecoveryDecision {
    if (state.status === "completed" && state.urls.length > 0) return "archive";
    if (state.status === "completed") return options.expired ? "refund" : "wait";
    if (state.status === "pending") return options.expired ? "refund" : "wait";
    return "refund";
}

/**
 * 客户端报失败、我们按客户端的原因把任务结掉了（退款也退了），上游随后才把成品送回来：
 * 从结账那一刻算起，这段窗口之内成品仍然认领（2026-09-18「谁看见真相谁定论」的补网）。
 *
 * 为什么会走到这里：客户端那条连接一断就报失败，而它报失败的那一瞬间，
 * 我们发往上游的那次调用可能还没登记进「在飞登记簿」（见 upstream-inflight.ts）——
 * 结算请求小、跑得快，代理请求背着几 MB 素材、慢半拍，于是竞速输了：
 * 任务被结为失败并退款，紧接着上游调用照跑、照出图、照样计费。成品不能就这么扔了。
 *
 * 窗口刻意短：只兜「客户端先跑掉、上游紧跟着出结果」这一种时序，
 * 不覆盖上游排队几分钟才出结果的情形（那种情形客户端还在等，是暂缓结账的活）。
 *
 * 注意：认领只改任务状态与成品归属，**不动钱** —— 退款已经出手，这笔不再向用户重复收取
 * （用户白得一张图，总好过我们付了钱、图上谁都没有）。
 */
export const LATE_RESCUE_WINDOW_MS = 10 * 60 * 1000;

/** 已被结为失败、但还没超出补认领窗口：成品这时到达仍然该认领 */
export function isLateRescueClaimable(status: string | null | undefined, finishedAt: Date | number | string | null | undefined, now = Date.now()): boolean {
    if (status !== "failed") return false;
    return withinWindow(finishedAt, LATE_RESCUE_WINDOW_MS, now);
}

/**
 * 用户主动取消之后，上游其实**停不下来**：同步通道没有取消接口，那边的图照样画完、照样计费
 * （2026-09-18 真机验证：起任务 1.5 秒后取消，服务端当场退款，而上游 200 秒后返回 200 + 完整 PNG，
 * 那时我们判的是 cancelled，抢救不认 —— 图被静默丢弃，等于白付一次 API）。
 *
 * 所以取消之后这段窗口内送回来的成品仍然归档保留，但**不改状态、不再收费**：
 * 用户说了不要，就不该再扣他的钱；可我们已经付给上游了，扔掉是纯亏。
 * 窗口比补认领长，因为视频/4K 这类任务在取消后还要跑好一会儿。
 */
export const CANCELED_ARTIFACT_WINDOW_MS = 30 * 60 * 1000;

/** 已取消、但成品还在路上：这时到达的成品要保下来（只保图，不动钱和状态） */
export function isCanceledArtifactKeepable(status: string | null | undefined, finishedAt: Date | number | string | null | undefined, now = Date.now()): boolean {
    if (status !== "cancelled") return false;
    return withinWindow(finishedAt, CANCELED_ARTIFACT_WINDOW_MS, now);
}

/** 成品到达时该怎么处置这条任务，规则全部收在这里（服务端只照着执行） */
export type RescueAction = "claim" | "keep-artifact" | "skip";

export function decideRescueAction(job: { status: string | null | undefined; finishedAt: Date | number | string | null | undefined }, now = Date.now()): RescueAction {
    // 任务还在跑：就地定论，成品到手即成功（照常收费）
    if (job.status === "running") return "claim";
    // 客户端先跑了、我们按它的报告结成了失败：补认领（钱已退，不再重复收）
    if (isLateRescueClaimable(job.status, job.finishedAt, now)) return "claim";
    // 用户取消：保图不保账（退款照旧，图留给用户）
    if (isCanceledArtifactKeepable(job.status, job.finishedAt, now)) return "keep-artifact";
    return "skip";
}

/** 结账时间是否落在窗口内；时间读不出来、或离谱的将来（时钟漂移）一律不算 */
function withinWindow(finishedAt: Date | number | string | null | undefined, windowMs: number, now: number): boolean {
    const finished = finishedAt instanceof Date ? finishedAt.getTime() : new Date(finishedAt ?? 0).getTime();
    if (!Number.isFinite(finished) || finished <= 0) return false;
    const elapsed = now - finished;
    return elapsed <= windowMs && elapsed > -windowMs;
}

/**
 * 浏览器这侧的失败是不是「网络层」的：连 HTTP 响应都没拿到（fetch 直接抛错），
 * 而不是拿到了上游明确报错。前者真伪未定 —— 我们服务端那次上游调用可能还在跑，
 * 后者已经有结论，可以立刻告诉用户。
 */
export function isNetworkLayerFailure(error: unknown): boolean {
    if (error instanceof TypeError) return true;
    const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
    return /Failed to fetch|NetworkError|Load failed|Network request failed|网络层中断|ERR_NETWORK|ERR_CONNECTION/i.test(message);
}

/**
 * 客户端报失败之后，要不要继续等上游的结论。
 *
 * - 结算没送到服务端：任务生死未知，等；
 * - 结算被暂缓（服务端返回仍是 running）：上游调用还在飞，等；
 * - 失败是网络层的：浏览器连响应都没拿到，我们服务端可能正在跑这次上游调用，等。
 *
 * 其余情形不等：服务端已经拿到了上游的真实报错（内容违规、鉴权失败之类），
 * 那种结论是独立的证据，再等只是让用户白等。
 *
 * 等待不是拖延报错：服务端若已按上游报错结为失败，第一轮轮询就拿到结论、立刻报错。
 * 网络层失败的例外见客户端 awaitDeferredSettlement 的 keepWaitingOnFailure ——
 * 那种失败下的「已失败」是照客户端自己的报告说的，成品可能几分钟后才被补认领回来。
 */
export function shouldAwaitUpstreamSettlement(options: { settledStatus?: string | null; networkLayerFailure: boolean }): boolean {
    if (options.networkLayerFailure) return true;
    if (!options.settledStatus) return true;
    return options.settledStatus === "running";
}
