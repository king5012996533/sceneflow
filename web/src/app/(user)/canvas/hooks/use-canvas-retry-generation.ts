"use client";

import { useCallback } from "react";
import { requestGeneratedText, requestGeneratedVideo, persistGeneratedVideo, requestGeneratedAudio, persistGeneratedAudio, requestGeneratedImages } from "@/lib/generation/generation-request";
import { uploadImage } from "@/services/image-storage";
import type { AiConfig } from "@/stores/use-config-store";
import { NODE_DEFAULT_SIZE } from "../constants";
import { CanvasNodeType } from "../types";
import type { CanvasNodeData, CanvasNodeMetadata } from "../types";
import type { NodeGenerationContext } from "../components/canvas-node-generation";
import { buildNodeResponseMessages } from "../components/canvas-node-generation";
import {
    NODE_STATUS_LOADING,
    NODE_STATUS_SUCCESS,
    NODE_STATUS_ERROR,
    VIDEO_NODE_MAX_WIDTH,
    VIDEO_NODE_MAX_HEIGHT,
    imageMetadata,
    videoMetadata,
    audioMetadata,
    buildImageGenerationMetadata,
    buildAudioGenerationMetadata,
} from "../utils/canvas-utils";
import { fitNodeSize } from "../utils/canvas-node-size";
import { canvasGenerationErrorToast, formatCanvasGenerationErrorDetails } from "../utils/canvas-generation-error";
import type { ReferenceImage } from "@/types/image";

type UseCanvasRetryGenerationOptions = {
    reserveCanvasGenerationQuota: (count?: number) => Promise<void>;
    startGenerationRequest: (targetNodeId: string, originNodeId: string, runningId?: string, controller?: AbortController) => Promise<AbortController>;
    finishGenerationRequest: (targetNodeId: string, controller: AbortController) => void;
    isGenerationCanceled: (error: unknown) => boolean;
    retrySourceNode: (nodeId: string) => CanvasNodeData | undefined | null;
    buildHydratedContext: (nodeId: string, prompt: string) => Promise<NodeGenerationContext>;
    buildGenCfg: (node: CanvasNodeData | undefined, mode: "image" | "video" | "audio" | "text") => AiConfig;
    resolveReferences: (metadata: CanvasNodeMetadata) => Promise<ReferenceImage[] | null>;
    sourceReferenceImages: (node: CanvasNodeData | null) => ReferenceImage[];
    isAiConfigReady: (config: AiConfig, model: string) => boolean;
    openConfigDialog: (show: boolean) => void;
    nodesRef: React.MutableRefObject<CanvasNodeData[]>;
    effectiveConfig: AiConfig;
    setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>;
    setRunningNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    message: { info: (msg: string) => void; success: (msg: string) => void; error: (msg: string) => void; warning: (msg: string) => void };
};

export function useCanvasRetryGeneration(options: UseCanvasRetryGenerationOptions) {
    const {
        reserveCanvasGenerationQuota,
        startGenerationRequest,
        finishGenerationRequest,
        isGenerationCanceled,
        retrySourceNode,
        buildHydratedContext,
        buildGenCfg,
        resolveReferences,
        sourceReferenceImages,
        isAiConfigReady,
        openConfigDialog,
        nodesRef,
        effectiveConfig,
        setNodes,
        setRunningNodeId,
        message,
    } = options;

    const retryNode = useCallback(
        async (node: CanvasNodeData) => {
            const sourceNode = retrySourceNode(node.id) || node;
            const batchRoot = node.metadata?.batchRootId ? nodesRef.current.find((item) => item.id === node.metadata?.batchRootId) : null;
            const savedImageMetadata = node.type === CanvasNodeType.Image ? { ...batchRoot?.metadata, ...node.metadata } : undefined;
            const hasSavedImageMetadata = Boolean(savedImageMetadata?.generationType);

            const generationConfig: AiConfig =
                hasSavedImageMetadata && savedImageMetadata
                    ? ({
                          ...effectiveConfig,
                          model: savedImageMetadata.model || effectiveConfig.imageModel || effectiveConfig.model,
                          quality: savedImageMetadata.quality || effectiveConfig.quality,
                          size: savedImageMetadata.size || effectiveConfig.size,
                          count: "1",
                      } as AiConfig)
                    : ({ ...buildGenCfg(sourceNode, node.type === CanvasNodeType.Text ? "text" : node.type === CanvasNodeType.Video ? "video" : node.type === CanvasNodeType.Audio ? "audio" : "image"), count: "1" } as AiConfig);

            if (!isAiConfigReady(generationConfig, generationConfig.model)) {
                openConfigDialog(true);
                return;
            }

            const context = hasSavedImageMetadata ? null : await buildHydratedContext(sourceNode.id, sourceNode.metadata?.prompt || node.metadata?.prompt || "");
            const prompt = (savedImageMetadata?.prompt || context?.prompt || "").trim();
            if (!prompt) {
                message.warning("找不到提示词，无法重试");
                return;
            }

            const generationType = savedImageMetadata?.generationType;
            const useReferenceImages = generationType ? generationType === "edit" : Boolean(context?.referenceImages.length);
            const retryReferenceImages =
                hasSavedImageMetadata && savedImageMetadata
                    ? await resolveReferences(savedImageMetadata)
                    : useReferenceImages
                      ? context?.referenceImages.length
                          ? context.referenceImages
                          : sourceReferenceImages(batchRoot || sourceNode)
                      : [];
            if (useReferenceImages && !retryReferenceImages) {
                message.error("参考图片已丢失，无法继续重试");
                setNodes((prev) => prev.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_ERROR, errorDetails: "参考图片已丢失，无法继续重试" } } : item)));
                return;
            }
            const retryImages = retryReferenceImages || [];

            try {
                await reserveCanvasGenerationQuota(1);
            } catch (error) {
                if (error instanceof Error) message.warning(error.message);
                return;
            }

            setRunningNodeId(node.id);
            setNodes((prev) => prev.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_LOADING, errorDetails: undefined } } : item)));
            const controller = await startGenerationRequest(node.id, sourceNode.id, node.id);

            try {
                if (node.type === CanvasNodeType.Text) {
                    if (!context) return;
                    let streamed = "";
                    const answer = await requestGeneratedText({ config: generationConfig, messages: buildNodeResponseMessages({ ...context, prompt }), onDelta: (text) => {
                        streamed = text;
                        setNodes((prev) => prev.map((item) => (item.id === node.id ? { ...item, type: CanvasNodeType.Text, metadata: { ...item.metadata, content: text, status: NODE_STATUS_LOADING } } : item)));
                    }, options: { signal: controller.signal } });
                    setNodes((prev) => prev.map((item) => (item.id === node.id ? { ...item, type: CanvasNodeType.Text, metadata: { ...item.metadata, content: answer || streamed, prompt, status: NODE_STATUS_SUCCESS } } : item)));
                    return;
                }

                if (node.type === CanvasNodeType.Video) {
                    const video = await persistGeneratedVideo(await requestGeneratedVideo({ config: generationConfig, prompt, references: retryImages, videoReferences: context?.referenceVideos || [], audioReferences: context?.referenceAudios || [], options: { signal: controller.signal } }));
                    const videoSize = fitNodeSize(video.width || node.width, video.height || node.height, VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT);
                    setNodes((prev) => prev.map((item) => (item.id === node.id ? { ...item, width: videoSize.width, height: videoSize.height, position: { x: item.position.x + item.width / 2 - videoSize.width / 2, y: item.position.y + item.height / 2 - videoSize.height / 2 }, metadata: { ...item.metadata, ...videoMetadata(video), prompt, model: generationConfig.model, size: generationConfig.size, seconds: generationConfig.videoSeconds, vquality: generationConfig.vquality, generateAudio: generationConfig.videoGenerateAudio, watermark: generationConfig.videoWatermark } } : item)));
                    return;
                }

                if (node.type === CanvasNodeType.Audio) {
                    const audio = await persistGeneratedAudio(await requestGeneratedAudio({ config: generationConfig, prompt, options: { signal: controller.signal } }), generationConfig.audioFormat);
                    setNodes((prev) => prev.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, ...audioMetadata(audio), prompt, ...buildAudioGenerationMetadata(generationConfig) } } : item)));
                    return;
                }

                const image = await requestGeneratedImages({ config: generationConfig, prompt, references: useReferenceImages ? retryImages : [], options: { signal: controller.signal } }).then((items) => items[0]);
                const uploadedImage = await uploadImage(image.dataUrl);
                const imageConfig = NODE_DEFAULT_SIZE[CanvasNodeType.Image];
                const imageSize = fitNodeSize(uploadedImage.width, uploadedImage.height, imageConfig.width, imageConfig.height);
                const generationMetadata = savedImageMetadata?.generationType
                    ? { generationType: savedImageMetadata.generationType, model: generationConfig.model, size: generationConfig.size, quality: generationConfig.quality, count: savedImageMetadata.count || 1, references: savedImageMetadata.references }
                    : buildImageGenerationMetadata(useReferenceImages ? "edit" : "generation", generationConfig, 1, retryImages);
                setNodes((prev) =>
                    prev.map((item) =>
                        item.id === node.id
                            ? {
                                ...item,
                                type: CanvasNodeType.Image,
                                width: imageSize.width,
                                height: imageSize.height,
                                metadata: { ...item.metadata, ...imageMetadata(uploadedImage), prompt, ...generationMetadata },
                            }
                            : item,
                    ),
                );
            } catch (error) {
                if (isGenerationCanceled(error)) return;
                const errorDetails = formatCanvasGenerationErrorDetails(error);
                message.error(canvasGenerationErrorToast(errorDetails));
                setNodes((prev) => prev.map((item) => (item.id === node.id ? { ...item, metadata: { ...item.metadata, status: NODE_STATUS_ERROR, errorDetails } } : item)));
            } finally {
                finishGenerationRequest(node.id, controller);
                setRunningNodeId(null);
            }
        },
        [
            effectiveConfig,
            finishGenerationRequest,
            isAiConfigReady,
            isGenerationCanceled,
            message,
            openConfigDialog,
            reserveCanvasGenerationQuota,
            retrySourceNode,
            startGenerationRequest,
            buildHydratedContext,
            buildGenCfg,
            resolveReferences,
            sourceReferenceImages,
            nodesRef,
            setNodes,
            setRunningNodeId,
        ],
    );

    return { retryNode };
}
