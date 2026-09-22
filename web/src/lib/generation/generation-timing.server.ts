/**
 * 生成链路的耗时埋点（服务端）。
 *
 * 为什么单独开一个模块：这条链路上「用户等了多久」此前完全没有日志 —— 成功路径一行耗时都不打，
 * 只有超时分支有。于是线上反馈「上游早就出结果了，画布还在等」时，只能靠翻数据库、回查上游接口
 * 一点点拼，而且拼不出「上游完成 → 我们发现」「取件归档」「结账」这几段各占多少。
 *
 * 约定：一行一条、前缀固定 `[generation-timing]`，字段用 `｜` 分隔、数值带单位。
 * 这样既能直接 grep，也能拿 awk 按阶段统计。**不要往这里塞用户内容或密钥。**
 */
export const GENERATION_TIMING_PREFIX = "[generation-timing]";

type TimingPart = string | number | null | undefined;

export function logGenerationTiming(jobId: string, stage: string, parts: TimingPart[]): void {
    const detail = parts.filter((part) => part !== null && part !== undefined && part !== "").join("｜");
    console.log(`${GENERATION_TIMING_PREFIX} 任务 ${jobId} ${stage}${detail ? `｜${detail}` : ""}`);
}

/** 毫秒差，负数与异常输入一律归零：埋点本身绝不能因为时钟回拨写出误导性的数字 */
export function elapsedMs(startedAt: number, now = Date.now()): number {
    return Math.max(0, Math.round(now - startedAt));
}

/** 「某个时间点到现在」隔了多久；时间戳缺失或不可解析时返回 null（调用方自行决定要不要打这一段） */
export function sinceMs(isoOrMs: unknown, now = Date.now()): number | null {
    const value = typeof isoOrMs === "number" ? isoOrMs : typeof isoOrMs === "string" ? Date.parse(isoOrMs) : NaN;
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.round(now - value));
}

/** 体积写成人类可读的一小段，日志里比裸字节好读 */
export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
