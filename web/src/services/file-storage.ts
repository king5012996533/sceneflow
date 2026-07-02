"use client";

import localforage from "localforage";
import { nanoid } from "nanoid";

import { fetchClientEntitlements } from "@/lib/client-entitlements";

export type UploadedFile = { url: string; storageKey: string; bytes: number; mimeType: string; width?: number; height?: number; durationMs?: number };

const store = localforage.createInstance({ name: "infinite-canvas", storeName: "media_files" });
const objectUrls = new Map<string, string>();
const STORAGE_KEY = "sceneflow:storage_usage";

function getStorageUsage(): number {
    try {
        return Number(localStorage.getItem(STORAGE_KEY)) || 0;
    } catch {
        return 0;
    }
}

function addStorageUsage(bytes: number) {
    try {
        localStorage.setItem(STORAGE_KEY, String(Math.max(0, getStorageUsage() + bytes)));
    } catch {}
}

function removeStorageUsage(bytes: number) {
    try {
        localStorage.setItem(STORAGE_KEY, String(Math.max(0, getStorageUsage() - bytes)));
    } catch {}
}

async function checkStorageAllowed(additionalBytes: number): Promise<boolean> {
    const entitlements = await fetchClientEntitlements();
    const limitBytes = entitlements.storageGb !== null ? entitlements.storageGb * 1024 * 1024 * 1024 : null;
    if (limitBytes === null) return true;
    return getStorageUsage() + additionalBytes <= limitBytes;
}

export async function uploadMediaFile(input: string | Blob, prefix = "file"): Promise<UploadedFile> {
    const blob = typeof input === "string" ? await (await fetch(input)).blob() : input;
    if (!(await checkStorageAllowed(blob.size))) {
        throw new Error("存储空间不足，请清理旧素材或升级套餐。");
    }
    const storageKey = `${prefix}:${nanoid()}`;
    await store.setItem(storageKey, blob);
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
    const blob = await store.getItem<Blob>(storageKey);
    if (!blob) return fallback;
    const url = URL.createObjectURL(blob);
    objectUrls.set(storageKey, url);
    return url;
}

export async function getMediaBlob(storageKey: string) {
    return store.getItem<Blob>(storageKey);
}

export async function setMediaBlob(storageKey: string, blob: Blob) {
    if (!(await checkStorageAllowed(blob.size))) {
        throw new Error("存储空间不足，请清理旧素材或升级套餐。");
    }
    const previous = await store.getItem<Blob>(storageKey);
    await store.setItem(storageKey, blob);
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
            const blob = await store.getItem<Blob>(key);
            await store.removeItem(key);
            if (blob) removeStorageUsage(blob.size);
        }),
    );
}

export async function cleanupUnusedMedia(usedData: unknown) {
    const usedKeys = collectMediaStorageKeys(usedData);
    const unused: string[] = [];
    await store.iterate((_value, key) => {
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
