import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { assertAllowedProxyUrl, fetchSafely } from "@/lib/url-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ASSET_TIMEOUT_MS = 60_000;
const MAX_ASSET_BYTES = 25 * 1024 * 1024;

/**
 * 素材（图片/视频）下载代理：浏览器不再直连公网素材 URL，改由服务端下载后同源返回。
 *
 * 规避三类问题：
 * 1. CDN 无 CORS 头 → 浏览器 fetch/axios 被拦（Failed to fetch / Network Error）
 * 2. 用户在墙内网络无法直连境外 CDN（如 oaiusercontent.com / blob.core.windows.net）
 * 3. CSP 对非 https 素材源的拦截（connect-src 'self' https: wss:）
 *
 * SSRF 防护与主代理一致：assertAllowedProxyUrl（仅 http/https + 非内网 + DNS 固定解析防重绑定）。
 * 注意：素材下载目标（中转站 CDN 等）不在凭证白名单内，这里只做网络层校验，不注入任何平台 Key。
 */
export async function GET(req: NextRequest) {
    const user = await requireCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const rawUrl = req.nextUrl.searchParams.get("url");
    if (!rawUrl) return NextResponse.json({ error: "缺少 url 参数" }, { status: 400 });

    let target: URL;
    try {
        target = await assertAllowedProxyUrl(rawUrl);
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 403 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ASSET_TIMEOUT_MS);
    try {
        const response = await fetchSafely(target.toString(), { signal: controller.signal });
        if (!response.ok) {
            return NextResponse.json({ error: `素材下载失败（上游 ${response.status}）` }, { status: 502 });
        }
        const contentLength = Number(response.headers.get("content-length") || 0);
        if (contentLength > MAX_ASSET_BYTES) {
            return NextResponse.json({ error: "素材体积超过代理限制" }, { status: 413 });
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.byteLength > MAX_ASSET_BYTES) {
            return NextResponse.json({ error: "素材体积超过代理限制" }, { status: 413 });
        }
        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                "Content-Type": response.headers.get("content-type") || "application/octet-stream",
                "Content-Length": String(buffer.byteLength),
                "Cache-Control": "private, max-age=3600",
            },
        });
    } catch (error) {
        if (controller.signal.aborted) {
            return NextResponse.json({ error: `素材下载超时（超过 ${ASSET_TIMEOUT_MS / 1000} 秒）` }, { status: 504 });
        }
        return NextResponse.json({ error: `素材下载失败：${(error as Error).message}` }, { status: 502 });
    } finally {
        clearTimeout(timeout);
    }
}
