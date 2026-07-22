"use client";

import { Box, Camera, ExternalLink } from "lucide-react";

import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import type { CanvasNodeData } from "../types";

export function DirectorShotNodeContent({ node, onOpen }: { node: CanvasNodeData; onOpen: (node: CanvasNodeData) => void }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const previewUrl = node.metadata?.content;
    const captureCount = node.metadata?.directorCaptureCount || 0;

    return (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[inherit]" style={{ background: theme.node.fill, color: theme.node.text }}>
            <div className="relative min-h-0 flex-1 overflow-hidden">
                {previewUrl ? (
                    <img src={previewUrl} alt={node.title} draggable={false} className="block h-full w-full select-none object-cover" />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center" style={{ color: theme.node.placeholder }}>
                        <span className="grid size-14 place-items-center rounded-2xl" style={{ background: theme.toolbar.activeBg }}>
                            <Box className="size-7 opacity-55" />
                        </span>
                        <span className="text-sm font-medium">3D Shot Director</span>
                        <span className="max-w-[260px] text-xs leading-5 opacity-65">Stage the scene, set cameras, then send captures back to the canvas.</span>
                    </div>
                )}
                <div className="pointer-events-none absolute left-3 top-3 rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur" style={{ background: `${theme.toolbar.panel}e6`, borderColor: theme.toolbar.border }}>
                    3D Shot
                </div>
            </div>
            <div className="flex h-14 items-center justify-between gap-3 border-t px-3" style={{ borderColor: theme.toolbar.border, background: theme.node.panel }}>
                <span className="inline-flex min-w-0 items-center gap-1.5 text-xs opacity-70">
                    <Camera className="size-3.5 shrink-0" />
                    <span className="truncate">{captureCount ? `${captureCount} captures` : "No captures yet"}</span>
                </span>
                <button
                    type="button"
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition hover:scale-[1.02]"
                    style={{ borderColor: theme.toolbar.border, background: theme.toolbar.activeBg, color: theme.toolbar.activeText }}
                    onClick={(event) => {
                        event.stopPropagation();
                        onOpen(node);
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                >
                    <ExternalLink className="size-3.5" />
                    Open
                </button>
            </div>
        </div>
    );
}
