"use client";

import { useCallback, useRef } from "react";
import { CanvasNodeType } from "../types";
import type { CanvasConnection, CanvasNodeData, ContextMenuState, Position } from "../types";
import type { CanvasClipboard } from "../utils/canvas-utils";

type UseCanvasClipboardOptions = {
    nodesRef: React.MutableRefObject<CanvasNodeData[]>;
    connectionsRef: React.MutableRefObject<CanvasConnection[]>;
    selectedNodeIdsRef: React.MutableRefObject<Set<string>>;
    getCanvasCenter: () => Position;
    setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>;
    setConnections: React.Dispatch<React.SetStateAction<CanvasConnection[]>>;
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setSelectedConnectionId: (id: string | null) => void;
    setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
    setDialogNodeId: (id: string | null) => void;
};

export function useCanvasClipboard(options: UseCanvasClipboardOptions) {
    const {
        nodesRef,
        connectionsRef,
        selectedNodeIdsRef,
        getCanvasCenter,
        setNodes,
        setConnections,
        setSelectedNodeIds,
        setSelectedConnectionId,
        setContextMenu,
        setDialogNodeId,
    } = options;

    const clipboardRef = useRef<CanvasClipboard | null>(null);

    const copySelectedNodes = useCallback(() => {
        const selectedIds = new Set(selectedNodeIdsRef.current);
        if (!selectedIds.size) return;

        // 复制编组时连带复制组内资产，否则粘贴后组的子节点引用会失效
        nodesRef.current.forEach((node) => {
            if (selectedIds.has(node.id) && node.type === CanvasNodeType.Group) {
                node.metadata?.groupChildIds?.forEach((childId) => selectedIds.add(childId));
            }
        });

        const copiedNodes = nodesRef.current
            .filter((node) => selectedIds.has(node.id))
            .map((node) => ({
                ...node,
                position: { ...node.position },
                metadata: node.metadata ? { ...node.metadata } : undefined,
            }));

        if (!copiedNodes.length) return;

        clipboardRef.current = {
            nodes: copiedNodes,
            connections: connectionsRef.current
                .filter((connection) => selectedIds.has(connection.fromNodeId) && selectedIds.has(connection.toNodeId))
                .map((connection) => ({ ...connection })),
        };
    }, [selectedNodeIdsRef, nodesRef, connectionsRef]);

    const pasteCopiedNodes = useCallback((): boolean => {
        const clipboard = clipboardRef.current;
        if (!clipboard?.nodes.length) return false;

        const center = getCanvasCenter();
        const bounds = clipboard.nodes.reduce(
            (acc, node) => ({
                left: Math.min(acc.left, node.position.x),
                top: Math.min(acc.top, node.position.y),
                right: Math.max(acc.right, node.position.x + node.width),
                bottom: Math.max(acc.bottom, node.position.y + node.height),
            }),
            { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
        );
        const dx = center.x - (bounds.left + bounds.right) / 2;
        const dy = center.y - (bounds.top + bounds.bottom) / 2;
        const idMap = new Map<string, string>();
        const nextNodes = clipboard.nodes
            .map((node, index) => {
                const id = `${node.type}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`;
                idMap.set(node.id, id);
                return {
                    ...node,
                    id,
                    title: node.title.endsWith(" Copy") ? node.title : `${node.title} Copy`,
                    position: {
                        x: node.position.x + dx,
                        y: node.position.y + dy,
                    },
                    metadata: node.metadata ? { ...node.metadata } : undefined,
                };
            })
            // 粘贴的编组框：子节点 id 已重新生成，需同步重映射 groupChildIds
            .map((node) => (node.metadata?.groupChildIds ? { ...node, metadata: { ...node.metadata, groupChildIds: node.metadata.groupChildIds.map((childId) => idMap.get(childId) ?? childId) } } : node));

        const nextConnections = clipboard.connections.flatMap((connection, index) => {
            const fromNodeId = idMap.get(connection.fromNodeId);
            const toNodeId = idMap.get(connection.toNodeId);
            if (!fromNodeId || !toNodeId) return [];
            return [
                {
                    ...connection,
                    id: `conn-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
                    fromNodeId,
                    toNodeId,
                },
            ];
        });

        setNodes((prev) => [...prev, ...nextNodes]);
        setConnections((prev) => [...prev, ...nextConnections]);
        setSelectedNodeIds(new Set(nextNodes.map((node) => node.id)));
        setSelectedConnectionId(null);
        setContextMenu(null);
        setDialogNodeId(nextNodes[0]?.id || null);
        return true;
    }, [getCanvasCenter, setNodes, setConnections, setSelectedNodeIds, setSelectedConnectionId, setContextMenu, setDialogNodeId]);

    return {
        clipboardRef,
        copySelectedNodes,
        pasteCopiedNodes,
    };
}
