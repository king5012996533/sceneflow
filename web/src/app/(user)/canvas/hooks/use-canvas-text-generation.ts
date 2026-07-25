"use client";

import { useCallback } from "react";
import { nanoid } from "nanoid";
import { requestGeneratedText } from "@/lib/generation/generation-request";
import type { AiConfig } from "@/stores/use-config-store";
import { NODE_DEFAULT_SIZE } from "../constants";
import { CanvasNodeType } from "../types";
import type { CanvasNodeData, CanvasConnection, CanvasNodeMetadata } from "../types";
import type { NodeGenerationContext } from "../components/canvas-node-generation";
import { buildNodeResponseMessages } from "../components/canvas-node-generation";
import {
    NODE_STATUS_LOADING,
    NODE_STATUS_SUCCESS,
    getGenerationCount,
} from "../utils/canvas-utils";

type UseCanvasTextGenerationOptions = {
    startGenerationRequest: (targetNodeId: string, originNodeId: string, runningId?: string, controller?: AbortController) => Promise<AbortController>;
    finishGenerationRequest: (targetNodeId: string, controller: AbortController) => void;
    setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>;
    setConnections: React.Dispatch<React.SetStateAction<CanvasConnection[]>>;
};

type GenerateTextParams = {
    sourceNode: CanvasNodeData | undefined;
    generationConfig: AiConfig;
    generationContext: NodeGenerationContext;
    effectivePrompt: string;
    nodeId: string;
    prompt: string;
    editingTextNode: boolean;
    runController: AbortController;
};

export function useCanvasTextGeneration(options: UseCanvasTextGenerationOptions) {
    const {
        startGenerationRequest,
        finishGenerationRequest,
        setNodes,
        setConnections,
    } = options;

    const generateText = useCallback(
        async ({ sourceNode, generationConfig, generationContext, effectivePrompt, nodeId, prompt, editingTextNode, runController }: GenerateTextParams) => {
            let streamed = "";
            const isConfigNode = sourceNode?.type === CanvasNodeType.Config;
            const textCount = isConfigNode ? getGenerationCount(generationConfig.count) : 1;
            const parentConfig = NODE_DEFAULT_SIZE[isConfigNode ? CanvasNodeType.Config : CanvasNodeType.Text];
            const textConfig = NODE_DEFAULT_SIZE[CanvasNodeType.Text];
            const parentPosition = sourceNode?.position || { x: 0, y: 0 };
            const childIds = isConfigNode || editingTextNode ? Array.from({ length: textCount }, () => nanoid()) : [];
            if (isConfigNode || editingTextNode) {
                const childNodes: CanvasNodeData[] = childIds.map((id, index) => ({
                    id,
                    type: CanvasNodeType.Text,
                    title: effectivePrompt.slice(0, 32) || "Generated Text",
                    position: {
                        x: parentPosition.x + parentConfig.width + 96,
                        y: parentPosition.y + parentConfig.height / 2 - textConfig.height / 2 + (index - (textCount - 1) / 2) * (textConfig.height + 36),
                    },
                    width: textConfig.width,
                    height: textConfig.height,
                    metadata: { prompt: effectivePrompt, status: NODE_STATUS_LOADING, fontSize: 14 },
                }));
                setNodes((prev) => [...prev.map((node) => (node.id === nodeId && isConfigNode ? { ...node, metadata: { ...node.metadata, prompt: effectivePrompt, status: NODE_STATUS_LOADING, errorDetails: undefined } } : node)), ...childNodes]);
                setConnections((prev) => [...prev, ...childIds.map((childId) => ({ id: nanoid(), fromNodeId: nodeId, toNodeId: childId }))]);
            }

            const controller = runController;
            const textTargetIds = childIds.length ? childIds : [nodeId];
            await Promise.all(textTargetIds.map((targetNodeId) => startGenerationRequest(targetNodeId, nodeId, nodeId, controller)));
            const answers = await Promise.all(
                textTargetIds.map((targetNodeId) => {
                    let localStreamed = "";
                    return requestGeneratedText({ config: generationConfig, messages: buildNodeResponseMessages({ ...generationContext, prompt: effectivePrompt }), onDelta: (text) => {
                        localStreamed = text;
                        streamed = text;
                        if (isConfigNode) return;
                        setNodes((prev) => prev.map((node) => (node.id === targetNodeId ? { ...node, type: CanvasNodeType.Text, metadata: { ...node.metadata, content: text, status: NODE_STATUS_LOADING } } : node)));
                    }, options: { signal: controller.signal } }).then((answer) => ({ nodeId: targetNodeId, content: answer || localStreamed })).finally(() => finishGenerationRequest(targetNodeId, controller));
                }),
            );
            if (controller.signal.aborted) return;
            const answerByNodeId = new Map(answers.map((item) => [item.nodeId, item.content]));
            setNodes((prev) =>
                prev.map((node) =>
                    childIds.includes(node.id)
                        ? { ...node, metadata: { ...node.metadata, content: answerByNodeId.get(node.id) || streamed, status: NODE_STATUS_SUCCESS } }
                        : node.id === nodeId && isConfigNode
                          ? { ...node, metadata: { ...node.metadata, status: NODE_STATUS_SUCCESS } }
                          : node.id === nodeId && !editingTextNode
                            ? { ...node, type: CanvasNodeType.Text, title: prompt.slice(0, 32) || "Generated Text", metadata: { ...node.metadata, content: answerByNodeId.get(node.id) || streamed, status: NODE_STATUS_SUCCESS } }
                            : node,
                ),
            );
        },
        [finishGenerationRequest, setConnections, setNodes, startGenerationRequest],
    );

    return { generateText };
}
