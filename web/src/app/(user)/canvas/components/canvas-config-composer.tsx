"use client";

import { useMemo } from "react";
import { Button } from "antd";
import { X } from "lucide-react";

import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import type { NodeGenerationInput } from "./canvas-node-generation";
import { CanvasPromptChipInput } from "./canvas-prompt-chip-input";
import type { CanvasResourceReference } from "../utils/canvas-resource-references";

type CanvasConfigComposerProps = {
    value: string;
    inputs: NodeGenerationInput[];
    onChange: (value: string) => void;
    onClose: () => void;
};

export const CONFIG_REFERENCE_PATTERN = /@\[node:([^\]]+)\]/g;

export function CanvasConfigComposer({ value, inputs, onChange, onClose }: CanvasConfigComposerProps) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];

    const references: CanvasResourceReference[] = useMemo(
        () =>
            inputs.map((input, index) => {
                const sameTypeInputs = inputs.filter((item) => item.type === input.type);
                const idx = Math.max(0, sameTypeInputs.findIndex((item) => item.nodeId === input.nodeId));
                const label = input.type === "image" ? `@图片 ${idx + 1}` : input.type === "video" ? `@视频 ${idx + 1}` : input.type === "audio" ? `@音频 ${idx + 1}` : `@文本 ${idx + 1}`;
                return {
                    id: input.nodeId,
                    nodeId: input.nodeId,
                    label,
                    kind: input.type as "image" | "video" | "audio" | "text",
                    title: input.title || input.text || "",
                    text: input.text || "",
                    active: true,
                    previewUrl: input.type === "image" && input.image ? input.image.dataUrl : input.type === "video" && input.video ? input.video.url : undefined,
                } as CanvasResourceReference;
            }),
        [inputs],
    );

    const handleTemplate = () => {
        const materialLines = inputs.length
            ? inputs.map((input) => {
                  const sameTypeInputs = inputs.filter((item) => item.type === input.type);
                  const idx = Math.max(0, sameTypeInputs.findIndex((item) => item.nodeId === input.nodeId));
                  const label = input.type === "image" ? `@图片 ${idx + 1}` : input.type === "video" ? `@视频 ${idx + 1}` : input.type === "audio" ? `@音频 ${idx + 1}` : `@文本 ${idx + 1}`;
                  return `${label}：${input.title || input.text || "参考素材"}`;
              })
            : ["@图片 1：主体参考图", "@图片 2：场景风格参考图", "@视频 1：运镜参考", "@音频 1：环境声或配乐参考"];
        const template = [
            "素材准备：",
            ...materialLines,
            "",
            "提示词：",
            "请结合以上参考素材完成创作。保持主体一致，参考场景风格与运镜方式。",
            "镜头 1：",
            "镜头 2：",
            "镜头 3：",
            "全程画面高清电影纪实风，色调统一，光影自然；人物面部稳定不变形，动作自然流畅，无卡顿无闪烁。",
        ].join("\n");
        onChange(value.trim() ? `${value.trim()}\n\n${template}` : template);
    };

    return (
        <div
            data-canvas-no-zoom
            className="rounded-2xl border p-3 shadow-2xl backdrop-blur"
            style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
        >
            <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-baseline gap-2">
                    <div className="shrink-0 text-xs font-semibold">组装提示词</div>
                    <div className="truncate text-[11px] opacity-55">@ 引用已连接素材，发送前按当前连接重新编号</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <Button size="small" type="text" className="!h-7 !px-2 !text-xs" onClick={handleTemplate}>
                        模板
                    </Button>
                    <Button size="small" type="text" className="!h-7 !w-7 !min-w-7 !p-0" icon={<X className="size-3.5" />} onClick={onClose} />
                </div>
            </div>
            <div className="relative rounded-xl border" style={{ background: theme.node.fill, borderColor: theme.node.stroke }}>
                <CanvasPromptChipInput
                    value={value}
                    references={references}
                    onChange={onChange}
                    placeholder="输入提示词，按 @ 引用连接的图片或文本"
                    className="min-h-28 w-full px-3 py-2 text-sm leading-7"
                    style={{ color: theme.node.text }}
                />
            </div>
        </div>
    );
}
