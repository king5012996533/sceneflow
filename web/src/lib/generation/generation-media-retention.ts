/**
 * 生成成品的保留与清理（纯逻辑：不碰磁盘、不碰数据库，便于在 Node 下直接单测）。
 *
 * 2026-09-18：服务端归档上线后（产出即归档、超时任务再补取件），成品会一直堆在
 * `~/.sceneflow/generation-media` 里，一张图 1–3MB、一条视频几十 MB，只进不出迟早撑爆磁盘；
 * 但也不能「用完即删」——用户隔天回来找那张「当时没拿到的图」，我们得还拿得出手，
 * 否则又回到「上游钱花了、我们手里什么都没有、也就没法扣用户额度」的黑洞里。
 *
 * 所以定一条有边界的保留期：默认 **2 天**（今天 + 昨天），每天凌晨清理一次更早的成品。
 * 为什么是「日界」而不是「满 48 小时」：清理要可预期、可复现——每天凌晨跑一次，
 * 删掉的永远是「前天 00:00 之前写入的文件」，成品寿命落在 28–52 小时之间，
 * 既保证用户第二天再来还拿得到，也保证磁盘占用有确定上限。
 *
 * 时区：日界按服务器本地时区切（部署在 UTC+8），偏移量可传参，便于单测与换机房。
 */

/** 默认保留天数（今天 + 昨天） */
export const DEFAULT_RETENTION_DAYS = 2;
/** 至少保留到「昨天」：只留当天会让用户第二天上午来找就扑空，等于没留 */
export const MIN_RETENTION_DAYS = 1;
/** 上限只是防呆：真要长期留存应该上对象存储，不该靠把磁盘堆满 */
export const MAX_RETENTION_DAYS = 30;

export const DAY_MS = 24 * 60 * 60 * 1000;

/** 服务器本地时区偏移（分钟），默认 UTC+8 */
export const DEFAULT_TZ_OFFSET_MINUTES = 8 * 60;

/** 单次清理的文件数上限：即使积压再多，一次也先把最老的这批收掉，不长时间占着磁盘 IO */
export const DEFAULT_PRUNE_LIMIT = 5000;
export const MAX_PRUNE_LIMIT = 20_000;

/** 归档键的形态：`<jobId>/<index>`（与 server-media-storage 的 safeKey 同一份白名单） */
const ARCHIVE_KEY_PATTERN = /^([a-zA-Z0-9_-]+)\/(\d+)$/;

/** 保留天数：非法值退回默认，越界夹到 [MIN, MAX]（环境变量给的是字符串，一并收进来） */
export function resolveRetentionDays(raw?: unknown, fallback: number = DEFAULT_RETENTION_DAYS): number {
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return fallback;
    return Math.min(MAX_RETENTION_DAYS, Math.max(MIN_RETENTION_DAYS, Math.floor(value)));
}

/** 单次清理上限：非法值退回默认，越界夹到上限 */
export function resolvePruneLimit(raw?: unknown, fallback: number = DEFAULT_PRUNE_LIMIT): number {
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return fallback;
    return Math.min(MAX_PRUNE_LIMIT, Math.floor(value));
}

/** 本地时区当天的零点时间戳（不做时区换算，只按传入偏移平移后再取整到天） */
export function startOfLocalDay(nowMs: number, tzOffsetMinutes: number = DEFAULT_TZ_OFFSET_MINUTES): number {
    const shifted = nowMs + tzOffsetMinutes * 60_000;
    return Math.floor(shifted / DAY_MS) * DAY_MS - tzOffsetMinutes * 60_000;
}

export type RetentionWindow = { nowMs: number; days: number; cutoffMs: number };

/**
 * 保留窗口：`cutoffMs` 之前的成品属于过期。
 * days=2、现在是 9/18 04:10 → 保留 9/17 与 9/18 的成品，删 9/17 00:00 之前写入的。
 */
export function resolveRetentionWindow(input: { now?: number; days?: unknown; tzOffsetMinutes?: number } = {}): RetentionWindow {
    const nowMs = typeof input.now === "number" && Number.isFinite(input.now) ? input.now : Date.now();
    const days = resolveRetentionDays(input.days);
    const cutoffMs = startOfLocalDay(nowMs, input.tzOffsetMinutes) - (days - 1) * DAY_MS;
    return { nowMs, days, cutoffMs };
}

/**
 * 这份成品该不该被清理。三条保守规则：
 *   1) 时间读不出来（NaN/0）→ 不删，宁可占点磁盘也不能删错；
 *   2) 修改时间在未来（时钟回拨/被 touch 过）→ 不删，说明我们对它的时间没有把握；
 *   3) 只有明确早于 cutoff 的才删。
 */
export function shouldPurgeArchiveFile(input: { mtimeMs: number; cutoffMs: number; nowMs: number }): boolean {
    const { mtimeMs, cutoffMs, nowMs } = input;
    if (!Number.isFinite(mtimeMs) || mtimeMs <= 0) return false;
    if (mtimeMs > nowMs) return false;
    return mtimeMs < cutoffMs;
}

/**
 * 解析归档键。只有 `<jobId>/<index>` 这一种形态的文件才会被清理——
 * 目录里将来多出来的任何东西（.gitkeep、临时文件、别的用途）一律跳过，
 * 避免「清理程序把不该删的删了」这类最难受的事故。
 */
export function parseArchiveKey(key: string): { jobId: string; index: number } | null {
    const matched = ARCHIVE_KEY_PATTERN.exec(key.replace(/\\/g, "/"));
    if (!matched) return null;
    return { jobId: matched[1], index: Number(matched[2]) };
}

/** 过期成品的提示语（媒体路由 404 时用，与清理用的是同一份天数） */
export function purgedMediaMessage(days: number = DEFAULT_RETENTION_DAYS) {
    return `成品已过 ${resolveRetentionDays(days)} 天保留期，服务器已自动清理；如需找回请联系客服`;
}

/** MIME → 落盘扩展名（下载时给个像样的文件名，认不出来就 bin） */
export function mimeTypeExtension(mimeType: string): string {
    const value = (mimeType || "").toLowerCase().split(";")[0].trim();
    const known: Record<string, string> = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
        "image/gif": "gif",
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/quicktime": "mov",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
    };
    return known[value] || "bin";
}
