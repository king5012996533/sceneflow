"use client";

import { useCallback, useMemo } from "react";
import { nanoid } from "nanoid";
import { requestGeneratedImages } from "@/lib/generation/generation-request";
import { QuotaExceededError } from "@/lib/generation/generation-guard";
import { defaultConfig, type AiConfig } from "@/stores/use-config-store";
import { uploadImage } from "@/services/image-storage";
import { cropDataUrl, splitDataUrl } from "../utils/canvas-image-data";
import { fitNodeSize } from "../utils/canvas-node-size";
import { CanvasNodeType } from "../types";
import type { CanvasNodeData, CanvasConnection } from "../types";
import type { CanvasImageCropRect } from "../components/canvas-node-crop-dialog";
import type { CanvasImageSplitParams } from "../components/canvas-node-split-dialog";
import type { CanvasImageMaskEditPayload } from "../components/canvas-node-mask-edit-dialog";
import {
    NODE_STATUS_LOADING,
    NODE_STATUS_ERROR,
    imageMetadata,
    buildImageGenerationMetadata,
    isGenerationCanceled,
} from "../utils/canvas-utils";
import { canvasGenerationErrorToast } from "../utils/canvas-generation-error";

type UseCanvasImageEditDialogsOptions = {
    nodes: CanvasNodeData[];
    effectiveConfig: AiConfig;
    cropNodeId: string | null;
    setCropNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    maskEditNodeId: string | null;
    setMaskEditNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    splitNodeId: string | null;
    setSplitNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    upscaleNodeId: string | null;
    setUpscaleNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    angleNodeId: string | null;
    setAngleNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    superResolveNodeId: string | null;
    setSuperResolveNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    previewNodeId: string | null;
    setPreviewNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    infoNodeId: string | null;
    setInfoNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>;
    setConnections: React.Dispatch<React.SetStateAction<CanvasConnection[]>>;
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
    setDialogNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    setRunningNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    startGenerationRequest: (targetNodeId: string, originNodeId: string, runningId?: string, controller?: AbortController) => Promise<AbortController>;
    finishGenerationRequest: (targetNodeId: string, controller: AbortController) => void;
    reserveCanvasGenerationQuota: (count?: number) => Promise<void>;
    isAiConfigReady: (config: AiConfig, model: string) => boolean;
    openConfigDialog: (show: boolean) => void;
    buildGenCfg: (node: CanvasNodeData | undefined, mode: "image" | "video" | "audio" | "text") => AiConfig;
    message: { info: (msg: string) => void; success: (msg: string) => void; error: (msg: string) => void; warning: (msg: string) => void };
    quotaModalRef: React.MutableRefObject<{ open: (remaining: number, limit: number | null) => void } | null>;
};

export function useCanvasImageEditDialogs(options: UseCanvasImageEditDialogsOptions) {
    const {
        nodes,
        effectiveConfig,
        cropNodeId,
        setCropNodeId,
        maskEditNodeId,
        setMaskEditNodeId,
        splitNodeId,
        setSplitNodeId,
        upscaleNodeId,
        setUpscaleNodeId,
        angleNodeId,
        setAngleNodeId,
        superResolveNodeId,
        setSuperResolveNodeId,
        previewNodeId,
        setPreviewNodeId,
        infoNodeId,
        setInfoNodeId,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setDialogNodeId,
        setRunningNodeId,
        startGenerationRequest,
        finishGenerationRequest,
        reserveCanvasGenerationQuota,
        isAiConfigReady,
        openConfigDialog,
        buildGenCfg,
        message,
        quotaModalRef,
    } = options;

    // Derived nodes
    const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
    const cropNode = cropNodeId ? nodeById.get(cropNodeId) || null : null;
    const maskEditNode = maskEditNodeId ? nodeById.get(maskEditNodeId) || null : null;
    const splitNode = splitNodeId ? nodeById.get(splitNodeId) || null : null;
    const upscaleNode = upscaleNodeId ? nodeById.get(upscaleNodeId) || null : null;
    const angleNode = angleNodeId ? nodeById.get(angleNodeId) || null : null;
    const superResolveNode = superResolveNodeId ? nodeById.get(superResolveNodeId) || null : null;
    const previewNode = previewNodeId ? nodeById.get(previewNodeId) || null : null;
    const infoNode = infoNodeId ? nodeById.get(infoNodeId) || null : null;

    const clearDialogState = useCallback(() => {
        setCropNodeId(null);
        setMaskEditNodeId(null);
        setSplitNodeId(null);
        setUpscaleNodeId(null);
        setAngleNodeId(null);
        setSuperResolveNodeId(null);
        setPreviewNodeId(null);
        setInfoNodeId(null);
    }, []);

    const cropImageNode = useCallback(async (node: CanvasNodeData, crop: CanvasImageCropRect) => {
        if (!node.metadata?.content) return;
        const cropped = await cropDataUrl(node.metadata.content, crop);
        const image = await uploadImage(cropped);
        const width = Math.min(node.width, Math.max(220, image.width));
        const childId = nanoid();
        const child: CanvasNodeData = {
            id: childId,
            type: CanvasNodeType.Image,
            title: "Cropped Image",
            position: { x: node.position.x + node.width + 96, y: node.position.y },
            width,
            height: width * (image.height / image.width),
            metadata: {
                ...imageMetadata(image),
                prompt: node.metadata?.prompt,
            },
        };
        setNodes((prev) => [...prev, child]);
        setConnections((prev) => [...prev, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }]);
        setSelectedNodeIds(new Set([childId]));
        setDialogNodeId(childId);
        setCropNodeId(null);
    }, [setConnections, setDialogNodeId, setNodes, setSelectedNodeIds]);

    const splitImageNode = useCallback(
        async (node: CanvasNodeData, params: CanvasImageSplitParams) => {
            if (!node.metadata?.content) return;
            setSplitNodeId(null);
            const pieces = await splitDataUrl(node.metadata.content, params);
            const gap = 16;
            const cellWidth = node.width / params.columns;
            const cellHeight = node.height / params.rows;
            const startX = node.position.x + node.width + 96;
            const startY = node.position.y;
            const childNodes = await Promise.all(
                pieces.map(async (piece) => {
                    const image = await uploadImage(piece.dataUrl);
                    const id = nanoid();
                    return {
                        id,
                        type: CanvasNodeType.Image,
                        title: `${node.title || "图片"} ${piece.row + 1}-${piece.column + 1}`,
                        position: { x: startX + piece.column * (cellWidth + gap), y: startY + piece.row * (cellHeight + gap) },
                        width: cellWidth,
                        height: cellHeight,
                        metadata: {
                            ...imageMetadata(image),
                            prompt: node.metadata?.prompt,
                        },
                    } satisfies CanvasNodeData;
                }),
            );
            setNodes((prev) => [...prev, ...childNodes]);
            setConnections((prev) => [...prev, ...childNodes.map((child) => ({ id: nanoid(), fromNodeId: node.id, toNodeId: child.id }))]);
            setSelectedNodeIds(new Set(childNodes.map((child) => child.id)));
            setSelectedConnectionId(null);
            setDialogNodeId(null);
            message.success(`已切分为 ${childNodes.length} 个子节点`);
        },
        [message, setConnections, setDialogNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds],
    );

    const applyMaskEdit = useCallback(
        async (node: CanvasNodeData, payload: CanvasImageMaskEditPayload) => {
            if (!node.metadata?.content) return;
            const generationConfig = { ...buildGenCfg(node, "image"), count: "1", size: node.metadata?.size || effectiveConfig.size || defaultConfig.size } as AiConfig;
            if (!isAiConfigReady(generationConfig, generationConfig.model)) {
                openConfigDialog(true);
                return;
            }
            const userPrompt = payload.prompt.trim();
            const prompt = `只修改蒙版透明区域，其他区域保持不变。${userPrompt}`;
            try {
                await reserveCanvasGenerationQuota(1);
            } catch (error) {
                if (error instanceof QuotaExceededError) quotaModalRef.current?.open(0, null);
                else if (error instanceof Error) message.warning(error.message);
                return;
            }
            const childId = nanoid();
            const source = { id: node.id, name: `${node.title || node.id}.png`, type: node.metadata.mimeType || "image/png", dataUrl: node.metadata.content, storageKey: node.metadata.storageKey };
            const generationMetadata = buildImageGenerationMetadata("edit", generationConfig, 1, [source]);
            setMaskEditNodeId(null);
            setRunningNodeId(childId);
            setNodes((prev) => [
                ...prev,
                {
                    id: childId,
                    type: CanvasNodeType.Image,
                    title: userPrompt.slice(0, 32) || "局部编辑结果",
                    position: { x: node.position.x + node.width + 96, y: node.position.y },
                    width: node.width,
                    height: node.height,
                    metadata: { prompt, status: NODE_STATUS_LOADING, ...generationMetadata },
                },
            ]);
            setConnections((prev) => [...prev, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }]);
            setSelectedNodeIds(new Set([childId]));
            setSelectedConnectionId(null);
            setDialogNodeId(childId);
            const controller = await startGenerationRequest(childId, node.id, childId);
            try {
                const image = await requestGeneratedImages({
                    config: generationConfig,
                    prompt,
                    references: [source],
                    mask: { id: `${node.id}-mask`, name: "mask.png", type: "image/png", dataUrl: payload.maskDataUrl },
                    options: { signal: controller.signal },
                }).then((items) => items[0]);
                const uploaded = await uploadImage(image.dataUrl);
                const size = fitNodeSize(uploaded.width, uploaded.height, node.width, node.height);
                setNodes((prev) => prev.map((item) => (item.id === childId ? { ...item, width: size.width, height: size.height, metadata: { ...item.metadata, ...imageMetadata(uploaded), prompt, ...generationMetadata } } : item)));
            } catch (error) {
                if (isGenerationCanceled(error)) return;
                const errorDetails = error instanceof Error ? error.message : "局部修改失败";
                message.error(canvasGenerationErrorToast(errorDetails));
                setNodes((prev) => prev.map((item) => (item.id === childId ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_ERROR, errorDetails } } : item)));
            } finally {
                finishGenerationRequest(childId, controller);
                setRunningNodeId(null);
            }
        },
        [
            buildGenCfg,
            effectiveConfig,
            finishGenerationRequest,
            isAiConfigReady,
            isGenerationCanceled,
            message,
            openConfigDialog,
            quotaModalRef,
            reserveCanvasGenerationQuota,
            setConnections,
            setDialogNodeId,
            setMaskEditNodeId,
            setNodes,
            setRunningNodeId,
            setSelectedConnectionId,
            setSelectedNodeIds,
            startGenerationRequest,
        ],
    );

    return {
        // Derived nodes
        cropNode,
        maskEditNode,
        splitNode,
        upscaleNode,
        angleNode,
        superResolveNode,
        previewNode,
        infoNode,
        // Common clear
        clearDialogState,
        // Handlers
        cropImageNode,
        splitImageNode,
        applyMaskEdit,
    };
}
