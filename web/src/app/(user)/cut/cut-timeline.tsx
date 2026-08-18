"use client";

import { useEffect, useMemo, useRef } from "react";
import { Empty } from "antd";
import type { DragEvent, PointerEvent as ReactPointerEvent } from "react";

import { formatMs } from "./cut-media";
import { getBoundaries, useCutStore } from "./cut-store";

/** 每秒钟占的像素数 */
const PX_PER_SEC = 60;

export default function CutTimeline() {
    const clips = useCutStore((s) => s.clips);
    const selectedId = useCutStore((s) => s.selectedId);
    const playheadMs = useCutStore((s) => s.playheadMs);
    const selectClip = useCutStore((s) => s.selectClip);
    const reorderClip = useCutStore((s) => s.reorderClip);
    const setTrim = useCutStore((s) => s.setTrim);
    const requestSeek = useCutStore((s) => s.requestSeek);

    const { boundaries, totalMs } = useMemo(() => getBoundaries(clips), [clips]);
    const totalPx = (totalMs / 1000) * PX_PER_SEC;

    const scrollRef = useRef<HTMLDivElement | null>(null);
    const dragIndexRef = useRef<number | null>(null);

    const ticks = useMemo(() => {
        const totalSec = Math.ceil(totalMs / 1000);
        const list: { sec: number; major: boolean }[] = [];
        for (let s = 0; s <= totalSec; s += 1) {
            list.push({ sec: s, major: s % 5 === 0 });
        }
        return list;
    }, [totalMs]);

    // 播放时保持播放头在可视范围内
    useEffect(() => {
        const el = scrollRef.current;
        if (!el || clips.length === 0) return;
        const px = (playheadMs / 1000) * PX_PER_SEC;
        const left = el.scrollLeft;
        const width = el.clientWidth;
        if (px < left + 30) {
            el.scrollLeft = Math.max(0, px - 30);
        } else if (px > left + width - 30) {
            el.scrollLeft = px - width + 30;
        }
    }, [playheadMs, clips.length]);

    const onTrimPointerDown = (event: ReactPointerEvent<HTMLDivElement>, clipId: string, side: "start" | "end") => {
        event.preventDefault();
        event.stopPropagation();
        const clip = clips.find((c) => c.id === clipId);
        if (!clip) return;
        const el = event.currentTarget;
        const startX = event.clientX;
        const initialStartMs = clip.startMs;
        const initialEndMs = clip.endMs;
        const onMove = (ev: PointerEvent) => {
            const deltaMs = ((ev.clientX - startX) / PX_PER_SEC) * 1000;
            if (side === "start") {
                setTrim(clipId, { startMs: initialStartMs + deltaMs });
            } else {
                setTrim(clipId, { endMs: initialEndMs + deltaMs });
            }
        };
        const onUp = () => {
            el.removeEventListener("pointermove", onMove);
            el.removeEventListener("pointerup", onUp);
            el.removeEventListener("pointercancel", onUp);
            try {
                el.releasePointerCapture(event.pointerId);
            } catch {}
        };
        try {
            el.setPointerCapture(event.pointerId);
        } catch {}
        el.addEventListener("pointermove", onMove);
        el.addEventListener("pointerup", onUp);
        el.addEventListener("pointercancel", onUp);
    };

    const onTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const ms = ((event.clientX - rect.left) / PX_PER_SEC) * 1000;
        requestSeek(Math.max(0, Math.min(totalMs, ms)));
    };

    const onBlockDragStart = (event: DragEvent<HTMLDivElement>, index: number) => {
        dragIndexRef.current = index;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
    };

    const onBlockDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    };

    const onBlockDrop = (event: DragEvent<HTMLDivElement>, toIndex: number) => {
        event.preventDefault();
        event.stopPropagation();
        const fromIndex = dragIndexRef.current;
        dragIndexRef.current = null;
        if (fromIndex === null || fromIndex === toIndex) return;
        reorderClip(fromIndex, toIndex);
    };

    return (
        <div className="flex flex-col overflow-hidden rounded-xl bg-white/70">
            <div className="border-b border-[#e8dfd0] px-3 py-2 text-sm font-medium text-[#201914]">
                时间轴
                <span className="ml-2 text-xs font-normal text-neutral-400">共 {formatMs(totalMs)} · {clips.length} 个素材</span>
            </div>
            {clips.length === 0 ? (
                <div className="py-10">
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="点击右上角「导入素材」开始剪辑" />
                </div>
            ) : (
                <div ref={scrollRef} className="overflow-x-auto">
                    <div
                        className="relative"
                        style={{ width: Math.max(totalPx + 40, 600), height: 104 }}
                        onPointerDown={onTrackPointerDown}
                    >
                        {/* 标尺 */}
                        <div className="absolute inset-x-0 top-0 h-6 border-b border-[#e8dfd0] bg-[#faf6ee]">
                            {ticks.map((tick) => (
                                <div key={tick.sec} className="absolute top-0 h-full" style={{ left: tick.sec * PX_PER_SEC }}>
                                    <div className={`absolute top-0 w-px ${tick.major ? "h-2.5 bg-[#b9ad99]" : "h-1.5 bg-[#d8cfbf]"}`} />
                                    {tick.major && (
                                        <span className="absolute left-1 top-1 text-[10px] leading-none text-[#8a7f6d]">
                                            {formatMs(tick.sec * 1000)}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        {/* 素材轨道 */}
                        <div className="absolute inset-x-0 top-7 h-[72px]">
                            {clips.map((clip, index) => {
                                const boundary = boundaries[index];
                                const left = (boundary.startMs / 1000) * PX_PER_SEC;
                                const width = ((boundary.endMs - boundary.startMs) / 1000) * PX_PER_SEC;
                                const selected = clip.id === selectedId;
                                return (
                                    <div
                                        key={clip.id}
                                        className={`absolute top-2 h-14 rounded-md border ${selected ? "border-[#9b5b32] bg-[#e9d5c2]" : "border-[#d8cfbf] bg-[#f3ecdf]"}`}
                                        style={{ left, width, cursor: "grab" }}
                                        draggable
                                        onDragStart={(e) => onBlockDragStart(e, index)}
                                        onDragOver={onBlockDragOver}
                                        onDrop={(e) => onBlockDrop(e, index)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => selectClip(clip.id)}
                                        title={`${clip.name}（${formatMs(clip.endMs - clip.startMs)}）`}
                                    >
                                        <div className="flex h-full items-center gap-1 overflow-hidden px-2 pr-5 text-xs text-[#201914]">
                                            <span className="truncate">{clip.name}</span>
                                            <span className="ml-auto shrink-0 font-mono text-[10px] text-neutral-500">
                                                {formatMs(clip.endMs - clip.startMs)}
                                            </span>
                                        </div>
                                        <div
                                            className="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-[#9b5b32]/40 hover:bg-[#9b5b32]/70"
                                            onPointerDown={(e) => onTrimPointerDown(e, clip.id, "start")}
                                            title="拖动调整起点"
                                        />
                                        <div
                                            className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-[#9b5b32]/40 hover:bg-[#9b5b32]/70"
                                            onPointerDown={(e) => onTrimPointerDown(e, clip.id, "end")}
                                            title="拖动调整终点"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        {/* 播放头 */}
                        {totalMs > 0 && (
                            <div
                                className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-[#d4380d]"
                                style={{ left: Math.min((playheadMs / 1000) * PX_PER_SEC, totalPx) }}
                            >
                                <div className="absolute -left-[5px] top-0 h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-[#d4380d]" />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
