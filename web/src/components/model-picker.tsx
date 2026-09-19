"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Cpu } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { REFERENCE_UNSUPPORTED_TAG } from "@/lib/model-reference-support";
import { cn } from "@/lib/utils";
import { imageModelSupportsReferences } from "@/stores/platform-catalog-store";
import { modelOptionLabel, modelOptionName, selectableModelsByCapability, type AiConfig, type ModelCapability } from "@/stores/use-config-store";

type ModelPickerProps = {
    config: AiConfig;
    value?: string;
    onChange: (model: string) => void;
    capability?: ModelCapability;
    className?: string;
    fullWidth?: boolean;
    placeholder?: string;
};

export function ModelPicker({ config, value, onChange, capability, className, fullWidth = false, placeholder = "选择模型" }: ModelPickerProps) {
    const pickerId = useId();
    const [open, setOpen] = useState(false);
    const options = useMemo(() => Array.from(new Set(selectableModelsByCapability(config, capability).filter((model): model is string => Boolean(model)))), [capability, config]);
    const current = value || "";

    useEffect(() => {
        const closeOtherPicker = (event: Event) => {
            if ((event as CustomEvent<string>).detail !== pickerId) setOpen(false);
        };
        window.addEventListener("model-picker-open", closeOtherPicker);
        return () => window.removeEventListener("model-picker-open", closeOtherPicker);
    }, [pickerId]);

    return (
        <Select
            open={open}
            value={current}
            onOpenChange={(nextOpen) => {
                if (nextOpen) window.dispatchEvent(new CustomEvent("model-picker-open", { detail: pickerId }));
                setOpen(nextOpen);
            }}
            onValueChange={onChange}
        >
            <SelectTrigger
                className={cn(
                    "canvas-composer-model-picker h-8 w-fit max-w-full gap-2 rounded-full border border-input bg-transparent px-3 text-sm font-normal shadow-sm transition-colors",
                    fullWidth ? "w-full min-w-0 justify-start" : "min-w-[9rem] justify-start",
                    "data-[state=open]:border-ring data-[state=open]:ring-2 data-[state=open]:ring-ring/20",
                    className,
                )}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
                title={current ? modelOptionLabel(config, current) : placeholder}
            >
                <ModelIcon model={current} />
                <span className="canvas-model-picker-text min-w-0 flex-1 truncate text-left">{current ? modelOptionLabel(config, current) : placeholder}</span>
            </SelectTrigger>
            <SelectContent
                data-canvas-no-zoom
                // 宽度必须「至少等于触发器宽度」：面板内每行的最小宽度由 Radix 按触发器宽度写死
                // （data-position=popper 的 min-w-(--radix-select-trigger-width)），面板比它窄时
                // 每行右侧会被 overflow-x-hidden 裁掉 —— 移动端抽屉里触发器 353px、面板写死 320px，
                // 结果就是模型名右边那截与能力标注一起被切。取两者较大值，再用视口收边。
                className="z-[1200] w-[max(20rem,var(--radix-select-trigger-width))] max-w-[calc(100vw-24px)] rounded-xl border border-border/70 bg-popover p-1 shadow-xl"
                position="popper"
                align="start"
                side="bottom"
                sideOffset={6}
                onPointerDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
            >
                {options.length ? (
                    options.map((model) => (
                        <SelectItem key={model} value={model} textValue={modelOptionLabel(config, model)}>
                            <ModelLabel config={config} model={model} capability={capability} />
                        </SelectItem>
                    ))
                ) : (
                    <SelectItem value="__empty__" disabled>
                        {emptyModelLabel(config, capability)}
                    </SelectItem>
                )}
            </SelectContent>
        </Select>
    );
}

function emptyModelLabel(config: AiConfig, capability?: ModelCapability) {
    const label = capability === "image" ? "生图" : capability === "video" ? "视频" : capability === "text" ? "文本" : capability === "audio" ? "音频" : "";
    if (config.models.length) return `暂无匹配的${label}模型`;
    return "暂无可用模型，请联系管理员在后台配置平台模型";
}

/**
 * 一行模型：图标 + 名字 +（图片模式下）能力标注。
 *
 * 为什么要在挑模型时就标出来：这类模型（Replicate 的 recraft 系）上游根本没有图像入参，
 * 却会对多余的字段静默忽略 —— 用户挂上参考图、照常出图、照常扣费，只是图与参考图无关。
 * 全部拦截逻辑在 lib/model-reference-support.ts，这里只负责让用户提前看见，别先选错再被提示。
 */
function ModelLabel({ config, model, capability }: { config: AiConfig; model: string; capability?: ModelCapability }) {
    // 只标图片模型：视频/音频/文本模型不吃参考图是另一套能力，标了反而误导。
    const showUnsupportedTag = capability === "image" && !imageModelSupportsReferences(model);
    return (
        <span className="flex min-w-0 flex-1 items-center gap-2">
            <ModelIcon model={model} />
            <span className="min-w-0 truncate">{modelOptionLabel(config, model)}</span>
            {showUnsupportedTag ? (
                <span className="ml-auto shrink-0 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] leading-none text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">{REFERENCE_UNSUPPORTED_TAG}</span>
            ) : null}
        </span>
    );
}

function ModelIcon({ model }: { model: string }) {
    const icon = resolveModelIcon(modelOptionName(model));
    return icon ? <img src={icon} alt="" className="size-4 shrink-0 dark:invert" /> : <Cpu className="size-4 shrink-0 opacity-70" />;
}

function resolveModelIcon(model: string) {
    const name = model.toLowerCase();
    if (name.includes("claude") || name.includes("anthropic")) return "/canvas/icons/claude.svg";
    if (name.includes("gemini") || name.includes("google")) return "/canvas/icons/gemini.svg";
    if (name.includes("gpt") || name.includes("openai")) return "/canvas/icons/openai.svg";
    if (name.includes("grok") || name.includes("grok")) return "/canvas/icons/grok.svg";
    if (name.includes("deepseek") || name.includes("deepseek")) return "/canvas/icons/deepseek.svg";
    if (name.includes("glm") || name.includes("glm")) return "/canvas/icons/glm.svg";
    return "";
}
