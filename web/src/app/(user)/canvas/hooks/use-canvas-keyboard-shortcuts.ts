"use client";

import { useEffect } from "react";

interface CanvasKeyboardShortcutHandlers {
    onUndo: () => void;
    onRedo: () => void;
    onSelectAll: () => void;
    onDelete: () => void;
    onCopy: () => void;
    onPaste: () => void;
    onEscape: () => void;
    onGroup: () => void;
    onUngroup: () => void;
}

export function useCanvasKeyboardShortcuts(handlers: CanvasKeyboardShortcutHandlers) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target instanceof Element ? event.target : null;
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || target?.closest("[contenteditable='true'],[data-canvas-no-zoom]")) return;

            const key = event.key.toLowerCase();
            const isModifierShortcut = event.metaKey || event.ctrlKey;

            if (isModifierShortcut && !event.altKey && key === "z") {
                event.preventDefault();
                if (event.shiftKey) handlers.onRedo();
                else handlers.onUndo();
                return;
            }

            if (isModifierShortcut && !event.altKey && key === "y") {
                event.preventDefault();
                handlers.onRedo();
                return;
            }

            if (isModifierShortcut && !event.altKey && key === "a") {
                event.preventDefault();
                handlers.onSelectAll();
                return;
            }

            if (isModifierShortcut && !event.altKey && key === "c") {
                event.preventDefault();
                handlers.onCopy();
                return;
            }

            if (isModifierShortcut && !event.altKey && key === "v") {
                event.preventDefault();
                handlers.onPaste();
                return;
            }

            if (isModifierShortcut && !event.altKey && key === "g") {
                event.preventDefault();
                if (event.shiftKey) handlers.onUngroup();
                else handlers.onGroup();
                return;
            }

            if (event.key === "Delete" || event.key === "Backspace") {
                handlers.onDelete();
            }

            if (event.key === "Escape") {
                handlers.onEscape();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handlers.onCopy, handlers.onDelete, handlers.onEscape, handlers.onGroup, handlers.onPaste, handlers.onRedo, handlers.onSelectAll, handlers.onUndo, handlers.onUngroup]);
}
