"use client";

import { useCallback, useEffect, useRef } from "react";
import { nanoid } from "nanoid";
import { requestGeneratedVideo, persistGeneratedVideo } from "@/lib/generation/generation-request";
import { uploadImage } from "@/services/image-storage";
import { resolveMediaUrl } from "@/services/file-storage";
import { proxyFetch } from "@/services/api/proxy-client";
import type { AiConfig } from "@/stores/use-config-store";
import { NODE_DEFAULT_SIZE } from "../constants";
import { CanvasNodeType } from "../types";
import type { CanvasNodeData, CanvasConnection, CanvasNodeMetadata } from "../types";
import type { NodeGenerationContext } from "../components/canvas-node-generation";
import {
    NODE_STATUS_IDLE,
    NODE_STATUS_LOADING,
    NODE_STATUS_SUCCESS,
    VIDEO_NODE_MAX_WIDTH,
    VIDEO_NODE_MAX_HEIGHT,
    videoMetadata,
    imageMetadata,
    extractVideoFrame,
} from "../utils/canvas-utils";
import { fitNodeSize, nodeSizeFromRatio } from "../utils/canvas-node-size";

type UseCanvasVideoGenerationOptions = {
    nodesRef: React.MutableRefObject<CanvasNodeData[]>;
    connectionsRef: React.MutableRefObject<CanvasConnection[]>;
    effectiveConfig: AiConfig;
    continuationPrompt: (previousPrompt?: string) => string;
    referenceUrls: (context: NodeGenerationContext) => string[];
    startGenerationRequest: (targetNodeId: string, originNodeId: string, runningId?: string, controller?: AbortController) => Promise<AbortController>;
    finishGenerationRequest: (targetNodeId: string, controller: AbortController) => void;
    setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>;
    setConnections: React.Dispatch<React.SetStateAction<CanvasConnection[]>>;
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
    setDialogNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    message: { loading: (config: { key: string; content: string; duration: number }) => void; success: (config: { key: string; content: string } | string) => void; error: (config: { key: string; content: string } | string) => void; warning: (msg: string) => void };
};

type GenerateVideoParams = {
    nodeId: string;
    sourceNode: CanvasNodeData | undefined;
    generationConfig: AiConfig;
    generationContext: NodeGenerationContext;
    effectivePrompt: string;
    runController: AbortController;
};

export function useCanvasVideoGeneration(options: UseCanvasVideoGenerationOptions) {
    const {
        nodesRef,
        connectionsRef,
        effectiveConfig,
        continuationPrompt,
        referenceUrls,
        startGenerationRequest,
        finishGenerationRequest,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setDialogNodeId,
        message,
    } = options;

    const generateVideo = useCallback(
        async ({ nodeId, sourceNode, generationConfig, generationContext, effectivePrompt, runController }: GenerateVideoParams) => {
            const spec = nodeSizeFromRatio(generationConfig.size, NODE_DEFAULT_SIZE[CanvasNodeType.Video].width, NODE_DEFAULT_SIZE[CanvasNodeType.Video].height) || NODE_DEFAULT_SIZE[CanvasNodeType.Video];
            const isEmptyVideoNode = sourceNode?.type === CanvasNodeType.Video && !sourceNode.metadata?.content;
            const videoId = isEmptyVideoNode ? nodeId : nanoid();
            const parent = sourceNode?.position || { x: 0, y: 0 };
            const videoNode: CanvasNodeData = {
                id: videoId,
                type: CanvasNodeType.Video,
                title: effectivePrompt.slice(0, 32) || "Generated Video",
                position: isEmptyVideoNode ? sourceNode.position : { x: parent.x + (sourceNode?.width || spec.width) + 96, y: parent.y },
                width: isEmptyVideoNode ? sourceNode.width : spec.width,
                height: isEmptyVideoNode ? sourceNode.height : spec.height,
                metadata: { prompt: effectivePrompt, status: NODE_STATUS_LOADING, model: generationConfig.model, size: generationConfig.size, seconds: generationConfig.videoSeconds, vquality: generationConfig.vquality, generateAudio: generationConfig.videoGenerateAudio, watermark: generationConfig.videoWatermark, references: referenceUrls(generationContext) },
            };
            setNodes((prev) => (isEmptyVideoNode ? prev.map((node) => (node.id === nodeId ? { ...node, ...videoNode } : node)) : [...prev.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_SUCCESS } } : node)), videoNode]));
            if (!isEmptyVideoNode) setConnections((prev) => [...prev, { id: nanoid(), fromNodeId: nodeId, toNodeId: videoId }]);
            const controller = await startGenerationRequest(videoId, nodeId, nodeId, runController);
            try {
                const video = await persistGeneratedVideo(await requestGeneratedVideo({ config: generationConfig, prompt: effectivePrompt, references: generationContext.referenceImages, videoReferences: generationContext.referenceVideos, audioReferences: generationContext.referenceAudios, options: { signal: controller.signal } }));
                const videoSize = fitNodeSize(video.width || spec.width, video.height || spec.height, VIDEO_NODE_MAX_WIDTH, VIDEO_NODE_MAX_HEIGHT);
                setNodes((prev) =>
                    prev.map((node) =>
                        node.id === videoId
                            ? {
                                  ...node,
                                  width: videoSize.width,
                                  height: videoSize.height,
                                  position: { x: node.position.x + node.width / 2 - videoSize.width / 2, y: node.position.y + node.height / 2 - videoSize.height / 2 },
                                  metadata: { ...node.metadata, ...videoMetadata(video), prompt: effectivePrompt, model: generationConfig.model, size: generationConfig.size, seconds: generationConfig.videoSeconds, vquality: generationConfig.vquality, generateAudio: generationConfig.videoGenerateAudio, watermark: generationConfig.videoWatermark, references: referenceUrls(generationContext) },
                              }
                            : node,
                    ),
                );
            } finally {
                finishGenerationRequest(videoId, controller);
            }
        },
        [finishGenerationRequest, nodesRef, referenceUrls, setConnections, setNodes, startGenerationRequest],
    );

    const createContinuationFromVideo = useCallback(
        async (node: CanvasNodeData) => {
            if (node.type !== CanvasNodeType.Video || !node.metadata?.content) {
                message.warning("请先生成或上传一段视频");
                return;
            }

            const key = "video-continuity";
            message.loading({ key, content: "正在提取尾帧...", duration: 0 });

            try {
                let videoUrl = await resolveMediaUrl(node.metadata.storageKey, node.metadata.content);
                let proxyBlobUrl: string | undefined;
                if (!node.metadata.storageKey && videoUrl && !videoUrl.startsWith("blob:")) {
                    const blob = await proxyFetch<Blob>({ url: videoUrl, method: "GET", responseType: "blob" });
                    proxyBlobUrl = URL.createObjectURL(blob);
                    videoUrl = proxyBlobUrl;
                }
                const frame = await extractVideoFrame(videoUrl).finally(() => {
                    if (proxyBlobUrl) URL.revokeObjectURL(proxyBlobUrl);
                });
                const uploaded = await uploadImage(frame);
                const imageSize = fitNodeSize(uploaded.width, uploaded.height);
                const videoSpec = NODE_DEFAULT_SIZE[CanvasNodeType.Video];
                const gap = 88;
                const frameId = `tail-frame-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                const nextVideoId = `video-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                const y = node.position.y + node.height / 2;
                const frameNode: CanvasNodeData = {
                    id: frameId,
                    type: CanvasNodeType.Image,
                    title: `${node.title || "视频"} 尾帧`,
                    position: {
                        x: node.position.x + node.width + gap,
                        y: y - imageSize.height / 2,
                    },
                    width: imageSize.width,
                    height: imageSize.height,
                    metadata: {
                        ...imageMetadata(uploaded),
                        prompt: "上一段视频尾帧，用于下一镜头连续叙事参考。",
                        assetCategory: "keyframe",
                        assetSource: "generate",
                        assetReusable: true,
                        pipelineKind: "continuity-tail-frame",
                        tailFrameSourceNodeId: node.id,
                    },
                };
                const nextPrompt = continuationPrompt(node.metadata.prompt);
                const nextVideoModel = node.metadata.model || effectiveConfig.videoModel || effectiveConfig.model;
                const nextVideoSize = node.metadata.size || effectiveConfig.size || effectiveConfig.size;
                const nextVideoSeconds = node.metadata.seconds || effectiveConfig.videoSeconds || effectiveConfig.videoSeconds;
                const nextVideoQuality = node.metadata.vquality || effectiveConfig.vquality || effectiveConfig.vquality;
                const nextVideoGenerateAudio = node.metadata.generateAudio || effectiveConfig.videoGenerateAudio || effectiveConfig.videoGenerateAudio;
                const nextVideoWatermark = node.metadata.watermark || effectiveConfig.videoWatermark || effectiveConfig.videoWatermark;
                const nextVideoNode: CanvasNodeData = {
                    id: nextVideoId,
                    type: CanvasNodeType.Video,
                    title: "下一镜头",
                    position: {
                        x: frameNode.position.x + frameNode.width + gap,
                        y: y - videoSpec.height / 2,
                    },
                    width: videoSpec.width,
                    height: videoSpec.height,
                    metadata: {
                        content: "",
                        status: NODE_STATUS_IDLE,
                        generationMode: "video",
                        prompt: nextPrompt,
                        model: nextVideoModel,
                        size: nextVideoSize,
                        seconds: nextVideoSeconds,
                        vquality: nextVideoQuality,
                        generateAudio: nextVideoGenerateAudio,
                        watermark: nextVideoWatermark,
                        references: [uploaded.storageKey || uploaded.url].filter(Boolean),
                        assetCategory: "video-shot",
                        assetSource: "generate",
                        assetReusable: true,
                        pipelineKind: "continuity-video",
                        continuitySourceNodeId: node.id,
                    },
                };

                const newConnections: CanvasConnection[] = [
                    { id: nanoid(), fromNodeId: node.id, toNodeId: frameId },
                    { id: nanoid(), fromNodeId: frameId, toNodeId: nextVideoId },
                ];
                const nextNodes = [...nodesRef.current, frameNode, nextVideoNode];
                const nextConnections = [...connectionsRef.current, ...newConnections];
                nodesRef.current = nextNodes;
                connectionsRef.current = nextConnections;
                setNodes(nextNodes);
                setConnections(nextConnections);
                setSelectedNodeIds(new Set([nextVideoId]));
                setSelectedConnectionId(null);
                setDialogNodeId(nextVideoId);
                message.success({ key, content: "已创建尾帧和下一镜头，请确认提示词后生成。" });
            } catch (error) {
                message.error({ key, content: error instanceof Error ? error.message : "提取尾帧失败" });
            }
        },
        [connectionsRef, continuationPrompt, effectiveConfig, message, nodesRef, setConnections, setDialogNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds],
    );

    const continueVideoRef = useRef<((node: CanvasNodeData) => Promise<void>) | null>(null);
    useEffect(() => {
        continueVideoRef.current = createContinuationFromVideo;
    }, [createContinuationFromVideo]);

    return { generateVideo, createContinuationFromVideo, continueVideoRef };
}
