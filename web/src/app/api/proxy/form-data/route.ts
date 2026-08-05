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
        const body = new FormData();

        incoming.forEach((value, key) => {
            if (!key.startsWith("_proxy_")) body.append(key, value);
        });

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

        try {
            const fetchHeaders: Record<string, string> = { ...safeHeaders };
            // 让 fetch 自动生成 multipart/form-data boundary
            delete fetchHeaders["content-type"];
            delete fetchHeaders["Content-Type"];
            console.log("[proxy/form-data] target:", target.toString(), "method:", method, "headers:", Object.keys(fetchHeaders).join(","));
            const response = await fetch(target.toString(), { method, headers: fetchHeaders, body, signal: controller.signal });
            console.log("[proxy/form-data] response status:", response.status);
            const data = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }));
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
