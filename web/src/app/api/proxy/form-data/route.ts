import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { assertAllowedProxyUrl, fetchSafely } from "@/lib/url-safety";
import { resolvePlatformCredential } from "@/lib/credential-store.server";
import { getOperationFlag } from "@/lib/operation-config";
import FormData from "form-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROXY_REQUEST_BYTES = 16 * 1024 * 1024;
const PROXY_TIMEOUT_MS = 120_000;
const ALLOWED_HEADER_NAMES = new Set(["authorization", "accept", "x-api-key", "x-request-id", "x-sf-provider", "x-sf-model"]);

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

        // 平台凭证优先（按目标 host + 可选 provider/model 匹配）；无平台凭证且 BYOK 开关打开时，
        // 回退用户 DB 默认 Key 或请求头自带的 Key（过渡期逻辑，最终移除）
        const sfProvider = typeof safeHeaders["x-sf-provider"] === "string" ? safeHeaders["x-sf-provider"] : undefined;
        const sfModel = typeof safeHeaders["x-sf-model"] === "string" ? safeHeaders["x-sf-model"] : undefined;
        const platformCred = await resolvePlatformCredential({ targetUrl: target.toString(), provider: sfProvider, model: sfModel });

        if (platformCred) {
            safeHeaders["authorization"] = `Bearer ${platformCred.apiKey}`;
            console.log(`[proxy/form-data] key-source=platform target=${target.hostname}`);
        } else if (await getOperationFlag("byok_enabled", true)) {
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
                console.warn("[proxy/form-data] DB key 读取失败，回退请求头 Key:", (dbErr as Error)?.message);
            }
            if (apiKey) safeHeaders["authorization"] = `Bearer ${apiKey}`;
            // DB 无 key 时：保留请求头自带的 key，不再删掉导致 502
        }

        // 使用 form-data 包构建 multipart body
        const form = new FormData();
        const fieldNames: string[] = [];
        for (const [key, value] of incoming.entries()) {
            if (key.startsWith("_proxy_")) continue;
            // 字段名/文件名剔除 CRLF，防止 form-data CRLF 注入（GHSA-q6p4-2r3g-8vhj）
            const safeKey = stripCrlf(key);
            fieldNames.push(safeKey);
            if (typeof value === "string") {
                form.append(safeKey, value);
            } else if (value instanceof File || (typeof Blob !== "undefined" && (value as unknown) instanceof Blob)) {
                const buffer = Buffer.from(await (value as File).arrayBuffer());
                form.append(safeKey, buffer, { filename: stripCrlf((value as File).name), contentType: (value as File).type || "application/octet-stream" });
            } else {
                form.append(safeKey, String(value));
            }
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

        try {
            const bodyBuffer = form.getBuffer();
            const response = await fetchSafely(target.toString(), {
                method,
                headers: {
                    ...safeHeaders,
                    "content-type": `multipart/form-data; boundary=${form.getBoundary()}`,
                    "content-length": String(bodyBuffer.length),
                },
                body: bodyBuffer as unknown as BodyInit,
                signal: controller.signal,
            });
            const data = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }));
            return NextResponse.json(data, { status: response.status });
        } finally {
            clearTimeout(timeout);
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "代理请求失败";
        const cause = err instanceof Error && err.cause instanceof Error && err.cause.message && err.cause.message !== message ? `: ${err.cause.message}` : "";
        console.error("[proxy/form-data]", message + cause);
        const status = message.includes("不允许") || message.includes("非法") || message.includes("重定向") ? 400 : message.includes("超时") || message.includes("aborted") ? 504 : 502;
        return NextResponse.json({ error: message + cause }, { status });
    }
}

function stripCrlf(value: string) {
    return value.replace(/[\r\n]/g, " ").trim();
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
