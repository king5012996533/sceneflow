import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { assertAllowedProxyUrl, fetchSafely } from "@/lib/url-safety";
import { resolvePlatformCredential } from "@/lib/credential-store.server";
import { getOperationFlag } from "@/lib/operation-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROXY_REQUEST_BYTES = 32 * 1024 * 1024;
// 原始文件上传（Replicate Files API 等）：base64 包一层后约 40MB，兼容服务器 nginx 50m 限制
const MAX_PROXY_RAW_BYTES = 30 * 1024 * 1024;
const MAX_PROXY_ENVELOPE_BYTES = 41 * 1024 * 1024;
const PROXY_TIMEOUT_MS = 120_000;
const ALLOWED_HEADER_NAMES = new Set(["authorization", "content-type", "accept", "prefer", "x-api-key", "x-request-id", "x-sf-provider", "x-sf-model"]);

type KeySource = "platform" | "byok-header" | "byok-db-channel" | "byok-db-default" | "none";

export async function POST(req: NextRequest) {
    const user = await requireCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_PROXY_ENVELOPE_BYTES) {
        return NextResponse.json({ error: "请求内容过大：素材总请求体超过代理限制。请压缩素材、减少参考素材数量，或改用公网素材 URL。" }, { status: 413 });
    }

    try {
        const { url, method = "POST", headers = {}, body, bodyBase64, responseType, stream = false } = await req.json();

        const target = await assertAllowedProxyUrl(String(url || ""));
        const safeHeaders = sanitizeHeaders(headers);

        // —— API Key 解析优先级（平台 Key 化后反转） ——
        // ① 平台统一配置的凭证（按目标 host + 可选 provider/model 匹配，admin 在后台管理）
        // ② 过渡期 BYOK：仅当 byok_enabled 开关打开时才读用户自带 Key
        //    （请求头 Key > 用户 DB 渠道 Key > 用户 DB 默认 Key）
        // ③ 都没有 → 402 拒绝（平台模式下不允许无 Key 调用）
        const sfProvider = typeof safeHeaders["x-sf-provider"] === "string" ? safeHeaders["x-sf-provider"] : undefined;
        const sfModel = typeof safeHeaders["x-sf-model"] === "string" ? safeHeaders["x-sf-model"] : undefined;

        const platformCred = await resolvePlatformCredential({ targetUrl: target.toString(), provider: sfProvider, model: sfModel });

        let finalToken = "";
        let keySource: KeySource = "none";
        if (platformCred) {
            finalToken = platformCred.apiKey;
            keySource = "platform";
        } else {
            const byokEnabled = await getOperationFlag("byok_enabled", true);
            if (byokEnabled) {
                const byok = await resolveByokKey(user.id, safeHeaders, target.toString());
                finalToken = byok.token;
                keySource = byok.source;
            }
        }

        // 清掉原有的 Authorization（可能是 "Authorization" 或 "authorization"，避免同名字头重复），统一写小写
        for (const key of Object.keys(safeHeaders)) {
            if (key.toLowerCase() === "authorization") delete safeHeaders[key];
        }
        if (finalToken) {
            if (platformCred?.provider === "gemini") {
                // Gemini 用 x-goog-api-key 而非 Authorization
                for (const key of Object.keys(safeHeaders)) {
                    if (key.toLowerCase() === "x-goog-api-key") delete safeHeaders[key];
                }
                safeHeaders["x-goog-api-key"] = finalToken;
            } else {
                safeHeaders["authorization"] = `Bearer ${finalToken}`;
            }
        }
        console.log(`[proxy] key-source=${keySource} target=${target.hostname}${target.pathname}`);

        const upstreamBody = buildUpstreamBody(body, bodyBase64, safeHeaders);
        const isRawUpload = typeof bodyBase64 === "string" && bodyBase64.length > 0;
        if (upstreamBody.byteLength > (isRawUpload ? MAX_PROXY_RAW_BYTES : MAX_PROXY_REQUEST_BYTES)) {
            return NextResponse.json(
                { error: isRawUpload ? "素材文件过大：单个参考素材超过 30MB，请压缩后重试或改用公网素材 URL。" : "请求内容过大：单张或多张参考素材的总请求体超过代理限制。请压缩图片、减少参考素材，或改用公网素材 URL。" },
                { status: 413 },
            );
        }

        const controller = new AbortController();
        // 流式请求（SSE/文本流）不设超时：长对话可能持续数分钟，由客户端自行中止；
        // 非流式请求保持 120s 上限防止上游挂起。
        const timeout = stream ? null : setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

        try {
            const response = await fetchSafely(target.toString(), {
                method: sanitizeMethod(method),
                headers: safeHeaders,
                body: upstreamBody.value,
                signal: controller.signal,
            });

            // 流式透传（SSE / 文本流）：把上游 body 流原样转给客户端
            if (stream) {
                return new NextResponse(response.body, {
                    status: response.status,
                    headers: {
                        "Content-Type": response.headers.get("Content-Type") || "text/event-stream; charset=utf-8",
                        "Cache-Control": "no-cache, no-transform",
                        "X-Accel-Buffering": "no",
                    },
                });
            }

            if (responseType === "blob") {
                const blob = await response.arrayBuffer();
                return new NextResponse(blob, {
                    status: response.status,
                    headers: {
                        "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
                        "Content-Length": String(blob.byteLength),
                    },
                });
            }

            const data = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }));
            if (response.status >= 400) {
                const snippet = typeof data === "object" && data !== null ? JSON.stringify(data).slice(0, 400) : String(data).slice(0, 400);
                const masked = safeHeaders.authorization ? safeHeaders.authorization.replace(/^Bearer\s+/i, "").replace(/^(.{6}).*(.{4})$/, "$1****$2") : "none";
                console.error(`[proxy] 上游 ${response.status} ${method} ${target} key=${masked}: ${snippet}`);
            }
            return NextResponse.json(data, { status: response.status });
        } finally {
            if (timeout) clearTimeout(timeout);
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "代理请求失败";
        const cause = err instanceof Error && err.cause instanceof Error && err.cause.message && err.cause.message !== message ? `: ${err.cause.message}` : "";
        console.error("[proxy]", message + cause);
        const status = message.includes("不允许") || message.includes("非法") || message.includes("重定向") ? 400 : message.includes("超时") || message.includes("aborted") ? 504 : 502;
        return NextResponse.json({ error: message + cause }, { status });
    }
}

/**
 * 过渡期 BYOK 解析：从请求头 Key → 用户 DB 渠道 Key → 用户 DB 默认 Key。
 * 平台 Key 化上线后此路径仅由 byok_enabled 开关控制，最终会移除。
 */
async function resolveByokKey(userId: string, safeHeaders: Record<string, string>, targetUrl: string): Promise<{ token: string; source: KeySource }> {
    const headerAuth = readHeaderAuthorization(safeHeaders);
    const headerKey = headerAuth.replace(/^Bearer\s+/i, "").trim();
    if (headerKey) return { token: headerKey, source: "byok-header" };

    if (!prisma) return { token: "", source: "none" };
    try {
        const config = await prisma.userConfig.findUnique({ where: { userId } });
        if (config?.config && typeof config.config === "object") {
            const stored = config.config as { config?: Record<string, unknown> };
            const cfg = (stored.config || stored) as Record<string, unknown>;
            const defaultKey = String(cfg.apiKey || "");
            try {
                const targetHost = new URL(targetUrl).hostname;
                const channels = Array.isArray(cfg.channels) ? (cfg.channels as Array<Record<string, unknown>>) : [];
                const matched = channels.find((channel) => {
                    try {
                        const base = String(channel.baseUrl || "").trim();
                        if (!base) return false;
                        return new URL(base).hostname === targetHost;
                    } catch {
                        return false;
                    }
                });
                if (matched && typeof matched.apiKey === "string" && matched.apiKey.trim()) {
                    return { token: matched.apiKey, source: "byok-db-channel" };
                }
            } catch {
                // 目标地址解析失败时回退默认 key
            }
            if (defaultKey) return { token: defaultKey, source: "byok-db-default" };
        }
    } catch (dbErr) {
        console.warn("[proxy] DB key 读取失败，回退请求头 Key:", (dbErr as Error)?.message);
    }
    return { token: "", source: "none" };
}

function sanitizeMethod(method: unknown) {
    const normalized = String(method || "POST").toUpperCase();
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(normalized)) throw new Error("非法请求方法");
    return normalized;
}

function readHeaderAuthorization(headers: Record<string, string>): string {
    for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === "authorization") return String(headers[key] ?? "");
    }
    return "";
}

function sanitizeHeaders(headers: unknown) {
    const safe: Record<string, string> = {};
    if (!headers || typeof headers !== "object") return safe;

    for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
        const normalized = key.toLowerCase();
        if (!ALLOWED_HEADER_NAMES.has(normalized) && !normalized.startsWith("x-")) continue;
        if (value === undefined || value === null) continue;
        safe[key] = String(value);
    }

    return safe;
}

// bodyBase64：客户端把本地文件 base64 后放进 JSON 信封，这里解码成二进制再转发（用于 Replicate Files API 等原始上传）
function buildUpstreamBody(body: unknown, bodyBase64: unknown, headers: Record<string, string>) {
    if (typeof bodyBase64 === "string" && bodyBase64.length > 0) {
        const buffer = Buffer.from(bodyBase64, "base64");
        return { value: buffer, byteLength: buffer.byteLength };
    }
    return buildBody(body, headers);
}

function buildBody(body: unknown, headers: Record<string, string>) {
    if (body === undefined || body === null) return { value: undefined, byteLength: 0 };
    if (typeof body === "string") return { value: body, byteLength: new TextEncoder().encode(body).byteLength };

    const value = JSON.stringify(body);
    if (!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
        headers["Content-Type"] = "application/json";
    }
    return { value, byteLength: new TextEncoder().encode(value).byteLength };
}
