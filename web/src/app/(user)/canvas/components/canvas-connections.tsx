import type { MouseEvent as ReactMouseEvent } from "react";

import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import type { CanvasConnection, CanvasNodeData, ConnectionHandle, Position } from "../types";

const selectionBlue = "#2f80ff";

export function ConnectionPath({
    connection,
    from,
    to,
    active,
    flowing = false,
    onSelect,
    onContextMenu,
}: {
    connection: CanvasConnection;
    from: CanvasNodeData;
    to: CanvasNodeData;
    active: boolean;
    flowing?: boolean;
    onSelect: () => void;
    onContextMenu?: (event: ReactMouseEvent<SVGPathElement>) => void;
}) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const startX = from.position.x + from.width;
    const startY = from.position.y + from.height / 2;
    const endX = to.position.x;
    const endY = to.position.y + to.height / 2;
    const dx = Math.abs(endX - startX);
    const curvature = Math.max(dx * 0.5, 50);
    const pathD = `M ${startX} ${startY} C ${startX + curvature} ${startY}, ${endX - curvature} ${endY}, ${endX} ${endY}`;

    return (
        <g>
            {/* 命中区域：透明加粗路径，方便点选连线 */}
            <path
                data-connection-id={connection.id}
                d={pathD}
                stroke="transparent"
                strokeWidth="16"
                fill="none"
                style={{ cursor: "pointer", pointerEvents: "stroke" }}
                onClick={(event) => {
                    event.stopPropagation();
                    onSelect();
                }}
                onContextMenu={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onContextMenu?.(event);
                }}
            />
            {/* 底层光晕：给线一点体积感（数据流动时增强） */}
            <path d={pathD} stroke={active || flowing ? theme.node.activeStroke : theme.node.muted} strokeWidth={active || flowing ? 9 : 7} strokeOpacity={flowing ? 0.3 : active ? 0.16 : 0.12} fill="none" style={{ pointerEvents: "none" }} />
            {/* 主线：挂载时 0.35s 画入 */}
            <path
                d={pathD}
                pathLength={1}
                stroke={active || flowing ? theme.node.activeStroke : theme.node.muted}
                strokeWidth={active ? 3 : 2}
                strokeOpacity={flowing ? 1 : active ? 1 : 0.85}
                strokeDasharray={1}
                strokeDashoffset={1}
                fill="none"
                style={{ animation: "canvas-connection-draw 0.35s ease-out both", filter: active || flowing ? `drop-shadow(0 0 8px ${theme.node.activeStroke}66)` : undefined, pointerEvents: "none" }}
            />
            {/* 流水线动态光流：光点沿连线从源节点流向目标节点（空闲静止，选中/生成时流动） */}
            <path
                d={pathD}
                stroke={flowing ? selectionBlue : theme.node.activeStroke}
                strokeWidth={flowing ? 3 : active ? 2.5 : 2}
                strokeOpacity={flowing ? 1 : active ? 1 : 0.22}
                strokeLinecap="round"
                strokeDasharray="12 16"
                fill="none"
                style={{
                    pointerEvents: "none",
                    animation: flowing ? "canvas-connection-flow 0.55s linear infinite" : active ? "canvas-connection-flow 0.9s linear infinite" : "none",
                    filter: flowing ? `drop-shadow(0 0 6px ${selectionBlue}cc)` : active ? `drop-shadow(0 0 4px ${selectionBlue}aa)` : undefined,
                }}
            />
        </g>
    );
}

export function ActiveConnectionPath({ node, handle, mouseWorld, target }: { node?: CanvasNodeData; handle: ConnectionHandle; mouseWorld: Position; target?: CanvasNodeData }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    if (!node) return null;

    const startX = handle.handleType === "source" ? node.position.x + node.width : mouseWorld.x;
    const startY = handle.handleType === "source" ? node.position.y + node.height / 2 : mouseWorld.y;
    const endX = handle.handleType === "source" ? mouseWorld.x : node.position.x;
    const endY = handle.handleType === "source" ? mouseWorld.y : node.position.y + node.height / 2;
    const snappedStartX = handle.handleType === "target" && target ? target.position.x + target.width : startX;
    const snappedStartY = handle.handleType === "target" && target ? target.position.y + target.height / 2 : startY;
    const snappedEndX = handle.handleType === "source" && target ? target.position.x : endX;
    const snappedEndY = handle.handleType === "source" && target ? target.position.y + target.height / 2 : endY;
    const distance = Math.abs(snappedEndX - snappedStartX);
    const pathD = `M ${snappedStartX} ${snappedStartY} C ${snappedStartX + distance * 0.5} ${snappedStartY}, ${snappedEndX - distance * 0.5} ${snappedEndY}, ${snappedEndX} ${snappedEndY}`;

    return (
        <g>
            <path d={pathD} stroke={theme.node.activeStroke} strokeWidth="2" fill="none" strokeDasharray="5,5" />
            {/* 拖拽连线时的动态光流 */}
            <path d={pathD} stroke={selectionBlue} strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="12 16" style={{ animation: "canvas-connection-flow 0.6s linear infinite" }} />
        </g>
    );
}
