// media-store.server.ts —— 平台素材中转存储（服务端专用）
//
// 用途：GenVideo 等上游只接受公网 http/https 图片链接，而用户上传的参考图在浏览器本地
// （localForage）没有公网 URL。上传路由把图片落到本目录、返回 /api/media/{id} 公网链接；
// 读取路由公开无鉴权（上游服务器拉取不带 Cookie），id 为 32 位随机十六进制不可枚举。

import os from "node:os";
import path from "node:path";

/**
 * 解析中转素材目录（纯函数，便于单测锁定「不许落在构建产物里」这条约束）。
 *
 * 这个目录必须在 `next build` 的清理范围之外：Next 默认开启 cleanDistDir，构建时会把整个
 * `.next` 递归删掉（只保留 cache/dev/lock/trace）。生产 PM2 进程的 cwd 恰好就是
 * `.next/standalone`，所以早先用 `process.cwd()/.media-store` 时，每次部署都会把已上传的
 * 参考图删光——上游随后拉取这些链接拿到 404，线上表现为
 * 「素材地址无法访问，请更换地址后重试。（GenVideo 视频生成失败）」。
 *
 * 默认落到用户主目录下的持久目录；MEDIA_STORE_DIR 可覆盖（相对路径按主目录展开，
 * 避免配一个相对路径又把文件写回构建产物）。
 */
export function resolveMediaStoreDir(configured?: string | null, home: string = os.homedir()) {
    const raw = (configured || "").trim();
    if (!raw) return path.join(home, ".sceneflow", "media-store");
    return path.isAbsolute(raw) ? path.normalize(raw) : path.join(home, raw);
}

export const MEDIA_STORE_DIR = resolveMediaStoreDir(process.env.MEDIA_STORE_DIR);
/** 落盘文件名格式：32 位十六进制 id + 白名单扩展名（同时用于读取路由的防穿越校验） */
export const MEDIA_FILE_ID_PATTERN = /^[a-f0-9]{32}\.(png|jpg|webp)$/;
export const MEDIA_MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 解码后 8MB 上限（参考图足够，防磁盘滥用）
/** 中转素材保留天数：上游任务最长 2h 内拉取，但用户可能隔天在同一个画布里重试，故留 7 天余量 */
export const MEDIA_FILE_TTL_DAYS = 7;
export const MEDIA_FILE_TTL_MS = MEDIA_FILE_TTL_DAYS * 24 * 60 * 60 * 1000;

export const MEDIA_MIME_EXT: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
};

export const MEDIA_CONTENT_TYPES: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    webp: "image/webp",
};
