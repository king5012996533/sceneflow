"use client";

import { nanoid } from "nanoid";

import { dataUrlToBlob } from "@/lib/image-utils";
import { createScopedLocalForageStore, scopedStorageKey } from "@/lib/user-data-scope";

export type UploadedFile = { url: string; storageKey: string; bytes: number; mimeType: string; width?: number; height?: number; durationMs?: number };

const objectUrls = new Map<string, string>();
const getStore = () => createScopedLocalForageStore("media_files");
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
    } catch {}
}

function removeStorageUsage(bytes: number) {
    try {
        localStorage.setItem(scopedStorageKey(STORAGE_KEY), String(Math.max(0, getStorageUsage() - bytes)));
    } catch {}
}

export async function uploadMediaFile(input: string | Blob, prefix = "file"): Promise<UploadedFile> {
    // dataURL 纯解码（atob），避免 CSP connect-src 无 data: 拦截 fetch(dataUrl)；
    // 视频/音频公网 URL 下载加 15s 超时，失败快速抛错而非一直挂起
    let blob: Blob;
    if (typeof input === "string") {
        if (/^data:/i.test(input)) {
            blob = dataUrlToBlob(input);
        } else {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15_000);
            try {
                blob = await (await fetch(input, { signal: controller.signal })).blob();
            } catch (error) {
                throw new Error(`素材下载失败：${(error as Error).message}`);
            } finally {
                clearTimeout(timeout);
            }
        }
    } else {
        blob = input;
    }
    const storageKey = `${prefix}:${nanoid()}`;
    await getStore().setItem(storageKey, blob);
    addStorageUsage(blob.size);
    const url = URL.createObjectURL(blob);
    objectUrls.set(storageKey, url);
    const meta = blob.type.startsWith("video/") ? await readVideoMeta(url) : blob.type.startsWith("audio/") ? await readAudioMeta(url) : {};
    return { url, storageKey, bytes: blob.size, mimeType: blob.type || "application/octet-stream", ...meta };
}

export async function resolveMediaUrl(storageKey?: string, fallback = "") {
    if (!storageKey) return fallback;
    const cached = objectUrls.get(storageKey);
    if (cached) return cached;
    const blob = await getStore().getItem<Blob>(storageKey);
    if (!blob) return fallback;
    const url = URL.createObjectURL(blob);
    objectUrls.set(storageKey, url);
    return url;
}

export async function getMediaBlob(storageKey: string) {
    return getStore().getItem<Blob>(storageKey);
}

export async function setMediaBlob(storageKey: string, blob: Blob) {
    const previous = await getStore().getItem<Blob>(storageKey);
    await getStore().setItem(storageKey, blob);
    if (previous) removeStorageUsage(previous.size);
    addStorageUsage(blob.size);
    const url = URL.createObjectURL(blob);
    objectUrls.set(storageKey, url);
    return url;
}

export async function deleteStoredMedia(keys: Iterable<string>) {
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

export async function cleanupUnusedMedia(usedData: unknown) {
    const usedKeys = collectMediaStorageKeys(usedData);
    const unused: string[] = [];
    await getStore().iterate((_value, key) => {
        if (!usedKeys.has(key)) unused.push(key);
    });
    await deleteStoredMedia(unused);
}

export function collectMediaStorageKeys(value: unknown, keys = new Set<string>()) {
    if (!value || typeof value !== "object") return keys;
    if ("storageKey" in value && typeof value.storageKey === "string" && value.storageKey.includes(":")) keys.add(value.storageKey);
    Object.values(value).forEach((item) => (Array.isArray(item) ? item.forEach((child) => collectMediaStorageKeys(child, keys)) : collectMediaStorageKeys(item, keys)));
    return keys;
}

function readVideoMeta(url: string) {
    return new Promise<{ width: number; height: number; durationMs?: number }>((resolve) => {
        const video = document.createElement("video");
        const done = () => resolve({ width: video.videoWidth || 1280, height: video.videoHeight || 720, durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : undefined });
        video.onloadedmetadata = done;
        video.onerror = done;
        video.src = url;
    });
}

function readAudioMeta(url: string) {
    return new Promise<{ durationMs?: number }>((resolve) => {
        const audio = document.createElement("audio");
        const done = () => resolve({ durationMs: Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : undefined });
        audio.onloadedmetadata = done;
        audio.onerror = done;
        audio.src = url;
    });
}
