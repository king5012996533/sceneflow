"use client";

import { useCallback, useRef } from "react";
import type { Position } from "../types";

type FileImportTarget = {
    nodeId?: string;
    position?: Position;
};

type FileImportOptions = {
    onFilesSelected: (files: FileList, target?: FileImportTarget) => void;
    onFilesDropped: (files: FileList, worldPos: Position) => void;
    screenToCanvas: (clientX: number, clientY: number) => Position;
};

export function useCanvasFileImport(options: FileImportOptions) {
    const imageInputRef = useRef<HTMLInputElement>(null);
    const uploadTargetRef = useRef<FileImportTarget | null>(null);
    // Use refs to avoid stale closures and keep returned handlers stable
    const onFilesSelectedRef = useRef(options.onFilesSelected);
    const onFilesDroppedRef = useRef(options.onFilesDropped);
    const screenToCanvasRef = useRef(options.screenToCanvas);
    onFilesSelectedRef.current = options.onFilesSelected;
    onFilesDroppedRef.current = options.onFilesDropped;
    screenToCanvasRef.current = options.screenToCanvas;

    const handleUploadRequest = useCallback((nodeId?: string, position?: Position) => {
        uploadTargetRef.current = { nodeId, position };
        imageInputRef.current?.click();
    }, []);

    const handleImageInputChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (!files?.length) return;
            const target = uploadTargetRef.current;
            onFilesSelectedRef.current(files, target ?? undefined);
            uploadTargetRef.current = null;
            event.target.value = "";
        },
        [],
    );

    const handleDrop = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            const files = event.dataTransfer.files;
            if (!files.length) return;
            const worldPos = screenToCanvasRef.current(event.clientX, event.clientY);
            onFilesDroppedRef.current(files, worldPos);
        },
        [],
    );

    return {
        imageInputRef,
        uploadTargetRef,
        handleUploadRequest,
        handleImageInputChange,
        handleDrop,
    };
}
