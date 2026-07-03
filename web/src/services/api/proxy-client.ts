// proxy-client.ts — 客户端代理请求，解决 CORS 和第三方 API 调用问题
const PROXY_PATH = "/canvas/api/proxy";

export interface ProxyRequestOptions {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    responseType?: "json" | "blob";
}

export async function proxyFetch<T = unknown>(options: ProxyRequestOptions): Promise<T> {
    const res = await fetch(PROXY_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
        credentials: "include",
    });

    if (options.responseType === "blob") {
        if (!res.ok) throw new Error(`请求失败: ${res.status}`);
        return res.blob() as Promise<T>;
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
        const msg = proxyErrorMessage(data) || `请求失败: ${res.status}`;
        throw new Error(msg);
    }
    return data as T;
}

function proxyErrorMessage(data: unknown): string {
    if (!data || typeof data !== "object") return "";
    const payload = data as { error?: unknown; msg?: unknown; message?: unknown; code?: unknown };
    if (typeof payload.msg === "string" && payload.msg) return payload.msg;
    if (typeof payload.message === "string" && payload.message) return payload.message;
    if (typeof payload.error === "string" && payload.error) return payload.error;
    if (payload.error && typeof payload.error === "object") {
        const error = payload.error as { message?: unknown; code?: unknown };
        if (typeof error.message === "string" && error.message) return error.message;
        if (typeof error.code === "string" && error.code) return error.code;
    }
    if (typeof payload.code === "string" && payload.code) return payload.code;
    if (typeof payload.code === "number") return `请求失败: ${payload.code}`;
    return "";
}
