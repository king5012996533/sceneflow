"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { CanvasNodeData, ConnectionHandle, Position } from "../types";
import type { ConnectionDropTarget, PendingConnectionCreate } from "../utils/canvas-utils";

type UseCanvasConnectionCreationOptions = {
    nodesRef: React.MutableRefObject<CanvasNodeData[]>;
    screenToCanvas: (clientX: number, clientY: number) => Position;
    getConnectionDropTarget: (clientX: number, clientY: number, current: ConnectionHandle) => ConnectionDropTarget;
    connectNodes: (current: ConnectionHandle, targetNodeId: string) => void;
};

export function useCanvasConnectionCreation(options: UseCanvasConnectionCreationOptions) {
    const { nodesRef, screenToCanvas, getConnectionDropTarget, connectNodes } = options;

    const [connectingParams, setConnectingParams] = useState<ConnectionHandle | null>(null);
    const [connectionTargetNodeId, setConnectionTargetNodeId] = useState<string | null>(null);
    const [pendingConnectionCreate, setPendingConnectionCreate] = useState<PendingConnectionCreate | null>(null);

    const connectingParamsRef = useRef(connectingParams);
    const connectionTargetNodeIdRef = useRef(connectionTargetNodeId);
    const pendingConnectionCreateRef = useRef(pendingConnectionCreate);

    // Sync refs on every render
    useLayoutEffect(() => { connectingParamsRef.current = connectingParams; }, [connectingParams]);
    useLayoutEffect(() => { connectionTargetNodeIdRef.current = connectionTargetNodeId; }, [connectionTargetNodeId]);
    useLayoutEffect(() => { pendingConnectionCreateRef.current = pendingConnectionCreate; }, [pendingConnectionCreate]);

    // Convenience setter that keeps connectingParams + connectionTargetNodeId in sync
    const setConnecting = useCallback((next: ConnectionHandle | null) => {
        connectingParamsRef.current = next;
        setConnectingParams(next);
        if (!next) {
            connectionTargetNodeIdRef.current = null;
            setConnectionTargetNodeId(null);
        }
    }, []);

    // Connection handle pointer down: starts a new connection drag
    const startConnection = useCallback(
        (event: ReactMouseEvent, nodeId: string, handleType: "source" | "target") => {
            event.stopPropagation();
            setConnecting({ nodeId, handleType });
            connectionTargetNodeIdRef.current = null;
            setConnectionTargetNodeId(null);
        },
        [setConnecting],
    );

    // Updates the connection target node as the pointer moves
    const updateConnectionTarget = useCallback(
        (clientX: number, clientY: number) => {
            if (!connectingParamsRef.current || pendingConnectionCreateRef.current) return;
            const dropTarget = getConnectionDropTarget(clientX, clientY, connectingParamsRef.current);
            connectionTargetNodeIdRef.current = dropTarget.nodeId;
            setConnectionTargetNodeId(dropTarget.nodeId);
        },
        [getConnectionDropTarget],
    );

    // Completes the connection: snap to target, show pending menu for empty space
    const finishConnection = useCallback(
        (clientX: number, clientY: number) => {
            const currentConnection = connectingParamsRef.current;
            if (!currentConnection) return;

            const dropTarget = getConnectionDropTarget(clientX, clientY, currentConnection);
            if (dropTarget.nodeId) {
                connectNodes(currentConnection, dropTarget.nodeId);
                setConnecting(null);
            } else if (dropTarget.isNearNode) {
                setConnecting(null);
            } else {
                setPendingConnectionCreate({
                    connection: currentConnection,
                    position: screenToCanvas(clientX, clientY),
                });
            }
        },
        [connectNodes, getConnectionDropTarget, screenToCanvas, setConnecting],
    );

    // Cancel the current connection creation entirely
    const cancelConnection = useCallback(() => {
        setConnecting(null);
    }, [setConnecting]);

    // Cancel the pending create menu
    const cancelPendingConnectionCreate = useCallback(() => {
        setPendingConnectionCreate(null);
        setConnecting(null);
    }, [setConnecting]);

    return {
        connectingParams,
        connectionTargetNodeId,
        pendingConnectionCreate,
        connectingParamsRef,
        connectionTargetNodeIdRef,
        pendingConnectionCreateRef,
        setConnecting,
        startConnection,
        updateConnectionTarget,
        finishConnection,
        cancelConnection,
        cancelPendingConnectionCreate,
    };
}
