/**
 * 生成成品（archiveKey / MIME / 地址归一 / 合并）的纯逻辑。
 *
 * 2026-09-18 线上：nginx 显示上游调用 99% 是 200，但任务成功率只有 55%
 * —— 钱花在上游成功了，结果却丢在我们自己的交付环节：下载、上传、回报全发生在
 * 用户的标签页里，标签页一关/一断/一刷新，上游已出图并计费，我们手里什么都没有，
 * 只能退款，成本全由平台承担。
 *
 * 解法是让服务端自己握住成品：客户端一拿到地址就报过来，服务端立刻取一份归档，
 * 任务成败从此只看「上游有没有产出」，不看「浏览器还活着没有」。
 *
 * 这里只放纯逻辑（能被 Node 直接单测）：体积/时限常量、MIME 兜底、地址归一、多份合并。
 * 落盘与取件在 generation-result.server.ts，路由在 app/api/generation/jobs/[id]/result。
 */

/** 单份成品的体积上限（视频也走这条通道，与 Replicate 归档同一档） */
export const MAX_RESULT_BYTES = 100 * 1024 * 1024;
/** 单份成品的下载时限：上游 CDN 偶尔很慢，但不能无限挂着 */
export const RESULT_FETCH_TIMEOUT_MS = 120_000;
/** 一次上报的成品地址上限（与客户端 MAX_REPORTED_RESULTS 同一份数字） */
export const MAX_RESULT_URLS = 8;
/** 单个成品地址长度上限：正常是 CDN 直链，超长要么是 data: 要么是构造出来的 */
export const MAX_RESULT_URL_LENGTH = 1000;

export type ResultItem = { archiveKey: string; mimeType: string; bytes: number } | { url: string };

/** 已归档的成品（拿到了本地键，不依赖第三方 CDN 的有效期与防盗链） */
export function isArchivedResultItem(item: unknown): item is { archiveKey: string; mimeType: string; bytes: number } {
    return Boolean(item) && typeof item === "object" && typeof (item as { archiveKey?: unknown }).archiveKey === "string";
}

/** 按扩展名兜底猜 MIME（上游不给 content-type 时，媒体路由要用它设响应头） */
export function guessMimeType(url: string): string {
    const path = url.split("?")[0].toLowerCase();
    if (path.endsWith(".png")) return "image/png";
    if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
    if (path.endsWith(".webp")) return "image/webp";
    if (path.endsWith(".gif")) return "image/gif";
    if (path.endsWith(".mp4")) return "video/mp4";
    if (path.endsWith(".webm")) return "video/webm";
    if (path.endsWith(".mov")) return "video/quicktime";
    if (path.endsWith(".m4v")) return "video/x-m4v";
    if (path.endsWith(".mp3")) return "audio/mpeg";
    if (path.endsWith(".wav")) return "audio/wav";
    return "application/octet-stream";
}

/**
 * 归一上报的成品地址：只收 http(s) 直链（data: 形态的成品由浏览器自己带着字节，
 * 不往回传，避免几 MB 的 body 拖着生成流程），去空白、限量、限长。
 */
export function normalizeResultUrls(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    return input
        .filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url.trim()) && url.trim().length <= MAX_RESULT_URL_LENGTH)
        .map((url) => url.trim())
        .slice(0, MAX_RESULT_URLS);
}

/**
 * 把新一批归档结果并进已有记录（按下标对齐）。
 *
 * 服务端是「先认领、后归档」：认领时先写下裸地址，归档完再把本地键补上；
 * 若上一轮已经归档过同一份（例如先认领后归档中间被打断、再来一次），
 * 已归档的旧记录优先于新来的裸地址——本地键永远不倒退成 CDN 直链。
 */
export function mergeResultItems(existing: unknown, incoming: ResultItem[]): ResultItem[] {
    const previous = Array.isArray(existing) ? (existing as unknown[]) : [];
    const merged: ResultItem[] = [];
    const length = Math.max(previous.length, incoming.length);
    for (let index = 0; index < length; index += 1) {
        const next = incoming[index];
        const before = previous[index];
        if (isArchivedResultItem(next)) merged.push(next);
        else if (isArchivedResultItem(before)) merged.push(before);
        else if (next) merged.push(next);
        else if (before) merged.push(before as ResultItem);
    }
    return merged;
}

/** 归档成品的取件地址（与 client 端 archivedMediaUrls 同一形状） */
export function resultMediaPath(jobId: string, index: number) {
    return `/api/generation/jobs/${encodeURIComponent(jobId)}/media/${index}`;
}
