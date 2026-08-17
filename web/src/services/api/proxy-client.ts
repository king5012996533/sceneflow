// proxy-client.ts — 客户端代理请求，解决 CORS 和第三方 API 调用问题
const PROXY_PATH = "/canvas/api/proxy";
const PROXY_WARNING_BYTES = 16 * 1024 * 1024;

export interface ProxyRequestOptions {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    /** 原始文件上传：本地文件 base64 编码后的内容（代理服务端会解码成二进制转发，如 Replicate Files API） */
    bodyBase64?: string;
    responseType?: "json" | "blob";
}

export async function proxyFetch<T = unknown>(options: ProxyRequestOptions): Promise<T> {
    const payload = JSON.stringify(options);
    const isRawUpload = typeof options.bodyBase64 === "string" && options.bodyBase64.length > 0;
    // 原始上传（参考视频/音频）体积大，用独立的宽松上限；普通 JSON 请求保持原来的预警线
    const warningBytes = isRawUpload ? 50 * 1024 * 1024 : PROXY_WARNING_BYTES;
    if (payload.length > warningBytes) {
        throw new Error(
            isRawUpload
                ? "素材文件过大：单个参考素材超过 30MB，请压缩后重试或改用公网素材 URL。"
                : `请求内容过大：本次代理请求约 ${formatProxyBytes(payload.length)}，超过 ${formatProxyBytes(PROXY_WARNING_BYTES)}。单张参考图也可能因原图体积或 base64 编码膨胀触发限制，请压缩图片、减少参考素材，或改用公网素材 URL。`,
        );
    }
    const res = await fetch(PROXY_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        credentials: "include",
    });

    if (options.responseType === "blob") {
        if (!res.ok) throw new Error(`请求失败: ${res.status}`);
        return res.blob() as Promise<T>;
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
        const msg = proxyErrorMessage(data) || proxyStatusMessage(res.status);
        throw new Error(normalizeUpstreamError(msg));
    }
    return data as T;
}

/**
 * 流式代理请求：透传上游响应流（SSE / 文本流），返回原始 Response 由调用方读取 body。
 * 平台 Key 化后所有上游 egress 都走代理，流式对话同样由服务端注入 Key。
 */
export async function proxyFetchStream(options: ProxyRequestOptions): Promise<Response> {
    const payload = JSON.stringify({ ...options, stream: true });
    if (payload.length > PROXY_WARNING_BYTES) {
        throw new Error(`请求内容过大：本次代理请求约 ${formatProxyBytes(payload.length)}，超过 ${formatProxyBytes(PROXY_WARNING_BYTES)}。`);
    }
    const res = await fetch(PROXY_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        credentials: "include",
    });
    if (!res.ok && !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(proxyErrorMessage(data) || proxyStatusMessage(res.status));
    }
    return res;
}

function proxyStatusMessage(status: number) {
    if (status === 413) return `请求内容过大：代理请求超过 ${formatProxyBytes(PROXY_WARNING_BYTES)}。单张参考图也可能因原图体积或 base64 编码膨胀触发限制，请压缩图片、减少参考素材，或改用公网素材 URL。`;
    if (status === 401 || status === 403) return "鉴权失败，请检查 API Key 或模型权限。";
    if (status === 429) return "请求被限流或额度不足，请稍后重试。";
    return `请求失败: ${status}`;
}

function formatProxyBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
    return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 1 : 2)} MB`;
}

function proxyErrorMessage(data: unknown): string {
    if (!data || typeof data !== "object") return "";
    const payload = data as Record<string, unknown>;
    // MiniMax 等上游把错误包在 base_resp 里（base_resp.status_code / status_msg）
    const base = payload.base_resp;
    if (base && typeof base === "object") {
        const baseResp = base as { status_code?: unknown; status_msg?: unknown };
        if (typeof baseResp.status_msg === "string" && baseResp.status_msg) return baseResp.status_msg;
        if (typeof baseResp.status_code === "number") return `上游错误 ${baseResp.status_code}`;
    }
    const { msg, message, error, code } = payload as { msg?: unknown; message?: unknown; error?: unknown; code?: unknown };
    if (typeof msg === "string" && msg) return msg;
    if (typeof message === "string" && message) return message;
    if (typeof error === "string" && error) return error;
    if (error && typeof error === "object") {
        const err = error as { message?: unknown; code?: unknown };
        if (typeof err.message === "string" && err.message) return err.message;
        if (typeof err.code === "string" && err.code) return err.code;
    }
    if (typeof code === "string" && code) return code;
    if (typeof code === "number") return `请求失败: ${code}`;
    return "";
}

function normalizeUpstreamError(message: string) {
    if (!message) return message;
    const requestId = message.match(/request id:\s*([a-z0-9]+)/i)?.[1];
    const suffix = requestId ? ` Request id: ${requestId}` : "";
    if (/input image/i.test(message) && /real person/i.test(message)) {
        return `上游安全策略拦截：参考图可能包含真实人物，当前模型不允许用这张图生成视频。请换成二次元/虚拟角色图、三视图设定稿，或降低照片真实感后重试。${suffix}`;
    }
    if (/content policy|safety|moderation/i.test(message)) {
        return `上游安全策略拦截：当前输入或参考素材没有通过模型审核，请调整提示词或更换参考素材后重试。${suffix}`;
    }
    return message;
}
