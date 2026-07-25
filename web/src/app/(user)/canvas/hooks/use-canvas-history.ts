"use client";

import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { CanvasAssistantSession, CanvasConnection, CanvasNodeData, ContextMenuState } from "../types";
import type { CanvasBackgroundMode } from "@/lib/canvas-theme";
import type { CanvasHistoryEntry } from "../utils/canvas-utils";

type HistorySetters = {
    setNodes: Dispatch<SetStateAction<CanvasNodeData[]>>;
    setConnections: Dispatch<SetStateAction<CanvasConnection[]>>;
    setChatSessions: Dispatch<SetStateAction<CanvasAssistantSession[]>>;
    setActiveChatId: Dispatch<SetStateAction<string | null>>;
    setBackgroundMode: Dispatch<SetStateAction<CanvasBackgroundMode>>;
    setShowImageInfo: Dispatch<SetStateAction<boolean>>;
    setSelectedNodeIds: Dispatch<SetStateAction<Set<string>>>;
    setSelectedConnectionId: Dispatch<SetStateAction<string | null>>;
    setContextMenu: Dispatch<SetStateAction<ContextMenuState | null>>;
};

type HistoryState = {
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
    chatSessions: CanvasAssistantSession[];
    activeChatId: string | null;
    backgroundMode: CanvasBackgroundMode;
    showImageInfo: boolean;
};

export function useCanvasHistory(state: HistoryState, setters: HistorySetters) {
    const historyRef = useRef<{ past: CanvasHistoryEntry[]; future: CanvasHistoryEntry[] }>({ past: [], future: [] });
    const lastHistoryRef = useRef<CanvasHistoryEntry | null>(null);
    const historyCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const applyingHistoryRef = useRef(false);
    const historyPausedRef = useRef(false);
    const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

    const createHistoryEntry = useCallback(
        (): CanvasHistoryEntry => ({
            nodes: state.nodes,
            connections: state.connections,
            chatSessions: state.chatSessions,
            activeChatId: state.activeChatId,
            backgroundMode: state.backgroundMode,
            showImageInfo: state.showImageInfo,
        }),
        [
            state.activeChatId,
            state.backgroundMode,
            state.chatSessions,
            state.connections,
            state.nodes,
            state.showImageInfo,
        ],
    );

    const applyHistory = useCallback(
        (entry: CanvasHistoryEntry) => {
            if (historyCommitTimerRef.current) {
                clearTimeout(historyCommitTimerRef.current);
                historyCommitTimerRef.current = null;
            }
            applyingHistoryRef.current = true;
            setters.setNodes(entry.nodes);
            setters.setConnections(entry.connections);
            setters.setChatSessions(entry.chatSessions);
            setters.setActiveChatId(entry.activeChatId);
            setters.setBackgroundMode(entry.backgroundMode);
            setters.setShowImageInfo(entry.showImageInfo);
            setters.setSelectedNodeIds(new Set());
            setters.setSelectedConnectionId(null);
            setters.setContextMenu(null);
            setTimeout(() => {
                lastHistoryRef.current = entry;
                applyingHistoryRef.current = false;
                setHistoryState({
                    canUndo: historyRef.current.past.length > 0,
                    canRedo: historyRef.current.future.length > 0,
                });
            });
        },
        // setters are stable (from useState), safe to omit
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const undoCanvas = useCallback(() => {
        const previous = historyRef.current.past.pop();
        const current = lastHistoryRef.current;
        if (!previous || !current) return;
        historyRef.current.future.push(current);
        applyHistory(previous);
    }, [applyHistory]);

    const redoCanvas = useCallback(() => {
        const next = historyRef.current.future.pop();
        const current = lastHistoryRef.current;
        if (!next || !current) return;
        historyRef.current.past.push(current);
        applyHistory(next);
    }, [applyHistory]);

    const resetHistory = useCallback(() => {
        historyRef.current = { past: [], future: [] };
        if (historyCommitTimerRef.current) {
            clearTimeout(historyCommitTimerRef.current);
            historyCommitTimerRef.current = null;
        }
        setHistoryState({ canUndo: false, canRedo: false });
    }, []);

    const updateLastHistoryEntry = useCallback((entry: CanvasHistoryEntry) => {
        lastHistoryRef.current = entry;
    }, []);

    return {
        historyRef,
        lastHistoryRef,
        historyCommitTimerRef,
        applyingHistoryRef,
        historyPausedRef,
        historyState,
        setHistoryState,
        createHistoryEntry,
        applyHistory,
        undoCanvas,
        redoCanvas,
        resetHistory,
        updateLastHistoryEntry,
    };
}
