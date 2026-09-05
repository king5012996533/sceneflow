// media-store.server.ts —— 平台素材中转存储（服务端专用）
//
// 用途：GenVideo 等上游只接受公网 http/https 图片链接，而用户上传的参考图在浏览器本地
// （localForage）没有公网 URL。上传路由把图片落到本目录、返回 /api/media/{id} 公网链接；
// 读取路由公开无鉴权（上游服务器拉取不带 Cookie），id 为 32 位随机十六进制不可枚举。

import path from "node:path";

export const MEDIA_STORE_DIR = process.env.MEDIA_STORE_DIR || path.join(process.cwd(), ".media-store");
/** 落盘文件名格式：32 位十六进制 id + 白名单扩展名（同时用于读取路由的防穿越校验） */
export const MEDIA_FILE_ID_PATTERN = /^[a-f0-9]{32}\.(png|jpg|webp)$/;
export const MEDIA_MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 解码后 8MB 上限（参考图足够，防磁盘滥用）
export const MEDIA_FILE_TTL_MS = 48 * 60 * 60 * 1000; // 48 小时后惰性清理（上游任务最长 2h 内拉取，余量充足）

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
