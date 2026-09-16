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

const ASSET_KINDS = new Set(["image", "video", "audio"]);
// 上游 CDN 不一定给对 MIME：字节系 dola/zjcdn 的成品 mp4 返回 binary/octet-stream，
// 只按 content-type 判档会把 43MB 的视频按图片档（25MB）拒掉（线上 413）。
// 所以档位按「调用方声明的 kind → 上游 content-type → URL 线索」任一命中媒体即按媒体档。
const MEDIA_URL_HINT = /[?&]mime_type=(?:video|audio)_|\.(?:mp4|m4v|mov|webm|mkv|mp3|m4a|wav|aac|flac|ogg|opus)(?:[?#]|$)/i;

function isMediaAsset(kind: string | null, contentType: string, rawUrl: string) {
    if (kind === "video" || kind === "audio") return true;
    if (kind === "image") return false;
    return /^(video|audio)\//i.test(contentType) || MEDIA_URL_HINT.test(rawUrl);
}

const MEDIA_TYPE_HINTS: Array<[RegExp, string]> = [
    [/(?:[?&]mime_type=video_mp4|\.mp4)(?:[?#]|$)/i, "video/mp4"],
    [/\.m4v(?:[?#]|$)/i, "video/x-m4v"],
    [/\.mov(?:[?#]|$)/i, "video/quicktime"],
    [/\.webm(?:[?#]|$)/i, "video/webm"],
    [/\.mkv(?:[?#]|$)/i, "video/x-matroska"],
    [/(?:[?&]mime_type=audio_mp3|\.mp3)(?:[?#]|$)/i, "audio/mpeg"],
    [/\.m4a(?:[?#]|$)/i, "audio/mp4"],
    [/\.wav(?:[?#]|$)/i, "audio/wav"],
    [/\.aac(?:[?#]|$)/i, "audio/aac"],
    [/\.flac(?:[?#]|$)/i, "audio/flac"],
    [/(?:\.ogg|\.opus)(?:[?#]|$)/i, "audio/ogg"],
];

/**
 * 上游用通用二进制类型时补一个准确的媒体类型：<video>/<audio> 靠嗅探照样能播，
 * 但 blob.type 会作为文件 MIME 存下来——时长/尺寸元数据与下载扩展名都依赖它（octet-stream 会被当普通文件）。
 */
function mediaContentType(kind: string | null, contentType: string, rawUrl: string) {
    if (/^(video|audio)\//i.test(contentType)) return contentType;
    for (const [pattern, type] of MEDIA_TYPE_HINTS) if (pattern.test(rawUrl)) return type;
    if (kind === "video") return "video/mp4";
    if (kind === "audio") return "audio/mpeg";
    return contentType;
}

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

    const kindParam = req.nextUrl.searchParams.get("kind");
    const kind = kindParam && ASSET_KINDS.has(kindParam) ? kindParam : null;

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
        const response = await fetchSafely(target.toString(), { signal: controller.signal, ...(range ? { headers: { Range: range } } : {}) });
        if (!response.ok) {
            return NextResponse.json({ error: `素材下载失败（上游 ${response.status}）` }, { status: 502 });
        }
        const upstreamType = response.headers.get("content-type") || "application/octet-stream";
        const contentType = mediaContentType(kind, upstreamType, rawUrl);
        const contentRange = response.headers.get("content-range");
        const contentLength = Number(response.headers.get("content-length") || 0);
        // 206 的 content-length 只是这一段，体积档位要看 Content-Range 里的总长度
        const totalBytes = contentRange ? Number(contentRange.split("/")[1] || 0) : contentLength;
        const limit = isMediaAsset(kind, upstreamType, rawUrl) ? MAX_MEDIA_ASSET_BYTES : MAX_ASSET_BYTES;
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
