"use client";

import { Images, Plus } from "lucide-react";

import type { CanvasNodeData } from "../types";

export function ShotPackNodeContent({ node }: { node: CanvasNodeData }) {
    const pack = node.metadata?.shotPack;
    const shots = pack?.shots || [];
    if (node.metadata?.content) {
        return (
            <div className="relative h-full w-full overflow-hidden rounded-3xl bg-[#f7f4ef]">
                <img src={node.metadata.content} alt={node.title} draggable={false} className="pointer-events-none h-full w-full select-none object-contain" />
                <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                    镜头包 · {shots.length} 镜头
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#fffaf1] text-[#6b7280]">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Images className="size-7 text-[#4f46e5]" />
            </div>
            <div className="text-center">
                <div className="text-sm font-semibold text-[#111827]">镜头包</div>
                <div className="mt-1 text-xs">加入散图或拆分九宫格，再生成合集参考图</div>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-[#ded8cd] bg-white px-3 py-1 text-xs">
                <Plus className="size-3.5" />
                打开面板开始整理
            </div>
        </div>
    );
}
