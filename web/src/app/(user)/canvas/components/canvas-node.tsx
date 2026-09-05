"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronRight, CircleAlert, Clapperboard, Image as ImageIcon, Layers, Music2, Play, RefreshCw, SlidersHorizontal, Star, Type as TypeIcon, Video } from "lucide-react";

import { canvasThemes } from "@/lib/canvas-theme";
import { formatBytes } from "@/lib/image-utils";
import { upgradeInsecureMediaUrl } from "@/lib/media-url";
import { useThemeStore } from "@/stores/use-theme-store";
import { CanvasResourceMentionTextarea } from "./canvas-resource-mention-textarea";
import { CanvasNodeType, type CanvasNodeData, type Position } from "../types";
import { summarizeCanvasGenerationError } from "../utils/canvas-generation-error";
import type { CanvasResourceReference } from "../utils/canvas-resource-references";

type ResizeCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type CanvasThemeLike = (typeof canvasThemes)[keyof typeof canvasThemes];

/** 活动色（加载 / 进行中）：统一使用类型色板中的橙色。 */
function activityColor(theme: CanvasThemeLike) {
    return theme.type.video;
}

/** 类型色：每种节点一种品牌色，用于端口、图标、选中描边与状态点。 */
function typeColorOf(node: CanvasNodeData, theme: CanvasThemeLike) {
    switch (node.type) {
        case CanvasNodeType.Image:
            return theme.type.image;
        case CanvasNodeType.Video:
            return theme.type.video;
        case CanvasNodeType.Text:
            return theme.type.text;
        case CanvasNodeType.Config:
            return theme.type.config;
        case CanvasNodeType.Audio:
            return theme.type.audio;
        case CanvasNodeType.DirectorShot:
            return theme.type.director;
        case CanvasNodeType.Group:
            return theme.type.group;
        default:
            return theme.node.muted;
    }
}

/** 主题感知的节点状态色：loading 用活动橙，error 用警示红，其余弱化。 */
function statusColorOf(theme: CanvasThemeLike, status: string | undefined) {
    if (status === "loading") return activityColor(theme);
    if (status === "error") return theme.type.danger;
    return theme.node.muted;
}

/** 混合两个 6 位 hex 颜色，weight 为后者占比（0-1）。 */
function mixHex(a: string, b: string, weight: number) {
    const pa = parseInt(a.slice(1), 16);
    const pb = parseInt(b.slice(1), 16);
    const ra = (pa >> 16) & 255;
    const ga = (pa >> 8) & 255;
    const ba = pa & 255;
    const rb = (pb >> 16) & 255;
    const gb = (pb >> 8) & 255;
    const bb = pb & 255;
    const r = Math.round(ra + (rb - ra) * weight);
    const g = Math.round(ga + (gb - ga) * weight);
    const bl = Math.round(ba + (bb - ba) * weight);
    return `rgb(${r}, ${g}, ${bl})`;
}

type CanvasNodeProps = {
    data: CanvasNodeData;
    scale: number;
    isSelected: boolean;
    isDragging?: boolean;
    isRelated: boolean;
    isFocusRelated: boolean;
    isConnectionTarget: boolean;
    isConnecting: boolean;
    editRequestNonce?: number;
    showPanel: boolean;
    showImageInfo: boolean;
    resourceLabel?: CanvasResourceReference;
    mentionReferences?: CanvasResourceReference[];
    renderPanel?: (node: CanvasNodeData) => ReactNode;
    renderNodeContent?: (node: CanvasNodeData) => ReactNode;
    batchCount?: number;
    batchExpanded?: boolean;
    batchClosing?: boolean;
    batchOpening?: boolean;
    batchRecovering?: boolean;
    batchMotion?: { x: number; y: number; index: number };
    onMouseDown: (event: React.MouseEvent, nodeId: string) => void;
    onHoverStart: (nodeId: string) => void;
    onHoverEnd: (nodeId: string) => void;
    onConnectStart: (event: React.MouseEvent, nodeId: string, handleType: "source" | "target") => void;
    onResize: (nodeId: string, width: number, height: number, position?: Position) => void;
    onContentChange: (nodeId: string, content: string) => void;
    onTitleChange: (nodeId: string, title: string) => void;
    onToggleBatch?: (nodeId: string) => void;
    onSetBatchPrimary?: (node: CanvasNodeData) => void;
    onRetry?: (node: CanvasNodeData) => void;
    onGenerateImage?: (node: CanvasNodeData) => void;
    onViewImage?: (node: CanvasNodeData) => void;
    onContextMenu: (event: React.MouseEvent, nodeId: string) => void;
};

type NodeContentRendererProps = {
    node: CanvasNodeData;
    theme: (typeof canvasThemes)[keyof typeof canvasThemes];
    isEditingContent: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    isBatchRoot: boolean;
    batchCount: number;
    batchExpanded: boolean;
    batchOpening: boolean;
    batchRecovering: boolean;
    renderNodeContent?: (node: CanvasNodeData) => ReactNode;
    onContentChange: (nodeId: string, content: string) => void;
    onTitleChange: (nodeId: string, title: string) => void;
    onStopEditing: () => void;
    mentionReferences: CanvasResourceReference[];
    onRetry?: (node: CanvasNodeData) => void;
    onGenerateImage?: (node: CanvasNodeData) => void;
    onToggleBatch?: () => void;
    onSetBatchPrimary?: () => void;
};

export const CanvasNode = React.memo(function CanvasNode({
    data,
    scale,
    isSelected,
    isDragging = false,
    isRelated,
    isFocusRelated,
    isConnectionTarget,
    isConnecting,
    editRequestNonce = 0,
    showPanel,
    showImageInfo,
    resourceLabel,
    mentionReferences = [],
    renderPanel,
    renderNodeContent,
    batchCount = 0,
    batchExpanded = false,
    batchClosing = false,
    batchOpening = false,
    batchRecovering = false,
    batchMotion,
    onMouseDown,
    onHoverStart,
    onHoverEnd,
    onConnectStart,
    onResize,
    onContentChange,
    onTitleChange,
    onToggleBatch,
    onSetBatchPrimary,
    onRetry,
    onGenerateImage,
    onViewImage,
    onContextMenu,
}: CanvasNodeProps) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const [hovered, setHovered] = useState(false);
    const [isEditingContent, setIsEditingContent] = useState(false);
    const hasImageContent = data.type === CanvasNodeType.Image && Boolean(data.metadata?.content);
    const hasVideoContent = data.type === CanvasNodeType.Video && Boolean(data.metadata?.content);
    const hasAudioContent = data.type === CanvasNodeType.Audio && Boolean(data.metadata?.content);
    const hasDirectorShotContent = data.type === CanvasNodeType.DirectorShot;
    const isGroup = data.type === CanvasNodeType.Group;
    const isBatchRoot = data.type === CanvasNodeType.Image && Boolean(data.metadata?.isBatchRoot) && batchCount > 1;
    const isBatchChild = data.type === CanvasNodeType.Image && Boolean(data.metadata?.batchRootId);
    const isActive = isConnectionTarget || isSelected || isFocusRelated;
    const nodeStatus = data.metadata?.status;
    const statusColor = statusColorOf(theme, nodeStatus);
    const typeColor = typeColorOf(data, theme);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(data.title || "");
    const resizeRef = useRef({
        isResizing: false,
        corner: "bottom-right" as ResizeCorner,
        startX: 0,
        startY: 0,
        startLeft: 0,
        startTop: 0,
        startWidth: 0,
        startHeight: 0,
        keepRatio: false,
        ratio: 1,
    });

    useEffect(() => {
        setTitleDraft(data.title || "");
    }, [data.title]);

    useEffect(() => {
        if (!isEditingTitle) return;
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
    }, [isEditingTitle]);

    const finishTitleEditing = useCallback(() => {
        const title = titleDraft.trim() || data.title || "未命名";
        setTitleDraft(title);
        setIsEditingTitle(false);
        if (title !== data.title) onTitleChange(data.id, title);
    }, [data.id, data.title, onTitleChange, titleDraft]);

    useEffect(() => {
        if (!isEditingTitle) return;
        const handleOutsidePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (target instanceof Node && titleInputRef.current?.contains(target)) return;
            finishTitleEditing();
        };
        window.addEventListener("pointerdown", handleOutsidePointerDown, true);
        return () => window.removeEventListener("pointerdown", handleOutsidePointerDown, true);
    }, [finishTitleEditing, isEditingTitle]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const handleWheel = (event: WheelEvent) => event.stopPropagation();
        textarea.addEventListener("wheel", handleWheel, { passive: false });
        return () => textarea.removeEventListener("wheel", handleWheel);
    }, [data.type, isEditingContent]);

    useEffect(() => {
        if (!isEditingContent) return;
        const textarea = textareaRef.current;
        textarea?.focus();
        textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
    }, [isEditingContent]);

    useEffect(() => {
        if (!editRequestNonce || data.type !== CanvasNodeType.Text) return;
        setIsEditingContent(true);
    }, [data.type, editRequestNonce]);

    useEffect(() => {
        if (!isEditingContent) return;

        const handleOutsidePointerDown = (event: PointerEvent) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (isEditingContent && textareaRef.current?.contains(target)) return;

            setIsEditingContent(false);
        };

        window.addEventListener("pointerdown", handleOutsidePointerDown, true);
        return () => window.removeEventListener("pointerdown", handleOutsidePointerDown, true);
    }, [isEditingContent]);

    const handleResizeMove = useCallback(
        (event: MouseEvent) => {
            if (!resizeRef.current.isResizing) return;

            const dx = (event.clientX - resizeRef.current.startX) / scale;
            const dy = (event.clientY - resizeRef.current.startY) / scale;
            const minWidth = 220;
            const minHeight = 160;
            const startRight = resizeRef.current.startLeft + resizeRef.current.startWidth;
            const startBottom = resizeRef.current.startTop + resizeRef.current.startHeight;
            const fromLeft = resizeRef.current.corner.includes("left");
            const fromTop = resizeRef.current.corner.includes("top");
            const rawWidth = Math.max(minWidth, resizeRef.current.startWidth + (fromLeft ? -dx : dx));
            const rawHeight = Math.max(minHeight, resizeRef.current.startHeight + (fromTop ? -dy : dy));
            let width = rawWidth;
            let height = rawHeight;
            if (resizeRef.current.keepRatio) {
                const ratio = resizeRef.current.ratio;
                if (Math.abs(dx) >= Math.abs(dy)) {
                    height = width / ratio;
                } else {
                    width = height * ratio;
                }
                if (height < minHeight) {
                    height = minHeight;
                    width = height * ratio;
                }
                if (width < minWidth) {
                    width = minWidth;
                    height = width / ratio;
                }
            }

            onResize(data.id, width, height, {
                x: fromLeft ? startRight - width : resizeRef.current.startLeft,
                y: fromTop ? startBottom - height : resizeRef.current.startTop,
            });
        },
        [data.id, onResize, scale],
    );

    const handleResizeUp = useCallback(() => {
        resizeRef.current.isResizing = false;
        window.removeEventListener("mousemove", handleResizeMove);
        window.removeEventListener("mouseup", handleResizeUp);
    }, [handleResizeMove]);

    const handleResizeMouseDown = (event: React.MouseEvent, corner: ResizeCorner) => {
        event.stopPropagation();
        event.preventDefault();
        resizeRef.current = {
            isResizing: true,
            corner,
            startX: event.clientX,
            startY: event.clientY,
            startLeft: data.position.x,
            startTop: data.position.y,
            startWidth: data.width,
            startHeight: data.height,
            keepRatio: (data.type === CanvasNodeType.Image && !data.metadata?.freeResize) || data.type === CanvasNodeType.Video,
            ratio: (data.metadata?.naturalWidth || data.width) / (data.metadata?.naturalHeight || data.height || 1),
        };
        window.addEventListener("mousemove", handleResizeMove);
        window.addEventListener("mouseup", handleResizeUp);
    };

    useEffect(() => {
        return () => {
            window.removeEventListener("mousemove", handleResizeMove);
            window.removeEventListener("mouseup", handleResizeUp);
        };
    }, [handleResizeMove, handleResizeUp]);

    return (
        <div
            data-node-id={data.id}
            className={`node-element absolute flex select-none flex-col transition-shadow duration-200 ${isGroup ? "z-[5]" : isDragging ? "z-[60]" : isSelected ? "z-50" : "z-10"}`}
            style={{
                transform: `translate(${data.position.x}px, ${data.position.y}px)`,
                width: data.width,
                height: data.height,
                transition: "box-shadow 200ms ease",
                contain: "layout style",
                willChange: isDragging ? "transform" : undefined,
            }}
            onMouseEnter={() => {
                setHovered(true);
                onHoverStart(data.id);
            }}
            onMouseLeave={() => {
                setHovered(false);
                onHoverEnd(data.id);
            }}
            onContextMenu={(event) => onContextMenu(event, data.id)}
        >
            <div
                className="relative flex h-full w-full flex-col overflow-visible rounded-[4px] border transition-[box-shadow,border-color] duration-150"
                style={{
                    background: hasImageContent || hasVideoContent || hasDirectorShotContent || isGroup ? "transparent" : hovered && !isDragging ? theme.node.panelHover : theme.node.panel,
                    borderColor: isActive ? typeColor : hovered && !isBatchChild ? mixHex(theme.node.stroke, typeColor, 0.45) : isRelated && !isBatchChild ? theme.node.muted : theme.node.stroke,
                    transform: isDragging ? "scale(1.02)" : hovered ? "translateY(-2px)" : undefined,
                    transition: "transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease, background 150ms ease",
                    boxShadow: isDragging
                        ? `0 26px 64px rgba(0,0,0,.32), 0 0 0 1px ${typeColor}44`
                        : isActive
                          ? `0 0 0 2px ${typeColor}38, 0 10px 34px rgba(0,0,0,.16)`
                          : isRelated && !isBatchChild
                            ? `0 0 0 1px ${theme.node.muted}55, 0 18px 48px rgba(0,0,0,.14)`
                            : hovered
                              ? `0 14px 40px rgba(0,0,0,.16)`
                              : undefined,
                }}
                onMouseDown={(event) => onMouseDown(event, data.id)}
                onDoubleClick={(event) => {
                    if (isBatchRoot) {
                        event.stopPropagation();
                        onToggleBatch?.(data.id);
                        return;
                    }
                    if (data.type === CanvasNodeType.Image && hasImageContent) {
                        event.stopPropagation();
                        onViewImage?.(data);
                        return;
                    }
                    if (data.type !== CanvasNodeType.Text) return;
                    event.stopPropagation();
                    setIsEditingContent(true);
                }}
            >
                {/* 卡头：类型图标 + 标题（双击重命名）+ 状态 */}
                <div className="flex h-[38px] shrink-0 items-center gap-2 border-b px-2.5" style={{ background: theme.node.panel, borderColor: `${theme.node.stroke}a6` }}>
                    <span className="grid size-[17px] shrink-0 place-items-center" style={{ color: typeColor }}>
                        <NodeTypeIcon type={data.type} className="size-[15px]" strokeWidth={1.5} />
                    </span>
                    {isEditingTitle ? (
                        <input
                            ref={titleInputRef}
                            value={titleDraft}
                            maxLength={64}
                            className="min-w-0 flex-1 border-b border-dashed bg-transparent text-xs font-semibold outline-none"
                            style={{ borderColor: theme.node.muted, color: theme.node.text }}
                            onChange={(event) => setTitleDraft(event.target.value)}
                            onBlur={finishTitleEditing}
                            onMouseDown={(event) => event.stopPropagation()}
                            onPointerDown={(event) => event.stopPropagation()}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") finishTitleEditing();
                                if (event.key === "Escape") {
                                    setTitleDraft(data.title || "");
                                    setIsEditingTitle(false);
                                }
                            }}
                        />
                    ) : (
                        <span
                            className="min-w-0 flex-1 truncate text-xs font-semibold"
                            style={{ color: theme.node.text }}
                            title="双击重命名"
                            onDoubleClick={(event) => {
                                event.stopPropagation();
                                setIsEditingTitle(true);
                            }}
                        >
                            {data.title || "未命名"}
                        </span>
                    )}
                    <span className="shrink-0 font-mono text-[9px] leading-none" style={{ color: isSelected || hovered ? typeColor : theme.node.faint }}>
                        {isSelected ? "选中" : hovered ? "悬浮" : NODE_TYPE_LABELS[data.type]}
                    </span>
                </div>

                {/* 卡体：内容区 */}
                <div className="relative min-h-0 flex-1 p-2.5">
                    <div
                        className={`relative flex h-full w-full items-center justify-center rounded-[inherit] ${isBatchRoot ? "overflow-visible" : "overflow-hidden"}`}
                        style={
                            {
                                "--batch-from-x": `${batchMotion?.x || 0}px`,
                                "--batch-from-y": `${batchMotion?.y || 0}px`,
                                "--batch-from-rotate": `${6 + (batchMotion?.index || 0) * 4}deg`,
                                animation: data.metadata?.batchRootId ? (batchClosing ? "canvas-batch-child-out 260ms cubic-bezier(.4,0,.2,1) both" : "canvas-batch-child-in 340ms cubic-bezier(.2,.85,.18,1) both") : undefined,
                                animationDelay: data.metadata?.batchRootId ? `${batchClosing ? 0 : 45 + (batchMotion?.index || 0) * 24}ms` : undefined,
                            } as React.CSSProperties
                        }
                    >
                        <NodeContent
                            node={data}
                            theme={theme}
                            isEditingContent={isEditingContent}
                            textareaRef={textareaRef}
                            isBatchRoot={isBatchRoot}
                            batchCount={batchCount}
                            batchExpanded={batchExpanded}
                            batchOpening={batchOpening}
                            batchRecovering={batchRecovering}
                            renderNodeContent={renderNodeContent}
                            mentionReferences={mentionReferences}
                            onContentChange={onContentChange}
                            onTitleChange={onTitleChange}
                            onStopEditing={() => setIsEditingContent(false)}
                            onRetry={onRetry}
                            onGenerateImage={onGenerateImage}
                            onToggleBatch={() => onToggleBatch?.(data.id)}
                            onSetBatchPrimary={() => onSetBatchPrimary?.(data)}
                        />
                    </div>

                    {data.type === CanvasNodeType.Text ? <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12" style={{ background: `linear-gradient(to top, ${theme.node.panel}cc, transparent)` }} /> : null}

                    {nodeStatus && nodeStatus !== "idle" ? (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[3px] overflow-hidden">
                            <div
                                className="h-full w-full"
                                style={{
                                    background: statusColor,
                                    opacity: nodeStatus === "loading" ? undefined : nodeStatus === "error" ? 0.95 : 0.4,
                                    animation: nodeStatus === "loading" ? "canvas-status-pulse 1.2s ease-in-out infinite" : undefined,
                                }}
                            />
                        </div>
                    ) : null}
                </div>

                {/* 卡脚：状态点 + 状态文字 / 元信息 */}
                <div className="flex h-[29px] shrink-0 items-center justify-between gap-2 border-t px-2.5 font-mono text-[9px] leading-none" style={{ background: theme.node.panel, borderColor: `${theme.node.stroke}a6`, color: theme.node.muted }}>
                    <span className="flex min-w-0 items-center gap-1.5">
                        <i className="size-[5px] shrink-0 rounded-full" style={{ background: nodeStatus === "loading" ? activityColor(theme) : nodeStatus === "error" ? theme.type.danger : typeColor }} />
                        <span className="truncate">{statusLabelOf(data, nodeStatus)}</span>
                    </span>
                    <span className="truncate" style={{ color: theme.node.faint }}>
                        {footMetaOf(data, batchCount)}
                    </span>
                </div>

                {showImageInfo && hasImageContent ? <ImageInfoBar node={data} /> : null}
                {resourceLabel ? <ResourceLabelBadge reference={resourceLabel} theme={theme} color={typeColor} /> : null}
                {data.metadata?.pipelineLabel ? <PipelineBadge node={data} /> : null}

                <ResizeHandle corner="top-left" onMouseDown={handleResizeMouseDown} />
                <ResizeHandle corner="top-right" onMouseDown={handleResizeMouseDown} />
                <ResizeHandle corner="bottom-left" onMouseDown={handleResizeMouseDown} />
                <ResizeHandle corner="bottom-right" onMouseDown={handleResizeMouseDown} />
            </div>

            <ConnectionHandleDot side="left" color={typeColor} visible={!isGroup && (hovered || isSelected || isConnecting)} onMouseDown={(event) => onConnectStart(event, data.id, "target")} />
            <ConnectionHandleDot side="right" color={typeColor} visible={!isGroup && data.type !== CanvasNodeType.Config && (hovered || isSelected || isConnecting)} onMouseDown={(event) => onConnectStart(event, data.id, "source")} />

            {showPanel && renderPanel ? <div className="absolute left-1/2 top-full z-[70] w-[600px] -translate-x-1/2 pt-4">{renderPanel(data)}</div> : null}
        </div>
    );
});

function NodeContent(props: NodeContentRendererProps) {
    if (props.node.metadata?.pipelineKind === "shot-pack" && props.renderNodeContent) return <>{props.renderNodeContent(props.node)}</>;
    if (props.node.metadata?.pipelineKind === "director-shot" && props.renderNodeContent) return <>{props.renderNodeContent(props.node)}</>;
    if (props.node.type === CanvasNodeType.Config && props.renderNodeContent) return <>{props.renderNodeContent(props.node)}</>;
    if (props.isBatchRoot) return <ImageNodeContent {...props} />;
    if (props.node.metadata?.status === "loading") return <LoadingContent theme={props.theme} />;
    if (props.node.metadata?.status === "error") return <ErrorContent node={props.node} theme={props.theme} onRetry={props.onRetry} />;

    const Renderer = nodeContentRenderers[props.node.type];
    return Renderer ? <Renderer {...props} /> : <UnknownNodeContent theme={props.theme} />;
}

const NODE_TYPE_LABELS: Record<CanvasNodeType, string> = {
    [CanvasNodeType.Image]: "图片",
    [CanvasNodeType.Video]: "视频",
    [CanvasNodeType.Text]: "文本",
    [CanvasNodeType.Config]: "配置",
    [CanvasNodeType.Audio]: "音频",
    [CanvasNodeType.DirectorShot]: "分镜",
    [CanvasNodeType.Group]: "分组",
};

function nodeTypeIcon(type: CanvasNodeType) {
    switch (type) {
        case CanvasNodeType.Image:
            return ImageIcon;
        case CanvasNodeType.Video:
            return Video;
        case CanvasNodeType.Text:
            return TypeIcon;
        case CanvasNodeType.Config:
            return SlidersHorizontal;
        case CanvasNodeType.Audio:
            return Music2;
        case CanvasNodeType.DirectorShot:
            return Clapperboard;
        case CanvasNodeType.Group:
            return Layers;
        default:
            return ImageIcon;
    }
}

function NodeTypeIcon({ type, className, strokeWidth }: { type: CanvasNodeType; className?: string; strokeWidth?: number }) {
    const Icon = nodeTypeIcon(type);
    return <Icon className={className} strokeWidth={strokeWidth} />;
}

function statusLabelOf(node: CanvasNodeData, status: string | undefined) {
    if (status === "loading") return "生成中";
    if (status === "error") return "处理失败";
    switch (node.type) {
        case CanvasNodeType.Text:
            return "有效";
        case CanvasNodeType.Config:
            return "已同步";
        case CanvasNodeType.Video:
            return "已缓存";
        case CanvasNodeType.DirectorShot:
            return "分镜就绪";
        case CanvasNodeType.Group:
            return "分组";
        default:
            return "已就绪";
    }
}

function footMetaOf(node: CanvasNodeData, batchCount: number) {
    const meta = node.metadata;
    if (node.type === CanvasNodeType.Image) {
        if (meta?.isBatchRoot && batchCount > 1) return `${batchCount} 张图片`;
        const w = meta?.naturalWidth;
        const h = meta?.naturalHeight;
        const dims = w && h ? `${Math.round(w)} × ${Math.round(h)}` : "";
        const size = meta?.bytes ? formatBytes(meta.bytes) : "";
        return dims || size ? [dims, size].filter(Boolean).join(" · ") : "图片";
    }
    if (node.type === CanvasNodeType.Text) return `${meta?.content?.length ?? 0} 字符`;
    if (node.type === CanvasNodeType.Config) return "配置参数";
    if (node.type === CanvasNodeType.Video) return meta?.bytes ? formatBytes(meta.bytes) : "视频";
    if (node.type === CanvasNodeType.Audio) return meta?.bytes ? formatBytes(meta.bytes) : "音频";
    if (node.type === CanvasNodeType.Group) return `${meta?.groupChildIds?.length ?? 0} 项`;
    if (node.type === CanvasNodeType.DirectorShot) return "分镜脚本";
    return "";
}

function PipelineBadge({ node }: { node: CanvasNodeData }) {
    return (
        <div className="pointer-events-none absolute left-3 top-[-26px] z-30 max-w-[calc(100%-24px)] rounded-full border border-black/10 bg-white/90 px-2.5 py-1 text-xs font-medium text-[#242529] shadow-sm backdrop-blur">
            <span className="block truncate">{node.metadata?.pipelineLabel}</span>
        </div>
    );
}

const nodeContentRenderers = {
    [CanvasNodeType.Text]: TextContent,
    [CanvasNodeType.Image]: ImageNodeContent,
    [CanvasNodeType.Config]: EmptyImageContent,
    [CanvasNodeType.Video]: VideoNodeContent,
    [CanvasNodeType.Audio]: AudioNodeContent,
    [CanvasNodeType.DirectorShot]: EmptyImageContent,
    [CanvasNodeType.Group]: GroupContent,
} satisfies Record<CanvasNodeType, (props: NodeContentRendererProps) => ReactNode>;

function GroupContent({ node, theme }: NodeContentRendererProps) {
    const childCount = node.metadata?.groupChildIds?.length || 0;
    return (
        <div className="relative flex h-full w-full items-center justify-center rounded-[inherit]">
            {/* 虚线框：pointer-events-none，让点击穿透到组框本体或更上层的子节点 */}
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] border-2 border-dashed" style={{ borderColor: theme.node.muted }} />
            <div
                className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium backdrop-blur-md"
                style={{ background: `${theme.toolbar.panel}dd`, borderColor: theme.node.stroke, color: theme.node.text }}
            >
                <Layers className="size-3" />
                <span>{childCount} 项</span>
            </div>
        </div>
    );
}

function LoadingContent({ theme }: Pick<NodeContentRendererProps, "theme">) {
    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3" style={{ color: activityColor(theme) }}>
            <div className="size-10 animate-spin rounded-full border-2" style={{ borderColor: theme.node.stroke, borderTopColor: activityColor(theme) }} />
            <span className="text-[10px] tracking-[0.2em]" style={{ color: theme.node.muted }}>
                生成中
            </span>
            <span className="h-[3px] w-7" style={{ background: `linear-gradient(90deg, ${activityColor(theme)} 42%, ${theme.node.stroke} 42%)` }} />
        </div>
    );
}

function ErrorContent({ node, theme, onRetry }: Pick<NodeContentRendererProps, "node" | "theme" | "onRetry">) {
    const errorView = summarizeCanvasGenerationError(node.metadata?.errorDetails);
    const danger = theme.type.danger;
    return (
        <div className="flex h-full w-full items-center justify-center p-1">
            <div className="w-full rounded-[2px] border p-2.5" style={{ borderColor: mixHex(theme.node.stroke, danger, 0.4), background: mixHex(theme.node.panel, danger, 0.06) }}>
                <div className="flex items-center gap-2.5">
                    <span className="grid size-[30px] shrink-0 place-items-center rounded-full border" style={{ borderColor: `${danger}5c`, color: danger }}>
                        <CircleAlert className="size-4" strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <strong className="block truncate text-[11px] font-semibold" style={{ color: theme.node.text }}>
                            {errorView.title}
                        </strong>
                        <span className="mt-1 block font-mono text-[9px] leading-[1.4]" style={{ color: theme.node.muted }}>
                            {errorView.hint}
                        </span>
                        {errorView.requestId ? (
                            <div className="mt-0.5 truncate font-mono text-[9px]" style={{ color: theme.node.faint }}>
                                Request id: {errorView.requestId}
                            </div>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition hover:scale-[1.02]"
                        style={{ background: theme.toolbar.panel, borderColor: `${danger}73`, color: danger }}
                        onClick={(event) => {
                            event.stopPropagation();
                            onRetry?.(node);
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <RefreshCw className="size-3.5" />
                        重试
                    </button>
                </div>
            </div>
        </div>
    );
}

function UnknownNodeContent({ theme }: Pick<NodeContentRendererProps, "theme">) {
    return (
        <div className="flex h-full w-full items-center justify-center text-sm" style={{ color: theme.node.placeholder }}>
            未知节点
        </div>
    );
}

function TextContent({ node, theme, isEditingContent, textareaRef, mentionReferences, onContentChange, onStopEditing, onGenerateImage }: NodeContentRendererProps) {
    const fontSize = node.metadata?.fontSize || 14;
    const textStyle = { fontSize: `${fontSize}px`, lineHeight: `${Math.round(fontSize * 1.65)}px`, color: theme.node.text, caretColor: theme.node.activeStroke, boxSizing: "border-box" } as React.CSSProperties;

    return (
        <div className="flex h-full w-full flex-col overflow-hidden pl-2.5 pt-1" style={{ borderLeft: `2px solid ${typeColorOf(node, theme)}` }}>
            <button
                type="button"
                className="absolute right-3 top-3 z-20 inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-medium opacity-85 backdrop-blur-md transition hover:scale-[1.02] hover:opacity-100"
                style={{ background: `${theme.toolbar.panel}dd`, borderColor: theme.node.stroke, color: theme.node.text }}
                onClick={(event) => {
                    event.stopPropagation();
                    onGenerateImage?.(node);
                }}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                title="用文本生图"
                aria-label="用文本生图"
            >
                <ImageIcon className="size-3.5" />
                生图
            </button>
            {isEditingContent ? (
                <CanvasResourceMentionTextarea
                    ref={textareaRef}
                    className="thin-scrollbar block h-full w-full resize-none overflow-y-auto whitespace-pre-wrap break-words border-none bg-transparent pl-1 pr-14 pt-0 pb-4 m-0 font-mono outline-none select-text appearance-none"
                    style={textStyle}
                    value={node.metadata?.content || ""}
                    references={mentionReferences}
                    highlightLabels={false}
                    onChange={(value) => onContentChange(node.id, value)}
                    onBlur={onStopEditing}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") onStopEditing();
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    onWheel={(event) => event.stopPropagation()}
                />
            ) : (
                <div className="thin-scrollbar block h-full w-full overflow-y-auto whitespace-pre-wrap break-words bg-transparent pl-1 pr-14 pt-0 pb-4 font-mono" style={textStyle} onWheel={(event) => event.stopPropagation()}>
                    {node.metadata?.content || <span style={{ color: theme.node.placeholder }}>双击编辑文字</span>}
                </div>
            )}
        </div>
    );
}

function ResourceLabelBadge({ reference, theme, color }: { reference: CanvasResourceReference; theme: CanvasThemeLike; color: string }) {
    return (
        <span
            className={`pointer-events-none absolute right-3 top-[-26px] z-30 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${reference.active ? "text-white shadow-sm" : "bg-black/35 text-white/75"}`}
            style={reference.active ? { background: color } : undefined}
        >
            {reference.label}
        </span>
    );
}

function ImageNodeContent(props: NodeContentRendererProps) {
    if (!props.node.metadata?.content && props.isBatchRoot) {
        const content =
            props.node.metadata?.status === "loading" ? (
                <LoadingContent theme={props.theme} />
            ) : props.node.metadata?.status === "error" ? (
                <ErrorContent node={props.node} theme={props.theme} onRetry={props.onRetry} />
            ) : (
                <EmptyImageContent {...props} isBatchRoot={false} />
            );
        return (
            <BatchFrame batchCount={props.batchCount} batchExpanded={props.batchExpanded} batchOpening={props.batchOpening} batchRecovering={props.batchRecovering} onToggleBatch={props.onToggleBatch}>
                {content}
            </BatchFrame>
        );
    }
    if (!props.node.metadata?.content) return <EmptyImageContent {...props} />;

    return (
        <ImageContent
            node={props.node}
            isBatchRoot={props.isBatchRoot}
            batchCount={props.batchCount}
            batchExpanded={props.batchExpanded}
            batchOpening={props.batchOpening}
            batchRecovering={props.batchRecovering}
            onToggleBatch={props.onToggleBatch}
            onSetBatchPrimary={props.onSetBatchPrimary}
        />
    );
}

function EmptyImageContent({ node, theme, isBatchRoot, batchCount, batchExpanded, batchOpening, batchRecovering, onToggleBatch }: NodeContentRendererProps) {
    const typeColor = typeColorOf(node, theme);
    const fieldBg = mixHex(theme.node.panel, "#000000", theme.name === "dark" ? 0.12 : 0.04);
    const emptyLabel = node.type === CanvasNodeType.Config ? "空配置节点" : node.type === CanvasNodeType.DirectorShot ? "空分镜节点" : "空图片节点";
    const content = (
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[2px] border" style={{ borderColor: `${theme.node.stroke}a6`, background: fieldBg }}>
            <div className="flex flex-col items-center justify-center gap-3" style={{ color: typeColor }}>
                <ImageIcon className="size-6 opacity-50" strokeWidth={1.5} />
                <span className="text-[10px] tracking-[0.18em]" style={{ color: theme.node.placeholder }}>
                    {emptyLabel}
                </span>
            </div>
        </div>
    );
    if (isBatchRoot)
        return (
            <BatchFrame batchCount={batchCount} batchExpanded={batchExpanded} batchOpening={batchOpening} batchRecovering={batchRecovering} onToggleBatch={onToggleBatch}>
                {content}
            </BatchFrame>
        );
    return content;
}

function VideoNodeContent({ node, theme }: NodeContentRendererProps) {
    if (!node.metadata?.content) {
        const typeColor = typeColorOf(node, theme);
        const fieldBg = mixHex(theme.node.panel, "#000000", theme.name === "dark" ? 0.12 : 0.04);
        return (
            <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[2px] border" style={{ borderColor: `${theme.node.stroke}a6`, background: fieldBg }}>
                <span className="grid size-[29px] place-items-center rounded-full border" style={{ borderColor: typeColor, color: typeColor }}>
                    <Play className="size-3 translate-x-px" fill="currentColor" strokeWidth={0} />
                </span>
                <span className="text-[10px] tracking-[0.18em]" style={{ color: theme.node.placeholder }}>
                    空视频节点
                </span>
            </div>
        );
    }
    return <video src={upgradeInsecureMediaUrl(node.metadata.content)} controls className="h-full w-full rounded-[2px] border bg-black object-contain" style={{ borderColor: `${theme.node.stroke}a6` }} data-canvas-no-zoom />;
}

function AudioNodeContent({ node, theme }: NodeContentRendererProps) {
    if (!node.metadata?.content)
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3" style={{ color: theme.node.placeholder }}>
                <div className="flex size-14 items-center justify-center rounded-2xl border" style={{ background: theme.toolbar.activeBg, borderColor: theme.node.stroke }}>
                    <Music2 className="size-6 opacity-40" />
                </div>
                <span className="text-[10px] tracking-[0.18em] opacity-60">空音频节点</span>
            </div>
        );
    return (
        <div className="flex h-full w-full flex-col justify-center gap-3 px-4" style={{ background: theme.node.panel, color: theme.node.text }}>
            <div className="flex min-w-0 items-center gap-2 text-sm opacity-70">
                <Music2 className="size-4 shrink-0" />
                <span className="truncate">{node.title || "音频"}</span>
            </div>
            <audio src={node.metadata.content} controls className="w-full" data-canvas-no-zoom />
        </div>
    );
}

function ImageContent({
    node,
    isBatchRoot,
    batchCount,
    batchExpanded,
    batchOpening,
    batchRecovering,
    onToggleBatch,
    onSetBatchPrimary,
}: {
    node: CanvasNodeData;
    isBatchRoot: boolean;
    batchCount: number;
    batchExpanded: boolean;
    batchOpening: boolean;
    batchRecovering: boolean;
    onToggleBatch?: () => void;
    onSetBatchPrimary?: () => void;
}) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const isBatchChild = Boolean(node.metadata?.batchRootId);

    return (
        <BatchFrame batchCount={isBatchRoot ? batchCount : 0} batchExpanded={batchExpanded} batchOpening={batchOpening} batchRecovering={batchRecovering} onToggleBatch={onToggleBatch}>
            <div className="h-full w-full overflow-hidden rounded-[2px] border" style={{ borderColor: `${theme.node.stroke}a6`, background: "#000" }}>
                <img
                    src={node.metadata!.content!}
                    alt={node.title}
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
                    className={`pointer-events-none block h-full w-full select-none ${node.metadata?.freeResize ? "object-fill" : "object-contain"}`}
                />
            </div>
            {isBatchRoot ? (
                <button
                    type="button"
                    className="absolute right-2.5 top-2.5 z-30 flex h-8 items-center justify-center gap-1 rounded-full border px-2.5 text-xs font-semibold shadow-[0_6px_18px_rgba(15,23,42,.10)] backdrop-blur-md transition hover:scale-[1.02]"
                    style={{ background: `${theme.toolbar.panel}d9`, borderColor: `${theme.toolbar.border}cc`, color: theme.node.text }}
                    aria-label={batchExpanded ? "图片组已展开" : "图片组已收起"}
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleBatch?.();
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                >
                    <span className="leading-none" style={{ color: typeColorOf(node, theme) }}>
                        {batchCount}
                    </span>
                    <ChevronRight className={`size-3.5 opacity-55 transition-transform ${batchExpanded ? "rotate-90" : ""}`} />
                </button>
            ) : null}
            {isBatchChild ? (
                <button
                    type="button"
                    className="absolute right-3 top-3 z-30 flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium opacity-0 shadow-[0_8px_20px_rgba(68,64,60,.13)] backdrop-blur-md transition group-hover/batch:opacity-100 hover:scale-[1.02]"
                    style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
                    onClick={(event) => {
                        event.stopPropagation();
                        onSetBatchPrimary?.();
                    }}
                    onMouseDown={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                >
                    <Star className="size-3.5" style={{ color: typeColorOf(node, theme) }} />
                    设为主图
                </button>
            ) : null}
        </BatchFrame>
    );
}

function ImageInfoBar({ node }: { node: CanvasNodeData }) {
    const width = Math.round(node.metadata?.naturalWidth || node.width);
    const height = Math.round(node.metadata?.naturalHeight || node.height);
    const size = formatBytes(node.metadata?.bytes || 0);
    return (
        <div className="pointer-events-none absolute bottom-10 left-3 z-40 max-w-[calc(100%-24px)]">
            <span className="max-w-full truncate rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium leading-none text-white backdrop-blur-sm">
                {width} x {height}
                {size ? ` · ${size}` : ""}
            </span>
        </div>
    );
}

function BatchFrame({ batchCount, batchExpanded, batchOpening, batchRecovering, onToggleBatch, children }: { batchCount: number; batchExpanded: boolean; batchOpening: boolean; batchRecovering: boolean; onToggleBatch?: () => void; children: ReactNode }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const isBatchRoot = batchCount > 1;
    return (
        <div
            className="group/batch relative h-full w-full overflow-visible"
            onDoubleClick={
                isBatchRoot
                    ? (event) => {
                          event.stopPropagation();
                          onToggleBatch?.();
                      }
                    : undefined
            }
        >
            {isBatchRoot ? (
                <div className="pointer-events-none absolute inset-0 overflow-visible">
                    {Array.from({ length: Math.min(batchCount - 1, 5) }).map((_, index) => (
                        <div
                            key={index}
                            className="absolute rounded-[inherit] border shadow-[0_14px_34px_rgba(68,64,60,.16)] transition-all duration-300 group-hover/batch:translate-x-2"
                            style={{
                                inset: 0,
                                background: `linear-gradient(135deg, ${theme.node.panel}, ${theme.node.fill})`,
                                borderColor: theme.node.stroke,
                                opacity: batchExpanded && !batchOpening ? 0.34 : 1,
                                transform:
                                    batchOpening || batchRecovering ? `translate(${54 + index * 22}px, ${20 + index * 12}px) rotate(${8 + index * 5}deg) scale(.98)` : `translate(${34 + index * 18}px, ${14 + index * 10}px) rotate(${6 + index * 4}deg)`,
                                zIndex: -index - 1,
                            }}
                        />
                    ))}
                </div>
            ) : null}
            {children}
        </div>
    );
}
function ResizeHandle({ corner, onMouseDown }: { corner: ResizeCorner; onMouseDown: (event: React.MouseEvent, corner: ResizeCorner) => void }) {
    const positionClass = {
        "top-left": "-left-[14px] -top-[14px] cursor-nwse-resize",
        "top-right": "-right-[14px] -top-[14px] cursor-nesw-resize",
        "bottom-left": "-bottom-[14px] -left-[14px] cursor-nesw-resize",
        "bottom-right": "-bottom-[14px] -right-[14px] cursor-nwse-resize",
    }[corner];

    return <div className={`absolute z-50 size-7 ${positionClass}`} onMouseDown={(event) => onMouseDown(event, corner)} />;
}

function ConnectionHandleDot({ side, visible, color, onMouseDown }: { side: "left" | "right"; visible: boolean; color: string; onMouseDown: (event: React.MouseEvent) => void }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];

    return (
        <div
            className={`absolute top-1/2 z-30 flex size-12 -translate-y-1/2 cursor-crosshair items-center justify-center transition-opacity duration-150 ${
                side === "left" ? "-left-6" : "-right-6"
            } ${visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-60"}`}
            onMouseDown={onMouseDown}
        >
            <div className="size-[10px] rounded-full border-2 transition-all hover:scale-125" style={{ background: color, borderColor: theme.canvas.background, boxShadow: `0 0 0 1px ${color}73` }} />
        </div>
    );
}
