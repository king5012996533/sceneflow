import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROXY_REQUEST_BYTES = 16 * 1024 * 1024;
const PROXY_TIMEOUT_MS = 120_000;
const ALLOWED_HEADER_NAMES = new Set(["authorization", "accept", "x-api-key", "x-request-id"]);

export async function POST(req: NextRequest) {
    const user = await requireCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_PROXY_REQUEST_BYTES) return NextResponse.json({ error: "请求内容过大：单张或多张参考素材的总上传体积超过代理限制。请压缩图片、减少参考素材，或改用公网素材 URL。" }, { status: 413 });

    try {
        const incoming = await req.formData();
        const target = await assertAllowedProxyUrl(String(incoming.get("_proxy_url") || ""));
        const method = sanitizeMethod(incoming.get("_proxy_method") || "POST");
        const safeHeaders = sanitizeHeaders(parseHeaders(incoming.get("_proxy_headers")));

        // 收集所有字段和文件
        const fields: [string, string][] = [];
        const files: [string, File][] = [];
        for (const [key, value] of incoming.entries()) {
            if (key.startsWith("_proxy_")) continue;
            if (value instanceof File) {
                files.push([key, value]);
            } else {
                fields.push([key, String(value)]);
            }
        }

        // 构建 multipart body
        const boundary = `----FormBoundary${Math.random().toString(36).slice(2)}`;
        const parts: string[] = [];
        for (const [key, value] of fields) {
            parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}`);
        }
        for (const [key, file] of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"; filename="${file.name}"\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`);
            parts.push(buffer);
        }
        parts.push(`--${boundary}--\r\n`);

        const bodyParts: (string | Buffer)[] = [];
        for (let i = 0; i < parts.length; i++) {
            if (typeof parts[i] === "string") {
                bodyParts.push(Buffer.from(parts[i]));
            } else {
                bodyParts.push(parts[i]);
            }
        }
        const body = Buffer.concat(bodyParts.map(p => typeof p === "string" ? Buffer.from(p) : p));

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

        try {
            const fetchHeaders: Record<string, string> = {
                ...safeHeaders,
                "Content-Type": `multipart/form-data; boundary=${boundary}`,
            };
            console.log("[proxy/form-data] target:", target.toString(), "method:", method, "bodyBytes:", body.length);
            const response = await fetch(target.toString(), { method, headers: fetchHeaders, body, signal: controller.signal });
            console.log("[proxy/form-data] response status:", response.status);
            const data = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }));
            if (response.status >= 400) {
                console.error("[proxy/form-data] error response:", JSON.stringify(data).slice(0, 500));
            }
            return NextResponse.json(data, { status: response.status });
        } finally {
            clearTimeout(timeout);
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "代理请求失败";
        console.error("[proxy/form-data]", message);
        const status = message.includes("不允许") || message.includes("非法") ? 400 : message.includes("超时") ? 504 : 502;
        return NextResponse.json({ error: message }, { status });
    }
}

function parseHeaders(value: FormDataEntryValue | null) {
    if (typeof value !== "string" || !value.trim()) return {};
    try {
        const parsed = JSON.parse(value) as unknown;
        return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
        return {};
    }
}

function sanitizeMethod(method: unknown) {
    const normalized = String(method || "POST").toUpperCase();
    if (!["POST", "PUT", "PATCH"].includes(normalized)) throw new Error("非法请求方法");
    return normalized;
}

function sanitizeHeaders(headers: Record<string, unknown>) {
    const safe: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
        const normalized = key.toLowerCase();
        if (!ALLOWED_HEADER_NAMES.has(normalized) && !normalized.startsWith("x-")) continue;
        if (value === undefined || value === null) continue;
        safe[key] = String(value);
    }
    return safe;
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
