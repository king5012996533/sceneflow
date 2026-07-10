"use client";

import { Button, Checkbox, Empty, Input, InputNumber, Select } from "antd";
import { ArrowDown, ArrowUp, Grid3X3, Images, Plus, Scissors, Trash2 } from "lucide-react";

import type { CanvasNodeData, CanvasShotPack, CanvasShotPackLayout, CanvasShotPackShot } from "../types";

type ShotPackPanelProps = {
    node: CanvasNodeData;
    imageNodes: CanvasNodeData[];
    busy: boolean;
    onClose: () => void;
    onAddShot: (source: CanvasNodeData) => void;
    onSplitGrid: (source: CanvasNodeData, rows: number, cols: number) => void;
    onUpdateShot: (shotId: string, patch: Partial<CanvasShotPackShot>) => void;
    onMoveShot: (shotId: string, direction: -1 | 1) => void;
    onRemoveShot: (shotId: string) => void;
    onPatchPack: (patch: Partial<CanvasShotPack>) => void;
    onCompose: () => void;
};

const layoutOptions: Array<{ label: string; value: CanvasShotPackLayout }> = [
    { label: "自动", value: "auto" },
    { label: "2x2 / 两列", value: "grid-2" },
    { label: "3x3 / 三列", value: "grid-3" },
    { label: "横向长图", value: "horizontal" },
    { label: "竖向长图", value: "vertical" },
    { label: "电影分镜条", value: "strip" },
];

export function ShotPackPanel({ node, imageNodes, busy, onClose, onAddShot, onSplitGrid, onUpdateShot, onMoveShot, onRemoveShot, onPatchPack, onCompose }: ShotPackPanelProps) {
    const pack = readShotPack(node);
    const availableImages = imageNodes.filter((item) => item.id !== node.id && item.metadata?.content);
    const sourceOptions = availableImages.map((item) => ({ label: item.title || item.id, value: item.id }));

    return (
        <div className="thin-scrollbar max-h-[620px] overflow-y-auto rounded-2xl border border-[#ded8cd] bg-[#fffaf1] p-4 text-[#111827] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 border-b border-[#e8dfd1] pb-3">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4f46e5]">
                        <Images className="size-3.5" />
                        镜头包
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">把散落镜头整理成一张参考图</h3>
                    <p className="mt-1 text-xs text-[#6b7280]">支持散图加入，也支持把 GPT 九宫格切成独立镜头。</p>
                </div>
                <Button onClick={onClose}>关闭</Button>
            </div>

            <div className="mt-4 grid grid-cols-[1fr_160px] gap-3">
                <Select
                    showSearch
                    placeholder="选择画布上的图片加入镜头包"
                    options={sourceOptions}
                    optionFilterProp="label"
                    onChange={(id) => {
                        const source = availableImages.find((item) => item.id === id);
                        if (source) onAddShot(source);
                    }}
                />
                <Select
                    placeholder="拆分九宫格"
                    options={sourceOptions}
                    optionFilterProp="label"
                    suffixIcon={<Grid3X3 className="size-4" />}
                    onChange={(id) => {
                        const source = availableImages.find((item) => item.id === id);
                        if (source) onSplitGrid(source, 3, 3);
                    }}
                />
            </div>

            <div className="mt-3 rounded-xl border border-[#e8dfd1] bg-white/80 p-3">
                <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-medium text-[#4b5563]">
                        合集布局
                        <Select className="mt-1 w-full" value={pack.layout} options={layoutOptions} onChange={(layout) => onPatchPack({ layout })} />
                    </label>
                    <div className="flex items-end gap-4 pb-1">
                        <Checkbox checked={pack.showIndex} onChange={(event) => onPatchPack({ showIndex: event.target.checked })}>
                            显示编号
                        </Checkbox>
                        <Checkbox checked={pack.showCaption} onChange={(event) => onPatchPack({ showCaption: event.target.checked })}>
                            显示说明
                        </Checkbox>
                    </div>
                </div>
            </div>

            <div className="mt-4 space-y-2">
                {pack.shots.length ? (
                    pack.shots.map((shot, index) => (
                        <div key={shot.id} className="grid grid-cols-[72px_1fr_84px] gap-3 rounded-xl border border-[#e8dfd1] bg-white p-2">
                            <img src={shot.imageUrl} alt={shot.title} className="h-16 w-[72px] rounded-lg bg-[#f3f0ea] object-cover" />
                            <div className="min-w-0 space-y-2">
                                <div className="grid grid-cols-[1fr_80px] gap-2">
                                    <Input value={shot.title} placeholder={`镜头 ${index + 1}`} onChange={(event) => onUpdateShot(shot.id, { title: event.target.value })} />
                                    <InputNumber className="w-full" min={0} max={60} value={shot.duration} placeholder="秒" onChange={(value) => onUpdateShot(shot.id, { duration: typeof value === "number" ? value : undefined })} />
                                </div>
                                <Input value={shot.description} placeholder="画面描述，例如：白衣剑客拔剑，竹叶飞散" onChange={(event) => onUpdateShot(shot.id, { description: event.target.value })} />
                                <Input value={shot.camera} placeholder="镜头运动，例如：中景、轻微推进、横移跟拍" onChange={(event) => onUpdateShot(shot.id, { camera: event.target.value })} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <Button size="small" icon={<ArrowUp className="size-3.5" />} disabled={index === 0} onClick={() => onMoveShot(shot.id, -1)} />
                                <Button size="small" icon={<ArrowDown className="size-3.5" />} disabled={index === pack.shots.length - 1} onClick={() => onMoveShot(shot.id, 1)} />
                                <Button size="small" danger icon={<Trash2 className="size-3.5" />} onClick={() => onRemoveShot(shot.id)} />
                            </div>
                        </div>
                    ))
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="先从画布图片加入镜头，或选择一张九宫格分镜图拆分" />
                )}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#e8dfd1] pt-3">
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                    <Scissors className="size-4" />
                    {pack.shots.length} 个镜头。生成后会变成一张可喂给视频模型的合集参考图。
                </div>
                <Button type="primary" loading={busy} disabled={!pack.shots.length} icon={<Plus className="size-4" />} onClick={onCompose}>
                    生成合集图
                </Button>
            </div>
        </div>
    );
}

function readShotPack(node: CanvasNodeData): CanvasShotPack {
    return {
        shots: node.metadata?.shotPack?.shots || [],
        layout: node.metadata?.shotPack?.layout || "grid-3",
        showIndex: node.metadata?.shotPack?.showIndex ?? true,
        showCaption: node.metadata?.shotPack?.showCaption ?? false,
        sourceGrid: node.metadata?.shotPack?.sourceGrid,
        composedAt: node.metadata?.shotPack?.composedAt,
    };
}
