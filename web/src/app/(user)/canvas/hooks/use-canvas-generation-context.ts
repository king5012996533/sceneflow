"use client";

import { useMemo } from "react";
import { buildNodeGenerationContext, buildNodeGenerationInputs, hydrateNodeGenerationContext, type NodeGenerationContext, type NodeGenerationInput } from "../components/canvas-node-generation";
import { CanvasNodeType, type CanvasNodeData, type CanvasConnection, type CanvasNodeMetadata } from "../types";
import type { AiConfig } from "@/stores/use-config-store";
import { getPlatformCapability } from "@/stores/platform-catalog-store";
import { resolveImageQuality } from "@/lib/model-capability-spec";
import type { ReferenceImage } from "@/types/image";
import {
    buildGenerationConfig,
    buildContinuationPrompt,
    generationReferenceUrls,
    resolveMetadataReferences,
    findRetrySourceNode,
    sourceNodeReferenceImages,
    generationModeFromNodeType,
} from "../utils/canvas-utils";

type UseCanvasGenerationContextOptions = {
    effectiveConfig: AiConfig;
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
    nodesRef: React.MutableRefObject<CanvasNodeData[]>;
    connectionsRef: React.MutableRefObject<CanvasConnection[]>;
};

export function useCanvasGenerationContext(options: UseCanvasGenerationContextOptions) {
    const { effectiveConfig, nodes, connections, nodesRef, connectionsRef } = options;

    const configInputsById = useMemo(() => {
        const map = new Map<string, NodeGenerationInput[]>();
        nodes.forEach((node) => {
            if (node.type !== CanvasNodeType.Config) return;
            map.set(node.id, buildNodeGenerationInputs(node.id, nodes, connections));
        });
        return map;
    }, [connections, nodes]);

    async function buildHydratedContext(nodeId: string, prompt: string): Promise<NodeGenerationContext> {
        return hydrateNodeGenerationContext(buildNodeGenerationContext(nodeId, nodesRef.current, connectionsRef.current, prompt));
    }

    function config(node: CanvasNodeData | undefined, mode: "image" | "video" | "audio" | "text") {
        const built = buildGenerationConfig(effectiveConfig, node, mode);
        if (mode !== "image") return built;
        // 画质在**发请求之前**就落定：模型标定的默认档要真的进请求体与节点元数据，
        // 不能只在面板上显示。否则面板显示「低 ¥0.09」、上游收到的却是 auto、按 ¥1.78 结账。
        return { ...built, quality: resolveImageQuality(built.quality, getPlatformCapability(built.imageModel || built.model)) };
    }

    function continuationPrompt(previousPrompt?: string) {
        return buildContinuationPrompt(previousPrompt);
    }

    function retrySourceNode(nodeId: string) {
        return findRetrySourceNode(nodeId, nodesRef.current, connectionsRef.current);
    }

    function sourceReferenceImages(node: CanvasNodeData | null): ReferenceImage[] {
        return sourceNodeReferenceImages(node);
    }

    function referenceUrls(context: NodeGenerationContext) {
        return generationReferenceUrls(context);
    }

    async function resolveReferences(metadata: CanvasNodeMetadata) {
        return resolveMetadataReferences(metadata);
    }

    function generationMode(type: CanvasNodeType): "image" | "video" | "audio" | "text" {
        return generationModeFromNodeType(type);
    }

    return {
        configInputsById,
        buildHydratedContext,
        config,
        continuationPrompt,
        retrySourceNode,
        sourceReferenceImages,
        referenceUrls,
        resolveReferences,
        generationMode,
    };
}
