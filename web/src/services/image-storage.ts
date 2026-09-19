"use client";

import { nanoid } from "nanoid";
import { readImageMeta } from "@/lib/image-utils";
import { createScopedLocalForageStore, scopedStorageKey } from "@/lib/user-data-scope";
import { fetchAssetBlob } from "./asset-proxy";

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

export async function uploadImage(input: string | Blob): Promise<UploadedImage> {
    const blob = typeof input === "string" ? await fetchAssetBlob(input, undefined, "image") : input;
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

/**
 * 参考图超过这个体积就先压一道再编码。
 * 为什么要有这个闸：参考图动辄是几 MB 的原图/成品图，base64 之后体积再涨 1/3，
 * 两张就把上游请求体顶到十几 MB —— 各通道的请求体上限（以及出网通道的传输时间）都吃不住。
 */
const REFERENCE_COMPRESS_THRESHOLD_BYTES = 900_000;

/**
 * 画布里的图有没有真正的透明像素。
 * 用途：压图时决定编码格式 —— JPEG 没有 alpha 通道，透明底会被压成黑底（抠图素材/设计稿很常见）。
 * 抽样扫 alpha 通道而不是逐像素全扫：这里只要判「有没有透明」，1280² 抽 2 万点足够。
 */
function imageHasAlpha(ctx: OffscreenCanvasRenderingContext2D, width: number, height: number) {
    try {
        const data = ctx.getImageData(0, 0, width, height).data;
        const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 20_000)));
        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                if (data[(y * width + x) * 4 + 3] < 250) return true;
            }
        }
    } catch {
        // getImageData 拿不到（画布被污染等）就按不透明处理，退回 jpeg
    }
    return false;
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
    // 有透明像素的压 webp（体积与 jpeg 同级、保留 alpha），其余照旧压 jpeg
    const result = await canvas.convertToBlob({ type: imageHasAlpha(ctx, width, height) ? "image/webp" : "image/jpeg", quality });
    return result;
}

export async function imageToDataUrl(image: { url?: string; dataUrl?: string; storageKey?: string }) {
    const url = image.dataUrl || (await resolveImageUrl(image.storageKey, image.url || ""));
    if (!url) return url;
    // 2026-09-19：data: 以前在这里直接原样返回，于是「最常走的那条路」完全没过闸——
    // 参考图本来就常是别的模型刚出的成品、或用户直接粘进来的图（data URL，动辄 2-8MB），
    // 两张一起发就把 Replicate 通道的请求体顶爆（线上实测：413「Replicate 输入过大」，任务直接失败）。
    // 现在不论来路（data: / blob: / storageKey）一律按体积判，超阈值就用同一套压缩参数压一道。
    const blob = await (await fetch(url)).blob();
    const compressible = blob.size > REFERENCE_COMPRESS_THRESHOLD_BYTES && /^image\/(jpeg|jpg|png|webp|bmp|gif|avif)$/i.test(blob.type);
    // 压缩失败一律退回原图：参考图格式古怪（矢量、损坏）时，宁可发原图，也不能让一次生成直接失败
    const compressed = compressible ? await compressImageBlob(blob).catch(() => blob) : blob;
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
