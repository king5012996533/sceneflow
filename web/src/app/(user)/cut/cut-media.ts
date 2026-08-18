"use client";

import { getMediaBlob } from "@/services/file-storage";
import type { CutClip } from "./cut-store";

/** 元信息读取失败时的兜底时长 */
export const FALLBACK_DURATION_MS = 10000;

export function readVideoMetaFromUrl(url: string): Promise<{ width: number; height: number; durationMs?: number }> {
    return new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        const done = () => {
            resolve({
                width: video.videoWidth || 1280,
                height: video.videoHeight || 720,
                durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : undefined,
            });
        };
        video.onloadedmetadata = done;
        video.onerror = done;
        video.src = url;
    });
}

export async function getClipBlob(clip: Pick<CutClip, "storageKey" | "url" | "name">): Promise<Blob> {
    if (clip.storageKey) {
        const blob = await getMediaBlob(clip.storageKey);
        if (blob) return blob;
    }
    const response = await fetch(clip.url);
    if (!response.ok) throw new Error(`素材「${clip.name}」加载失败`);
    return response.blob();
}

export function formatMs(ms: number): string {
    const total = Math.max(0, Math.round(ms));
    const seconds = Math.floor(total / 1000);
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
