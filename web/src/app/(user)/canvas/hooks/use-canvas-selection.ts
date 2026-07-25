"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ContextMenuState } from "../types";

type SelectionSetters = {
    setContextMenu: (value: ContextMenuState | null | ((prev: ContextMenuState | null) => ContextMenuState | null)) => void;
};

export function useCanvasSelection(setters?: SelectionSetters) {
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
    const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

    // Ref for callback access — synced on every render
    const selectedNodeIdsRef = useRef(selectedNodeIds);
    useEffect(() => {
        selectedNodeIdsRef.current = selectedNodeIds;
    });

    const hasMultipleSelectedNodes = selectedNodeIds.size > 1;
    const activeNodeId = useMemo(
        () =>
            hasMultipleSelectedNodes
                ? null
                : hoveredNodeId || (selectedNodeIds.size === 1 ? Array.from(selectedNodeIds)[0] : null),
        [hasMultipleSelectedNodes, hoveredNodeId, selectedNodeIds],
    );

    const selectSingleNode = useCallback((nodeId: string) => {
        setSelectedNodeIds(new Set([nodeId]));
        setSelectedConnectionId(null);
    }, []);

    const toggleNodeSelection = useCallback((nodeId: string) => {
        setSelectedNodeIds((prev) => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
        setSelectedConnectionId(null);
    }, []);

    const deselectCanvas = useCallback(() => {
        setSelectedNodeIds(new Set());
        setSelectedConnectionId(null);
        setHoveredNodeId(null);
        setters?.setContextMenu(null);
    }, [setters]);

    return {
        // State
        selectedNodeIds,
        setSelectedNodeIds,
        selectedConnectionId,
        setSelectedConnectionId,
        hoveredNodeId,
        setHoveredNodeId,
        // Ref
        selectedNodeIdsRef,
        // Derived
        activeNodeId,
        hasMultipleSelectedNodes,
        // Actions
        deselectCanvas,
        selectSingleNode,
        toggleNodeSelection,
    };
}
