"use client";

import { type ReactNode, useEffect } from "react";
import { Switch } from "antd";

import { ImageSettingsTheme } from "@/components/image-settings-panel";
import {
    boolConfig,
    isSeedanceFastModel,
    isSeedanceVideoConfig,
    normalizeSeedanceDuration,
    normalizeSeedanceRatio,
    normalizeSeedanceResolution,
    seedanceDurationOptions,
    seedancePixelLabel,
    seedanceRatioOptions,
    seedanceResolutionOptions,
} from "@/lib/seedance-video";
import { isMiniMaxVideoConfig, normalizeMiniMaxDuration, normalizeMiniMaxRatio, normalizeMiniMaxResolution, MINIMAX_DURATION_OPTIONS, MINIMAX_RATIO_OPTIONS, MINIMAX_RESOLUTION_OPTIONS } from "@/lib/minimax-video";
import { GENVIDEO_DURATION_OPTIONS, GENVIDEO_RATIO_OPTIONS, isGenvideoVideoConfig, normalizeGenvideoDuration, normalizeGenvideoRatio } from "@/lib/genvideo";
import { type CanvasTheme } from "@/lib/canvas-theme";
import { usePlatformCapability } from "@/stores/platform-catalog-store";
import { modelOptionName, type AiConfig } from "@/stores/use-config-store";

const resolutionOptions = [
    { value: "720", label: "720p" },
    { value: "480", label: "480p" },
];

const sizeOptions = [
    { value: "1280x720", label: "横屏", width: 1280, height: 720 },
    { value: "720x1280", label: "竖屏", width: 720, height: 1280 },
    { value: "1024x1024", label: "方形", width: 1024, height: 1024 },
    { value: "1792x1024", label: "宽屏", width: 1792, height: 1024 },
    { value: "1024x1792", label: "长图", width: 1024, height: 1792 },
    { value: "auto", label: "auto", width: 0, height: 0 },
];

const secondOptions = [6, 10, 12, 16, 20];

type VideoSettingsPanelProps = {
    config: AiConfig;
    onConfigChange: (key: "vquality" | "size" | "videoSeconds" | "videoGenerateAudio" | "videoWatermark" | "videoDraft", value: string) => void;
    theme: CanvasTheme;
    showTitle?: boolean;
    className?: string;
};

export function VideoSettingsPanel({ config, onConfigChange, theme, showTitle = true, className = "w-[320px] space-y-4 rounded-2xl px-1 py-0.5" }: VideoSettingsPanelProps) {
    if (isMiniMaxVideoConfig(config)) {
        return <MiniMaxVideoSettingsPanel config={config} onConfigChange={onConfigChange} theme={theme} showTitle={showTitle} className={className} />;
    }
    if (isGenvideoVideoConfig(config)) {
        // GenVideo 分支须在 seedance 之前：与任务创建分发顺序保持一致
        return <GenVideoSettingsPanel config={config} onConfigChange={onConfigChange} theme={theme} showTitle={showTitle} className={className} />;
    }
    if (isSeedanceVideoConfig(config)) {
        return <SeedanceVideoSettingsPanel config={config} onConfigChange={onConfigChange} theme={theme} showTitle={showTitle} className={className} />;
    }

    const seconds = config.videoSeconds || "6";
    const size = normalizeVideoSizeValue(config.size);
    const dimensions = readSizeDimensions(size);
    const resolution = normalizeVideoResolutionValue(config.vquality);
    const model = modelOptionName(config.model || config.videoModel);
    const spec = usePlatformCapability(model);
    // 平台能力标定：有标定则按标定过滤选项；无标定（或标定为空）退回内置默认
    const clarityOptionsShown = spec?.kind === "video" && (spec.clarity as string[]).length ? resolutionOptions.filter((item) => (spec.clarity as string[]).includes(item.value)) : resolutionOptions;
    const sizeOptionsShown = spec?.kind === "video" && (spec.sizes as string[]).length ? sizeOptions.filter((item) => (spec.sizes as string[]).includes(item.value)) : sizeOptions;
    const secondsOptionsShown = spec?.kind === "video" && (spec.seconds as number[]).length ? secondOptions.filter((value) => (spec.seconds as number[]).includes(value)) : secondOptions;
    // prunaai/p-video 支持草稿模式：开启更快更省但画质较低，关闭走完整推理
    const isPrunaVideo = model.toLowerCase().includes("prunaai/p-video");
    const draftMode = boolConfig(config.videoDraft, true);
    // 收敛：当前值不在平台标定范围内时自动切到第一个允许值（避免把不允许的参数发往上游）
    useEffect(() => {
        if (spec?.kind !== "video") return;
        const allowed = spec.clarity as string[];
        if (!allowed.length || allowed.includes(resolution)) return;
        onConfigChange("vquality", allowed[0] || "720");
    }, [spec, resolution]);
    useEffect(() => {
        if (spec?.kind !== "video") return;
        const allowed = spec.sizes as string[];
        if (!allowed.length || allowed.includes(size)) return;
        onConfigChange("size", allowed[0] || "1280x720");
    }, [spec, size]);
    useEffect(() => {
        if (spec?.kind !== "video") return;
        const allowed = spec.seconds as number[];
        if (!allowed.length || allowed.includes(Number(seconds))) return;
        onConfigChange("videoSeconds", String(allowed[0] ?? 6));
    }, [spec, seconds]);
    const updateDimension = (key: "width" | "height", value: number | null) => {
        const next = Math.max(1, Math.floor(value || dimensions[key] || 720));
        onConfigChange("size", `${key === "width" ? next : dimensions.width}x${key === "height" ? next : dimensions.height}`);
    };

    return (
        <ImageSettingsTheme theme={theme}>
            <div className={className} style={{ color: theme.node.text }} onMouseDown={(event) => event.stopPropagation()}>
                {showTitle ? <div className="text-sm font-medium">视频设置</div> : null}
                <SettingGroup index={4} title="清晰度" en="CLARITY" color={theme.node.muted} faintColor={theme.node.faint}>
                    <div className="grid grid-cols-3 gap-2.5">
                        {clarityOptionsShown.map((item) => (
                            <OptionPill key={item.value} selected={resolution === item.value} theme={theme} onClick={() => onConfigChange("vquality", item.value)}>
                                {item.label}
                            </OptionPill>
                        ))}
                        <ResolutionInput value={resolution} theme={theme} onChange={(value) => onConfigChange("vquality", value)} />
                    </div>
                </SettingGroup>
                <SettingGroup index={5} title="尺寸" en="SIZE" color={theme.node.muted} faintColor={theme.node.faint}>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
                        <DimensionInput prefix="W" value={dimensions.width} disabled={size === "auto"} theme={theme} onChange={(value) => updateDimension("width", value)} />
                        <span className="text-lg opacity-45">↔</span>
                        <DimensionInput prefix="H" value={dimensions.height} disabled={size === "auto"} theme={theme} onChange={(value) => updateDimension("height", value)} />
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                        {sizeOptionsShown.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                className="flex h-[78px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border text-sm transition hover:opacity-80"
                                style={{
                                    borderColor: size === item.value ? theme.node.activeStroke : theme.node.stroke,
                                    background: size === item.value ? theme.node.fill : "transparent",
                                    boxShadow: size === item.value ? `inset 0 0 0 1px ${theme.node.activeStroke}` : "none",
                                    color: theme.node.text,
                                }}
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={() => onConfigChange("size", item.value)}
                            >
                                <SizePreview width={item.width} height={item.height} color={size === item.value ? theme.node.activeStroke : theme.node.text} />
                                <span>{item.label}</span>
                                {item.value === "auto" ? null : <span className="sf-mono text-[10px] leading-none opacity-55">{item.value}</span>}
                            </button>
                        ))}
                    </div>
                </SettingGroup>
                <SettingGroup index={6} title="秒数" en="SECONDS" color={theme.node.muted} faintColor={theme.node.faint}>
                    <div className="grid grid-cols-3 gap-2.5">
                        {secondsOptionsShown.map((value) => (
                            <OptionPill key={value} selected={seconds === String(value)} theme={theme} onClick={() => onConfigChange("videoSeconds", String(value))}>
                                {value}s
                            </OptionPill>
                        ))}
                        <NumberInput value={seconds} min={1} max={20} theme={theme} onChange={(value) => onConfigChange("videoSeconds", value)} />
                    </div>
                </SettingGroup>
                {isPrunaVideo ? (
                    <SettingGroup index={7} title="输出" en="OUTPUT" color={theme.node.muted} faintColor={theme.node.faint}>
                        <div className="grid gap-2 rounded-xl border p-2.5" style={{ borderColor: theme.node.stroke }}>
                            <SwitchRow label="草稿模式（更快更省）" checked={draftMode} theme={theme} onChange={(checked) => onConfigChange("videoDraft", String(checked))} />
                        </div>
                    </SettingGroup>
                ) : null}
            </div>
        </ImageSettingsTheme>
    );
}

function SeedanceVideoSettingsPanel({ config, onConfigChange, theme, showTitle, className }: VideoSettingsPanelProps) {
    const model = modelOptionName(config.model || config.videoModel);
    const spec = usePlatformCapability(model);
    const resolution = normalizeSeedanceResolution(config.vquality, model);
    const ratio = normalizeSeedanceRatio(config.size);
    const duration = normalizeSeedanceDuration(config.videoSeconds);
    const generateAudio = boolConfig(config.videoGenerateAudio, true);
    const watermark = boolConfig(config.videoWatermark, false);
    // 平台能力标定：有标定则按标定过滤选项；无标定（或标定为空）退回内置默认
    const resolutionOptionsShown = spec?.kind === "seedance-video" && (spec.resolutions as string[]).length ? seedanceResolutionOptions.filter((item) => (spec.resolutions as string[]).includes(item.value)) : seedanceResolutionOptions;
    const ratioOptionsShown = spec?.kind === "seedance-video" && (spec.ratios as string[]).length ? seedanceRatioOptions.filter((item) => (spec.ratios as string[]).includes(item.value)) : seedanceRatioOptions;
    const durationOptionsShown = spec?.kind === "seedance-video" && (spec.durations as number[]).length ? seedanceDurationOptions.filter((value) => (spec.durations as number[]).includes(value)) : seedanceDurationOptions;
    const audioEnabled = spec?.kind !== "seedance-video" || spec.audio;
    const watermarkEnabled = spec?.kind !== "seedance-video" || spec.watermark;
    // 收敛：当前值不在平台标定范围内时自动切到第一个允许值；不允许的声音/水印强制关闭
    useEffect(() => {
        if (spec?.kind !== "seedance-video") return;
        const allowed = spec.resolutions as string[];
        if (!allowed.length || allowed.includes(resolution)) return;
        onConfigChange("vquality", allowed[0] || "720p");
    }, [spec, resolution]);
    useEffect(() => {
        if (spec?.kind !== "seedance-video") return;
        const allowed = spec.ratios as string[];
        if (!allowed.length || allowed.includes(ratio)) return;
        onConfigChange("size", allowed[0] || "16:9");
    }, [spec, ratio]);
    useEffect(() => {
        if (spec?.kind !== "seedance-video") return;
        const allowed = spec.durations as number[];
        if (!allowed.length || allowed.includes(duration)) return;
        onConfigChange("videoSeconds", String(allowed[0] ?? -1));
    }, [spec, duration]);
    useEffect(() => {
        if (spec?.kind !== "seedance-video") return;
        if (!spec.audio && generateAudio) onConfigChange("videoGenerateAudio", "false");
        if (!spec.watermark && watermark) onConfigChange("videoWatermark", "false");
    }, [spec, generateAudio, watermark]);

    return (
        <ImageSettingsTheme theme={theme}>
            <div className={className} style={{ color: theme.node.text }} onMouseDown={(event) => event.stopPropagation()}>
                {showTitle ? <div className="text-sm font-medium">视频设置</div> : null}
                <SettingGroup index={4} title="分辨率" en="RESOLUTION" color={theme.node.muted} faintColor={theme.node.faint}>
                    <div className="grid grid-cols-3 gap-2.5">
                        {resolutionOptionsShown.map((item) => {
                            const disabled = item.value === "1080p" && isSeedanceFastModel(model);
                            return (
                                <OptionPill key={item.value} selected={resolution === item.value} disabled={disabled} theme={theme} onClick={() => onConfigChange("vquality", item.value)}>
                                    {item.label}
                                </OptionPill>
                            );
                        })}
                    </div>
                    {isSeedanceFastModel(model) ? <div className="text-[11px] leading-4 opacity-55">fast 模型不支持 1080p，会自动使用 720p。</div> : null}
                </SettingGroup>
                <SettingGroup index={5} title="比例" en="RATIO" color={theme.node.muted} faintColor={theme.node.faint}>
                    <div className="grid grid-cols-3 gap-2.5">
                        {ratioOptionsShown.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                className="flex h-[68px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-1 text-sm transition hover:opacity-80"
                                style={{
                                    borderColor: ratio === item.value ? theme.node.activeStroke : theme.node.stroke,
                                    background: ratio === item.value ? theme.node.fill : "transparent",
                                    boxShadow: ratio === item.value ? `inset 0 0 0 1px ${theme.node.activeStroke}` : "none",
                                    color: theme.node.text,
                                }}
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={() => onConfigChange("size", item.value)}
                            >
                                <SizePreview width={ratioPreview(item.value).width} height={ratioPreview(item.value).height} color={ratio === item.value ? theme.node.activeStroke : theme.node.text} />
                                <span>{item.label}</span>
                                <span className="sf-mono text-[9px] leading-none opacity-55">{item.value === "adaptive" ? "adaptive" : seedancePixelLabel(resolution, item.value)}</span>
                            </button>
                        ))}
                    </div>
                </SettingGroup>
                <SettingGroup index={6} title="时长" en="DURATION" color={theme.node.muted} faintColor={theme.node.faint}>
                    <div className="grid grid-cols-4 gap-2.5">
                        {durationOptionsShown.map((value) => (
                            <OptionPill key={value} selected={duration === value} theme={theme} onClick={() => onConfigChange("videoSeconds", String(value))}>
                                {value === -1 ? "智能" : `${value}s`}
                            </OptionPill>
                        ))}
                    </div>
                    <NumberInput value={String(duration)} min={-1} max={15} theme={theme} onChange={(value) => onConfigChange("videoSeconds", value)} />
                </SettingGroup>
                <SettingGroup index={7} title="输出" en="OUTPUT" color={theme.node.muted} faintColor={theme.node.faint}>
                    <div className="grid gap-2 rounded-xl border p-2.5" style={{ borderColor: theme.node.stroke }}>
                        {audioEnabled ? <SwitchRow label="生成声音" checked={generateAudio} theme={theme} onChange={(checked) => onConfigChange("videoGenerateAudio", String(checked))} /> : null}
                        {watermarkEnabled ? <SwitchRow label="添加水印" checked={watermark} theme={theme} onChange={(checked) => onConfigChange("videoWatermark", String(checked))} /> : null}
                    </div>
                </SettingGroup>
            </div>
        </ImageSettingsTheme>
    );
}

export function videoResolutionLabel(value: string) {
    // MiniMax H3：直接返回 768P / 2K
    if (value === "768P" || value === "768p" || value === "2K" || value === "2k") return value.toUpperCase();
    return `${normalizeVideoResolutionValue(value)}p`;
}

function MiniMaxVideoSettingsPanel({ config, onConfigChange, theme, showTitle, className }: VideoSettingsPanelProps) {
    const model = modelOptionName(config.model || config.videoModel);
    const spec = usePlatformCapability(model);
    const resolution = normalizeMiniMaxResolution(config.vquality);
    const ratio = normalizeMiniMaxRatio(config.size) ?? "16:9";
    const duration = normalizeMiniMaxDuration(config.videoSeconds);
    const generateAudio = boolConfig(config.videoGenerateAudio, true);
    const watermark = boolConfig(config.videoWatermark, false);
    // 平台能力标定：有标定则按标定过滤选项；无标定（或标定为空）退回内置默认
    const resolutionOptionsShown = spec?.kind === "minimax-video" && (spec.resolutions as string[]).length ? MINIMAX_RESOLUTION_OPTIONS.filter((item) => (spec.resolutions as string[]).includes(item.value)) : MINIMAX_RESOLUTION_OPTIONS;
    const ratioOptionsShown = spec?.kind === "minimax-video" && (spec.ratios as string[]).length ? MINIMAX_RATIO_OPTIONS.filter((item) => (spec.ratios as string[]).includes(item.value)) : MINIMAX_RATIO_OPTIONS;
    const durationOptionsShown = spec?.kind === "minimax-video" && (spec.durations as number[]).length ? MINIMAX_DURATION_OPTIONS.filter((item) => (spec.durations as number[]).includes(item.value)) : MINIMAX_DURATION_OPTIONS;
    const audioEnabled = spec?.kind !== "minimax-video" || spec.audio;
    const watermarkEnabled = spec?.kind !== "minimax-video" || spec.watermark;
    // 收敛：当前值不在平台标定范围内时自动切到第一个允许值；不允许的声音/水印强制关闭
    useEffect(() => {
        if (spec?.kind !== "minimax-video") return;
        const allowed = spec.resolutions as string[];
        if (!allowed.length || allowed.includes(resolution)) return;
        onConfigChange("vquality", allowed[0] || "768P");
    }, [spec, resolution]);
    useEffect(() => {
        if (spec?.kind !== "minimax-video") return;
        const allowed = spec.ratios as string[];
        if (!allowed.length || allowed.includes(ratio)) return;
        onConfigChange("size", allowed[0] || "16:9");
    }, [spec, ratio]);
    useEffect(() => {
        if (spec?.kind !== "minimax-video") return;
        const allowed = spec.durations as number[];
        if (!allowed.length || allowed.includes(duration)) return;
        onConfigChange("videoSeconds", String(allowed[0] ?? 6));
    }, [spec, duration]);
    useEffect(() => {
        if (spec?.kind !== "minimax-video") return;
        if (!spec.audio && generateAudio) onConfigChange("videoGenerateAudio", "false");
        if (!spec.watermark && watermark) onConfigChange("videoWatermark", "false");
    }, [spec, generateAudio, watermark]);

    return (
        <ImageSettingsTheme theme={theme}>
            <div className={className} style={{ color: theme.node.text }} onMouseDown={(event) => event.stopPropagation()}>
                {showTitle ? <div className="text-sm font-medium">视频设置</div> : null}
                <SettingGroup index={4} title="分辨率" en="RESOLUTION" color={theme.node.muted} faintColor={theme.node.faint}>
                    <div className="grid grid-cols-2 gap-2.5">
                        {resolutionOptionsShown.map((item) => (
                            <OptionPill key={item.value} selected={resolution === item.value} theme={theme} onClick={() => onConfigChange("vquality", item.value)}>
                                {item.label}
                            </OptionPill>
                        ))}
                    </div>
                    <div className="text-[11px] leading-4 opacity-55">2K 画质更高，生成更慢、积分消耗更多。</div>
                </SettingGroup>
                <SettingGroup index={5} title="比例" en="RATIO" color={theme.node.muted} faintColor={theme.node.faint}>
                    <div className="grid grid-cols-3 gap-2.5">
                        {ratioOptionsShown.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                className="flex h-[68px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-1 text-sm transition hover:opacity-80"
                                style={{
                                    borderColor: ratio === item.value ? theme.node.activeStroke : theme.node.stroke,
                                    background: ratio === item.value ? theme.node.fill : "transparent",
                                    boxShadow: ratio === item.value ? `inset 0 0 0 1px ${theme.node.activeStroke}` : "none",
                                    color: theme.node.text,
                                }}
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={() => onConfigChange("size", item.value)}
                            >
                                <SizePreview width={ratioPreview(item.value).width} height={ratioPreview(item.value).height} color={ratio === item.value ? theme.node.activeStroke : theme.node.text} />
                                <span>{item.label}</span>
                                <span className="sf-mono text-[9px] leading-none opacity-55">{item.value}</span>
                            </button>
                        ))}
                    </div>
                </SettingGroup>
                <SettingGroup index={6} title="时长" en="DURATION" color={theme.node.muted} faintColor={theme.node.faint}>
                    <div className="grid grid-cols-4 gap-2.5">
                        {durationOptionsShown.map((item) => (
                            <OptionPill key={item.value} selected={duration === item.value} theme={theme} onClick={() => onConfigChange("videoSeconds", String(item.value))}>
                                {`${item.value}s`}
                            </OptionPill>
                        ))}
                    </div>
                    <NumberInput value={String(duration)} min={4} max={15} theme={theme} onChange={(value) => onConfigChange("videoSeconds", value)} />
                </SettingGroup>
                <SettingGroup index={7} title="输出" en="OUTPUT" color={theme.node.muted} faintColor={theme.node.faint}>
                    <div className="grid gap-2 rounded-xl border p-2.5" style={{ borderColor: theme.node.stroke }}>
                        {audioEnabled ? <SwitchRow label="生成声音（H3 原生立体声）" checked={generateAudio} theme={theme} onChange={(checked) => onConfigChange("videoGenerateAudio", String(checked))} /> : null}
                        {watermarkEnabled ? <SwitchRow label="添加水印" checked={watermark} theme={theme} onChange={(checked) => onConfigChange("videoWatermark", String(checked))} /> : null}
                    </div>
                </SettingGroup>
            </div>
        </ImageSettingsTheme>
    );
}

function GenVideoSettingsPanel({ config, onConfigChange, theme, showTitle, className }: VideoSettingsPanelProps) {
    const model = modelOptionName(config.model || config.videoModel);
    const spec = usePlatformCapability(model);
    const ratio = normalizeGenvideoRatio(config.size) ?? "16:9";
    const duration = normalizeGenvideoDuration(config.videoSeconds);
    // 平台能力标定：有标定则按标定过滤选项；无标定（或标定为空）退回内置默认
    const ratioOptionsShown = spec?.kind === "genvideo" && (spec.ratios as string[]).length ? GENVIDEO_RATIO_OPTIONS.filter((item) => (spec.ratios as string[]).includes(item.value)) : GENVIDEO_RATIO_OPTIONS;
    const durationOptionsShown = spec?.kind === "genvideo" && (spec.durations as number[]).length ? GENVIDEO_DURATION_OPTIONS.filter((item) => (spec.durations as number[]).includes(item.value)) : GENVIDEO_DURATION_OPTIONS;
    // 收敛：当前值不在平台标定范围内时自动切到第一个允许值
    useEffect(() => {
        if (spec?.kind !== "genvideo") return;
        const allowed = spec.ratios as string[];
        if (!allowed.length || allowed.includes(ratio)) return;
        onConfigChange("size", allowed[0] || "16:9");
    }, [spec, ratio]);
    useEffect(() => {
        if (spec?.kind !== "genvideo") return;
        const allowed = spec.durations as number[];
        if (!allowed.length || allowed.includes(duration)) return;
        onConfigChange("videoSeconds", String(allowed[0] ?? 5));
    }, [spec, duration]);

    return (
        <ImageSettingsTheme theme={theme}>
            <div className={className} style={{ color: theme.node.text }} onMouseDown={(event) => event.stopPropagation()}>
                {showTitle ? <div className="text-sm font-medium">视频设置</div> : null}
                <SettingGroup index={5} title="比例" en="RATIO" color={theme.node.muted} faintColor={theme.node.faint}>
                    <div className="grid grid-cols-3 gap-2.5">
                        {ratioOptionsShown.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                className="flex h-[68px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-1 text-sm transition hover:opacity-80"
                                style={{
                                    borderColor: ratio === item.value ? theme.node.activeStroke : theme.node.stroke,
                                    background: ratio === item.value ? theme.node.fill : "transparent",
                                    boxShadow: ratio === item.value ? `inset 0 0 0 1px ${theme.node.activeStroke}` : "none",
                                    color: theme.node.text,
                                }}
                                onMouseDown={(event) => event.stopPropagation()}
                                onClick={() => onConfigChange("size", item.value)}
                            >
                                <SizePreview width={ratioPreview(item.value).width} height={ratioPreview(item.value).height} color={ratio === item.value ? theme.node.activeStroke : theme.node.text} />
                                <span>{item.label}</span>
                                <span className="sf-mono text-[9px] leading-none opacity-55">{item.value}</span>
                            </button>
                        ))}
                    </div>
                </SettingGroup>
                <SettingGroup index={6} title="时长" en="DURATION" color={theme.node.muted} faintColor={theme.node.faint}>
                    <div className="grid grid-cols-4 gap-2.5">
                        {durationOptionsShown.map((item) => (
                            <OptionPill key={item.value} selected={duration === item.value} theme={theme} onClick={() => onConfigChange("videoSeconds", String(item.value))}>
                                {item.value === 30 ? "30s·2.5" : `${item.value}s`}
                            </OptionPill>
                        ))}
                    </div>
                    <div className="text-[11px] leading-4 opacity-55">5/10/15 秒走 2.0 模式；30 秒为 2.5 模式，生成更慢。支持上传参考图（最多 10 张，平台自动中转）。</div>
                </SettingGroup>
            </div>
        </ImageSettingsTheme>
    );
}

export function videoSizeLabel(value: string) {
    const ratio = normalizeSeedanceRatio(value);
    if (value === "adaptive" || value === "auto") return "自适应";
    if (ratio === value) return seedanceRatioOptions.find((item) => item.value === ratio)?.label || ratio;
    const size = normalizeVideoSizeValue(value);
    return sizeOptions.find((item) => item.value === size)?.label || size;
}

export function videoSecondsLabel(value: string) {
    if (String(value).trim() === "-1") return "智能";
    return `${value || "6"}s`;
}

export function normalizeVideoSizeValue(value: string) {
    if (value === "auto") return "auto";
    if (/^\d+x\d+$/.test(value || "")) return value;
    return ["9:16", "2:3", "3:4"].includes(value) ? "720x1280" : "1280x720";
}

export function normalizeVideoResolutionValue(value: string) {
    if (value === "480p" || value === "low") return "480";
    if (value === "720p" || value === "auto" || value === "high" || value === "medium") return "720";
    return value.replace(/p$/i, "") || "720";
}

function OptionPill({ selected, disabled = false, theme, onClick, children }: { selected: boolean; disabled?: boolean; theme: CanvasTheme; onClick: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            disabled={disabled}
            className="h-9 cursor-pointer rounded-full border px-2 text-sm font-medium transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-35"
            style={{
                background: selected ? theme.node.fill : "transparent",
                borderColor: selected ? theme.node.activeStroke : theme.node.stroke,
                boxShadow: selected ? `inset 0 0 0 1px ${theme.node.activeStroke}` : "none",
                color: theme.node.text,
            }}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={onClick}
        >
            {children}
        </button>
    );
}

function SettingGroup({ title, en, index, color, faintColor, children }: { title: string; en: string; index?: number; color: string; faintColor: string; children: ReactNode }) {
    return (
        <div className="space-y-2.5">
            <div className="sf-mono flex items-baseline gap-2 text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color }}>
                <span>{typeof index === "number" ? `${String(index).padStart(2, "0")} · ${en}` : en}</span>
                <span className="normal-case font-semibold tracking-normal" style={{ color: faintColor }}>
                    {title}
                </span>
            </div>
            {children}
        </div>
    );
}

function ResolutionInput({ value, theme, onChange }: { value: string; theme: CanvasTheme; onChange: (value: string) => void }) {
    return (
        <label className="flex h-9 overflow-hidden rounded-full border text-sm" style={{ borderColor: theme.node.stroke, color: theme.node.text }}>
            <input
                type="number"
                min={1}
                className="sf-mono min-w-0 flex-1 bg-transparent px-3 text-center font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onMouseDown={(event) => event.stopPropagation()}
            />
            <span className="grid w-7 place-items-center pr-1 sf-mono" style={{ color: theme.node.muted }}>
                p
            </span>
        </label>
    );
}

function DimensionInput({ prefix, value, disabled, theme, onChange }: { prefix: string; value: number; disabled: boolean; theme: CanvasTheme; onChange: (value: number | null) => void }) {
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
                value={value || ""}
                onChange={(event) => onChange(Number(event.target.value) || null)}
                onMouseDown={(event) => event.stopPropagation()}
            />
        </label>
    );
}

function NumberInput({ value, min, max, theme, onChange }: { value: string; min: number; max: number; theme: CanvasTheme; onChange: (value: string) => void }) {
    return (
        <input
            type="number"
            min={min}
            max={max}
            className="sf-mono h-9 rounded-full border bg-transparent px-3 text-center text-sm font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            style={{ borderColor: theme.node.stroke, color: theme.node.text, WebkitTextFillColor: theme.node.text }}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onMouseDown={(event) => event.stopPropagation()}
        />
    );
}

function SizePreview({ width, height, color }: { width: number; height: number; color: string }) {
    if (!width || !height) return null;
    const longSide = Math.max(width, height);
    const previewWidth = Math.max(10, Math.round((width / longSide) * 26));
    const previewHeight = Math.max(10, Math.round((height / longSide) * 26));
    return <span className="rounded-[3px] border-2" style={{ width: previewWidth, height: previewHeight, borderColor: color }} />;
}

function ratioPreview(ratio: string) {
    if (ratio === "9:16") return { width: 9, height: 16 };
    if (ratio === "1:1") return { width: 1, height: 1 };
    if (ratio === "4:3") return { width: 4, height: 3 };
    if (ratio === "3:4") return { width: 3, height: 4 };
    if (ratio === "21:9") return { width: 21, height: 9 };
    if (ratio === "adaptive") return { width: 0, height: 0 };
    return { width: 16, height: 9 };
}

function SwitchRow({ label, checked, theme, onChange }: { label: string; checked: boolean; theme: CanvasTheme; onChange: (checked: boolean) => void }) {
    return (
        <div className="flex h-8 items-center justify-between gap-3">
            <span className="text-sm" style={{ color: theme.node.text }}>
                {label}
            </span>
            <span onMouseDown={(event) => event.stopPropagation()}>
                <Switch size="small" checked={checked} onChange={onChange} />
            </span>
        </div>
    );
}

function readSizeDimensions(size: string) {
    if (size === "auto") return { width: 0, height: 0 };
    const match = size.match(/^(\d+)x(\d+)$/);
    return { width: Number(match?.[1]) || 1280, height: Number(match?.[2]) || 720 };
}
