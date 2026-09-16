import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { assertAllowedProxyUrl, fetchSafely } from "@/lib/url-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ASSET_TIMEOUT_MS = 120_000;
const MAX_ASSET_BYTES = 25 * 1024 * 1024;
// 音视频成品普遍比图片大：上限与主代理的 blob 透传一致（200MB）。
// 但超过缓冲阈值就改为流式透传——几十上百 MB 整段 Buffer 进内存会顶到 PM2 的 900M 重启线，
// 进程一重启 nginx 对所有在途请求裸断 502（主代理早已因此改成流式）。
const MAX_MEDIA_ASSET_BYTES = 200 * 1024 * 1024;
const MEDIA_BUFFER_BYTES = 25 * 1024 * 1024;

/**
 * 素材（图片/视频）下载代理：浏览器不再直连公网素材 URL，改由服务端下载后同源返回。
 *
 * 规避四类问题：
 * 1. CDN 无 CORS 头 → 浏览器 fetch/axios 被拦（Failed to fetch / Network Error）
 * 2. 用户在墙内网络无法直连境外 CDN（如 oaiusercontent.com / blob.core.windows.net）
 * 3. CSP 对非 https 素材源的拦截（connect-src 'self' https: wss:）
 * 4. CDN 按 Referer 防盗链（字节系 v3-dy-o.zjcdn.com 等）→ 浏览器带我们站点的 Referer 一律 403，
 *    服务端不带 Referer 请求同一地址返回 200（线上事故 2026-09-16）
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
        const contentType = response.headers.get("content-type") || "application/octet-stream";
        const limit = /^(video|audio)\//i.test(contentType) ? MAX_MEDIA_ASSET_BYTES : MAX_ASSET_BYTES;
        const contentLength = Number(response.headers.get("content-length") || 0);
        if (contentLength > limit) {
            return NextResponse.json({ error: `素材体积超过代理限制（${Math.round(limit / 1024 / 1024)}MB）` }, { status: 413 });
        }
        if (contentLength > 0 && contentLength <= MEDIA_BUFFER_BYTES) {
            const buffer = Buffer.from(await response.arrayBuffer());
            if (buffer.byteLength > limit) {
                return NextResponse.json({ error: `素材体积超过代理限制（${Math.round(limit / 1024 / 1024)}MB）` }, { status: 413 });
            }
            return new NextResponse(new Uint8Array(buffer), {
                status: 200,
                headers: {
                    "Content-Type": contentType,
                    "Content-Length": String(buffer.byteLength),
                    "Cache-Control": "private, max-age=3600",
                },
            });
        }
        if (!response.body) {
            return NextResponse.json({ error: "素材下载失败（上游没有返回内容）" }, { status: 502 });
        }
        // 大文件/未知长度的流式透传：边传边计数，超限立即中断（此时响应头已发出，客户端表现为下载中断）
        let received = 0;
        const counted = response.body.pipeThrough(
            new TransformStream<Uint8Array, Uint8Array>({
                transform(chunk, streamController) {
                    received += chunk.byteLength;
                    if (received > limit) {
                        streamController.error(new Error("素材体积超过代理限制"));
                        return;
                    }
                    streamController.enqueue(chunk);
                },
            }),
        );
        return new NextResponse(counted, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                ...(contentLength > 0 ? { "Content-Length": String(contentLength) } : {}),
                "Cache-Control": "private, max-age=3600",
                "X-Accel-Buffering": "no",
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
