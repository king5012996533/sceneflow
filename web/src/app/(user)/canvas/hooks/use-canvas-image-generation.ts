"use client";

import { useCallback } from "react";
import { nanoid } from "nanoid";
import { requestGeneratedImages } from "@/lib/generation/generation-request";
import { QuotaExceededError } from "@/lib/generation/generation-guard";
import { uploadImage } from "@/services/image-storage";
import type { AiConfig } from "@/stores/use-config-store";
import { canvasGenerationErrorToast, formatCanvasGenerationErrorDetails } from "../utils/canvas-generation-error";
import { NODE_DEFAULT_SIZE, getNodeSpec } from "../constants";
import { CanvasNodeType } from "../types";
import type { CanvasNodeData, CanvasConnection, CanvasNodeMetadata } from "../types";
import type { NodeGenerationContext } from "../components/canvas-node-generation";
import { NODE_STATUS_IDLE, NODE_STATUS_SUCCESS, NODE_STATUS_LOADING, NODE_STATUS_ERROR, buildImageGenerationMetadata, createCanvasNode, imageMetadata, resolveGenerationCount } from "../utils/canvas-utils";
import { fitNodeSize } from "../utils/canvas-node-size";

type UseCanvasImageGenerationOptions = {
    nodesRef: React.MutableRefObject<CanvasNodeData[]>;
    connectionsRef: React.MutableRefObject<CanvasConnection[]>;
    effectiveConfig: AiConfig;
    reserveCanvasGenerationQuota: (count?: number) => Promise<void>;
    startGenerationRequest: (targetNodeId: string, originNodeId: string, runningId?: string, controller?: AbortController) => Promise<AbortController>;
    finishGenerationRequest: (targetNodeId: string, controller: AbortController) => void;
    isGenerationCanceled: (error: unknown) => boolean;
    setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>;
    setConnections: React.Dispatch<React.SetStateAction<CanvasConnection[]>>;
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
    setDialogNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    message: { info: (msg: string) => void; success: (msg: string) => void; error: (msg: string) => void; warning: (msg: string) => void };
    quotaModalRef: React.MutableRefObject<{ open: (remaining: number, limit: number | null) => void } | null>;
};

type GenerateImageParams = {
    nodeId: string;
    sourceNode: CanvasNodeData | undefined;
    generationConfig: AiConfig;
    generationContext: NodeGenerationContext;
    effectivePrompt: string;
    runController: AbortController;
};

export function useCanvasImageGeneration(options: UseCanvasImageGenerationOptions) {
    const {
        nodesRef,
        connectionsRef,
        effectiveConfig,
        reserveCanvasGenerationQuota,
        startGenerationRequest,
        finishGenerationRequest,
        isGenerationCanceled,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setDialogNodeId,
        message,
        quotaModalRef,
    } = options;

    const generateImage = useCallback(
        async ({ nodeId, sourceNode, generationConfig, generationContext, effectivePrompt, runController }: GenerateImageParams) => {
            const count = resolveGenerationCount(generationConfig.count);
            try {
                await reserveCanvasGenerationQuota(count);
            } catch (error) {
                if (error instanceof QuotaExceededError) quotaModalRef.current?.open(0, null);
                else if (error instanceof Error) message.warning(error.message);
                return;
            }

            const isConfigNode = sourceNode?.type === CanvasNodeType.Config;
            const isImageNode = sourceNode?.type === CanvasNodeType.Image;
            const isEmptyImageNode = isImageNode && !sourceNode?.metadata?.content;
            const sourceReference =
                isImageNode && sourceNode?.metadata?.content
                    ? [{ id: sourceNode.id, name: `${sourceNode.title || sourceNode.id}.png`, type: sourceNode.metadata.mimeType || "image/png", dataUrl: sourceNode.metadata.content, storageKey: sourceNode.metadata.storageKey }]
                    : [];
            const referenceImages = sourceReference.length ? sourceReference : generationContext.referenceImages;
            const generationType = referenceImages.length ? ("edit" as const) : ("generation" as const);
            const generationMetadata = buildImageGenerationMetadata(generationType, generationConfig, count, referenceImages);
            const parentConfig = NODE_DEFAULT_SIZE[isConfigNode ? CanvasNodeType.Config : isImageNode ? CanvasNodeType.Image : CanvasNodeType.Text];
            const imageConfig = NODE_DEFAULT_SIZE[CanvasNodeType.Image];
            const parentPosition = sourceNode?.position || { x: 0, y: 0 };
            const gap = 96;
            const rowGap = 36;
            const rootId = isEmptyImageNode ? nodeId : nanoid();
            const childIds = count > 1 ? Array.from({ length: count }, () => nanoid()) : [];
            const targetIds = count > 1 ? childIds : [rootId];
            const rootNode: CanvasNodeData = {
                id: rootId,
                type: CanvasNodeType.Image,
                title: effectivePrompt.slice(0, 32) || "Generated Image",
                position: {
                    x: isEmptyImageNode ? parentPosition.x : parentPosition.x + parentConfig.width + gap,
                    y: parentPosition.y + parentConfig.height / 2 - imageConfig.height / 2,
                },
                width: isEmptyImageNode ? sourceNode?.width || imageConfig.width : imageConfig.width,
                height: isEmptyImageNode ? sourceNode?.height || imageConfig.height : imageConfig.height,
                metadata: {
                    prompt: effectivePrompt,
                    status: NODE_STATUS_LOADING,
                    isBatchRoot: count > 1,
                    batchChildIds: count > 1 ? childIds : undefined,
                    batchUsesReferenceImages: referenceImages.length > 0,
                    ...generationMetadata,
                    imageBatchExpanded: count > 1 ? true : undefined,
                },
            };
            const childNodes: CanvasNodeData[] = childIds.map((id, index) => ({
                id,
                type: CanvasNodeType.Image,
                title: effectivePrompt.slice(0, 32) || "Generated Image",
                position: {
                    x: rootNode.position.x + rootNode.width + 120 + (index % 2) * (imageConfig.width + 36),
                    y: rootNode.position.y + Math.floor(index / 2) * (imageConfig.height + rowGap),
                },
                width: imageConfig.width,
                height: imageConfig.height,
                metadata: { prompt: effectivePrompt, status: NODE_STATUS_LOADING, batchRootId: count > 1 ? rootId : undefined, ...generationMetadata },
            }));
            const batchConnections = [...(isEmptyImageNode ? [] : [{ id: nanoid(), fromNodeId: nodeId, toNodeId: rootId }]), ...childIds.map((childId) => ({ id: nanoid(), fromNodeId: rootId, toNodeId: childId }))];

            setNodes((prev) => [
                ...prev.map((node) =>
                    node.id === nodeId
                        ? isConfigNode
                            ? { ...node, metadata: { ...node.metadata, prompt: effectivePrompt, status: NODE_STATUS_LOADING, errorDetails: undefined } }
                            : isEmptyImageNode
                              ? { ...node, position: rootNode.position, width: rootNode.width, height: rootNode.height, title: rootNode.title, metadata: { ...node.metadata, ...rootNode.metadata, errorDetails: undefined } }
                              : isImageNode
                                ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_SUCCESS, errorDetails: undefined } }
                                : {
                                      ...node,
                                      type: CanvasNodeType.Text,
                                      title: effectivePrompt.slice(0, 32) || "Prompt",
                                      width: parentConfig.width,
                                      height: parentConfig.height,
                                      metadata: { ...node.metadata, content: effectivePrompt, prompt: effectivePrompt, status: NODE_STATUS_SUCCESS, fontSize: 14, errorDetails: undefined },
                                  }
                        : node,
                ),
                ...(isEmptyImageNode ? [] : [rootNode]),
                ...childNodes,
            ]);
            setConnections((prev) => [...prev, ...batchConnections]);
            setSelectedNodeIds(new Set([nodeId]));
            setSelectedConnectionId(null);
            setDialogNodeId(nodeId);

            const controller = runController;
            await Promise.all(targetIds.map((targetId) => startGenerationRequest(targetId, nodeId, nodeId, controller)));
            let hasSuccess = false;
            let hasFailure = false;
            await Promise.all(
                targetIds.map(async (targetId) => {
                    try {
                        const image = referenceImages.length
                            ? await requestGeneratedImages({ config: { ...generationConfig, count: "1" }, prompt: effectivePrompt, references: referenceImages, options: { signal: controller.signal } }).then((items) => items[0])
                            : await requestGeneratedImages({ config: { ...generationConfig, count: "1" }, prompt: effectivePrompt, options: { signal: controller.signal } }).then((items) => items[0]);
                        const uploaded = await uploadImage(image.dataUrl);
                        const imageSize = fitNodeSize(uploaded.width, uploaded.height, imageConfig.width, imageConfig.height);
                        setNodes((prev) => {
                            const root = prev.find((node) => node.id === rootId);
                            return prev.map((node) => {
                                if (node.id !== targetId && node.id !== rootId) return node;
                                const center = { x: node.position.x + node.width / 2, y: node.position.y + node.height / 2 };
                                if (node.id === rootId && (targetId === rootId || !root?.metadata?.primaryImageId))
                                    return {
                                        ...node,
                                        position: { x: center.x - imageSize.width / 2, y: center.y - imageSize.height / 2 },
                                        width: imageSize.width,
                                        height: imageSize.height,
                                        metadata: { ...node.metadata, ...imageMetadata(uploaded), primaryImageId: targetId },
                                    };
                                if (node.id === targetId)
                                    return {
                                        ...node,
                                        position: { x: center.x - imageSize.width / 2, y: center.y - imageSize.height / 2 },
                                        width: imageSize.width,
                                        height: imageSize.height,
                                        metadata: { ...node.metadata, ...imageMetadata(uploaded) },
                                    };
                                return node;
                            });
                        });
                        hasSuccess = true;
                        if (isConfigNode) setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_SUCCESS, errorDetails: undefined } } : node)));
                        return true;
                    } catch (error) {
                        if (isGenerationCanceled(error)) return false;
                        const errorDetails = formatCanvasGenerationErrorDetails(error);
                        hasFailure = true;
                        setNodes((prev) => prev.map((node) => (node.id === targetId ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_ERROR, errorDetails } } : node)));
                    } finally {
                        finishGenerationRequest(targetId, controller);
                    }
                    return false;
                }),
            );
            if (controller.signal.aborted) {
                setNodes((prev) => prev.map((node) => (node.id === nodeId && isConfigNode && node.metadata?.status === NODE_STATUS_LOADING ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_IDLE, errorDetails: undefined } } : node)));
                return;
            }
            if (hasFailure) message.error(hasSuccess ? "部分图片生成失败" : "全部图片生成失败");
            setNodes((prev) =>
                prev.map((node) =>
                    node.id === nodeId && isConfigNode
                        ? { ...node, metadata: { ...node.metadata, status: hasSuccess ? NODE_STATUS_SUCCESS : NODE_STATUS_ERROR, errorDetails: hasSuccess ? undefined : "全部图片生成失败" } }
                        : node.id === nodeId && isEmptyImageNode
                          ? { ...node, metadata: { ...node.metadata, status: hasSuccess ? NODE_STATUS_SUCCESS : NODE_STATUS_ERROR, errorDetails: hasSuccess ? undefined : "全部图片生成失败" } }
                          : node.id === rootId && !hasSuccess
                            ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_ERROR, errorDetails: "全部图片生成失败" } }
                            : node,
                ),
            );
        },
        [finishGenerationRequest, isGenerationCanceled, message, quotaModalRef, reserveCanvasGenerationQuota, setConnections, setDialogNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds, startGenerationRequest],
    );

    const generateImageFromTextNode = useCallback(
        (node: CanvasNodeData) => {
            const prompt = (node.metadata?.content || node.metadata?.prompt || "").trim();
            if (!prompt) {
                message.warning("文本节点为空，无法生图");
                return;
            }
            const sourceNode = nodesRef.current.find((item) => item.id === node.id);
            if (!sourceNode) return;
            const nodeSize = getNodeSpec(CanvasNodeType.Config);
            const configNode = createCanvasNode(
                CanvasNodeType.Config,
                {
                    x: sourceNode.position.x + sourceNode.width + 96 + nodeSize.width / 2,
                    y: sourceNode.position.y + sourceNode.height / 2,
                },
                {
                    prompt: "",
                    model: effectiveConfig.imageModel || effectiveConfig.model,
                    size: effectiveConfig.size,
                    count: resolveGenerationCount(effectiveConfig.canvasImageCount || effectiveConfig.count),
                },
            );
            const connection = { id: nanoid(), fromNodeId: sourceNode.id, toNodeId: configNode.id };
            const nextNodes = nodesRef.current.map((item) => (item.id === sourceNode.id ? { ...item, metadata: { ...item.metadata, content: prompt, prompt, status: NODE_STATUS_SUCCESS } } : item)).concat(configNode);
            const nextConnections = [...connectionsRef.current, connection];
            nodesRef.current = nextNodes;
            connectionsRef.current = nextConnections;
            setNodes(nextNodes);
            setConnections(nextConnections);
            setSelectedNodeIds(new Set([configNode.id]));
            setSelectedConnectionId(null);
            setDialogNodeId(configNode.id);
        },
        [
            connectionsRef,
            effectiveConfig.canvasImageCount,
            effectiveConfig.count,
            effectiveConfig.imageModel,
            effectiveConfig.model,
            effectiveConfig.size,
            message,
            nodesRef,
            setConnections,
            setDialogNodeId,
            setNodes,
            setSelectedConnectionId,
            setSelectedNodeIds,
        ],
    );

    return { generateImage, generateImageFromTextNode };
}
