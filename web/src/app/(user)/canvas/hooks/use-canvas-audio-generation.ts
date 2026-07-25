"use client";

import { useCallback } from "react";
import { nanoid } from "nanoid";
import { requestGeneratedAudio, persistGeneratedAudio } from "@/lib/generation/generation-request";
import type { AiConfig } from "@/stores/use-config-store";
import { NODE_DEFAULT_SIZE } from "../constants";
import { CanvasNodeType } from "../types";
import type { CanvasNodeData, CanvasConnection } from "../types";
import {
    NODE_STATUS_LOADING,
    NODE_STATUS_SUCCESS,
    audioMetadata,
    buildAudioGenerationMetadata,
} from "../utils/canvas-utils";

type UseCanvasAudioGenerationOptions = {
    startGenerationRequest: (targetNodeId: string, originNodeId: string, runningId?: string, controller?: AbortController) => Promise<AbortController>;
    finishGenerationRequest: (targetNodeId: string, controller: AbortController) => void;
    setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>;
    setConnections: React.Dispatch<React.SetStateAction<CanvasConnection[]>>;
};

type GenerateAudioParams = {
    nodeId: string;
    sourceNode: CanvasNodeData | undefined;
    generationConfig: AiConfig;
    effectivePrompt: string;
    runController: AbortController;
};

export function useCanvasAudioGeneration(options: UseCanvasAudioGenerationOptions) {
    const { startGenerationRequest, finishGenerationRequest, setNodes, setConnections } = options;

    const generateAudio = useCallback(
        async ({ nodeId, sourceNode, generationConfig, effectivePrompt, runController }: GenerateAudioParams) => {
            const spec = NODE_DEFAULT_SIZE[CanvasNodeType.Audio];
            const isEmptyAudioNode = sourceNode?.type === CanvasNodeType.Audio && !sourceNode.metadata?.content;
            const audioId = isEmptyAudioNode ? nodeId : nanoid();
            const parent = sourceNode?.position || { x: 0, y: 0 };
            const audioNode: CanvasNodeData = {
                id: audioId,
                type: CanvasNodeType.Audio,
                title: effectivePrompt.slice(0, 32) || "Generated Audio",
                position: isEmptyAudioNode ? sourceNode.position : { x: parent.x + (sourceNode?.width || spec.width) + 96, y: parent.y + ((sourceNode?.height || spec.height) - spec.height) / 2 },
                width: isEmptyAudioNode ? sourceNode.width : spec.width,
                height: isEmptyAudioNode ? sourceNode.height : spec.height,
                metadata: { prompt: effectivePrompt, status: NODE_STATUS_LOADING, ...buildAudioGenerationMetadata(generationConfig) },
            };
            setNodes((prev) => (isEmptyAudioNode ? prev.map((node) => (node.id === nodeId ? { ...node, ...audioNode } : node)) : [...prev.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_SUCCESS } } : node)), audioNode]));
            if (!isEmptyAudioNode) setConnections((prev) => [...prev, { id: nanoid(), fromNodeId: nodeId, toNodeId: audioId }]);
            const controller = await startGenerationRequest(audioId, nodeId, nodeId, runController);
            try {
                const audio = await persistGeneratedAudio(await requestGeneratedAudio({ config: generationConfig, prompt: effectivePrompt, options: { signal: controller.signal } }), generationConfig.audioFormat);
                setNodes((prev) => prev.map((node) => (node.id === audioId ? { ...node, metadata: { ...node.metadata, ...audioMetadata(audio), prompt: effectivePrompt, ...buildAudioGenerationMetadata(generationConfig) } } : node)));
            } finally {
                finishGenerationRequest(audioId, controller);
            }
        },
        [finishGenerationRequest, setConnections, setNodes, startGenerationRequest],
    );

    return { generateAudio };
}
