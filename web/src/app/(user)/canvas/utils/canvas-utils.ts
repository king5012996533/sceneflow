// canvas-utils.ts — 纯工具函数和类型定义，从 canvas-client-page.tsx 提取

import { getDataUrlByteSize } from "@/lib/image-utils";
import { buildNodeGenerationConfig } from "@/lib/generation/generation-config";
import {
    CanvasNodeType,
    type CanvasAssistantSession,
    type CanvasConnection,
    type CanvasNodeData,
    type CanvasNodeMetadata,
    type CanvasShotPackShot,
    type ConnectionHandle,
    type Position,
} from "../types";
import { NODE_DEFAULT_SIZE, getNodeSpec } from "../constants";
import { nodeSizeFromRatio, fitNodeSize } from "./canvas-node-size";
import { canvasGenerationErrorToast } from "./canvas-generation-error";
import type { CanvasBackgroundMode } from "@/lib/canvas-theme";
import type { CanvasImageAngleParams } from "../components/canvas-node-angle-dialog";
import type { CanvasNodeGenerationMode } from "../components/canvas-node-prompt-panel";
export type { CanvasNodeGenerationMode };
import type { Asset } from "@/stores/use-asset-store";
import type { AiConfig } from "@/stores/use-config-store";
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
    assetCategoryFromNode, nodeAssetTags, nodeAssetMetadata, imageMetadata, videoMetadata, audioMetadata, buildImageGenerationMetadata, buildAudioGenerationMetadata,
    VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT, CONNECTION_HANDLE_HIT_RADIUS, CONNECTION_NODE_HIT_PADDING,
    NODE_STATUS_IDLE, NODE_STATUS_LOADING, NODE_STATUS_SUCCESS, NODE_STATUS_ERROR,
    DIRECTOR_DESK_URL, AUTO_ARCHIVE_CATEGORIES, IMAGE_PROMPT_REVERSE_PRESET,
    referenceUrl, generationReferenceUrls, resolveMetadataReferences, hydrateCanvasImages, hydrateAssistantImages, extractVideoFrame,
};

export function archiveCanvasNode(
    node: CanvasNodeData,
    projectId: string,
    addAsset: (asset: Omit<Asset, "id" | "createdAt" | "updatedAt">) => string | null,
) {
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

// ========== 数字/配置辅助函数 ==========

export function getGenerationCount(count: string) {
    return Math.max(1, Math.min(15, Math.floor(Math.abs(Number(count)) || 1)));
}

export function applyNodeConfigPatch(node: CanvasNodeData, patch: Partial<CanvasNodeData["metadata"]>) {
    const safePatch = patch || {};
    const next = { ...node, metadata: { ...node.metadata, ...safePatch } };
    const spec = node.type === CanvasNodeType.Video ? NODE_DEFAULT_SIZE[CanvasNodeType.Video] : NODE_DEFAULT_SIZE[CanvasNodeType.Image];
    const size = typeof safePatch.size === "string" && !node.metadata?.content ? nodeSizeFromRatio(safePatch.size, spec.width, spec.height) : null;
    return size && (node.type === CanvasNodeType.Image || node.type === CanvasNodeType.Video) ? { ...next, ...size, position: { x: node.position.x + node.width / 2 - size.width / 2, y: node.position.y + node.height / 2 - size.height / 2 } } : next;
}

export function buildGenerationConfig(config: AiConfig, node: CanvasNodeData | undefined, mode: "image" | "video" | "audio" | "text") {
    return buildNodeGenerationConfig(config, node, mode);
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

// ========== Shot Pack / 分镜函数 ==========

export function buildShotPackPrompt(shots: CanvasShotPackShot[]) {
    const lines = shots.map((shot, index) => {
        const parts = [`${String(index + 1).padStart(2, "0")} ${shot.title || "未命名镜头"}`];
        if (shot.description) parts.push(shot.description);
        if (shot.camera) parts.push(`镜头: ${shot.camera}`);
        if (shot.duration) parts.push(`时长: ${shot.duration}s`);
        return parts.join(" / ");
    });
    return [`参考图是一组连续分镜，请按从左到右、从上到下的顺序理解镜头变化，保持角色、服装、场景一致。`, ...lines].join("\n");
}

// ========== 提示词构建函数 ==========

export function buildContinuationPrompt(previousPrompt?: string) {
    const base = previousPrompt?.trim();
    return [
        "这是连续叙事镜头，请以上一段视频尾帧作为下一段视频第一帧状态。",
        "必须保持：角色身份、脸部特征、服装、发型、道具、场景、光线、构图方向、镜头轴线一致。",
        "只推进下一段 15 秒的动作、表情、镜头运动和情绪变化；不要重置场景，不要换脸，不要换衣服，不要突然切换画风。",
        "输出给视频模型的提示词请包含：起始状态、动作推进、镜头运动、结束状态、连续性禁忌。",
        base ? `上一段镜头参考：${base}` : "",
    ]
        .filter(Boolean)
        .join("\n");
}

export function buildAngleLabel(params: CanvasImageAngleParams) {
    const horizontal = params.horizontalAngle === 0 ? "正面视角" : params.horizontalAngle > 0 ? `向右旋转 ${params.horizontalAngle} 度` : `向左旋转 ${Math.abs(params.horizontalAngle)} 度`;
    const pitch = params.pitchAngle === 0 ? "水平视角" : params.pitchAngle > 0 ? `俯视 ${params.pitchAngle} 度` : `仰视 ${Math.abs(params.pitchAngle)} 度`;
    return `AI 多角度：${horizontal}，${pitch}，镜头距离 ${params.cameraDistance.toFixed(1)}，${params.wideAngle ? "广角" : "标准"}镜头`;
}

export function buildAnglePrompt(params: CanvasImageAngleParams) {
    return `基于参考图重新生成同一主体的新视角，保持主体、颜色、材质和画面风格一致，不要只做透视变形。${buildAngleLabel(params)}。`;
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

// ========== 文件扩展名函数 ==========

export function imageExtension(dataUrl: string) {
    return dataUrl.match(/^data:image[/]([^;]+)/)?.[1] || dataUrl.match(/image[/]([^;]+)/)?.[1] || "png";
}

export function audioExtension(mimeType?: string) {
    if (mimeType?.includes("wav")) return "wav";
    if (mimeType?.includes("opus")) return "opus";
    if (mimeType?.includes("aac")) return "aac";
    if (mimeType?.includes("flac")) return "flac";
    if (mimeType?.includes("pcm")) return "pcm";
    return "mp3";
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
