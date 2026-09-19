"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Checkbox, Modal } from "antd";
import { MousePointerClick, SquareDashed, RotateCcw, Trash2 } from "lucide-react";

import { formatImageMarkers, isDragTooSmall, markerFromBox, markerFromPoint, type Box2D, type ImageMarker } from "@/lib/image-marker";

/**
 * 交互编辑的标注面板：在参考图上点选 / 框选，把位置换算成官方坐标标记插进提示词。
 *
 * 为什么要有这个面板：交互编辑的坐标得**人工指定**，用户不可能手算「这张图里花坛在 120 180」。
 * 面板负责三件事，每件都对应一个会安静出错的地方：
 *   1. 像素 → 归一化换算（官方 1000×1000 网格，左上 0,0）—— 由 lib/image-marker.ts 算，这里只取坐标；
 *   2. 让用户看清「标记打在图的哪个位置」（图上画出框/准星 + 归一化坐标实时回显）——
 *      框歪了不会报错，只会改错地方，所以必须看得见；
 *   3. 支持撤回与「保持不变」：官方明确要求不变的对象也要框出来并标注，框错一个就得能退回。
 *
 * 拖拽小于 4px 视为误触（官方口径）直接丢弃，且不产生标记。
 */
export type ImageMarkerDialogProps = {
    open: boolean;
    onClose: () => void;
    /** 要标注的参考图（dataUrl 用于渲染） */
    reference: { id: string; name: string; dataUrl: string } | null;
    /** 这张图在参考图列表里的序号（0 基）；标记里写出来的编号由 label 决定 */
    imageIndex: number;
    /** 编号词汇：默认 @图片 N（见 lib/image-reference-prompt.ts），换词汇只改这里传进去的函数 */
    label: (imageIndex: number) => string;
    /** 把标记文字插到提示词里（调用方决定插光标处还是追加到末尾） */
    onInsert: (markerText: string, markers: ImageMarker[]) => void;
};

type Mode = "point" | "bbox";

/** 图在视口里的渲染框：比例换算只需要 width/height，left/top 用来把鼠标位置换算成图内坐标 */
type StageFrame = { left: number; top: number; width: number; height: number };

export function ImageMarkerDialog({ open, onClose, reference, imageIndex, label, onInsert }: ImageMarkerDialogProps) {
    const [mode, setMode] = useState<Mode>("bbox");
    const [markers, setMarkers] = useState<ImageMarker[]>([]);
    const [keepUnchanged, setKeepUnchanged] = useState(false);
    const [dragging, setDragging] = useState<Box2D | null>(null);
    const [hint, setHint] = useState("");
    const stageRef = useRef<HTMLDivElement | null>(null);
    const dragStart = useRef<{ x: number; y: number } | null>(null);
    // 手势开始时把图的渲染框量一次：换算用的是比例，渲染尺寸与原图尺寸等价，
    // 但**按下与松开必须用同一份框**——弹窗是垂直居中的，内容一变高就整体上移，
    // 中途重新量框会把「按下」和「松开」放进两套坐标，框就歪了（提示行出现/消失正是这种情况）。
    const dragFrame = useRef<StageFrame | null>(null);

    // 换图 / 关面板时清空：标记是"针对某一张图"的，上一张图的框留在下一张上就是改错地方
    useEffect(() => {
        setMarkers([]);
        setDragging(null);
        setHint("");
        dragStart.current = null;
        setKeepUnchanged(false);
    }, [reference?.id, open]);

    const stageFrame = useCallback((): StageFrame | null => {
        const rect = stageRef.current?.getBoundingClientRect();
        return rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null;
    }, []);

    /** 鼠标位置 → 图内坐标（相对传入的那一份框，保证一次手势里用的是同一个坐标系） */
    const localPoint = useCallback((event: React.PointerEvent, frame: StageFrame | null): { x: number; y: number } => {
        if (!frame) return { x: 0, y: 0 };
        return { x: event.clientX - frame.left, y: event.clientY - frame.top };
    }, []);

    const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!reference) return;
        event.preventDefault();
        const frame = stageFrame();
        if (!frame) return;
        stageRef.current?.setPointerCapture(event.pointerId);
        const point = localPoint(event, frame);
        if (mode === "point") {
            const marker = markerFromPoint(imageIndex, point, frame, keepUnchanged);
            if (marker) setMarkers((value) => [...value, marker]);
            setHint("");
            return;
        }
        dragStart.current = point;
        dragFrame.current = frame;
        setDragging({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
        setHint("");
    };

    const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        if (mode !== "bbox" || !dragStart.current) return;
        const point = localPoint(event, dragFrame.current);
        setDragging({ x1: dragStart.current.x, y1: dragStart.current.y, x2: point.x, y2: point.y });
    };

    const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
        if (mode !== "bbox" || !dragStart.current) return;
        const start = dragStart.current;
        const frame = dragFrame.current ?? stageFrame();
        dragStart.current = null;
        dragFrame.current = null;
        setDragging(null);
        if (!frame) return;
        const end = localPoint(event, frame);
        if (isDragTooSmall(start, end)) {
            setHint("框太小了（小于 4 像素），已忽略；要选一个点请切到「点选」。");
            return;
        }
        const marker = markerFromBox(imageIndex, { x1: start.x, y1: start.y, x2: end.x, y2: end.y }, frame, keepUnchanged);
        if (!marker) {
            setHint("这个框没有面积，已忽略：请拖出一个真正的区域。");
            return;
        }
        setMarkers((value) => [...value, marker]);
        setHint("");
    };

    const undo = () => setMarkers((value) => value.slice(0, -1));
    const clear = () => setMarkers([]);

    const preview = useMemo(() => {
        const frame = dragFrame.current;
        if (!dragging || !frame) return null;
        return markerFromBox(imageIndex, dragging, frame);
    }, [dragging, imageIndex]);

    /** 归一化值 → 百分比（网格 1000：x=500 就是图的 50% 处） */
    const percent = (value: number) => `${value / 10}%`;

    const last = markers[markers.length - 1];
    const readout = last ? (last.kind === "point" ? `点选 ${last.x} ${last.y}` : `框选 ${last.x1} ${last.y1} ${last.x2} ${last.y2}`) : "还没有标记";

    const insert = () => {
        if (!markers.length) return;
        onInsert(formatImageMarkers(markers, label), markers);
        onClose();
    };

    return (
        <Modal
            title={`标注要改的位置 · ${reference ? label(imageIndex) : ""}`}
            open={open}
            onCancel={onClose}
            centered
            width={880}
            footer={
                <div className="flex items-center justify-between gap-3">
                    {/* 读数常驻定高、单行截断：文案一换行弹窗就变高，垂直居中会让图整体挪位（打一个标跳一下）。
                        网格口径写在下方提示里，这里只留读数，窄屏截断也不会把坐标截掉。 */}
                    <div className="min-h-4 min-w-0 flex-1 truncate text-xs text-[#726d67]">
                        当前读数：<span className="sf-mono">{readout}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={onClose}>取消</Button>
                        <Button type="primary" aria-label="插入标记" disabled={!markers.length} onClick={insert}>
                            插入到提示词（{markers.length}）
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <Button size="small" type={mode === "bbox" ? "primary" : "default"} aria-label="框选模式" icon={<SquareDashed className="size-3.5" />} onClick={() => setMode("bbox")}>
                            框选
                        </Button>
                        <Button size="small" type={mode === "point" ? "primary" : "default"} aria-label="点选模式" icon={<MousePointerClick className="size-3.5" />} onClick={() => setMode("point")}>
                            点选
                        </Button>
                    </div>
                    <Checkbox checked={keepUnchanged} onChange={(event) => setKeepUnchanged(event.target.checked)}>
                        这个区域保持不变
                    </Checkbox>
                    <div className="ml-auto flex items-center gap-2">
                        <Button size="small" aria-label="撤回上一个标记" icon={<RotateCcw className="size-3.5" />} disabled={!markers.length} onClick={undo}>
                            撤回
                        </Button>
                        <Button size="small" aria-label="清空标记" icon={<Trash2 className="size-3.5" />} disabled={!markers.length} onClick={clear}>
                            清空
                        </Button>
                    </div>
                </div>

                <div className="flex justify-center rounded-xl bg-[#f4f2f0] p-2">
                    <div
                        ref={stageRef}
                        data-marker-stage
                        className={`relative inline-block max-h-[52vh] max-w-full touch-none select-none ${mode === "bbox" ? "cursor-crosshair" : "cursor-pointer"}`}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerCancel={() => {
                            dragStart.current = null;
                            setDragging(null);
                        }}
                    >
                        {reference ? <img src={reference.dataUrl} alt={reference.name} draggable={false} className="block max-h-[52vh] w-auto max-w-full rounded-lg" /> : null}
                        {markers.map((marker, index) =>
                            marker.kind === "bbox" ? (
                                <div
                                    key={index}
                                    className={`pointer-events-none absolute rounded-sm border-2 ${marker.keepUnchanged ? "border-[#2f7d6d] bg-[#2f7d6d]/10" : "border-[#c2410c] bg-[#c2410c]/10"}`}
                                    style={{ left: percent(marker.x1), top: percent(marker.y1), width: `${(marker.x2 - marker.x1) / 10}%`, height: `${(marker.y2 - marker.y1) / 10}%` }}
                                >
                                    <span className="absolute -top-4 left-0 rounded bg-[#332f2a] px-1 text-[10px] text-white">{index + 1}</span>
                                </div>
                            ) : (
                                <div key={index} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2" style={{ left: percent(marker.x), top: percent(marker.y) }}>
                                    <div className={`size-4 rounded-full border-2 ${marker.keepUnchanged ? "border-[#2f7d6d] bg-white" : "border-[#c2410c] bg-white"}`} />
                                </div>
                            ),
                        )}
                        {preview ? (
                            <div
                                className="pointer-events-none absolute rounded-sm border-2 border-dashed border-[#c2410c]"
                                style={{ left: percent(preview.x1), top: percent(preview.y1), width: `${(preview.x2 - preview.x1) / 10}%`, height: `${(preview.y2 - preview.y1) / 10}%` }}
                            />
                        ) : null}
                    </div>
                </div>

                {/* 提示行常驻、高度固定：文案一出现弹窗就变高，垂直居中会让整张图上移，坐标跟着挪位 */}
                <div className="min-h-4 text-xs text-amber-600">{hint}</div>

                <ul className="space-y-1 text-xs text-[#5a5550]">
                    <li>· 坐标按官方口径归一化到 1000×1000 网格：左上 0,0，右下 999,999。</li>
                    <li>· 标记会写成「{reference ? label(imageIndex) : "@图片 N"} &lt;bbox&gt;…&lt;/bbox&gt;」插进提示词，编号必须紧跟标记前面 —— 模型靠它判断改哪张图。</li>
                    <li>· 一个框里有多个主体时，请在句子里点名（例如「把 @图片 1 &lt;bbox&gt;…&lt;/bbox&gt; 里的沙发换成藤椅」）。</li>
                    <li>· 要保持不变的对象也要框出来，并勾上「这个区域保持不变」。</li>
                    <li>· 点选与框选可以混用；拖拽小于 4 像素视为误触，不会生成标记。</li>
                </ul>
            </div>
        </Modal>
    );
}
