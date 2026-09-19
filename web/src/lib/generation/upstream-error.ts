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

/**
 * 从上游应答里取错误说明文案（各家中转站字段名不统一：msg / message / error_message / error 字符串或对象）。
 *
 * 与 services/api/image-task.ts 的 envelopeMessage 是同一张字段表：那边为了能被 Node 单测直接 import，
 * 刻意零依赖、自己留了一份实现（本模块同样零依赖，但 image-task 是 services 层，反向依赖不合适）。
 * 改字段表时两处一起改；这里多认一层 data 里的失败原因（任务制通道会放在那）。
 */
export function upstreamErrorMessage(payload: unknown): string {
    if (!payload || typeof payload !== "object") return "";
    const record = payload as Record<string, unknown>;
    for (const value of [record.msg, record.message, record.error_message]) {
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    const error = record.error;
    if (typeof error === "string" && error.trim()) return error.trim();
    if (error && typeof error === "object") {
        const nested = error as Record<string, unknown>;
        for (const value of [nested.message, nested.msg, nested.detail]) {
            if (typeof value === "string" && value.trim()) return value.trim();
        }
    }
    const data = Array.isArray(record.data) ? record.data[0] : record.data;
    if (data && typeof data === "object") {
        const inner = data as Record<string, unknown>;
        for (const value of [inner.error, inner.fail_reason, inner.failure_reason, inner.reason, inner.message, inner.msg]) {
            if (typeof value === "string" && value.trim()) return value.trim();
        }
    }
    // Replicate 一类上游把原因放在顶层 detail（`{"title":"Unauthenticated","detail":"You did not pass a valid authentication token"}`），
    // 没有 error 字段。2026-09-19 就是这条报文被读成空，前端只看到「Replicate 任务创建失败」，
    // 明明上游已经把「没带有效令牌」写在脸上了。放最后，别抢前面更明确的字段。
    if (typeof record.detail === "string" && record.detail.trim()) return record.detail.trim();
    return "";
}

/** 报文片段：认不出结构时，至少把上游原话（截断）留出来，别让排查到此为止 */
function rawSnippet(payload: unknown, limit = 200): string {
    let text = "";
    try {
        text = typeof payload === "string" ? payload : JSON.stringify(payload);
    } catch {
        text = "";
    }
    if (!text) return "";
    const compact = text.replace(/\s+/g, " ").trim();
    return compact.length > limit ? `${compact.slice(0, limit)}…` : compact;
}

/**
 * 「HTTP 200，但报文里没有候选结果」时的文案（带 tools 的对话轮次专用）。
 *
 * 2026-09-19 老板报「上游没有返回任何候选结果，请稍后重试」——这句话对排查毫无用处：
 * 既不说上游到底答了什么，也不说该重试还是该改配置，服务端（只记录 4xx/5xx）更是一个字都没留。
 * 中转站把失败包在 200 里回是常态（`{"code":500,"message":"服务繁忙"}` 这类），所以先认信封；
 * 认不出来就把 finish_reason 与报文片段带上，让下一个人有东西可查。
 */
export function describeMissingCandidates(payload: unknown, options: { shape?: string; finishReason?: string } = {}): string {
    const envelope = upstreamErrorMessage(payload);
    if (envelope) return `上游没有返回任何候选结果：${envelope}；请稍后重试`;
    const finish = typeof options.finishReason === "string" && options.finishReason.trim() ? options.finishReason.trim() : "";
    const shape = typeof options.shape === "string" ? options.shape.trim() : "";
    const snippet = rawSnippet(payload);
    const detail = [finish ? `finish_reason=${finish}` : "", shape, snippet ? `报文片段：${snippet}` : ""].filter(Boolean).join("，");
    return `上游没有返回任何候选结果${detail ? `（${detail}）` : ""}；请稍后重试`;
}

const SUCCESS_CODES = new Set(["0", "200", "201", "202", "204"]);

/**
 * 「HTTP 2xx，但报文其实用不了」的判定，专供代理路由记日志用。
 *
 * 2026-09-19：客户端报「上游没有返回任何候选结果」，而服务端的代理日志只记 4xx/5xx（见 route.ts），
 * 于是那次调用在上游侧等于没发生过——查不下去。这里把「2xx 但信封看着是失败」的情况点出来，
 * 让日志留下证据。返回空串 = 看不出问题（正常成功报文一律返回空串，不污染日志）。
 */
export function describeUnusableSuccess(pathname: string, payload: unknown): string {
    if (!payload || typeof payload !== "object") return "";
    const record = payload as Record<string, unknown>;
    const choices = record.choices;
    const isChat = pathname.includes("/chat/completions");
    if (choices !== undefined) {
        if (!Array.isArray(choices)) return "choices 不是数组";
        if (isChat && choices.length === 0) return "choices 为空";
        const first = choices[0];
        if (isChat && choices.length > 0 && (!first || typeof first !== "object" || !(first as Record<string, unknown>).message)) return "choices 里没有 message";
    } else if (isChat) {
        return "没有 choices 字段";
    }
    const code = record.code;
    if (code !== undefined && code !== null && !SUCCESS_CODES.has(String(code))) return `信封失败码 ${String(code)}`;
    if (record.error) return "信封里带 error";
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
