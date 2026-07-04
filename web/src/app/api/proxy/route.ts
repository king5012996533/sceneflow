import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROXY_REQUEST_BYTES = 4 * 1024 * 1024;
const PROXY_TIMEOUT_MS = 120_000;
const ALLOWED_HEADER_NAMES = new Set(["authorization", "content-type", "accept", "x-api-key", "x-request-id"]);

export async function POST(req: NextRequest) {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_PROXY_REQUEST_BYTES) {
        return NextResponse.json({ error: "请求内容过大，请减少参考素材数量或改用公网素材 URL。" }, { status: 413 });
    }

    try {
        const { url, method = "POST", headers = {}, body, responseType } = await req.json();
        const target = await assertAllowedProxyUrl(String(url || ""));
        const safeHeaders = sanitizeHeaders(headers);
        const upstreamBody = buildBody(body, safeHeaders);
        if (upstreamBody.byteLength > MAX_PROXY_REQUEST_BYTES) {
            return NextResponse.json({ error: "请求内容过大，请减少参考素材数量或改用公网素材 URL。" }, { status: 413 });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

        try {
            const response = await fetch(target.toString(), {
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
        console.error("[proxy]", message);
        const status = message.includes("不允许") || message.includes("非法") ? 400 : message.includes("超时") ? 504 : 502;
        return NextResponse.json({ error: message }, { status });
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

async function assertAllowedProxyUrl(rawUrl: string) {
    if (!rawUrl) throw new Error("缺少 url 参数");

    let target: URL;
    try {
        target = new URL(rawUrl);
    } catch {
        throw new Error("非法 URL");
    }

    if (!["https:", "http:"].includes(target.protocol)) throw new Error("不允许代理非 HTTP 地址");
    if (target.username || target.password) throw new Error("不允许 URL 携带认证信息");
    if (isPrivateHostname(target.hostname)) throw new Error("不允许代理内网或本机地址");

    try {
        const records = await lookup(target.hostname, { all: true, verbatim: true });
        if (records.some((record) => isPrivateAddress(record.address))) throw new Error("不允许代理内网或本机地址");
    } catch (error) {
        if (error instanceof Error && error.message.includes("不允许")) throw error;
        throw new Error("目标域名解析失败");
    }

    return target;
}

function isPrivateHostname(hostname: string) {
    const host = hostname.toLowerCase();
    return host === "localhost" || host.endsWith(".localhost") || isPrivateAddress(host);
}

function isPrivateAddress(address: string) {
    if (address === "::1") return true;
    const version = isIP(address);
    if (version === 4) {
        const parts = address.split(".").map((item) => Number(item));
        const [a, b] = parts;
        return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0;
    }
    if (version === 6) {
        const value = address.toLowerCase();
        return value === "::" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:");
    }
    return false;
}
