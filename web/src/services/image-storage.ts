"use client";

import { nanoid } from "nanoid";
import { dataUrlToBlob, readImageMeta } from "@/lib/image-utils";
import { createScopedLocalForageStore, scopedStorageKey } from "@/lib/user-data-scope";

export type UploadedImage = {
    url: string;
    storageKey: string;
    width: number;
    height: number;
    bytes: number;
    mimeType: string;
};

const objectUrls = new Map<string, string>();
const getStore = () => createScopedLocalForageStore("image_files");

// 存储用量追踪（客户端估算）
const STORAGE_KEY = "sceneflow:storage_usage";
function getStorageUsage(): number {
    try {
        return Number(localStorage.getItem(scopedStorageKey(STORAGE_KEY))) || 0;
    } catch {
        return 0;
    }
}
function addStorageUsage(bytes: number) {
    try {
        localStorage.setItem(scopedStorageKey(STORAGE_KEY), String(Math.max(0, getStorageUsage() + bytes)));
    } catch {
        /* localStorage 不可用时静默 */
    }
}
function removeStorageUsage(bytes: number) {
    try {
        localStorage.setItem(scopedStorageKey(STORAGE_KEY), String(Math.max(0, getStorageUsage() - bytes)));
    } catch {
        /* 同上 */
    }
}
export function resetStorageUsage() {
    try {
        localStorage.removeItem(scopedStorageKey(STORAGE_KEY));
    } catch {
        /* 同上 */
    }
}

const ASSET_PROXY_PATH = "/canvas/api/proxy/asset";

// 获取素材 Blob：dataURL 纯解码（atob，不 fetch，避免 CSP connect-src 无 data: 拦截）；
// http(s) URL 走服务端下载代理，规避 CDN 无 CORS 头 / 墙内直连境外 CDN 导致的 Failed to fetch
async function fetchAssetBlob(input: string): Promise<Blob> {
    if (/^data:/i.test(input)) return dataUrlToBlob(input);
    const response = await fetch(`${ASSET_PROXY_PATH}?url=${encodeURIComponent(input)}`, { credentials: "include" });
    if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(typeof payload?.error === "string" ? payload.error : "素材下载失败");
    }
    return response.blob();
}

export async function uploadImage(input: string | Blob): Promise<UploadedImage> {
    const blob = typeof input === "string" ? await fetchAssetBlob(input) : input;
    const storageKey = `image:${nanoid()}`;
    await getStore().setItem(storageKey, blob);
    addStorageUsage(blob.size);
    const url = URL.createObjectURL(blob);
    objectUrls.set(storageKey, url);
    const meta = await readImageMeta(url);
    return { url, storageKey, width: meta.width, height: meta.height, bytes: blob.size, mimeType: blob.type || meta.mimeType };
}

export async function resolveImageUrl(storageKey?: string, fallback = "") {
    if (!storageKey) return fallback;
    const cached = objectUrls.get(storageKey);
    if (cached) return cached;
    const blob = await getStore().getItem<Blob>(storageKey);
    if (!blob) return fallback;
    const url = URL.createObjectURL(blob);
    objectUrls.set(storageKey, url);
    return url;
}

export async function getImageBlob(storageKey: string) {
    return getStore().getItem<Blob>(storageKey);
}

export async function setImageBlob(storageKey: string, blob: Blob) {
    const previous = await getStore().getItem<Blob>(storageKey);
    await getStore().setItem(storageKey, blob);
    if (previous) removeStorageUsage(previous.size);
    addStorageUsage(blob.size);
    const url = URL.createObjectURL(blob);
    objectUrls.set(storageKey, url);
    return url;
}

async function compressImageBlob(blob: Blob, maxSide = 1280, quality = 0.85): Promise<Blob> {
    const bitmap = await createImageBitmap(blob);
    let { width, height } = bitmap;
    if (width > maxSide || height > maxSide) {
        const ratio = Math.min(maxSide / width, maxSide / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
    }
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const result = await canvas.convertToBlob({ type: "image/jpeg", quality });
    return result;
}

export async function imageToDataUrl(image: { url?: string; dataUrl?: string; storageKey?: string }) {
    const url = image.dataUrl || (await resolveImageUrl(image.storageKey, image.url || ""));
    if (!url || url.startsWith("data:")) return url;
    const blob = await (await fetch(url)).blob();
    const compressed = blob.size > 900_000 ? await compressImageBlob(blob) : blob;
    return blobToDataUrl(compressed);
}

export async function deleteStoredImages(keys: Iterable<string>) {
    await Promise.all(
        Array.from(new Set(keys)).map(async (key) => {
            const url = objectUrls.get(key);
            if (url) URL.revokeObjectURL(url);
            objectUrls.delete(key);
            const blob = await getStore().getItem<Blob>(key);
            await getStore().removeItem(key);
            if (blob) removeStorageUsage(blob.size);
        }),
    );
}

export async function cleanupUnusedImages(usedData: unknown) {
    const usedKeys = collectImageStorageKeys(usedData);
    const unused: string[] = [];
    await getStore().iterate((_value, key) => {
        if (!usedKeys.has(key)) unused.push(key);
    });
    await deleteStoredImages(unused);
}

export function collectImageStorageKeys(value: unknown, keys = new Set<string>()) {
    if (!value || typeof value !== "object") return keys;
    if ("storageKey" in value && typeof value.storageKey === "string" && value.storageKey.startsWith("image:")) keys.add(value.storageKey);
    Object.values(value).forEach((item) => (Array.isArray(item) ? item.forEach((child) => collectImageStorageKeys(child, keys)) : collectImageStorageKeys(item, keys)));
    return keys;
}

function blobToDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("读取图片失败"));
        reader.readAsDataURL(blob);
    });
}
