/**
 * 上游失败原因的可读化（纯逻辑：不触网、不连库、无依赖，浏览器与 Node 下都能跑）。
 *
 * 2026-09-18 线上：最近 24 小时图片失败的头号文案就是「请求失败」四个字——没有 HTTP 状态码、
 * 没有上游信封里的失败码、没有网络错误码。后果很实在：既判断不了「上游到底出图没有」
 * （出了图就该去补取件，把成品和这笔额度要回来），也没法跟中转站对账、没法修网络路径。
 *
 * 所以失败文案必须自带三样东西，缺哪样都会让这条记录变成黑洞：
 *   1) HTTP 状态（尤其是 5xx 网关异常 / 408 超时 / 413 体积超限）；
 *   2) 上游信封里的失败码 + 响应结构摘要（`code: 4xx`、data 数组长什么样）；
 *   3) 网络层错误码与目标主机（ETIMEDOUT 103.252.114.11:443 这种一眼能查的线索）。
 */

/** 错误文案长度上限：既要够用，也不能把整份上游报文塞进数据库 */
export const MAX_UPSTREAM_ERROR_CHARS = 400;

/** HTTP 状态 → 人话。认得出语义的给语义，认不出的也至少把状态码留住。 */
export function describeHttpStatus(status: unknown, fallback = "请求失败"): string {
    const code = Number(status);
    if (!Number.isFinite(code) || code <= 0) return fallback;
    if (code === 401 || code === 403) return "鉴权失败，请检查 API Key 或模型权限";
    if (code === 429) return "请求被限流或额度不足，请稍后重试";
    if (code === 408) return "上游响应超时（HTTP 408）";
    if (code === 413) return "请求内容过大（HTTP 413）";
    if (code >= 500) return `上游网关异常（HTTP ${code}）`;
    return `${fallback}（HTTP ${code}）`;
}

const NETWORK_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,}$/;
/** 报文里出现的常见网络错误码（Node/undici/curl 的写法都在内） */
const NETWORK_CODE_IN_TEXT = /\b(EAI_AGAIN|ECONNRESET|ECONNREFUSED|ECONNABORTED|ETIMEDOUT|ENOTFOUND|EPIPE|EHOSTUNREACH|ENETUNREACH|UND_ERR_[A-Z_]+)\b/;
const HOST_IN_MESSAGE_PATTERN = /\b((?:\d{1,3}\.){3}\d{1,3}|[a-z0-9][a-z0-9.-]*\.[a-z]{2,})(?::\d{1,5})?\b/i;

/** 异常自身与 cause 的文案（undici 把真实原因放在 cause.message 里） */
function errorMessages(error: unknown): string[] {
    const messages: string[] = [];
    if (error && typeof error === "object") {
        const cause = (error as { cause?: unknown }).cause;
        if (cause instanceof Error) messages.push(cause.message);
        else if (typeof cause === "string") messages.push(cause);
    }
    if (error instanceof Error) messages.push(error.message);
    else if (typeof error === "string") messages.push(error);
    return messages.filter(Boolean);
}

/** 网络错误码：先看 ERROR.code / ERROR.cause.code，再从文案里捞（「connect ETIMEDOUT 1.2.3.4:443」这种） */
function networkErrorCode(error: unknown): string {
    const candidates: unknown[] = [];
    if (error && typeof error === "object") {
        const record = error as { code?: unknown; cause?: unknown };
        candidates.push(record.code);
        const cause = record.cause;
        if (cause && typeof cause === "object") candidates.push((cause as { code?: unknown }).code);
    }
    for (const candidate of candidates) {
        const value = String(candidate ?? "").trim();
        if (value && NETWORK_CODE_PATTERN.test(value)) return value;
    }
    for (const message of errorMessages(error)) {
        const matched = NETWORK_CODE_IN_TEXT.exec(message)?.[1];
        if (matched) return matched;
    }
    return "";
}

/**
 * 网络层失败（压根没拿到 HTTP 响应）：错误码 + 目标主机。
 * 三者都没有时返回空串——不确定的东西不要写进记录，免得把排查带偏。
 */
export function describeNetworkFailure(error: unknown): string {
    const code = networkErrorCode(error);
    const messages = errorMessages(error);
    const host = messages.map((message) => HOST_IN_MESSAGE_PATTERN.exec(message)?.[1]).find(Boolean) || "";
    const pieces: string[] = [];
    if (code) pieces.push(`网络错误 ${code}`);
    if (host) pieces.push(`目标 ${host}`);
    if (pieces.length) return pieces.join("，");
    if (messages.some((message) => /failed to fetch|networkerror|network error|fetch failed|connection closed|socket hang up/i.test(message))) return "网络层中断（没拿到 HTTP 响应）";
    return "";
}

/** 上游信封里的失败码 + 响应结构摘要：`上游返回失败码 403（顶层{code,data}，data 数组1项）` */
export function describeEnvelopeFailure(code: unknown, shape = ""): string {
    const value = typeof code === "number" ? String(code) : String(code ?? "").trim();
    if (!value) return "";
    return `上游返回失败码 ${value}${shape ? `（${shape}）` : ""}`;
}

/**
 * 组装最终文案：过滤空段、按原顺序去重、用「；」连接、封顶长度。
 * 一段都没有时给 fallback——但调用方应尽量别让这种情况发生。
 */
export function composeUpstreamFailure(parts: Array<unknown>, fallback = "请求失败"): string {
    const seen = new Set<string>();
    const segments: string[] = [];
    for (const part of parts) {
        const text = typeof part === "string" ? part.trim() : part == null ? "" : String(part).trim();
        if (!text || seen.has(text)) continue;
        seen.add(text);
        segments.push(text);
    }
    // 被别的段落包含的短句（「请求失败」之于「请求失败（HTTP 502）」）不必重复出现
    const kept = segments.filter((segment) => !segments.some((other) => other !== segment && other.includes(segment)));
    if (!kept.length) return fallback;
    const joined = kept.join("；");
    return joined.length > MAX_UPSTREAM_ERROR_CHARS ? `${joined.slice(0, MAX_UPSTREAM_ERROR_CHARS - 1)}…` : joined;
}
