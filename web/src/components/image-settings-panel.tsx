"use client";

import { type ReactNode, useEffect, useState } from "react";
import { ConfigProvider, Switch } from "antd";

import { type CanvasTheme } from "@/lib/canvas-theme";
import { usePlatformCapability } from "@/stores/platform-catalog-store";
import { modelOptionName, type AiConfig } from "@/stores/use-config-store";

const qualityOptions = [
    { value: "auto", label: "自动" },
    { value: "high", label: "高" },
    { value: "medium", label: "中" },
    { value: "low", label: "低" },
];
const DIMENSION_STEP = 16;

const aspectOptions = [
    { value: "1:1", label: "1:1", width: 1024, height: 1024, icon: "square" },
    { value: "3:2", label: "3:2", width: 1536, height: 1024, icon: "landscape" },
    { value: "2:3", label: "2:3", width: 1024, height: 1536, icon: "portrait" },
    { value: "4:3", label: "4:3", width: 1360, height: 1024, icon: "landscape" },
    { value: "3:4", label: "3:4", width: 1024, height: 1360, icon: "portrait" },
    { value: "16:9", label: "16:9", width: 1824, height: 1024, icon: "landscape" },
    { value: "9:16", label: "9:16", width: 1024, height: 1824, icon: "portrait" },
    { value: "1:1-2k", label: "1:1(2k)", size: "2048x2048", width: 2048, height: 2048, icon: "square" },
    { value: "16:9-2k", label: "16:9(2k)", size: "2048x1152", width: 2048, height: 1152, icon: "landscape" },
    { value: "9:16-2k", label: "9:16(2k)", size: "1152x2048", width: 1152, height: 2048, icon: "portrait" },
    { value: "16:9-4k", label: "16:9(4k)", size: "3840x2160", width: 3840, height: 2160, icon: "landscape" },
    { value: "9:16-4k", label: "9:16(4k)", size: "2160x3840", width: 2160, height: 3840, icon: "portrait" },
    { value: "auto", label: "auto", width: 0, height: 0, icon: "auto" },
];

type ImageSettingsPanelProps = {
    config: AiConfig;
    onConfigChange: (key: "quality" | "size" | "count", value: string) => void;
    theme: CanvasTheme;
    showTitle?: boolean;
    className?: string;
    maxCount?: number;
    quickCount?: number;
};

export function ImageSettingsPanel({ config, onConfigChange, theme, showTitle = true, className = "w-[320px] space-y-4 rounded-2xl px-1 py-0.5", maxCount = 15, quickCount = 10 }: ImageSettingsPanelProps) {
    const [snapDimensionToStep, setSnapDimensionToStep] = useState(true);
    const model = modelOptionName(config.model || config.imageModel);
    const spec = usePlatformCapability(model);
    // 平台能力标定：有标定则按标定过滤选项；无标定（或过滤后为空）退回内置默认
    const qualityOptionsShown = spec?.kind === "image" ? qualityOptions.filter((item) => (spec.qualities as string[]).includes(item.value)) : qualityOptions;
    const aspectOptionsShown = spec?.kind === "image" ? aspectOptions.filter((item) => (spec.aspects as string[]).includes(item.value)) : aspectOptions;
    const effectiveQualities = qualityOptionsShown.length ? qualityOptionsShown : qualityOptions;
    const effectiveAspects = aspectOptionsShown.length ? aspectOptionsShown : aspectOptions;
    const effectiveMaxCount = spec?.kind === "image" ? Math.max(1, Math.min(maxCount, spec.maxCount)) : maxCount;
    const quality = config.quality || "auto";
    const count = Math.max(1, Math.min(effectiveMaxCount, Math.floor(Math.abs(Number(config.count)) || 1)));
    const activeSize = config.size || "auto";
    const selectedAspect = effectiveAspects.find((item) => (item.size || item.value) === activeSize || item.value === activeSize);
    // 收敛：当前值不在平台标定范围内时自动切到第一个允许值（避免把不允许的参数发往上游）
    useEffect(() => {
        if (spec?.kind !== "image") return;
        const allowed = spec.qualities as string[];
        if (!allowed.length || allowed.includes(quality)) return;
        onConfigChange("quality", allowed[0] || "auto");
    }, [spec, quality]);
    useEffect(() => {
        if (spec?.kind !== "image") return;
        const allowedValues = (spec.aspects as string[]).filter((value) => aspectOptions.some((item) => item.value === value));
        const currentAllowed = aspectOptions.some((item) => allowedValues.includes(item.value) && ((item.size || item.value) === activeSize || item.value === activeSize));
        if (!currentAllowed && allowedValues.length) {
            const first = aspectOptions.find((item) => item.value === allowedValues[0]);
            onConfigChange("size", first?.size || first?.value || "auto");
        }
    }, [spec, activeSize]);
    const dimensions = readSizeDimensions(activeSize, selectedAspect || aspectOptions[0]);
    const selectAspect = (value: string) => {
        const option = aspectOptions.find((item) => item.value === value);
        onConfigChange("size", option?.size || option?.value || "auto");
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
                    <SettingTitle index={4} en="QUALITY" color={theme.node.muted} faintColor={theme.node.faint}>
                        质量
                    </SettingTitle>
                    <div className="grid grid-cols-4 gap-2.5">
                        {effectiveQualities.map((item) => (
                            <OptionPill key={item.value} selected={quality === item.value} theme={theme} onClick={() => onConfigChange("quality", item.value)}>
                                {item.label}
                            </OptionPill>
                        ))}
                    </div>
                </div>
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                        <SettingTitle index={5} en="SIZE" color={theme.node.muted} faintColor={theme.node.faint}>
                            尺寸
                        </SettingTitle>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium" style={{ color: theme.node.muted }}>
                                16倍数对齐
                            </span>
                            <span title="输入完成后自动向上补成 16 的倍数" onMouseDown={(event) => event.stopPropagation()}>
                                <Switch size="small" checked={snapDimensionToStep} onChange={setSnapDimensionToStep} />
                            </span>
                        </div>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
                        <DimensionInput prefix="W" value={dimensions.width} disabled={activeSize === "auto"} theme={theme} alignToStep={snapDimensionToStep} onChange={(value) => updateDimension("width", value)} />
                        <span className="text-lg opacity-45">↔</span>
                        <DimensionInput prefix="H" value={dimensions.height} disabled={activeSize === "auto"} theme={theme} alignToStep={snapDimensionToStep} onChange={(value) => updateDimension("height", value)} />
                    </div>
                </div>
                <div className="space-y-2.5">
                    <SettingTitle index={6} en="ASPECT" color={theme.node.muted} faintColor={theme.node.faint}>
                        宽高比
                    </SettingTitle>
                    <div className="grid grid-cols-4 gap-2.5">
                        {effectiveAspects.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                className="flex h-[74px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border text-sm transition hover:opacity-80"
                                style={{
                                    borderColor: selectedAspect?.value === item.value ? theme.node.activeStroke : theme.node.stroke,
                                    background: selectedAspect?.value === item.value ? theme.node.fill : "transparent",
                                    boxShadow: selectedAspect?.value === item.value ? `inset 0 0 0 1px ${theme.node.activeStroke}` : "none",
                                    color: theme.node.text,
                                }}
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={() => selectAspect(item.value)}
                            >
                                <AspectIcon type={item.icon} width={item.width} height={item.height} color={selectedAspect?.value === item.value ? theme.node.activeStroke : theme.node.text} />
                                <span>{item.label}</span>
                                {item.width && item.height ? <span className="sf-mono text-[9px] leading-none opacity-55">{item.width === item.height ? `${item.width}²` : `${item.width}·${item.height}`}</span> : null}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="space-y-2.5">
                    <SettingTitle index={7} en="COUNT" color={theme.node.muted} faintColor={theme.node.faint}>
                        生成张数
                    </SettingTitle>
                    <div className="grid grid-cols-4 gap-2.5">
                        {Array.from({ length: quickCount }, (_, index) => index + 1).map((value) => (
                            <OptionPill key={value} selected={count === value} theme={theme} onClick={() => onConfigChange("count", String(value))}>
                                {value} 张
                            </OptionPill>
                        ))}
                        <CountInput value={count} max={effectiveMaxCount} theme={theme} onChange={(value) => onConfigChange("count", String(value || 1))} />
                    </div>
                </div>
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
    return ({ auto: "自动", high: "高", medium: "中", low: "低" } as Record<string, string>)[value] || value;
}

export function imageSizeLabel(size: string) {
    return aspectOptions.find((item) => (item.size || item.value) === size || item.value === size)?.label || size;
}

function OptionPill({ selected, theme, onClick, children }: { selected: boolean; theme: CanvasTheme; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            className="h-9 cursor-pointer rounded-full border px-2 text-sm font-medium transition hover:opacity-80"
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
                onChange={(event) => onChange(Number(event.target.value) || null)}
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
