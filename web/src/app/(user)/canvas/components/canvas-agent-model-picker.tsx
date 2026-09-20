"use client";

import { useMemo } from "react";
import { Cpu } from "lucide-react";

import { modelOptionName, resolveModelChannel, selectableModelsByCapability, type AiConfig } from "@/stores/use-config-store";
import { modelAvailabilityFrom, usePlatformCatalogModels } from "@/stores/platform-catalog-store";
import { CHANNEL_DOWN_TAG } from "@/lib/credential-health";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

/**
 * Agent 面板共用的文本模型选择器。
 * 候选项来自平台模型目录（管理员后台凭据「绑定模型」→ /api/platform/catalog → 文本能力分桶）。
 * online / orchestrator 面板共用，写入全局 AiConfig.textModel。
 *
 * 渠道熔断（上游凭证失效）的模型在这里置灰：Agent 面板一次失败就是整轮对话中断，
 * 比图片失败更难自行恢复，所以宁可让用户提前挑别的模型。
 */
export function AgentTextModelPicker({ config, value, onChange }: { config: AiConfig; value: string; onChange: (model: string) => void }) {
    const options = useMemo(() => Array.from(new Set([value, ...selectableModelsByCapability(config, "text")].filter(Boolean))), [config, value]);
    const catalogModels = usePlatformCatalogModels();
    const current = value || "";
    const currentAvailability = modelAvailabilityFrom(catalogModels, current);
    return (
        <Select value={current} onValueChange={onChange}>
            <SelectTrigger
                hideChevron
                className="h-7 min-w-0 max-w-[220px] gap-1.5 border-0 bg-transparent px-1 py-0 text-xs font-normal shadow-none hover:bg-transparent hover:opacity-75 focus-visible:border-transparent focus-visible:ring-0 data-[state=open]:ring-0 dark:bg-transparent dark:hover:bg-transparent"
                title={current ? `${modelOptionName(current)} · ${resolveModelChannel(config, current).name}${currentAvailability.available ? "" : `｜${currentAvailability.reason}`}` : "选择文本模型"}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
            >
                <AgentModelIcon model={current} />
                <span className="min-w-0 truncate">{current ? modelOptionName(current) : "选择文本模型"}</span>
                {current ? <span className="shrink-0 opacity-55">{resolveModelChannel(config, current).name}</span> : null}
            </SelectTrigger>
            <SelectContent data-canvas-no-zoom className="z-[1200] w-72 max-w-[calc(100vw-24px)]" position="popper" align="start" side="bottom" sideOffset={6} onPointerDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                {options.length ? (
                    options.map((model) => {
                        const availability = modelAvailabilityFrom(catalogModels, model);
                        return (
                            <SelectItem key={model} value={model} disabled={!availability.available} textValue={`${modelOptionName(model)} ${resolveModelChannel(config, model).name}`}>
                                <span className="flex min-w-0 items-center gap-2" title={availability.reason || undefined}>
                                    <AgentModelIcon model={model} />
                                    <span className="min-w-0 flex-1 truncate">{modelOptionName(model)}</span>
                                    {availability.available ? (
                                        <span className="shrink-0 text-xs opacity-55">{resolveModelChannel(config, model).name}</span>
                                    ) : (
                                        <span className="shrink-0 rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] leading-none text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{CHANNEL_DOWN_TAG}</span>
                                    )}
                                </span>
                            </SelectItem>
                        );
                    })
                ) : (
                    <SelectItem value="__empty_text_model__" disabled>
                        暂无文本模型（请联系管理员在后台凭据「绑定模型」中添加）
                    </SelectItem>
                )}
            </SelectContent>
        </Select>
    );
}

function AgentModelIcon({ model }: { model: string }) {
    const icon = resolveModelIcon(modelOptionName(model));
    return icon ? <img src={icon} alt="" className="size-4 shrink-0 dark:invert" /> : <Cpu className="size-4 shrink-0 opacity-70" />;
}

function resolveModelIcon(model: string) {
    const name = model.toLowerCase();
    if (name.includes("claude") || name.includes("anthropic")) return "/canvas/icons/claude.svg";
    if (name.includes("gemini") || name.includes("google")) return "/canvas/icons/gemini.svg";
    if (name.includes("gpt") || name.includes("openai")) return "/canvas/icons/openai.svg";
    if (name.includes("grok")) return "/canvas/icons/grok.svg";
    if (name.includes("deepseek")) return "/canvas/icons/deepseek.svg";
    if (name.includes("glm")) return "/canvas/icons/glm.svg";
    return "";
}
