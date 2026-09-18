/**
 * 超时任务的统一判定（纯逻辑：不碰数据库、不触网，便于在 Node 下直接单测）。
 *
 * 2026-09-18 线上：7 条任务卡在 running，24 积分挂着没退，最久的一条挂了 24 天。
 * 根因是「结算」这个动作原本只有两个主人——浏览器（生成结束后 PATCH 结算）和
 * 「同一用户下次生成」时的懒清扫。浏览器中途消失（关标签页、刷新、切后台、断网）
 * 就再没人关这笔账；懒清扫又只扫自己那一行，用户不回来就永远不结算。
 * 于是补一个全局清扫（generation-sweep.server.ts），超时阈值、跳过规则、批量上限
 * 都收在这里，懒清扫与全局清扫共用同一份数字，避免两套标准漂移。
 */

/** running 超过这个时长即视为超时（懒清扫与全局清扫共用同一阈值） */
export const STALE_JOB_MS = 30 * 60 * 1000;

/** 全局清扫的窗口下限：窗口太短会把正在跑的任务误杀 */
export const MIN_SWEEP_WINDOW_MS = 60 * 1000;

/** 单次清扫的批量上限（默认值 / 硬上限） */
export const DEFAULT_SWEEP_LIMIT = 50;
export const MAX_SWEEP_LIMIT = 200;

/** 有服务端轮询器认领的通道（判据与 replicate-poller 的查询一致：provider 且 externalGetUrl 非空） */
export const SWEEP_POLLED_PROVIDER = "replicate";

export type SweepWindow = { olderThanMs: number; cutoff: Date; limit: number };

/** 清扫窗口：非法输入退回默认值，窗口不得短于 1 分钟，批量不得超上限。 */
export function resolveSweepWindow(input: { olderThanMs?: number | null; limit?: number | null; now?: number } = {}): SweepWindow {
    const now = typeof input.now === "number" && Number.isFinite(input.now) ? input.now : Date.now();
    const rawWindow = Number(input.olderThanMs);
    const olderThanMs = Number.isFinite(rawWindow) && rawWindow > 0 ? Math.max(MIN_SWEEP_WINDOW_MS, Math.floor(rawWindow)) : STALE_JOB_MS;
    const rawLimit = Number(input.limit);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(MAX_SWEEP_LIMIT, Math.floor(rawLimit)) : DEFAULT_SWEEP_LIMIT;
    return { olderThanMs, cutoff: new Date(now - olderThanMs), limit };
}

/**
 * 该不该被清扫关掉。轮询器认领的任务有自己的超时逻辑（轮询次数上限 + 失败退款），
 * 清扫不得抢——否则会把还在轮询的任务提前判死退款，等它真出图了就白送一张。
 * 注意：图片通道的任务虽然也记了取件地址，但没有任何轮询器认领它，必须照扫。
 */
export function isSweepExcluded(job: { provider?: string | null; externalGetUrl?: string | null }): boolean {
    return job.provider === SWEEP_POLLED_PROVIDER && !!job.externalGetUrl;
}
