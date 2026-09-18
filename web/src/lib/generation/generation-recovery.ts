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
