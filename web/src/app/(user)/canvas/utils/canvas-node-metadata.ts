// canvas-node-metadata.ts — 节点元数据构建函数

import type { UploadedImage } from "@/services/image-storage";
import type { UploadedFile } from "@/services/file-storage";
import type { ReferenceImage } from "@/types/image";
import type { CanvasImageGenerationType, CanvasNodeData, CanvasNodeMetadata } from "../types";
import { CanvasNodeType } from "../types";
import type { AssetCategory, AssetMetadata } from "@/stores/use-asset-store";
import type { AiConfig } from "@/stores/use-config-store";

// ========== 资产分类函数 ==========

export function assetCategoryFromNode(node: CanvasNodeData): AssetCategory {
    if (node.metadata?.assetCategory) return node.metadata.assetCategory;
    const kind = node.metadata?.pipelineKind;
    if (kind === "character" || kind === "character-image") return "character";
    if (kind === "turnaround" || kind === "character-sheet") return "character-turnaround";
    if (kind === "scene" || kind === "scene-image") return "scene";
    if (kind === "style") return "style";
    if (kind === "storyboard") return "storyboard";
    if (kind === "keyframe" || kind === "shot-image") return "keyframe";
    if (kind === "video" || kind === "shot-video") return "video-shot";
    if (kind === "asset-archive") return "template";
    if (node.type === CanvasNodeType.Text) return "prompt";
    if (node.type === CanvasNodeType.Image) return "reference";
    return "general";
}

export function nodeAssetTags(node: CanvasNodeData): string[] {
    const tags = new Set<string>();
    tags.add(assetCategoryFromNode(node));
    if (node.metadata?.pipelineLabel) tags.add(node.metadata.pipelineLabel);
    if (node.metadata?.pipelineKind) tags.add(node.metadata.pipelineKind);
    if (node.metadata?.assetSource) tags.add(node.metadata.assetSource);
    return Array.from(tags);
}

export function nodeAssetMetadata(node: CanvasNodeData, projectId?: string): AssetMetadata {
    return {
        source: "canvas",
        origin: node.metadata?.assetSource === "platform-rental" ? "platform-rental" : node.metadata?.assetSource === "user-asset" ? "user-upload" : "canvas-generated",
        license: node.metadata?.assetLicense || (node.metadata?.assetSource === "platform-rental" ? "rented" : "private"),
        category: assetCategoryFromNode(node),
        nodeId: node.id,
        projectId,
        pipelineKind: node.metadata?.pipelineKind,
        prompt: node.metadata?.prompt,
        reusablePrompt: node.metadata?.composerContent || node.metadata?.prompt || node.metadata?.content,
        consistencyNotes: node.metadata?.consistencyNotes || node.metadata?.pipelineDescription,
        commercialUse: node.metadata?.assetSource !== "platform-rental",
    };
}

// ========== 元数据构建函数 ==========

export function imageMetadata(image: UploadedImage): CanvasNodeMetadata {
    return { content: image.url, storageKey: image.storageKey, status: "success", naturalWidth: image.width, naturalHeight: image.height, bytes: image.bytes, mimeType: image.mimeType };
}

export function videoMetadata(video: UploadedFile): CanvasNodeMetadata {
    return { content: video.url, storageKey: video.storageKey, status: "success", naturalWidth: video.width, naturalHeight: video.height, bytes: video.bytes, mimeType: video.mimeType || "video/mp4", durationMs: video.durationMs };
}

export function audioMetadata(audio: UploadedFile): CanvasNodeMetadata {
    return { content: audio.url, storageKey: audio.storageKey, status: "success", bytes: audio.bytes, mimeType: audio.mimeType || "audio/mpeg", durationMs: audio.durationMs };
}

export function buildImageGenerationMetadata(type: CanvasImageGenerationType, config: AiConfig, count: number, references: ReferenceImage[]): CanvasNodeMetadata {
    return {
        generationType: type,
        model: config.model,
        size: config.size,
        quality: config.quality,
        count,
        references: references.map(referenceUrl).filter((url): url is string => Boolean(url)),
    };
}

export function buildAudioGenerationMetadata(config: AiConfig): CanvasNodeMetadata {
    return {
        model: config.model,
        audioVoice: config.audioVoice,
        audioFormat: config.audioFormat,
        audioSpeed: config.audioSpeed,
        audioInstructions: config.audioInstructions,
    };
}

function referenceUrl(image: ReferenceImage) {
    return image.storageKey || image.url || (!image.dataUrl.startsWith("data:") ? image.dataUrl : undefined);
}
