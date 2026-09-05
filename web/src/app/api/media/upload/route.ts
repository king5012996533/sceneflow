import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getCurrentUser } from "@/lib/current-user";
import { isSameOriginRequest } from "@/lib/auth";
import { MEDIA_STORE_DIR, MEDIA_FILE_ID_PATTERN, MEDIA_MAX_IMAGE_BYTES, MEDIA_FILE_TTL_MS, MEDIA_MIME_EXT } from "@/lib/media-store.server";

// 平台素材中转上传：把用户本地的参考图（浏览器 localForage，无公网 URL）落到服务器磁盘，
// 换取一个公网可访问的 URL，供「只接受 http/https 图片链接」的上游（如 GenVideo）拉取。
// 上传需登录 + 同源校验；读取公开（见 ../[id]/route.ts）。

let lastSweepAt = 0;

function sweepExpiredFiles() {
    // 每分钟最多扫一次；文件量小，失败不影响上传
    const now = Date.now();
    if (now - lastSweepAt < 60_000) return;
    lastSweepAt = now;
    fs.readdir(MEDIA_STORE_DIR)
        .then((names) => {
            for (const name of names) {
                if (!MEDIA_FILE_ID_PATTERN.test(name)) continue;
                fs.stat(path.join(MEDIA_STORE_DIR, name))
                    .then((stat) => {
                        if (now - stat.mtimeMs > MEDIA_FILE_TTL_MS) void fs.rm(path.join(MEDIA_STORE_DIR, name), { force: true });
                    })
                    .catch(() => {});
            }
        })
        .catch(() => {});
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    if (!isSameOriginRequest(req)) return NextResponse.json({ error: "请求来源不合法" }, { status: 403 });

    let body: { dataUrl?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
    }
    const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
    const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return NextResponse.json({ error: "仅支持 png / jpeg / webp 图片的 data URL" }, { status: 400 });
    const mime = match[1];
    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.byteLength) return NextResponse.json({ error: "图片内容为空" }, { status: 400 });
    if (bytes.byteLength > MEDIA_MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: `参考图 ${(bytes.byteLength / 1024 / 1024).toFixed(1)}MB 超过 8MB 中转上限，请压缩后重试` }, { status: 413 });
    }

    const filename = `${randomUUID().replace(/-/g, "")}.${MEDIA_MIME_EXT[mime]}`;
    try {
        await fs.mkdir(MEDIA_STORE_DIR, { recursive: true });
        await fs.writeFile(path.join(MEDIA_STORE_DIR, filename), bytes);
    } catch {
        return NextResponse.json({ error: "参考图保存失败，请稍后重试" }, { status: 500 });
    }
    sweepExpiredFiles();

    const proto = req.headers.get("x-forwarded-proto")?.split(",")[0] || "https";
    const host = req.headers.get("x-forwarded-host")?.split(",")[0] || req.headers.get("host") || "";
    return NextResponse.json({ id: filename, url: `${proto}://${host}/api/media/${filename}` });
}
