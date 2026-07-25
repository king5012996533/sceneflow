"use client";

import { useCallback } from "react";
import { runCanvasPipeline } from "../utils/canvas-utils";
import type { CanvasNodeData, CanvasConnection } from "../types";

type UseCanvasPipelineRunnerOptions = {
    nodesRef: React.MutableRefObject<CanvasNodeData[]>;
    connectionsRef: React.MutableRefObject<CanvasConnection[]>;
    setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>;
    generateNodeRef: React.MutableRefObject<((nodeId: string, mode: "image" | "video" | "audio" | "text", prompt: string) => Promise<void>) | null>;
    message: { loading: (options: { key: string; content: string; duration: number }) => unknown; success: (options: { key: string; content: string }) => unknown; error: (options: { key: string; content: string }) => unknown };
};

export function useCanvasPipelineRunner(options: UseCanvasPipelineRunnerOptions) {
    const { nodesRef, connectionsRef, setNodes, generateNodeRef, message } = options;

    const runPipeline = useCallback(
        (nodeIds: string[], resume: boolean) => {
            void runCanvasPipeline(nodeIds, resume, nodesRef, connectionsRef, setNodes, generateNodeRef, message);
        },
        [connectionsRef, generateNodeRef, message, nodesRef, setNodes],
    );

    return { runPipeline };
}
