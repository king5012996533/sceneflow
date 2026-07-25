"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { CanvasNodeData, Position, SelectionBox } from "../types";
import { isHiddenBatchChild } from "../utils/canvas-utils";

type UseCanvasPointerInteractionsOptions = {
    screenToCanvas: (clientX: number, clientY: number) => Position;
    nodesRef: React.MutableRefObject<CanvasNodeData[]>;
    selectedNodeIdsRef: React.MutableRefObject<Set<string>>;
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<Set<string>>>;
};

export function useCanvasPointerInteractions(options: UseCanvasPointerInteractionsOptions) {
    const { screenToCanvas, nodesRef, selectedNodeIdsRef, setSelectedNodeIds } = options;

    const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
    const selectionBoxRef = useRef<SelectionBox | null>(null);

    // Sync ref on every render
    useLayoutEffect(() => {
        selectionBoxRef.current = selectionBox;
    }, [selectionBox]);

    const startSelectionBox = useCallback(
        (clientX: number, clientY: number, additive: boolean) => {
            const world = screenToCanvas(clientX, clientY);
            const nextSelectionBox: SelectionBox = {
                startWorldX: world.x,
                startWorldY: world.y,
                currentWorldX: world.x,
                currentWorldY: world.y,
                additive,
                initialSelectedNodeIds: additive ? Array.from(selectedNodeIdsRef.current) : [],
            };
            selectionBoxRef.current = nextSelectionBox;
            setSelectionBox(nextSelectionBox);
        },
        [screenToCanvas, selectedNodeIdsRef],
    );

    const clearSelectionBox = useCallback(() => {
        selectionBoxRef.current = null;
        setSelectionBox(null);
    }, []);

    const handleGlobalPointerMove = useCallback(
        (event: PointerEvent) => {
            const currentSelection = selectionBoxRef.current;
            if (!currentSelection) return;

            if (event.buttons === 0) {
                selectionBoxRef.current = null;
                setSelectionBox(null);
                return;
            }

            const world = screenToCanvas(event.clientX, event.clientY);
            const rectX = Math.min(currentSelection.startWorldX, world.x);
            const rectY = Math.min(currentSelection.startWorldY, world.y);
            const rectW = Math.abs(world.x - currentSelection.startWorldX);
            const rectH = Math.abs(world.y - currentSelection.startWorldY);
            const nextSelected = new Set<string>(currentSelection.additive ? currentSelection.initialSelectedNodeIds : []);

            nodesRef.current
                .filter((node) => !isHiddenBatchChild(node, nodesRef.current))
                .forEach((node) => {
                    const intersects =
                        rectX < node.position.x + node.width &&
                        rectX + rectW > node.position.x &&
                        rectY < node.position.y + node.height &&
                        rectY + rectH > node.position.y;

                    if (intersects) nextSelected.add(node.id);
                });

            const nextSelectionBox = { ...currentSelection, currentWorldX: world.x, currentWorldY: world.y };
            selectionBoxRef.current = nextSelectionBox;
            setSelectionBox(nextSelectionBox);
            setSelectedNodeIds(nextSelected);
        },
        [screenToCanvas, nodesRef, setSelectedNodeIds],
    );

    return {
        selectionBox,
        selectionBoxRef,
        startSelectionBox,
        clearSelectionBox,
        handleGlobalPointerMove,
    };
}
