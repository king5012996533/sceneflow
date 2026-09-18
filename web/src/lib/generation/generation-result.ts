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
 * 归一上报的成品地址：只收 http(s) 直链，去空白、限量、限长。
 *
 * data: 形态的成品不从这里走——它不是「没人要」，而是被服务端在代理层直接截下了
 * （上游报文里的 b64 字节一到代理就被提取归档，见 generation-rescue.server.ts）：
 * 让浏览器把几 MB 的 base64 再回传一次，既慢又会在长连接上多一个失败点。
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

// ---------- 上游报文里的成品提取 ----------
//
// 2026-09-18 线上账：7 天 374 条任务判「成功」，其中 370 条手上什么都没有
// ——因为成品是 base64 内联在上游报文里的（OpenAI 兼容通道 response_format=b64_json），
// 而客户端上报只收 http(s) 直链，于是「图片在用户浏览器里、服务器上一片空白」。
// 现在改成服务端在代理层直接看上游的原始报文，把成品就地取出来：不再依赖浏览器活着，
// 也不再依赖上游愿意给一个可回源的地址。

/** 上游报文里「字节已经在手」的成品 */
export type InlineArtifact = { base64: string; mimeType: string };
export type ExtractedArtifacts = { inline: InlineArtifact[]; urls: string[] };

/** 单次提取的成品份数上限（与客户端上报上限同一档） */
export const MAX_EXTRACTED_ARTIFACTS = 8;
/** 短于这个长度的 base64 不可能是成品（避免把上游的任务号、哈希当成图片） */
export const MIN_INLINE_BASE64_CHARS = 512;

/** 归档来源：内联字节直接落盘，远程地址需要再取一次 */
export type ResultSource = { kind: "url"; url: string } | { kind: "inline"; base64: string; mimeType: string };

/** 归档来源整理：内联在前、远程在后，各自去重限量（顺序即成品下标） */
export function resultSources(artifacts: ExtractedArtifacts): ResultSource[] {
    const sources: ResultSource[] = [];
    for (const artifact of artifacts.inline) sources.push({ kind: "inline", base64: artifact.base64, mimeType: artifact.mimeType });
    for (const url of artifacts.urls) sources.push({ kind: "url", url });
    return sources.slice(0, MAX_EXTRACTED_ARTIFACTS);
}

const BASE64_KEYS = new Set(["b64_json", "b64", "base64", "b64_data", "image_b64"]);
const INLINE_OBJECT_KEYS = ["inlineData", "inline_data"];
const URL_KEYS = new Set(["url", "image_url", "img_url", "cdn_url", "fileUri", "file_uri"]);
const DATA_URL_PATTERN = /^data:((?:image|video|audio)\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i;
const BASE64_PATTERN = /^[a-z0-9+/=]+$/i;

/** `data:image/png;base64,xxx` → 原样拆成字节 + MIME（内联成品最脏的一种形态） */
export function parseInlineDataUrl(value: string): InlineArtifact | null {
    const trimmed = value.trim();
    if (!/^data:/i.test(trimmed)) return null;
    // base64 本体可能有换行（个别通道按 76 列折行）；没空白就不复制，几 MB 的字符串少拷一次是一次
    const compact = /\s/.test(trimmed) ? trimmed.replace(/\s+/g, "") : trimmed;
    const matched = DATA_URL_PATTERN.exec(compact);
    if (!matched) return null;
    const base64 = matched[2];
    if (base64.length < MIN_INLINE_BASE64_CHARS) return null;
    return { base64, mimeType: matched[1].toLowerCase() };
}

type ArtifactSink = { inline: InlineArtifact[]; urls: Set<string> };

function pushInline(sink: ArtifactSink, value: unknown, mimeType: string) {
    if (sink.inline.length >= MAX_EXTRACTED_ARTIFACTS) return;
    if (typeof value !== "string") return;
    const base64 = /\s/.test(value) ? value.replace(/\s+/g, "") : value;
    if (base64.length < MIN_INLINE_BASE64_CHARS || !BASE64_PATTERN.test(base64)) return;
    if (sink.inline.some((item) => item.base64 === base64)) return;
    sink.inline.push({ base64, mimeType: (mimeType || "image/png").toLowerCase() });
}

function pushUrl(sink: ArtifactSink, value: unknown) {
    if (typeof value !== "string") return;
    const url = value.trim();
    if (url.length > MAX_RESULT_URL_LENGTH || !/^https?:\/\//i.test(url)) return;
    if (sink.urls.size >= MAX_EXTRACTED_ARTIFACTS) return;
    sink.urls.add(url);
}

/** 已知字段名下的字符串（`inlineData: {data, mimeType}` 这种嵌套对象用） */
function pickText(record: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

/** 收集嵌套结构里的字符串（`result.images[].url` 可能是字符串也可能是数组） */
function collectStrings(value: unknown, depth = 0): string[] {
    if (depth > 3) return [];
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item, depth + 1));
    if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).flatMap((item) => collectStrings(item, depth + 1));
    return [];
}

function walkArtifacts(value: unknown, sink: ArtifactSink, depth: number) {
    if (depth > 6) return;
    if (Array.isArray(value)) {
        for (const item of value) walkArtifacts(item, sink, depth + 1);
        return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;

    // Gemini 系：content.parts[].inlineData / inline_data
    for (const key of INLINE_OBJECT_KEYS) {
        const nested = record[key];
        if (!nested || typeof nested !== "object" || Array.isArray(nested)) continue;
        const inner = nested as Record<string, unknown>;
        pushInline(sink, pickText(inner, ["data", "b64_json", "base64"]), pickText(inner, ["mimeType", "mime_type", "content_type"]));
    }

    for (const [key, raw] of Object.entries(record)) {
        const lower = key.toLowerCase();
        if (typeof raw === "string") {
            // data: URL 先判：`{url: "data:image/png;base64,..."}` 这种形态很常见，别当成远程地址丢掉
            const fromDataUrl = parseInlineDataUrl(raw);
            if (fromDataUrl) pushInline(sink, fromDataUrl.base64, fromDataUrl.mimeType);
            else if (BASE64_KEYS.has(lower)) pushInline(sink, raw, "");
            else if (URL_KEYS.has(key)) pushUrl(sink, raw);
            continue;
        }
        if (BASE64_KEYS.has(lower)) {
            for (const text of collectStrings(raw)) pushInline(sink, text, "");
            continue;
        }
        if (URL_KEYS.has(key)) {
            for (const text of collectStrings(raw)) pushUrl(sink, text);
            continue;
        }
        walkArtifacts(raw, sink, depth + 1);
    }
}

/**
 * 从上游原始报文里提取成品（不认识的结构一律忽略，宁可漏认也不能乱认）。
 * 只认已知字段名，不做无差别全文搜索——请求里带过来的参考图、提示词都可能被回显。
 */
export function extractArtifacts(payload: unknown): ExtractedArtifacts {
    const sink: ArtifactSink = { inline: [], urls: new Set() };
    walkArtifacts(payload, sink, 0);
    return { inline: sink.inline.slice(0, MAX_EXTRACTED_ARTIFACTS), urls: [...sink.urls].slice(0, MAX_EXTRACTED_ARTIFACTS) };
}

/** 成品字节的真实类型（按文件头判定）：声明的 MIME 不可信，落盘前必须自己对一遍 */
export function detectMediaMime(bytes: Uint8Array): string {
    const startsWith = (offset: number, text: string) => {
        for (let index = 0; index < text.length; index += 1) {
            if (bytes[offset + index] !== text.charCodeAt(index)) return false;
        }
        return true;
    };
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes.length >= 6 && startsWith(0, "GIF8")) return "image/gif";
    if (bytes.length >= 12 && startsWith(0, "RIFF") && startsWith(8, "WEBP")) return "image/webp";
    if (bytes.length >= 12 && startsWith(0, "RIFF") && startsWith(8, "WAVE")) return "audio/wav";
    if (bytes.length >= 12 && startsWith(4, "ftyp")) {
        return startsWith(8, "qt") ? "video/quicktime" : "video/mp4";
    }
    if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "video/webm";
    if (bytes.length >= 3 && startsWith(0, "ID3")) return "audio/mpeg";
    return "";
}
