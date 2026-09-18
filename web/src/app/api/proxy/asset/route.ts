import { NextRequest, NextResponse } from "next/server";
import { assetLimitBytes, mediaContentType, normalizeAssetKind } from "@/lib/asset-tier";
import { requireCurrentUser } from "@/lib/current-user";
import { assertAllowedProxyUrl, fetchSafely } from "@/lib/url-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ASSET_TIMEOUT_MS = 120_000;
const MEDIA_BUFFER_BYTES = 25 * 1024 * 1024;

/**
 * 素材下载重试次数与退避。
 *
 * 中转站 CDN 常解析出多个 IP，其中个别 IP 在境内根本连不通（实测 getapib.org 三个 IP 里
 * 有一个连接必挂），而每次请求只钉第一个解析结果 → 同一张图时好时坏，表现为「上游已出图
 * 并计费，前端却拿不回来」。下载是幂等 GET，失败后换一次解析结果再试即可。
 * 4xx 是上游的明确答复（防盗链、过期），重试没有意义，直接返回。
 */
const ASSET_ATTEMPTS = 3;
const ASSET_RETRY_DELAY_MS = 300;

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
/**
 * 下载素材，失败则换一次解析结果重试（见 ASSET_ATTEMPTS 注释）。
 * 每次尝试都重新过 assertAllowedProxyUrl/fetchSafely，安全校验一次都不会被绕过。
 */
async function fetchAsset(url: string, signal: AbortSignal, range: string | null): Promise<Response> {
    let lastError: unknown = new Error("素材下载失败");
    for (let attempt = 1; attempt <= ASSET_ATTEMPTS; attempt++) {
        try {
            const response = await fetchSafely(url, { signal, ...(range ? { headers: { Range: range } } : {}) });
            if (response.status < 500 || attempt === ASSET_ATTEMPTS) return response;
            lastError = new Error(`上游 ${response.status}`);
        } catch (error) {
            lastError = error;
        }
        if (signal.aborted) break;
        // 没有日志时这类失败只能靠猜；留一行，便于日后核对是哪一段网络在抖
        console.error(`[asset] 第 ${attempt} 次下载失败，换解析结果重试：${lastError instanceof Error ? lastError.message : String(lastError)}`);
        await new Promise((resolve) => setTimeout(resolve, ASSET_RETRY_DELAY_MS * attempt));
    }
    throw lastError;
}

export async function GET(req: NextRequest) {
    const user = await requireCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const rawUrl = req.nextUrl.searchParams.get("url");
    if (!rawUrl) return NextResponse.json({ error: "缺少 url 参数" }, { status: 400 });

    const kind = normalizeAssetKind(req.nextUrl.searchParams.get("kind"));

    let target: URL;
    try {
        target = await assertAllowedProxyUrl(rawUrl);
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 403 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ASSET_TIMEOUT_MS);
    try {
        // 转发 Range：<video> 边播边拖进度时只取需要的分段，不必每次把整段几十 MB 拉完
        const range = req.headers.get("range");
        const response = await fetchAsset(target.toString(), controller.signal, range);
        if (!response.ok) {
            return NextResponse.json({ error: `素材下载失败（上游 ${response.status}）` }, { status: 502 });
        }
        const upstreamType = response.headers.get("content-type") || "application/octet-stream";
        const descriptor = { kind, contentType: upstreamType, url: rawUrl };
        const contentType = mediaContentType(descriptor);
        const contentRange = response.headers.get("content-range");
        const contentLength = Number(response.headers.get("content-length") || 0);
        // 206 的 content-length 只是这一段，体积档位要看 Content-Range 里的总长度
        const totalBytes = contentRange ? Number(contentRange.split("/")[1] || 0) : contentLength;
        const limit = assetLimitBytes(descriptor);
        if (totalBytes > limit) {
            return NextResponse.json({ error: `素材体积超过代理限制（${Math.round(limit / 1024 / 1024)}MB）` }, { status: 413 });
        }
        const passthroughHeaders: Record<string, string> = {
            "Content-Type": contentType,
            "Cache-Control": "private, max-age=3600",
        };
        if (contentRange) passthroughHeaders["Content-Range"] = contentRange;
        const acceptRanges = response.headers.get("accept-ranges");
        if (acceptRanges) passthroughHeaders["Accept-Ranges"] = acceptRanges;
        if (contentLength > 0) passthroughHeaders["Content-Length"] = String(contentLength);
        if (contentLength > 0 && contentLength <= MEDIA_BUFFER_BYTES) {
            const buffer = Buffer.from(await response.arrayBuffer());
            if (buffer.byteLength > limit) {
                return NextResponse.json({ error: `素材体积超过代理限制（${Math.round(limit / 1024 / 1024)}MB）` }, { status: 413 });
            }
            passthroughHeaders["Content-Length"] = String(buffer.byteLength);
            return new NextResponse(new Uint8Array(buffer), { status: response.status, headers: passthroughHeaders });
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
            status: response.status,
            headers: { ...passthroughHeaders, "X-Accel-Buffering": "no" },
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
