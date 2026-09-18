/**
 * 「我们发往上游的调用还在飞」的进程内登记簿（纯逻辑：不碰数据库、不触网，可直接在 Node 下单测）。
 *
 * 2026-09-18 线上账：7 天里 43 条图片/视频任务是在开跑 1 分钟之后才判失败的
 * （1-5 分钟 14 条、5-15 分钟 14 条、>15 分钟 15 条）—— 这批全是「浏览器那条长连接断了」，
 * 而**我们到上游的请求并没有断**：代理里的 AbortController 只挂自家的 900s 超时，
 * 不跟随客户端信号（见 app/api/proxy/route.ts）。也就是说，用户看到「请求失败」的那一刻，
 * 上游往往正在出图、并且已经收过我们的钱。
 *
 * 原来的账是：客户端一报失败就当场退款结账 → 几十秒后上游带着成品回来，任务已经 failed，
 * 抢救（generation-rescue.server.ts）只能空手而归 → 钱付了、图丢了、额度还退了。
 *
 * 所以这里只做一件事：让「客户端放弃了」与「上游还在跑」这两件事同时可见，
 * 结账时谁看见真相谁定论 —— 出成品就认领成功，确认没成品才退款。
 */

/** 单条任务的在飞状态：并发调用计数（任务式通道会并发轮询）+ 客户端放弃原因 */
type CallState = {
    calls: number;
    gaveUp?: string;
};

/** 放弃原因只用于写进 GenerationJob.error，与结算侧同一上限，避免超长文本 */
const MAX_REASON_CHARS = 1000;

const calls = new Map<string, CallState>();

/**
 * 登记一次上游调用开始，返回「这次调用结束」的释放函数。
 *
 * 释放函数幂等：重复调用只生效一次（路由里同时有 return 分支和 finally 时不会把计数减穿）。
 * 没有任务号（文本/工具调用等不产出成品的通道）时返回空操作，登记簿只服务会产出成品的任务。
 */
export function beginUpstreamCall(jobId?: string | null): () => void {
    if (!jobId) return () => undefined;

    const state = calls.get(jobId) ?? { calls: 0 };
    state.calls += 1;
    calls.set(jobId, state);

    let released = false;
    return () => {
        if (released) return;
        released = true;

        const current = calls.get(jobId);
        if (!current) return;
        current.calls = Math.max(0, current.calls - 1);
        // 调用全部结束且没有待处理的放弃记录 → 清掉，避免登记簿无限增长
        if (current.calls === 0 && !current.gaveUp) calls.delete(jobId);
    };
}

/** 这条任务此刻还有上游调用在飞吗（结算侧据此决定「暂不结账」） */
export function isUpstreamCallInFlight(jobId: string): boolean {
    return (calls.get(jobId)?.calls ?? 0) > 0;
}

/**
 * 记下「客户端已放弃」。
 *
 * 只在有在飞调用时记录：没有在飞调用说明这条任务此刻没有任何人可能带回成品，
 * 也就没有等下去的理由，结账照旧立即执行。
 */
export function noteClientGaveUp(jobId: string, reason?: string): void {
    const state = calls.get(jobId);
    if (!state) return;
    state.gaveUp = String(reason || "请求失败").slice(0, MAX_REASON_CHARS);
}

/** 取出并清掉放弃记录（只应由「代为结账」那条路径调用，取走即视为已处理） */
export function takeClientGaveUp(jobId: string): string | undefined {
    const state = calls.get(jobId);
    if (!state?.gaveUp) return undefined;

    const reason = state.gaveUp;
    state.gaveUp = undefined;
    if (state.calls === 0) calls.delete(jobId);
    return reason;
}

/** 登记簿里还有多少条任务（诊断/测试用） */
export function inflightJobCount(): number {
    return calls.size;
}

/** 清空登记簿（测试用；进程内状态，不要在生产路径调用） */
export function resetUpstreamInflight(): void {
    calls.clear();
}
