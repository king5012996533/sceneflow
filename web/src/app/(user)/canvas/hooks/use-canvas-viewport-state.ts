"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Position, ViewportTransform } from "../types";

type ViewportStateOptions = {
    projectId: string;
    projectLoaded: boolean;
    updateProject: (projectId: string, data: { viewport?: ViewportTransform }) => void;
};

export function useCanvasViewportState(options: ViewportStateOptions) {
    const { projectId, projectLoaded, updateProject } = options;

    const containerRef = useRef<HTMLDivElement>(null);
    const viewportSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const didInitialCenterRef = useRef(false);
    const [viewport, setViewport] = useState<ViewportTransform>({ x: 0, y: 0, k: 1 });
    const [size, setSize] = useState({ width: 1200, height: 720 });
    const viewportRef = useRef(viewport);

    // Sync ref on every render
    useLayoutEffect(() => {
        viewportRef.current = viewport;
    });

    // Debounced viewport persistence
    useEffect(() => {
        if (!projectLoaded) return;
        if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
        viewportSaveTimerRef.current = setTimeout(() => {
            updateProject(projectId, { viewport: viewportRef.current });
            viewportSaveTimerRef.current = null;
        }, 500);
        return () => {
            if (viewportSaveTimerRef.current) clearTimeout(viewportSaveTimerRef.current);
        };
    }, [projectId, projectLoaded, updateProject, viewport]);

    // Container resize observer + initial center
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const updateSize = () => {
            const rect = el.getBoundingClientRect();
            setSize({ width: rect.width, height: rect.height });
            if (!didInitialCenterRef.current) {
                didInitialCenterRef.current = true;
                setViewport({ x: rect.width / 2, y: rect.height / 2, k: 1 });
            }
        };

        updateSize();
        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(el);
        return () => resizeObserver.disconnect();
    }, []);

    const screenToCanvas = useCallback((clientX: number, clientY: number): Position => {
        const rect = containerRef.current?.getBoundingClientRect();
        const currentViewport = viewportRef.current;
        const localX = clientX - (rect?.left || 0);
        const localY = clientY - (rect?.top || 0);

        return {
            x: (localX - currentViewport.x) / currentViewport.k,
            y: (localY - currentViewport.y) / currentViewport.k,
        };
    }, []);

    const getCanvasCenter = useCallback((): Position => {
        const rect = containerRef.current?.getBoundingClientRect();
        return screenToCanvas(
            (rect?.left || 0) + (rect?.width || size.width) / 2,
            (rect?.top || 0) + (rect?.height || size.height) / 2,
        );
    }, [screenToCanvas, size.height, size.width]);

    const resetViewport = useCallback(() => {
        setViewport({ x: size.width / 2, y: size.height / 2, k: 1 });
    }, [size.height, size.width]);

    const setZoomScale = useCallback(
        (scale: number) => {
            const nextScale = Math.min(Math.max(scale, 0.05), 5);
            setViewport((prev) => ({
                x: size.width / 2 - ((size.width / 2 - prev.x) / prev.k) * nextScale,
                y: size.height / 2 - ((size.height / 2 - prev.y) / prev.k) * nextScale,
                k: nextScale,
            }));
        },
        [size.height, size.width],
    );

    return {
        containerRef,
        viewport,
        setViewport,
        size,
        setSize,
        viewportRef,
        viewportSaveTimerRef,
        screenToCanvas,
        getCanvasCenter,
        resetViewport,
        setZoomScale,
    };
}
