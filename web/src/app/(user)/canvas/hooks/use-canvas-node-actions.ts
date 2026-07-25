"use client";

import { useCallback } from "react";
import type { CanvasConnection, CanvasNodeData, ContextMenuState } from "../types";
import { CanvasNodeType } from "../types";
import { applyNodeConfigPatch } from "../utils/canvas-utils";

type UseCanvasNodeActionsOptions = {
    nodesRef: React.MutableRefObject<CanvasNodeData[]>;
    cleanupCanvasFiles: (extra?: unknown) => void;
    projectId: string;
    chatSessions: unknown[];
    setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>;
    setConnections: React.Dispatch<React.SetStateAction<CanvasConnection[]>>;
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setSelectedConnectionId: React.Dispatch<React.SetStateAction<string | null>>;
    setHoveredNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    setToolbarNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    setDialogNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    setEditingNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    setInfoNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    setCropNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    setMaskEditNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    setAngleNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    setPreviewNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    setRunningNodeId: React.Dispatch<React.SetStateAction<string | null>>;
    setClearConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
};

export function useCanvasNodeActions(options: UseCanvasNodeActionsOptions) {
    const {
        nodesRef,
        cleanupCanvasFiles,
        projectId,
        chatSessions,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setHoveredNodeId,
        setToolbarNodeId,
        setDialogNodeId,
        setEditingNodeId,
        setInfoNodeId,
        setCropNodeId,
        setMaskEditNodeId,
        setAngleNodeId,
        setPreviewNodeId,
        setRunningNodeId,
        setClearConfirmOpen,
        setContextMenu,
    } = options;

    const deleteNodes = useCallback(
        (ids: Set<string>) => {
            if (!ids.size) return;
            const allIds = new Set(ids);
            nodesRef.current.forEach((node) => {
                if (ids.has(node.id)) node.metadata?.batchChildIds?.forEach((childId) => allIds.add(childId));
            });
            setNodes((prev) => {
                const next = prev.filter((node) => !allIds.has(node.id));
                return next.map((node) => {
                    const childIds = node.metadata?.batchChildIds?.filter((childId) => !allIds.has(childId));
                    if (!node.metadata?.isBatchRoot || childIds?.length === node.metadata.batchChildIds?.length) return node;
                    const primaryImageId = childIds?.includes(node.metadata.primaryImageId || "") ? node.metadata.primaryImageId : childIds?.[0];
                    const primaryNode = next.find((item) => item.id === primaryImageId);
                    return {
                        ...node,
                        metadata: {
                            ...node.metadata,
                            batchChildIds: childIds,
                            primaryImageId,
                            content: primaryNode?.metadata?.content || node.metadata.content,
                            naturalWidth: primaryNode?.metadata?.naturalWidth || node.metadata.naturalWidth,
                            naturalHeight: primaryNode?.metadata?.naturalHeight || node.metadata.naturalHeight,
                        },
                    };
                });
            });
            setConnections((prev) => prev.filter((conn) => !allIds.has(conn.fromNodeId) && !allIds.has(conn.toNodeId)));
            setSelectedNodeIds(new Set());
            setSelectedConnectionId(null);
            setHoveredNodeId((current) => (current && allIds.has(current) ? null : current));
            setToolbarNodeId((current) => (current && allIds.has(current) ? null : current));
            setDialogNodeId((current) => (current && allIds.has(current) ? null : current));
            setEditingNodeId((current) => (current && allIds.has(current) ? null : current));
            setInfoNodeId((current) => (current && allIds.has(current) ? null : current));
            setCropNodeId((current) => (current && allIds.has(current) ? null : current));
            setMaskEditNodeId((current) => (current && allIds.has(current) ? null : current));
            setAngleNodeId((current) => (current && allIds.has(current) ? null : current));
            setPreviewNodeId((current) => (current && allIds.has(current) ? null : current));
            setRunningNodeId((current) => (current && allIds.has(current) ? null : current));
            setContextMenu((current) => (current?.type === "node" && allIds.has(current.nodeId) ? null : current));
            cleanupCanvasFiles({ projectId, nodes: nodesRef.current.filter((node) => !allIds.has(node.id)), chatSessions });
        },
        [chatSessions, cleanupCanvasFiles, nodesRef, projectId, setAngleNodeId, setConnections, setContextMenu, setCropNodeId, setDialogNodeId, setEditingNodeId, setHoveredNodeId, setInfoNodeId, setMaskEditNodeId, setPreviewNodeId, setRunningNodeId, setSelectedConnectionId, setSelectedNodeIds, setToolbarNodeId],
    );

    const deleteConnection = useCallback((connectionId: string) => {
        setConnections((prev) => prev.filter((conn) => conn.id !== connectionId));
        setSelectedConnectionId((current) => (current === connectionId ? null : current));
        setContextMenu((current) => (current?.type === "connection" && current.connectionId === connectionId ? null : current));
    }, [setConnections, setSelectedConnectionId, setContextMenu]);

    const clearCanvas = useCallback(() => {
        setNodes([]);
        setConnections([]);
        setInfoNodeId(null);
        setCropNodeId(null);
        setMaskEditNodeId(null);
        setAngleNodeId(null);
        setPreviewNodeId(null);
        setRunningNodeId(null);
        setClearConfirmOpen(false);
        cleanupCanvasFiles({ projectId, nodes: [], chatSessions: [] });
    }, [chatSessions, cleanupCanvasFiles, projectId, setAngleNodeId, setClearConfirmOpen, setConnections, setCropNodeId, setInfoNodeId, setMaskEditNodeId, setNodes, setPreviewNodeId, setRunningNodeId]);

    const duplicateNode = useCallback((nodeId: string) => {
        const source = nodesRef.current.find((node) => node.id === nodeId);
        if (!source) return;

        const id = `${source.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const next: CanvasNodeData = {
            ...source,
            id,
            title: `${source.title} Copy`,
            position: { x: source.position.x + 36, y: source.position.y + 36 },
        };

        setNodes((prev) => [...prev, next]);
        setSelectedNodeIds(new Set([id]));
        setSelectedConnectionId(null);
        setDialogNodeId(id);
    }, [nodesRef, setDialogNodeId, setNodes, setSelectedConnectionId, setSelectedNodeIds]);

    const updateNodeContent = useCallback((nodeId: string, content: string) => {
        setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, content } } : node)));
    }, [setNodes]);

    const updateNodePrompt = useCallback((nodeId: string, prompt: string) => {
        setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, metadata: { ...node.metadata, prompt } } : node)));
    }, [setNodes]);

    const patchNodeConfig = useCallback((nodeId: string, patch: Partial<CanvasNodeData["metadata"]>) => {
        const applyPatch = (items: CanvasNodeData[]) => items.map((node) => (node.id === nodeId ? applyNodeConfigPatch(node, patch) : node));
        nodesRef.current = applyPatch(nodesRef.current);
        setNodes((prev) => applyPatch(prev));
    }, [nodesRef, setNodes]);

    const resizeNode = useCallback((nodeId: string, width: number, height: number, position?: { x: number; y: number }) => {
        setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, width, height, position: position || node.position } : node)));
    }, [setNodes]);

    const toggleFreeResize = useCallback((nodeId: string) => {
        setNodes((prev) =>
            prev.map((node) => {
                if (node.id !== nodeId) return node;
                const freeResize = !node.metadata?.freeResize;
                if (freeResize || node.type !== CanvasNodeType.Image) return { ...node, metadata: { ...node.metadata, freeResize } };
                const ratio = (node.metadata?.naturalWidth || node.width) / (node.metadata?.naturalHeight || node.height || 1);
                const height = node.width / ratio;
                return { ...node, height, position: { x: node.position.x, y: node.position.y + node.height / 2 - height / 2 }, metadata: { ...node.metadata, freeResize } };
            }),
        );
    }, [setNodes]);

    return {
        deleteNodes,
        deleteConnection,
        clearCanvas,
        duplicateNode,
        updateNodeContent,
        updateNodePrompt,
        patchNodeConfig,
        resizeNode,
        toggleFreeResize,
    };
}
