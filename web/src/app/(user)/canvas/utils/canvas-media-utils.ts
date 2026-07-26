// canvas-media-utils.ts — 参考图/媒体处理函数

import type { ReferenceImage } from "@/types/image";
import { resolveImageUrl, uploadImage } from "@/services/image-storage";
import { resolveMediaUrl } from "@/services/file-storage";
import { CanvasNodeType } from "../types";
import type { CanvasAssistantSession, CanvasNodeData, CanvasNodeMetadata } from "../types";
import { imageMetadata } from "./canvas-node-metadata";

// ========== 参考图/媒体函数 ==========

export function referenceUrl(image: ReferenceImage) {
    return image.storageKey || image.url || (!image.dataUrl.startsWith("data:") ? image.dataUrl : undefined);
}

export function generationReferenceUrls(context: {
    referenceImages: ReferenceImage[];
    referenceVideos: Array<{ storageKey?: string; url?: string }>;
    referenceAudios?: Array<{ storageKey?: string; url?: string }>;
}) {
    return [
        ...context.referenceImages.map(referenceUrl).filter((url): url is string => Boolean(url)),
        ...context.referenceVideos.map((video) => video.storageKey || video.url).filter((url): url is string => Boolean(url)),
        ...(context.referenceAudios || []).map((audio) => audio.storageKey || audio.url).filter((url): url is string => Boolean(url)),
    ];
}

export async function resolveMetadataReferences(metadata: CanvasNodeMetadata) {
    if (metadata.generationType !== "edit") return [];
    if (!metadata.references?.length) return null;
    const references = await Promise.all(
        metadata.references.map(async (url, index) => {
            const dataUrl = url.startsWith("image:") ? await resolveImageUrl(url, "") : url;
            return dataUrl ? { id: `${index}`, name: `reference-${index}.png`, type: "image/png", dataUrl, storageKey: url.startsWith("image:") ? url : undefined } : null;
        }),
    );
    return references.every(Boolean) ? (references as ReferenceImage[]) : null;
}

export async function hydrateCanvasImages(nodes: CanvasNodeData[]) {
    return Promise.all(
        nodes.map(async (node) => {
            const content = node.metadata?.content;
            if ((node.type === CanvasNodeType.Video || node.type === CanvasNodeType.Audio) && node.metadata?.storageKey) return { ...node, metadata: { ...node.metadata, content: await resolveMediaUrl(node.metadata.storageKey, content) } };
            if (node.type !== CanvasNodeType.Image || !content) return node;
            if (node.metadata?.storageKey) return { ...node, metadata: { ...node.metadata, content: await resolveImageUrl(node.metadata.storageKey, content) } };
            if (!content.startsWith("data:image/")) return node;
            return { ...node, metadata: { ...node.metadata, ...imageMetadata(await uploadImage(content)) } };
        }),
    );
}

export async function hydrateAssistantImages(sessions: CanvasAssistantSession[]) {
    const hydrateItem = async <T extends { dataUrl?: string; storageKey?: string }>(item: T) => {
        if (item.storageKey) return { ...item, dataUrl: await resolveImageUrl(item.storageKey, item.dataUrl) };
        if (item.dataUrl?.startsWith("data:image/")) {
            const image = await uploadImage(item.dataUrl);
            return { ...item, dataUrl: image.url, storageKey: image.storageKey };
        }
        return item;
    };
    return Promise.all(
        sessions.map(async (session) => ({
            ...session,
            messages: await Promise.all(
                session.messages.map(async (message) => ({
                    ...message,
                    references: await Promise.all((message.references || []).map(hydrateItem)),
                })),
            ),
        })),
    );
}

// ========== 视频抽帧 ==========

export function extractVideoFrame(src: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        let settled = false;
        let timeout: number | undefined;

        const cleanup = () => {
            if (timeout) window.clearTimeout(timeout);
            video.onerror = null;
            video.onloadedmetadata = null;
            video.onseeked = null;
            video.pause();
            video.removeAttribute("src");
            video.load();
        };

        const fail = (message: string) => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(new Error(message));
        };

        timeout = window.setTimeout(() => fail("视频尾帧提取超时，请确认视频可正常预览"), 15000);

        video.crossOrigin = "anonymous";
        video.muted = true;
        video.preload = "auto";
        video.playsInline = true;
        video.onerror = () => {
            window.clearTimeout(timeout);
            fail("视频读取失败，无法提取尾帧");
        };
        video.onloadedmetadata = () => {
            const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
            video.currentTime = Math.max(0, duration - 0.08);
        };
        video.onseeked = () => {
            const width = video.videoWidth || 1280;
            const height = video.videoHeight || 720;
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext("2d");
            if (!context) {
                window.clearTimeout(timeout);
                fail("浏览器不支持视频抽帧");
                return;
            }
            context.drawImage(video, 0, 0, width, height);
            canvas.toBlob((blob) => {
                window.clearTimeout(timeout);
                if (!blob) {
                    fail("视频尾帧导出失败，可能是视频跨域限制");
                    return;
                }
                if (settled) return;
                settled = true;
                cleanup();
                resolve(blob);
            }, "image/png");
        };
        video.src = src;
        video.load();
    });
}
