"use client";

import { useCallback } from "react";
import { saveAs } from "file-saver";
import { nanoid } from "nanoid";
import { requestGeneratedImages } from "@/lib/generation/generation-request";
import { defaultConfig, type AiConfig } from "@/stores/use-config-store";
import { uploadImage } from "@/services/image-storage";
import { formatCanvasGenerationErrorDetails } from "../utils/canvas-generation-error";
import { upscaleDataUrl } from "../utils/canvas-image-data";
import { fitNodeSize } from "../utils/canvas-node-size";
import { NODE_DEFAULT_SIZE } from "../constants";
import { CanvasNodeType } from "../types";
import type { CanvasNodeData } from "../types";
import type { CanvasImageUpscaleParams } from "../components/canvas-node-upscale-dialog";
import type { CanvasImageAngleParams } from "../components/canvas-node-angle-dialog";
import {
    createCanvasNode,
    IMAGE_PROMPT_REVERSE_PRESET,
    NODE_STATUS_SUCCESS,
    NODE_STATUS_LOADING,
    NODE_STATUS_ERROR,
    imageMetadata,
    buildImageGenerationMetadata,
    buildAngleLabel,
    buildAnglePrompt,
    imageExtension,
    audioExtension,
    isGenerationCanceled,
} from "../utils/canvas-utils";

type UseCanvasImageToolsOptions = {
    effectiveConfig: AiConfig;
    setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>;
    setConnections: React.Dispatch<React.SetStateAction<{ id: string; fromNodeId: string; toNodeId: string }[]>>;
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
    setDialogNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    setRunningNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    setAngleNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    startGenerationRequest: (targetNodeId: string, originNodeId: string, runningId?: string, controller?: AbortController) => Promise<AbortController>;
    finishGenerationRequest: (targetNodeId: string, controller: AbortController) => void;
    reserveCanvasGenerationQuota: (count?: number) => Promise<void>;
    isAiConfigReady: (config: AiConfig, model: string) => boolean;
    buildGenCfg: (node: CanvasNodeData | undefined, mode: "image" | "video" | "audio" | "text") => AiConfig;
    message: { info: (msg: string) => void; success: (msg: string) => void; error: (msg: string) => void; warning: (msg: string) => void };
};

export function useCanvasImageTools(options: UseCanvasImageToolsOptions) {
    const {
        effectiveConfig,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setDialogNodeId,
        setRunningNodeId,
        setAngleNodeId,
        startGenerationRequest,
        finishGenerationRequest,
        reserveCanvasGenerationQuota,
        isAiConfigReady,
        buildGenCfg,
        message,
    } = options;

    const downloadNodeImage = useCallback((node: CanvasNodeData) => {
        if ((node.type !== CanvasNodeType.Image && node.type !== CanvasNodeType.Video && node.type !== CanvasNodeType.Audio) || !node.metadata?.content) return;
        saveAs(node.metadata.content, `canvas-${node.type}-${node.id}.${node.type === CanvasNodeType.Video ? "mp4" : node.type === CanvasNodeType.Audio ? audioExtension(node.metadata.mimeType) : imageExtension(node.metadata.content)}`);
    }, []);

    const createImageReversePromptNodes = useCallback(
        (node: CanvasNodeData) => {
            if (node.type !== CanvasNodeType.Image || !node.metadata?.content) {
                message.warning("图片节点为空，无法反推提示词");
                return;
            }

            const gap = 96;
            const textSpec = NODE_DEFAULT_SIZE[CanvasNodeType.Text];
            const configSpec = NODE_DEFAULT_SIZE[CanvasNodeType.Config];
            const centerY = node.position.y + node.height / 2;
            const textNode = {
                ...createCanvasNode(CanvasNodeType.Text, { x: node.position.x + node.width + gap + textSpec.width / 2, y: centerY }, { content: IMAGE_PROMPT_REVERSE_PRESET, prompt: IMAGE_PROMPT_REVERSE_PRESET, status: NODE_STATUS_SUCCESS, fontSize: 14 }),
                title: "反推提示词",
            };
            const configNode = {
                ...createCanvasNode(
                    CanvasNodeType.Config,
                    { x: textNode.position.x + textNode.width + gap + configSpec.width / 2, y: centerY },
                    {
                        generationMode: "text",
                        model: effectiveConfig.textModel || effectiveConfig.model || defaultConfig.textModel,
                        count: 1,
                        prompt: `参考图片：@[node:${node.id}]\n任务说明：@[node:${textNode.id}]`,
                        composerContent: `参考图片：@[node:${node.id}]\n任务说明：@[node:${textNode.id}]`,
                    },
                ),
                title: "反推提示词配置",
            };

            setNodes((prev) => [...prev, textNode, configNode]);
            setConnections((prev) => [...prev, { id: nanoid(), fromNodeId: node.id, toNodeId: configNode.id }, { id: nanoid(), fromNodeId: textNode.id, toNodeId: configNode.id }]);
            setSelectedNodeIds(new Set([configNode.id]));
            setSelectedConnectionId(null);
            setDialogNodeId(configNode.id);
        },
        [effectiveConfig, message, setConnections, setDialogNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds],
    );

    const generateUpscaledImage = useCallback(
        async (node: CanvasNodeData, params: CanvasImageUpscaleParams) => {
            if (!node.metadata?.content) return;
            const upscaled = await upscaleDataUrl(node.metadata.content, params);
            const image = await uploadImage(upscaled);
            const size = fitNodeSize(image.width, image.height);
            const childId = nanoid();
            const child: CanvasNodeData = {
                id: childId,
                type: CanvasNodeType.Image,
                title: "Upscaled Image",
                position: { x: node.position.x + node.width + 96, y: node.position.y },
                width: size.width,
                height: size.height,
                metadata: {
                    ...imageMetadata(image),
                    prompt: node.metadata?.prompt,
                },
            };
            setNodes((prev) => [...prev, child]);
            setConnections((prev) => [...prev, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }]);
            setSelectedNodeIds(new Set([childId]));
            setDialogNodeId(childId);
        },
        [setConnections, setDialogNodeId, setNodes, setSelectedNodeIds],
    );

    const generateAngleImage = useCallback(
        async (node: CanvasNodeData, params: CanvasImageAngleParams) => {
            if (!node.metadata?.content) return;
            const generationConfig = { ...buildGenCfg(node, "image"), count: "1" } as AiConfig;
            if (!isAiConfigReady(generationConfig, generationConfig.model)) {
                message.warning("暂无可用模型，请联系管理员在后台配置平台模型");
                return;
            }
            const childId = nanoid();
            const imageConfig = NODE_DEFAULT_SIZE[CanvasNodeType.Image];
            const title = buildAngleLabel(params);
            const prompt = buildAnglePrompt(params);
            const generationMetadata = buildImageGenerationMetadata("edit", generationConfig, 1, [
                { id: node.id, name: `${node.title || node.id}.png`, type: node.metadata.mimeType || "image/png", dataUrl: node.metadata.content, storageKey: node.metadata.storageKey },
            ]);
            try {
                await reserveCanvasGenerationQuota(1);
            } catch (error) {
                if (error instanceof Error) message.warning(error.message);
                return;
            }
            setAngleNodeId(null);
            setRunningNodeId(childId);
            setNodes((prev) => [
                ...prev,
                {
                    id: childId,
                    type: CanvasNodeType.Image,
                    title,
                    position: { x: node.position.x + node.width + 96, y: node.position.y },
                    width: imageConfig.width,
                    height: imageConfig.height,
                    metadata: { prompt, status: NODE_STATUS_LOADING, ...generationMetadata },
                },
            ]);
            setConnections((prev) => [...prev, { id: nanoid(), fromNodeId: node.id, toNodeId: childId }]);
            setSelectedNodeIds(new Set([childId]));
            setDialogNodeId(childId);
            const controller = await startGenerationRequest(childId, node.id, childId);
            try {
                const image = await requestGeneratedImages({
                    config: generationConfig,
                    prompt,
                    references: [{ id: node.id, name: `${node.title || node.id}.png`, type: node.metadata.mimeType || "image/png", dataUrl: node.metadata.content, storageKey: node.metadata.storageKey }],
                    options: { signal: controller.signal },
                }).then((items) => items[0]);
                const uploaded = await uploadImage(image.dataUrl);
                const size = fitNodeSize(uploaded.width, uploaded.height, imageConfig.width, imageConfig.height);
                setNodes((prev) => prev.map((item) => (item.id === childId ? { ...item, width: size.width, height: size.height, metadata: { ...item.metadata, ...imageMetadata(uploaded), prompt, ...generationMetadata } } : item)));
            } catch (error) {
                if (isGenerationCanceled(error)) return;
                const errorDetails = formatCanvasGenerationErrorDetails(error);
                setNodes((prev) => prev.map((item) => (item.id === childId ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_ERROR, errorDetails } } : item)));
            } finally {
                finishGenerationRequest(childId, controller);
                setRunningNodeId(null);
            }
        },
        [buildGenCfg, finishGenerationRequest, isAiConfigReady, isGenerationCanceled, message, reserveCanvasGenerationQuota, setAngleNodeId, setConnections, setDialogNodeId, setNodes, setRunningNodeId, setSelectedNodeIds, startGenerationRequest],
    );

    return {
        downloadNodeImage,
        createImageReversePromptNodes,
        generateUpscaledImage,
        generateAngleImage,
    };
}
