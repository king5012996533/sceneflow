import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { assertAllowedProxyUrl, fetchSafely } from "@/lib/url-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROXY_REQUEST_BYTES = 32 * 1024 * 1024;
const PROXY_TIMEOUT_MS = 120_000;
const ALLOWED_HEADER_NAMES = new Set(["authorization", "content-type", "accept", "prefer", "x-api-key", "x-request-id"]);

export async function POST(req: NextRequest) {
    const user = await requireCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_PROXY_REQUEST_BYTES) {
        return NextResponse.json({ error: "请求内容过大：单张或多张参考素材的总请求体超过代理限制。请压缩图片、减少参考素材，或改用公网素材 URL。" }, { status: 413 });
    }

    try {
        const { url, method = "POST", headers = {}, body, responseType } = await req.json();

        // 优先从数据库读取用户的 API Key；数据库不可用或没存时回退到请求头自带的 Key
        let apiKey = "";
        try {
            if (prisma) {
                const config = await prisma.userConfig.findUnique({ where: { userId: user.id } });
                if (config?.config && typeof config.config === "object") {
                    const cfg = config.config as Record<string, unknown>;
                    apiKey = String(cfg.apiKey || "");
                }
            }
        } catch (dbErr) {
            console.warn("[proxy] DB key 读取失败，回退请求头 Key:", (dbErr as Error)?.message);
        }

        const target = await assertAllowedProxyUrl(String(url || ""));
        const safeHeaders = sanitizeHeaders(headers);
        if (apiKey) safeHeaders["authorization"] = `Bearer ${apiKey}`;
        // DB 无 key 时：保留请求头自带的 key（BYOK 直连模式），不再删掉导致 502
        const upstreamBody = buildBody(body, safeHeaders);
        if (upstreamBody.byteLength > MAX_PROXY_REQUEST_BYTES) {
            return NextResponse.json({ error: "请求内容过大：单张或多张参考素材的总请求体超过代理限制。请压缩图片、减少参考素材，或改用公网素材 URL。" }, { status: 413 });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

        try {
            const response = await fetchSafely(target.toString(), {
                method: sanitizeMethod(method),
                headers: safeHeaders,
                body: upstreamBody.value,
                signal: controller.signal,
            });

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
            return NextResponse.json(data, { status: response.status });
        } finally {
            clearTimeout(timeout);
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "代理请求失败";
        const cause = err instanceof Error && err.cause instanceof Error && err.cause.message && err.cause.message !== message ? `: ${err.cause.message}` : "";
        console.error("[proxy]", message + cause);
        const status = message.includes("不允许") || message.includes("非法") || message.includes("重定向") ? 400 : message.includes("超时") || message.includes("aborted") ? 504 : 502;
        return NextResponse.json({ error: message + cause }, { status });
    }
}

function sanitizeMethod(method: unknown) {
    const normalized = String(method || "POST").toUpperCase();
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(normalized)) throw new Error("非法请求方法");
    return normalized;
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

function buildBody(body: unknown, headers: Record<string, string>) {
    if (body === undefined || body === null) return { value: undefined, byteLength: 0 };
    if (typeof body === "string") return { value: body, byteLength: new TextEncoder().encode(body).byteLength };

    const value = JSON.stringify(body);
    if (!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
        headers["Content-Type"] = "application/json";
    }
    return { value, byteLength: new TextEncoder().encode(value).byteLength };
}
