import { NextRequest, NextResponse } from "next/server";

import { assertAllowedProxyUrl, fetchSafely } from "@/lib/url-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 提示词库封面图代理：上游封面热链到 raw.githubusercontent.com / pbs.twimg.com 等
// 国内直连不稳定，统一走本域代理，浏览器只需访问 xingtudesign.com。
const PROXY_TIMEOUT_MS = 8_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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
        const response = await fetchSafely(target.toString(), { signal: AbortSignal.timeout(PROXY_TIMEOUT_MS) });
        if (!response.ok) return NextResponse.json({ error: `上游返回 ${response.status}` }, { status: 502 });

        const contentType = response.headers.get("content-type") || "application/octet-stream";
        if (!contentType.startsWith("image/")) {
            return NextResponse.json({ error: "上游返回的不是图片" }, { status: 502 });
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > MAX_IMAGE_BYTES) return NextResponse.json({ error: "图片过大" }, { status: 502 });

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Cache-Control": "public, max-age=3600",
                "Content-Length": String(buffer.length),
            },
        });
    } catch {
        return NextResponse.json({ error: "图片拉取失败" }, { status: 502 });
    }
}
