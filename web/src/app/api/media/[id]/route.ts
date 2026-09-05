import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

import { MEDIA_STORE_DIR, MEDIA_FILE_ID_PATTERN, MEDIA_CONTENT_TYPES } from "@/lib/media-store.server";

// 公开读取：上游视频服务（如 GenVideo）会在任务创建后自行拉取该 URL，不带任何 Cookie。
// 文件名是 32 位随机十六进制 + 白名单扩展名，已严格校验，无法枚举或路径穿越；
// 中转素材 48 小时后由上传路由惰性清理。
export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    if (!MEDIA_FILE_ID_PATTERN.test(id)) return NextResponse.json({ error: "素材不存在" }, { status: 404 });

    const ext = id.slice(id.lastIndexOf(".") + 1);
    try {
        const data = await fs.readFile(path.join(MEDIA_STORE_DIR, id));
        return new NextResponse(new Uint8Array(data), {
            status: 200,
            headers: {
                "Content-Type": MEDIA_CONTENT_TYPES[ext] || "application/octet-stream",
                "Content-Length": String(data.byteLength),
                "Cache-Control": "public, max-age=86400",
            },
        });
    } catch {
        return NextResponse.json({ error: "素材不存在或已过期（中转素材 48 小时后自动清理）" }, { status: 404 });
    }
}
