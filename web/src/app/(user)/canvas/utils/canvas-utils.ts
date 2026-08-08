// canvas-utils.ts — 纯工具函数和类型定义，从 canvas-client-page.tsx 提取

import { getDataUrlByteSize } from "@/lib/image-utils";
import { CanvasNodeType, type CanvasAssistantSession, type CanvasConnection, type CanvasNodeData, type CanvasNodeMetadata, type ConnectionHandle, type Position } from "../types";
import { getNodeSpec } from "../constants";
import { canvasGenerationErrorToast } from "./canvas-generation-error";
import type { CanvasBackgroundMode } from "@/lib/canvas-theme";
import type { CanvasNodeGenerationMode } from "../components/canvas-node-prompt-panel";
export type { CanvasNodeGenerationMode };
import type { Asset } from "@/stores/use-asset-store";
import { assetCategoryFromNode, nodeAssetTags, nodeAssetMetadata, imageMetadata, videoMetadata, audioMetadata, buildImageGenerationMetadata, buildAudioGenerationMetadata } from "./canvas-node-metadata";
import { referenceUrl, generationReferenceUrls, resolveMetadataReferences, hydrateCanvasImages, hydrateAssistantImages, extractVideoFrame } from "./canvas-media-utils";
import {
    VIDEO_NODE_MAX_WIDTH,
    VIDEO_NODE_MAX_HEIGHT,
    CONNECTION_HANDLE_HIT_RADIUS,
    CONNECTION_NODE_HIT_PADDING,
    NODE_STATUS_IDLE,
    NODE_STATUS_LOADING,
    NODE_STATUS_SUCCESS,
    NODE_STATUS_ERROR,
    DIRECTOR_DESK_URL,
    AUTO_ARCHIVE_CATEGORIES,
    IMAGE_PROMPT_REVERSE_PRESET,
} from "./canvas-constants";
import { resolveGenerationCount, applyNodeConfigPatch, buildGenerationConfig, buildShotPackPrompt, buildContinuationPrompt, buildAngleLabel, buildAnglePrompt, imageExtension, audioExtension } from "./canvas-prompt-utils";

// ========== 类型定义 ==========

export type CanvasClipboard = {
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
};

export type DirectorPanoramaPayload = {
    edgeId: string;
    sourceNodeId: string;
    imageUrl: string;
    fileName: string;
};

export type PendingConnectionCreate = {
    connection: ConnectionHandle;
    position: Position;
};

export type ConnectionDropTarget = {
    nodeId: string | null;
    isNearNode: boolean;
};

export type CanvasHistoryEntry = Pick<CanvasClipboard, "nodes" | "connections"> & {
    chatSessions: CanvasAssistantSession[];
    activeChatId: string | null;
    backgroundMode: CanvasBackgroundMode;
    showImageInfo: boolean;
};

export type CanvasGenerationRequest = {
    targetNodeId: string;
    originNodeId: string;
    runningNodeId: string;
    controller: AbortController;
};

// ========== 画布函数 ==========

export function resolveDirectorDeskUrl(value: string) {
    if (typeof window === "undefined") return null;

    try {
        return new URL(value, window.location.origin);
    } catch {
        return null;
    }
}

export {
    assetCategoryFromNode,
    nodeAssetTags,
    nodeAssetMetadata,
    imageMetadata,
    videoMetadata,
    audioMetadata,
    buildImageGenerationMetadata,
    buildAudioGenerationMetadata,
    VIDEO_NODE_MAX_WIDTH,
    VIDEO_NODE_MAX_HEIGHT,
    CONNECTION_HANDLE_HIT_RADIUS,
    CONNECTION_NODE_HIT_PADDING,
    NODE_STATUS_IDLE,
    NODE_STATUS_LOADING,
    NODE_STATUS_SUCCESS,
    NODE_STATUS_ERROR,
    DIRECTOR_DESK_URL,
    AUTO_ARCHIVE_CATEGORIES,
    IMAGE_PROMPT_REVERSE_PRESET,
    referenceUrl,
    generationReferenceUrls,
    resolveMetadataReferences,
    hydrateCanvasImages,
    hydrateAssistantImages,
    extractVideoFrame,
    resolveGenerationCount,
    applyNodeConfigPatch,
    buildGenerationConfig,
    buildShotPackPrompt,
    buildContinuationPrompt,
    buildAngleLabel,
    buildAnglePrompt,
    imageExtension,
    audioExtension,
};

export function archiveCanvasNode(node: CanvasNodeData, projectId: string, addAsset: (asset: Omit<Asset, "id" | "createdAt" | "updatedAt">) => string | null) {
    const tags = nodeAssetTags(node);
    const metadata = nodeAssetMetadata(node, projectId);
    if (node.type === CanvasNodeType.Text) {
        const content = node.metadata?.content?.trim();
        if (!content) return null;
        return addAsset({ kind: "text", title: node.title || node.metadata?.prompt?.slice(0, 24) || "画布文本", coverUrl: "", tags, source: "Canvas", data: { content }, metadata });
    }
    if (node.type === CanvasNodeType.Video) {
        if (!node.metadata?.content) return null;
        return addAsset({
            kind: "video",
            title: node.title || node.metadata?.prompt?.slice(0, 24) || "画布视频",
            coverUrl: "",
            tags,
            source: "Canvas",
            data: { url: node.metadata.content, storageKey: node.metadata.storageKey, width: node.width, height: node.height, bytes: node.metadata.bytes || 0, mimeType: node.metadata.mimeType || "video/mp4" },
            metadata,
        });
    }
    if (node.type !== CanvasNodeType.Image || !node.metadata?.content) return null;
    const dataUrl = node.metadata.storageKey ? "" : node.metadata.content;
    return addAsset({
        kind: "image",
        title: node.title || node.metadata?.prompt?.slice(0, 24) || "画布图片",
        coverUrl: node.metadata.content,
        tags,
        source: "Canvas",
        data: {
            dataUrl,
            storageKey: node.metadata.storageKey,
            width: node.metadata.naturalWidth || node.width,
            height: node.metadata.naturalHeight || node.height,
            bytes: node.metadata.bytes || getDataUrlByteSize(dataUrl),
            mimeType: node.metadata.mimeType || "image/png",
        },
        metadata,
    });
}

export function createCanvasNode(type: CanvasNodeType, position: Position, metadata?: CanvasNodeMetadata): CanvasNodeData {
    const spec = getNodeSpec(type);
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    return {
        id,
        type,
        title: spec.title,
        position: {
            x: position.x - spec.width / 2,
            y: position.y - spec.height / 2,
        },
        width: spec.width,
        height: spec.height,
        metadata: { ...spec.metadata, ...metadata },
    };
}

// ========== 连线函数 ==========

export function getConnectionTargetAnchor(node: CanvasNodeData, current: ConnectionHandle) {
    return {
        x: current.handleType === "source" ? node.position.x : node.position.x + node.width,
        y: node.position.y + node.height / 2,
    };
}

export function normalizeConnection(firstNodeId: string, secondNodeId: string, nodes: CanvasNodeData[], firstHandleType: "source" | "target") {
    const first = nodes.find((node) => node.id === firstNodeId);
    const second = nodes.find((node) => node.id === secondNodeId);
    if (!first || !second || first.id === second.id) return null;
    if (first.type === CanvasNodeType.Config && second.type === CanvasNodeType.Config) return null;
    if (second.type === CanvasNodeType.Config) return { fromNodeId: first.id, toNodeId: second.id };
    if (first.type === CanvasNodeType.Config && firstHandleType === "target") return { fromNodeId: second.id, toNodeId: first.id };
    if (first.type === CanvasNodeType.Config) return { fromNodeId: first.id, toNodeId: second.id };
    return { fromNodeId: first.id, toNodeId: second.id };
}

export function getInputSummary(inputs: Array<{ type: string }>) {
    return {
        textCount: inputs.filter((input) => input.type === "text").length,
        imageCount: inputs.filter((input) => input.type === "image").length,
        videoCount: inputs.filter((input) => input.type === "video").length,
        audioCount: inputs.filter((input) => input.type === "audio").length,
    };
}

// ========== 节点/生成函数 ==========

export function resetInterruptedGeneration(nodes: CanvasNodeData[]) {
    return nodes.map((node) => (node.metadata?.status === "loading" ? { ...node, metadata: { ...node.metadata, status: "error" as const, errorDetails: "页面刷新后生成已中断，请重新生成。" } } : node));
}

export function isGenerationCanceled(error: unknown) {
    return error instanceof Error && (error.message === "请求已取消" || error.name === "AbortError");
}

export function findRetrySourceNode(nodeId: string, nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const queue = connections.filter((connection) => connection.toNodeId === nodeId).map((connection) => connection.fromNodeId);
    const visited = new Set<string>();
    while (queue.length) {
        const id = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        const node = nodes.find((item) => item.id === id);
        if (node?.type === CanvasNodeType.Config) return node;
        connections.filter((connection) => connection.toNodeId === id).forEach((connection) => queue.push(connection.fromNodeId));
    }
    return null;
}

export function sourceNodeReferenceImages(node: CanvasNodeData | null) {
    if (!node || node.type !== CanvasNodeType.Image || !node.metadata?.content) return [];
    return [
        {
            id: node.id,
            name: `${node.title || node.id}.png`,
            type: node.metadata.mimeType || "image/png",
            dataUrl: node.metadata.content,
            storageKey: node.metadata.storageKey,
        },
    ];
}

export function generationModeFromNodeType(type: CanvasNodeType): "image" | "video" | "audio" | "text" {
    if (type === CanvasNodeType.Image) return "image";
    if (type === CanvasNodeType.Video) return "video";
    if (type === CanvasNodeType.Audio) return "audio";
    return "text";
}

export function isAudioFile(file: File) {
    return file.type.startsWith("audio/") || /\.(mp3|wav)$/i.test(file.name);
}

export function isHiddenBatchChild(node: CanvasNodeData, nodes: CanvasNodeData[], collapsingBatchIds?: Set<string>) {
    const rootId = node.metadata?.batchRootId;
    if (!rootId) return false;
    const root = nodes.find((item) => item.id === rootId);
    if (root && collapsingBatchIds?.has(rootId)) return false;
    return Boolean(root && !root.metadata?.imageBatchExpanded);
}

export function isHiddenBatchConnectionEndpoint(node: CanvasNodeData, nodes: CanvasNodeData[]) {
    const rootId = node.metadata?.batchRootId;
    if (!rootId) return false;
    const root = nodes.find((item) => item.id === rootId);
    return Boolean(root && !root.metadata?.imageBatchExpanded);
}

// ========== 流水线函数 ==========

export async function runCanvasPipeline(
    requestedNodeIds: string[],
    resume: boolean,
    nodesRef: { current: CanvasNodeData[] },
    connectionsRef: { current: CanvasConnection[] },
    setNodes: (value: CanvasNodeData[] | ((previous: CanvasNodeData[]) => CanvasNodeData[])) => void,
    generateNodeRef: { current: ((nodeId: string, mode: CanvasNodeGenerationMode, prompt: string) => Promise<void>) | null },
    message: { loading: (options: { key: string; content: string; duration: number }) => unknown; success: (options: { key: string; content: string }) => unknown; error: (options: { key: string; content: string }) => unknown },
) {
    const runId = `pipeline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const orderedIds = orderPipelineNodes(requestedNodeIds, nodesRef.current, connectionsRef.current);
    const key = `pipeline-run-${runId}`;
    message.loading({ key, content: `正在执行创作流水线（0/${orderedIds.length}）`, duration: 0 });

    const patchNode = (nodeId: string, patch: CanvasNodeMetadata) => {
        const apply = (items: CanvasNodeData[]) => items.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, ...patch } } : node));
        nodesRef.current = apply(nodesRef.current);
        setNodes(apply);
    };

    for (let index = 0; index < orderedIds.length; index += 1) {
        const nodeId = orderedIds[index];
        const node = nodesRef.current.find((item) => item.id === nodeId);
        if (!node) continue;
        if (resume && node.metadata?.pipelineRunStatus === "completed") {
            continue;
        }

        const mode = node.metadata?.generationMode || generationModeFromNodeType(node.type);
        const prompt = node.metadata?.composerContent || node.metadata?.prompt || "";
        patchNode(nodeId, { pipelineRunId: runId, pipelineRunStatus: "running", errorDetails: undefined });
        message.loading({ key, content: `正在执行：${node.metadata?.pipelineLabel || node.title}（${index + 1}/${orderedIds.length}）`, duration: 0 });

        try {
            if (!generateNodeRef.current) throw new Error("生成执行器尚未就绪");
            await generateNodeRef.current(nodeId, mode, prompt);
            await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
            const completed = nodesRef.current.find((item) => item.id === nodeId);
            if (completed?.metadata?.status === "error") throw new Error(completed.metadata.errorDetails || "节点生成失败");
            patchNode(nodeId, { pipelineRunId: runId, pipelineRunStatus: "completed", pipelineCompletedAt: new Date().toISOString() });
        } catch (error) {
            const text = error instanceof Error ? error.message : "流水线执行失败";
            patchNode(nodeId, { pipelineRunId: runId, pipelineRunStatus: "failed", errorDetails: text });
            message.error({ key, content: `${node.metadata?.pipelineLabel || node.title}失败，流水线已停在当前节点：${canvasGenerationErrorToast(text)}` });
            return;
        }
    }

    message.success({ key, content: "创作流水线执行完成，生成资产已自动回流素材库" });
}

export function orderPipelineNodes(requestedNodeIds: string[], nodes: CanvasNodeData[], connections: CanvasConnection[]) {
    const requested = new Set(requestedNodeIds.filter((id) => nodes.some((node) => node.id === id)));
    const indegree = new Map(Array.from(requested, (id) => [id, 0]));
    const outgoing = new Map<string, string[]>();
    connections.forEach((connection) => {
        if (!requested.has(connection.fromNodeId) || !requested.has(connection.toNodeId)) return;
        indegree.set(connection.toNodeId, (indegree.get(connection.toNodeId) || 0) + 1);
        outgoing.set(connection.fromNodeId, [...(outgoing.get(connection.fromNodeId) || []), connection.toNodeId]);
    });
    const queue = requestedNodeIds.filter((id) => requested.has(id) && indegree.get(id) === 0);
    const result: string[] = [];
    while (queue.length) {
        const id = queue.shift()!;
        if (result.includes(id)) continue;
        result.push(id);
        (outgoing.get(id) || []).forEach((nextId) => {
            indegree.set(nextId, (indegree.get(nextId) || 0) - 1);
            if (indegree.get(nextId) === 0) queue.push(nextId);
        });
    }
    requestedNodeIds.forEach((id) => {
        if (requested.has(id) && !result.includes(id)) result.push(id);
    });
    return result;
}
