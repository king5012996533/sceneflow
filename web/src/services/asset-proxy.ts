"use client";

import { dataUrlToBlob } from "@/lib/image-utils";

/**
 * 素材代理：跨域素材（生成结果 / 参考素材）一律改由服务端取回，浏览器只访问同源地址。
 *
 * 2026-09-16 线上事故：字节系 CDN（v3-dy-o.zjcdn.com、v16-dola.dola.com）按 Referer 防盗链——
 * 浏览器带着我们站点的 Referer 直连返回 403（blob 下载不到、<video> 也放不出来），
 * 而服务端不带 Referer 请求同一个地址返回 200。图片此前已走这条代理，视频/音频还是浏览器直连。
 */
const ASSET_PROXY_PATH = "/canvas/api/proxy/asset";

/** 跨域素材 URL → 同源代理地址；同源 / blob: / data: 原样返回（本来就不需要绕服务端） */
export function assetProxyUrl(url: string): string {
    if (!url || url.startsWith("/") || url.startsWith("blob:") || url.startsWith("data:")) return url;
    if (typeof window !== "undefined" && url.startsWith(window.location.origin)) return url;
    return `${ASSET_PROXY_PATH}?url=${encodeURIComponent(url)}`;
}

// 获取素材 Blob：dataURL 纯解码（atob，不 fetch，避免 CSP connect-src 无 data: 拦截）；
// http(s) URL 走服务端下载代理，规避 CDN 防盗链 / 无 CORS 头 / 墙内直连境外 CDN 导致的 Failed to fetch
export async function fetchAssetBlob(input: string, signal?: AbortSignal): Promise<Blob> {
    if (/^data:/i.test(input)) return dataUrlToBlob(input);
    const response = await fetch(assetProxyUrl(input), { credentials: "include", signal });
    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(typeof payload?.error === "string" ? payload.error : "素材下载失败");
    }
    return response.blob();
}
