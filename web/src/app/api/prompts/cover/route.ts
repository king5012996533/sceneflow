import { NextRequest, NextResponse } from "next/server";

import { assertAllowedProxyUrl, fetchSafely } from "@/lib/url-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 提示词库封面图代理：上游封面热链到 raw.githubusercontent.com / pbs.twimg.com 等
// 国内直连不稳定，统一走本域代理，浏览器只需访问 xingtudesign.com。
//
// 超时门槛不能按「直连慢」来拍：同一张图实测 2.9 秒、9.0 秒、17.1 秒都出现过（CDN 边缘在漂），
// 压在 8 秒会让整片封面时好时坏 —— 2026-09-19 线上就是这么来的：同一页 40 张封面里 2 张 502，
// 正是那两张各花了 9 秒和 17 秒。放宽到 20 秒，并且失败必须留日志（此前 catch 是静默的，
// 出了事日志里查不到任何线索，只能靠访问日志里的 502 去猜）。
const PROXY_TIMEOUT_MS = 20_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** 失败留痕：封面是次要资源，但静默失败会让「图挂了」永远查不出原因（文案保持原样，用户可见） */
function upstreamFailed(target: string, reason: string, detail: Record<string, unknown>) {
    console.warn(`[prompts/cover] ${reason}｜${target}｜${JSON.stringify(detail)}`);
    return NextResponse.json({ error: reason }, { status: 502 });
}

export async function GET(request: NextRequest) {
    const rawUrl = request.nextUrl.searchParams.get("url") || "";
    if (!rawUrl) return NextResponse.json({ error: "缺少 url 参数" }, { status: 400 });

    let target: URL;
    try {
        target = await assertAllowedProxyUrl(rawUrl);
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "URL 校验失败" }, { status: 400 });
    }

    try {
        const started = Date.now();
        const response = await fetchSafely(target.toString(), { signal: AbortSignal.timeout(PROXY_TIMEOUT_MS) });
        if (!response.ok) return upstreamFailed(target.toString(), `上游返回 ${response.status}`, { ms: Date.now() - started });

        const contentType = response.headers.get("content-type") || "application/octet-stream";
        if (!contentType.startsWith("image/")) {
            return upstreamFailed(target.toString(), "上游返回的不是图片", { contentType, ms: Date.now() - started });
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > MAX_IMAGE_BYTES) {
            return upstreamFailed(target.toString(), "图片过大", { bytes: buffer.length, ms: Date.now() - started });
        }

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=3600",
                "Content-Length": String(buffer.length),
            },
        });
    } catch (error) {
        return upstreamFailed(target.toString(), "图片拉取失败", {
            error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
        });
    }
}
