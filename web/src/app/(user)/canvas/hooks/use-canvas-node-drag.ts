"use client";

import { useCallback, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { CanvasNodeType } from "../types";
import type { CanvasNodeData, ContextMenuState } from "../types";

type DragState = {
    isDraggingNode: boolean;
    hasMoved: boolean;
    startX: number;
    startY: number;
    initialSelectedNodes: { id: string; x: number; y: number }[];
};

type UseCanvasNodeDragOptions = {
    nodesRef: React.MutableRefObject<CanvasNodeData[]>;
    selectedNodeIdsRef: React.MutableRefObject<Set<string>>;
    viewportRef: React.MutableRefObject<{ x: number; y: number; k: number }>;
    historyPausedRef: React.MutableRefObject<boolean>;
    setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>;
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    setSelectedConnectionId: (id: string | null) => void;
    setContextMenu: React.Dispatch<React.SetStateAction<ContextMenuState | null>>;
    setDialogNodeId: (id: string | null | ((prev: string | null) => string | null)) => void;
};

export function useCanvasNodeDrag(options: UseCanvasNodeDragOptions) {
    const { nodesRef, selectedNodeIdsRef, viewportRef, historyPausedRef, setNodes, setSelectedNodeIds, setSelectedConnectionId, setContextMenu, setDialogNodeId } = options;

    const [isNodeDragging, setIsNodeDragging] = useState(false);
    const [draggingNodeIds, setDraggingNodeIds] = useState<Set<string>>(new Set());
    const nodeDraggingRef = useRef(false);
    const rafRef = useRef<number | null>(null);
    const dragRef = useRef<DragState>({
        isDraggingNode: false,
        hasMoved: false,
        startX: 0,
        startY: 0,
        initialSelectedNodes: [],
    });

    const handleNodePointerDown = useCallback(
        (event: ReactMouseEvent, nodeId: string) => {
            event.stopPropagation();
            setContextMenu(null);
            setSelectedConnectionId(null);

            const currentSelected = selectedNodeIdsRef.current;
            const currentNodes = nodesRef.current;
            const nextSelected = new Set(currentSelected);

            if (event.shiftKey || event.metaKey || event.ctrlKey) {
                if (nextSelected.has(nodeId)) {
                    nextSelected.delete(nodeId);
                } else {
                    nextSelected.add(nodeId);
                }
            } else if (!nextSelected.has(nodeId)) {
                nextSelected.clear();
                nextSelected.add(nodeId);
            }

            setSelectedNodeIds(nextSelected);
            const dragIds = new Set(nextSelected);
            currentNodes.forEach((node) => {
                if (nextSelected.has(node.id)) node.metadata?.batchChildIds?.forEach((childId) => dragIds.add(childId));
            });
            dragRef.current = {
                isDraggingNode: true,
                hasMoved: false,
                startX: event.clientX,
                startY: event.clientY,
                initialSelectedNodes: currentNodes.filter((node) => dragIds.has(node.id)).map((node) => ({ id: node.id, x: node.position.x, y: node.position.y })),
            };
            historyPausedRef.current = true;
            nodeDraggingRef.current = true;
            setDraggingNodeIds(new Set(dragIds));
            setIsNodeDragging(true);
        },
        [selectedNodeIdsRef, nodesRef, historyPausedRef, setContextMenu, setSelectedConnectionId, setSelectedNodeIds, setIsNodeDragging],
    );

    const handleNodeDragPointerMove = useCallback(
        (event: MouseEvent) => {
            const currentViewport = viewportRef.current;

            if (!dragRef.current.isDraggingNode) return;

            const dx = (event.clientX - dragRef.current.startX) / currentViewport.k;
            const dy = (event.clientY - dragRef.current.startY) / currentViewport.k;
            const initialPositions = dragRef.current.initialSelectedNodes;
            if (Math.abs(event.clientX - dragRef.current.startX) > 3 || Math.abs(event.clientY - dragRef.current.startY) > 3) {
                dragRef.current.hasMoved = true;
                if (document.body.style.cursor !== "grabbing") document.body.style.cursor = "grabbing";
            }

            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => {
                setNodes((prev) =>
                    prev.map((node) => {
                        const initial = initialPositions.find((item) => item.id === node.id);
                        return initial ? { ...node, position: { x: initial.x + dx, y: initial.y + dy } } : node;
                    }),
                );
                rafRef.current = null;
            });
        },
        [viewportRef, setNodes],
    );

    const finishNodeDrag = useCallback(
        (clientX?: number, clientY?: number) => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            if (!dragRef.current.isDraggingNode) return;

            const wasClick = !dragRef.current.hasMoved && dragRef.current.initialSelectedNodes.length === 1;
            const clickedNodeId = dragRef.current.initialSelectedNodes[0]?.id;
            const currentViewport = viewportRef.current;
            const dx = clientX == null ? 0 : (clientX - dragRef.current.startX) / currentViewport.k;
            const dy = clientY == null ? 0 : (clientY - dragRef.current.startY) / currentViewport.k;
            const initialPositions = dragRef.current.initialSelectedNodes;

            historyPausedRef.current = false;
            nodeDraggingRef.current = false;
            setDraggingNodeIds(new Set());
            if (document.body.style.cursor === "grabbing") document.body.style.cursor = "";
            setIsNodeDragging(false);
            if (dragRef.current.hasMoved && clientX != null && clientY != null) {
                setNodes((prev) =>
                    prev.map((node) => {
                        const initial = initialPositions.find((item) => item.id === node.id);
                        if (!initial) return node;
                        return { ...node, position: { x: initial.x + dx, y: initial.y + dy } };
                    }),
                );
            }

            dragRef.current.isDraggingNode = false;
            dragRef.current.hasMoved = false;
            dragRef.current.initialSelectedNodes = [];
            if (wasClick && clickedNodeId) {
                const clickedNode = nodesRef.current.find((node) => node.id === clickedNodeId);
                if (clickedNode?.type === CanvasNodeType.Text) {
                    setDialogNodeId((current) => (current === clickedNodeId ? current : null));
                } else {
                    setDialogNodeId(clickedNodeId);
                }
            }
        },
        [viewportRef, nodesRef, historyPausedRef, setNodes, setDialogNodeId, setIsNodeDragging],
    );

    return {
        isNodeDragging,
        draggingNodeIds,
        nodeDraggingRef,
        dragRef,
        rafRef,
        handleNodePointerDown,
        handleNodeDragPointerMove,
        finishNodeDrag,
    };
}
