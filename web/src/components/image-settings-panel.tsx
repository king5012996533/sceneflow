"use client";

import { type ReactNode, useEffect, useState } from "react";
import { ConfigProvider, Switch } from "antd";

import { type CanvasTheme } from "@/lib/canvas-theme";
import { getGenerationCreditsCost } from "@/lib/credit-pricing";
import { CUSTOM_IMAGE_RATIO, IMAGE_RESOLUTION_OPTIONS, imageRatioOf, imageResolutionTier, imageSizeForRatio, nearestAllowedTier, parseImagePixelSize, synthesizeImagePixelSize, type ImageResolutionTier } from "@/lib/image-resolution";
import { normalizeImageCapability, normalizeImageOutputFormat, IMAGE_OUTPUT_FORMAT_OPTIONS, IMAGE_QUALITY_OPTIONS, IMAGE_QUALITY_TIER_OPTIONS, type ImageAspect, type ImageCapabilityView, type ImageQuality, resolveImageQuality } from "@/lib/model-capability-spec";
import { getPlatformPricing, getPricingDefaults, usePlatformCapability } from "@/stores/platform-catalog-store";
import { modelOptionName, type AiConfig } from "@/stores/use-config-store";

const qualityOptions = IMAGE_QUALITY_OPTIONS;
const DIMENSION_STEP = 16;

/** 比例清单（像素值即 1K 档的定值；2K/4K 的定值由 image-resolution 提供） */
const aspectOptions = [
    { value: "1:1", label: "1:1", width: 1024, height: 1024, icon: "square" },
    { value: "3:2", label: "3:2", width: 1536, height: 1024, icon: "landscape" },
    { value: "2:3", label: "2:3", width: 1024, height: 1536, icon: "portrait" },
    { value: "4:3", label: "4:3", width: 1360, height: 1024, icon: "landscape" },
    { value: "3:4", label: "3:4", width: 1024, height: 1360, icon: "portrait" },
    { value: "16:9", label: "16:9", width: 1824, height: 1024, icon: "landscape" },
    { value: "9:16", label: "9:16", width: 1024, height: 1824, icon: "portrait" },
    { value: "auto", label: "auto", width: 0, height: 0, icon: "auto" },
];

type ImageSettingsPanelProps = {
    config: AiConfig;
    onConfigChange: (key: "quality" | "size" | "count" | "outputFormat", value: string) => void;
    theme: CanvasTheme;
    /**
     * 本次请求真正会用的图像模型（调用方最清楚：画布节点用 config.model，studio 用 config.imageModel）。
     * 不传时按 config.model → config.imageModel 兜底。传错会导致「面板显示的单价/可选档位」与实际扣费不一致。
     */
    model?: string;
    showTitle?: boolean;
    className?: string;
    maxCount?: number;
    quickCount?: number;
};

export function ImageSettingsPanel({ config, onConfigChange, theme, model: modelProp, showTitle = true, className = "w-[320px] space-y-4 rounded-2xl px-1 py-0.5", maxCount = 15, quickCount = 10 }: ImageSettingsPanelProps) {
    const [snapDimensionToStep, setSnapDimensionToStep] = useState(true);
    const model = modelOptionName(modelProp || config.model || config.imageModel);
    const spec = usePlatformCapability(model);
    // 平台能力标定：有标定则按标定过滤选项；无标定（或过滤后为空）退回内置默认
    const imageCapability: ImageCapabilityView | null = spec?.kind === "image" ? normalizeImageCapability(spec) : null;
    const qualityOptionsShown = imageCapability ? qualityOptions.filter((item) => imageCapability.qualities.includes(item.value as ImageQuality)) : qualityOptions;
    const aspectOptionsShown = imageCapability ? aspectOptions.filter((item) => imageCapability.aspects.includes(item.value as ImageAspect)) : aspectOptions;
    const resolutionOptionsShown = imageCapability ? IMAGE_RESOLUTION_OPTIONS.filter((item) => imageCapability.resolutions.includes(item.value)) : [...IMAGE_RESOLUTION_OPTIONS];
    const effectiveQualities = qualityOptionsShown.length ? qualityOptionsShown : qualityOptions;
    const effectiveAspects = aspectOptionsShown.length ? aspectOptionsShown : aspectOptions;
    const effectiveResolutions = resolutionOptionsShown.length ? resolutionOptionsShown : [...IMAGE_RESOLUTION_OPTIONS];
    /**
     * 画质档位轴（模型自己用 quality 表达分辨率时标定，见 model-capability-spec 的 qualityTiers）。
     * 有这条轴时：分辨率档位整行换成画质档、尺寸只留宽高比、像素与 W/H 输入都不出现 ——
     * 因为像素是上游按 quality 决定的，我们给不出准确数字，硬写一个只会骗用户。
     */
    const qualityTierOptions = imageCapability?.qualityTiers?.length ? IMAGE_QUALITY_TIER_OPTIONS.filter((item) => imageCapability.qualityTiers!.includes(item.value)) : null;
    const usesQualityAxis = Boolean(qualityTierOptions);
    /**
     * 出图格式行：只有后台在能力标定里勾了 outputFormats 的模型才出现。
     * 平台请求里 output_format 是我们显式带的字段，勾了才敢让用户换 —— 没勾的渠道认不认这个值我们不知道。
     */
    const outputFormatOptions = imageCapability?.outputFormats?.length ? IMAGE_OUTPUT_FORMAT_OPTIONS.filter((item) => imageCapability.outputFormats!.includes(item.value)) : null;
    const usesOutputFormatRow = Boolean(outputFormatOptions);
    /**
     * 只吃宽高比的模型（后台标了 aspectOnly，见 model-capability-spec）：上游没有分辨率/画质这两轴，
     * 像素由它自己定。面板只留宽高比，别给像素数字、别给 W/H、别给档位 —— 给了就是骗人（还按档位收费）。
     */
    const usesAspectOnly = Boolean(imageCapability?.aspectOnly);
    /** 尺寸行「不给像素」的两种情形：画质档位轴（像素按 quality 走）与只吃宽高比 */
    const hidesPixelSize = usesQualityAxis || usesAspectOnly;
    const outputFormat = normalizeImageOutputFormat(config.outputFormat);
    const allowedTiers = effectiveResolutions.map((item) => item.value);
    const effectiveMaxCount = imageCapability ? Math.max(1, Math.min(maxCount, imageCapability.maxCount)) : maxCount;
    // 画质走统一解析：用户选过的值 > 模型标定的默认档 > auto。
    // 别在这里写 `config.quality || "auto"` —— 那样模型默认档永远轮不到，价格也会跟着算错档。
    const quality = resolveImageQuality(config.quality, imageCapability);
    const count = Math.max(1, Math.min(effectiveMaxCount, Math.floor(Math.abs(Number(config.count)) || 1)));
    const activeSize = config.size || "auto";
    // 当前选择落在哪个比例 / 哪一档分辨率（比例由像素值或比例串反推，自定义像素单独归一档）
    const selectedRatio = imageRatioOf(activeSize);
    const selectedAspect = effectiveAspects.find((item) => item.value === selectedRatio);
    const currentTier = imageResolutionTier(activeSize, quality);
    const activeTier = usesQualityAxis ? currentTier : allowedTiers.includes(currentTier) ? currentTier : nearestAllowedTier(currentTier, allowedTiers);
    const activeQualityTier = qualityTierOptions?.find((item) => item.value === quality);
    const perImageCredits = getGenerationCreditsCost("image", { model, size: activeSize, quality }, getPlatformPricing(model), getPricingDefaults());
    // 收敛 0（画质档位轴 / 只吃宽高比的模型专用）：这类模型没有「像素尺寸」这一轴，
    // 把遗留的像素值收敛回纯比例。不收敛会连带算错价：扣费按 size 判档，像素值会让档位脱离画质。
    useEffect(() => {
        if (!hidesPixelSize) return;
        const ratio = imageRatioOf(activeSize);
        const next = ratio === CUSTOM_IMAGE_RATIO ? "auto" : ratio;
        if (next !== activeSize) onConfigChange("size", next);
    }, [hidesPixelSize, activeSize]);
    // 收敛 1：档位不在标定里时只降不升地换档（不悄悄给用户涨价）
    useEffect(() => {
        if (!imageCapability || usesQualityAxis) return;
        const allowed = imageCapability.resolutions;
        const current = imageResolutionTier(activeSize, quality);
        if (!allowed.length || allowed.includes(current)) return;
        const next = nearestAllowedTier(current, allowed);
        const ratio = imageRatioOf(activeSize);
        if (ratio === CUSTOM_IMAGE_RATIO) {
            // 自定义像素：按原宽高比换算到允许档位（今天这里会把用户的输入直接丢掉，顺带修掉）
            const dimensions = parseImagePixelSize(activeSize);
            onConfigChange("size", (dimensions ? synthesizeImagePixelSize(`${dimensions.width}:${dimensions.height}`, next) : null) ?? "auto");
            return;
        }
        const target = ratio === "auto" ? effectiveAspects[0]?.value : ratio;
        onConfigChange("size", (target ? imageSizeForRatio(target, next) : null) ?? "auto");
    }, [spec, activeSize, quality]);
    // 收敛 2：当前比例不在标定里时换到第一个允许值（自定义像素不参与，避免把用户输入的尺寸改掉）
    useEffect(() => {
        if (!imageCapability || selectedRatio === CUSTOM_IMAGE_RATIO || selectedRatio === "auto") return;
        const allowedValues = imageCapability.aspects.filter((value) => aspectOptions.some((item) => item.value === value));
        if (!allowedValues.length || allowedValues.includes(selectedRatio)) return;
        onConfigChange("size", imageSizeForRatio(allowedValues[0], activeTier) ?? allowedValues[0]);
    }, [spec, activeSize, quality]);
    // 张数收敛：config.count 超过能力标定的 maxCount 时写回。
    // 上面那个 count 只是「显示用」的夹取，扣费与提交读的是 config.count —— 不写回就是
    // 「面板显示 1 张、按 3 张扣钱」。换模型（画布节点的默认值是 3 张）最容易撞上这条。
    useEffect(() => {
        const stored = Math.floor(Number(config.count));
        if (!Number.isFinite(stored) || stored <= effectiveMaxCount) return;
        onConfigChange("count", String(effectiveMaxCount));
    }, [config.count, effectiveMaxCount]);
    // 质量收敛：画质档位轴的模型按自己的档位清单收敛，其余沿用「画质（高级）」清单
    useEffect(() => {
        if (!imageCapability) return;
        const allowed = qualityTierOptions?.map((item) => item.value) || imageCapability.qualities;
        if (!allowed.length || allowed.includes(quality as ImageQuality)) return;
        onConfigChange("quality", allowed[0] || "auto");
    }, [spec, quality]);
    // 格式收敛：换了模型后本地存的格式可能不在这个模型的标定里（例如从 png 换到只支持 webp 的渠道）
    useEffect(() => {
        if (!outputFormatOptions) return;
        const allowed = outputFormatOptions.map((item) => item.value);
        if (allowed.includes(outputFormat as (typeof allowed)[number])) return;
        onConfigChange("outputFormat", allowed[0] || "webp");
    }, [spec, outputFormat]);
    const dimensions = readSizeDimensions(activeSize, selectedAspect || aspectOptions[0]);
    const selectAspect = (value: string) => {
        if (value === "auto") {
            onConfigChange("size", "auto");
            return;
        }
        // 画质档位轴 / 只吃宽高比的模型只发宽高比（像素由上游定），不能再写像素值
        onConfigChange("size", hidesPixelSize ? value : (imageSizeForRatio(value, activeTier) ?? value));
    };
    const selectResolution = (tier: ImageResolutionTier) => {
        if (selectedRatio === CUSTOM_IMAGE_RATIO) {
            const dimensions = parseImagePixelSize(activeSize);
            if (dimensions) {
                onConfigChange("size", synthesizeImagePixelSize(`${dimensions.width}:${dimensions.height}`, tier) ?? "auto");
                return;
            }
        }
        const ratio = selectedRatio === "auto" ? effectiveAspects[0]?.value : selectedRatio;
        onConfigChange("size", (ratio ? imageSizeForRatio(ratio, tier) : null) ?? "auto");
    };
    const updateDimension = (key: "width" | "height", value: number | null) => {
        const next = Math.max(1, Math.floor(value || dimensions[key] || 1024));
        const width = key === "width" ? next : dimensions.width;
        const height = key === "height" ? next : dimensions.height;
        onConfigChange("size", `${alignDimension(width, snapDimensionToStep)}x${alignDimension(height, snapDimensionToStep)}`);
    };

    return (
        <ImageSettingsTheme theme={theme}>
            <div
                className={className}
                style={{ color: theme.node.text }}
                onMouseDown={(event) => {
                    event.stopPropagation();
                    if (event.target instanceof HTMLInputElement) return;
                    if (document.activeElement instanceof HTMLInputElement && event.currentTarget.contains(document.activeElement)) document.activeElement.blur();
                }}
            >
                {showTitle ? <div className="text-sm font-medium">图像设置</div> : null}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                        <SettingTitle index={4} en="SIZE" color={theme.node.muted} faintColor={theme.node.faint}>
                            尺寸
                        </SettingTitle>
                        {/* 这个开关只作用于 W/H 输入框（补成 16 的倍数）；W/H 不显示时它没有任何作用对象，
                            留着就是个点了没反应的假控件 */}
                        {hidesPixelSize ? null : (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-medium" style={{ color: theme.node.muted }}>
                                    16倍数对齐
                                </span>
                                <span title="输入完成后自动向上补成 16 的倍数" onMouseDown={(event) => event.stopPropagation()}>
                                    <Switch size="small" checked={snapDimensionToStep} onChange={setSnapDimensionToStep} />
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-4 gap-2.5">
                        {effectiveAspects.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                className="flex h-[74px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border text-sm transition hover:opacity-80"
                                style={{
                                    borderColor: selectedRatio === item.value ? theme.node.activeStroke : theme.node.stroke,
                                    background: selectedRatio === item.value ? theme.node.fill : "transparent",
                                    boxShadow: selectedRatio === item.value ? `inset 0 0 0 1px ${theme.node.activeStroke}` : "none",
                                    color: theme.node.text,
                                }}
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={() => selectAspect(item.value)}
                            >
                                <AspectIcon type={item.icon} width={item.width} height={item.height} color={selectedRatio === item.value ? theme.node.activeStroke : theme.node.text} />
                                <span>{item.label}</span>
                                <AspectSizeHint ratio={item.value} tier={hidesPixelSize ? null : activeTier} className="sf-mono text-[9px] leading-none opacity-55" />
                            </button>
                        ))}
                    </div>
                    {/* 画质档位轴 / 只吃宽高比的模型不显示 W/H：像素由上游定，我们能给的数字是假的 */}
                    {hidesPixelSize ? null : (
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
                            <DimensionInput prefix="W" value={dimensions.width} disabled={activeSize === "auto"} theme={theme} alignToStep={snapDimensionToStep} onChange={(value) => updateDimension("width", value)} />
                            <span className="text-lg opacity-45">↔</span>
                            <DimensionInput prefix="H" value={dimensions.height} disabled={activeSize === "auto"} theme={theme} alignToStep={snapDimensionToStep} onChange={(value) => updateDimension("height", value)} />
                        </div>
                    )}
                </div>
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                        <SettingTitle index={5} en={usesQualityAxis ? "QUALITY" : "RESOLUTION"} color={theme.node.muted} faintColor={theme.node.faint}>
                            {usesQualityAxis ? "画质" : "分辨率"}
                        </SettingTitle>
                        <span className="sf-mono text-[11px] font-bold" style={{ color: theme.node.muted }}>
                            每张 {perImageCredits} 积分
                        </span>
                    </div>
                    {usesAspectOnly ? (
                        <div className="text-[11px] leading-4" style={{ color: theme.node.muted }}>
                            这个模型没有分辨率档位：像素由它自己按比例定，约 400 万像素级（9:16 实测出 1536×2688），这里只选宽高比。
                        </div>
                    ) : qualityTierOptions ? (
                        <>
                            <div className="grid grid-cols-3 gap-2.5">
                                {qualityTierOptions.map((item) => (
                                    <OptionPill key={item.value} title={item.hint} selected={quality === item.value} theme={theme} onClick={() => onConfigChange("quality", item.value)}>
                                        {item.label}
                                    </OptionPill>
                                ))}
                            </div>
                            {activeQualityTier ? (
                                <div className="text-[11px] leading-4" style={{ color: theme.node.muted }}>
                                    {activeQualityTier.hint}
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <div className="grid grid-cols-3 gap-2.5">
                            {effectiveResolutions.map((item) => (
                                <OptionPill key={item.value} selected={activeTier === item.value} theme={theme} onClick={() => selectResolution(item.value)}>
                                    {item.label}
                                </OptionPill>
                            ))}
                        </div>
                    )}
                </div>
                <div className="space-y-2.5">
                    <SettingTitle index={6} en="COUNT" color={theme.node.muted} faintColor={theme.node.faint}>
                        生成张数
                    </SettingTitle>
                    <div className="grid grid-cols-4 gap-2.5">
                        {Array.from({ length: Math.max(1, Math.min(quickCount, effectiveMaxCount)) }, (_, index) => index + 1).map((value) => (
                            <OptionPill key={value} selected={count === value} theme={theme} onClick={() => onConfigChange("count", String(value))}>
                                {value} 张
                            </OptionPill>
                        ))}
                        <CountInput value={count} max={effectiveMaxCount} theme={theme} onChange={(value) => onConfigChange("count", String(value || 1))} />
                    </div>
                </div>
                {/* 出图格式：只有能力标定里勾了 outputFormats 的模型才出现这一行 */}
                {outputFormatOptions ? (
                    <div className="space-y-2.5">
                        <SettingTitle index={7} en="FORMAT" color={theme.node.muted} faintColor={theme.node.faint}>
                            格式
                        </SettingTitle>
                        <div className="grid grid-cols-3 gap-2.5">
                            {outputFormatOptions.map((item) => (
                                <OptionPill key={item.value} title={item.hint} selected={outputFormat === item.value} theme={theme} onClick={() => onConfigChange("outputFormat", item.value)}>
                                    {item.label}
                                </OptionPill>
                            ))}
                        </div>
                        <div className="text-[11px] leading-4" style={{ color: theme.node.muted }}>
                            {outputFormatOptions.find((item) => item.value === outputFormat)?.hint || ""}
                        </div>
                    </div>
                ) : null}
                {/* 画质档位轴的模型：画质已经升格成上面那一行主档位，这里不再重复一遍；
                    只吃宽高比的模型上游不认 quality，也不该出现这一块 */}
                {hidesPixelSize ? null : (
                    <details className="space-y-2.5">
                        <summary className="cursor-pointer list-none select-none">
                            <SettingTitle index={outputFormatOptions ? 8 : 7} en="QUALITY" color={theme.node.muted} faintColor={theme.node.faint}>
                                画质（高级）
                            </SettingTitle>
                        </summary>
                        <div className="mt-2 grid grid-cols-4 gap-2.5">
                            {effectiveQualities.map((item) => (
                                <OptionPill key={item.value} selected={quality === item.value} theme={theme} onClick={() => onConfigChange("quality", item.value)}>
                                    {item.label}
                                </OptionPill>
                            ))}
                        </div>
                    </details>
                )}
            </div>
        </ImageSettingsTheme>
    );
}

export function ImageSettingsTheme({ theme, children }: { theme: CanvasTheme; children: ReactNode }) {
    return (
        <ConfigProvider
            theme={{
                token: { colorBgContainer: theme.toolbar.panel, colorBgElevated: theme.toolbar.panel, colorBorder: theme.node.stroke, colorPrimary: theme.node.activeStroke, colorText: theme.node.text, colorTextLightSolid: theme.node.panel },
                components: { Button: { defaultBg: theme.toolbar.panel, defaultBorderColor: theme.node.stroke, defaultColor: theme.node.text } },
            }}
        >
            {children}
        </ConfigProvider>
    );
}

export function imageQualityLabel(value: string) {
    return IMAGE_QUALITY_OPTIONS.find((item) => item.value === value)?.label || value;
}

export function imageSizeLabel(size: string) {
    if (!size || size === "auto") return "auto";
    const ratio = imageRatioOf(size);
    if (ratio === CUSTOM_IMAGE_RATIO) return size;
    const dimensions = parseImagePixelSize(size);
    const tier = dimensions ? imageResolutionTier(size) : null;
    return tier ? `${ratio} (${tier.toUpperCase()})` : ratio;
}

/** 比例 chip 上的像素提示：跟着当前分辨率档位走（"auto" 与画质档位轴的模型都不显示） */
function AspectSizeHint({ ratio, tier, className }: { ratio: string; tier: ImageResolutionTier | null; className?: string }) {
    if (ratio === "auto" || !tier) return null;
    const size = imageSizeForRatio(ratio, tier);
    const dimensions = size ? parseImagePixelSize(size) : null;
    if (!dimensions) return null;
    return <span className={className}>{dimensions.width === dimensions.height ? `${dimensions.width}²` : `${dimensions.width}·${dimensions.height}`}</span>;
}

function OptionPill({ selected, theme, onClick, title, children }: { selected: boolean; theme: CanvasTheme; onClick: () => void; title?: string; children: ReactNode }) {
    return (
        <button
            type="button"
            className="h-9 cursor-pointer rounded-full border px-2 text-sm font-medium transition hover:opacity-80"
            title={title}
            style={{
                background: selected ? theme.node.fill : "transparent",
                borderColor: selected ? theme.node.activeStroke : theme.node.stroke,
                boxShadow: selected ? `inset 0 0 0 1px ${theme.node.activeStroke}` : "none",
                color: selected ? theme.node.text : theme.node.text,
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

function DimensionInput({ prefix, value, disabled, theme, alignToStep, onChange }: { prefix: string; value: number; disabled: boolean; theme: CanvasTheme; alignToStep: boolean; onChange: (value: number | null) => void }) {
    const commit = (input: HTMLInputElement) => {
        const next = alignDimension(Math.max(1, Math.floor(Number(input.value) || value || 1024)), alignToStep);
        input.value = String(next);
        onChange(next);
    };

    return (
        <label className="flex h-9 overflow-hidden rounded-xl text-sm" style={{ background: theme.node.fill, color: theme.node.text, opacity: disabled ? 0.55 : 1 }}>
            <span className="grid w-9 place-items-center sf-mono text-xs" style={{ color: theme.node.muted }}>
                {prefix}
            </span>
            <input
                type="number"
                min={1}
                disabled={disabled}
                className="sf-mono min-w-0 flex-1 bg-transparent px-2 font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                defaultValue={value || ""}
                key={`${prefix}-${value}`}
                onBlur={(event) => commit(event.currentTarget)}
                onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                }}
                onMouseDown={(event) => event.stopPropagation()}
            />
        </label>
    );
}

function CountInput({ value, max, theme, onChange }: { value: number; max: number; theme: CanvasTheme; onChange: (value: number | null) => void }) {
    return (
        <label className="col-span-2 flex h-9 overflow-hidden rounded-full border text-sm" style={{ borderColor: theme.node.stroke, color: theme.node.text }}>
            <input
                type="number"
                min={1}
                max={max}
                className="sf-mono min-w-0 flex-1 bg-transparent px-3 text-center font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                style={{ color: theme.node.text, WebkitTextFillColor: theme.node.text }}
                value={value || ""}
                onChange={(event) => {
                    // 必须在这里夹住上限：input 的 max 属性只约束步进箭头，手打「99」照样能提交。
                    // 夹不住就是「按 99 张扣费、上游只回 maxCount 张」——固定出单张的模型（recraft）必中招。
                    const next = Math.floor(Number(event.target.value));
                    onChange(Number.isFinite(next) && next > 0 ? Math.min(next, max) : null);
                }}
                onMouseDown={(event) => event.stopPropagation()}
            />
        </label>
    );
}

function AspectIcon({ type, width, height, color }: { type: string; width: number; height: number; color: string }) {
    if (type === "auto") return null;
    const ratio = width / Math.max(1, height);
    const boxWidth = ratio >= 1 ? 24 : Math.max(10, 24 * ratio);
    const boxHeight = ratio >= 1 ? Math.max(10, 24 / ratio) : 24;
    return (
        <span className="grid h-7 w-9 place-items-center">
            <span className="border-2" style={{ width: boxWidth, height: boxHeight, borderColor: color }} />
        </span>
    );
}

function SettingTitle({ children, en, index, color, faintColor }: { children: string; en: string; index?: number; color: string; faintColor: string }) {
    return (
        <div className="sf-mono flex items-baseline gap-2 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color }}>
            <span>{typeof index === "number" ? `${String(index).padStart(2, "0")} · ${en}` : en}</span>
            <span className="normal-case font-semibold tracking-normal" style={{ color: faintColor }}>
                {children}
            </span>
        </div>
    );
}

function readSizeDimensions(size: string, fallback: { width: number; height: number }) {
    const match = size?.match(/^(\d+)x(\d+)$/);
    return {
        width: match ? Number(match[1]) : fallback.width,
        height: match ? Number(match[2]) : fallback.height,
    };
}

function alignDimension(value: number, enabled: boolean) {
    return enabled ? Math.ceil(value / DIMENSION_STEP) * DIMENSION_STEP : value;
}
