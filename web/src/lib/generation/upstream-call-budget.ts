/**
 * 单条生成任务的「生成类上游调用」预算（进程内计数，2026-09-20）。
 *
 * 为什么需要它：任务号是生成类上游调用的通行证（见 proxy-access.server.ts），
 * 而通行证是可以反复使用的 —— 付一张图的钱拿到一条 running 任务，
 * 如果不管次数，同一条任务号能一直打上游，等于「付 1 张的钱出 N 张」。
 * 所以每条任务只发它该有的那几次：预算按任务类型与张数定（resolveJobCallBudget）。
 *
 * 计数放在进程内（与 upstream-inflight 同一取舍）：
 * 这是防滥用护栏，不是权益账本 —— 进程重启丢掉计数只是短暂放宽，
 * 不会算错用户的积分，也不值得为它加一次数据库写。
 */

const MAX_TRACKED_JOBS = 2000;
const ENTRY_TTL_MS = 60 * 60 * 1000;

type BudgetEntry = { used: number; limit: number; at: number };

const budgets = new Map<string, BudgetEntry>();

function pruneExpired(now: number) {
    for (const [jobId, entry] of budgets) {
        if (now - entry.at > ENTRY_TTL_MS) budgets.delete(jobId);
    }
}

/**
 * 消耗一次调用预算。返回 false = 这条任务已经把预算用完，调用方应当拒绝。
 * 首次调用即建立条目（limit 取第一次进来的值，之后不变，避免同一任务被用不同预算反复重置）。
 */
export function consumeUpstreamCallBudget(jobId: string, limit: number): boolean {
    if (!jobId) return false;
    const now = Date.now();
    if (budgets.size > MAX_TRACKED_JOBS) pruneExpired(now);
    const entry = budgets.get(jobId);
    const effectiveLimit = entry ? entry.limit : Math.max(1, Math.floor(limit) || 1);
    if (entry && entry.used >= effectiveLimit) {
        entry.at = now;
        return false;
    }
    budgets.set(jobId, { used: (entry?.used ?? 0) + 1, limit: effectiveLimit, at: now });
    return true;
}

/** 任务关账时释放（正常路径下不释放也无妨：条目会过期，且任务号不会再被使用） */
export function releaseUpstreamCallBudget(jobId: string): void {
    if (jobId) budgets.delete(jobId);
}

/** 单测用：看某条任务已用掉几次 */
export function readUpstreamCallBudget(jobId: string): { used: number; limit: number } | null {
    const entry = budgets.get(jobId);
    return entry ? { used: entry.used, limit: entry.limit } : null;
}

/** 单测用：清空状态，避免用例之间互相影响 */
export function resetUpstreamCallBudget(): void {
    budgets.clear();
}
