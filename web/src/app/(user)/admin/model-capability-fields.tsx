"use client";

import { Button, Checkbox, InputNumber, Radio, Switch } from "antd";

import { IMAGE_RESOLUTION_OPTIONS, type ImageResolutionTier } from "@/lib/image-resolution";
import {
    DEFAULT_GENVIDEO_VIDEO_CAPABILITY,
    DEFAULT_GENERIC_VIDEO_CAPABILITY,
    DEFAULT_IMAGE_CAPABILITY,
    DEFAULT_MINIMAX_VIDEO_CAPABILITY,
    DEFAULT_SEEDANCE_VIDEO_CAPABILITY,
    GENVIDEO_DURATION_OPTIONS,
    GENVIDEO_RATIO_OPTIONS,
    GENVIDEO_VIDEO_KIND,
    GENERIC_VIDEO_KIND,
    IMAGE_ASPECT_OPTIONS,
    IMAGE_KIND,
    IMAGE_MAX_COUNT_LIMIT,
    IMAGE_QUALITY_OPTIONS,
    IMAGE_QUALITY_TIER_OPTIONS,
    MINIMAX_DURATION_OPTIONS,
    MINIMAX_RATIO_OPTIONS,
    MINIMAX_RESOLUTION_OPTIONS,
    MINIMAX_VIDEO_KIND,
    SEEDANCE_DURATION_OPTIONS,
    SEEDANCE_RATIO_OPTIONS,
    SEEDANCE_RESOLUTION_OPTIONS,
    SEEDANCE_VIDEO_KIND,
    VIDEO_CLARITY_OPTIONS,
    VIDEO_SECONDS_OPTIONS,
    VIDEO_SIZE_OPTIONS,
    defaultCapabilityForModel,
    normalizeImageCapability,
    type ImageAspect,
    type ImageCapabilitySpec,
    type ImageQuality,
    type MiniMaxDuration,
    type MiniMaxRatio,
    type MiniMaxResolution,
    type MiniMaxVideoCapabilitySpec,
    type GenVideoDuration,
    type GenVideoRatio,
    type GenVideoVideoCapabilitySpec,
    type ModelCapabilityKind,
    type ModelCapabilitySpec,
    type SeedanceDuration,
    type SeedanceRatio,
    type SeedanceResolution,
    type SeedanceVideoCapabilitySpec,
    type GenericVideoCapabilitySpec,
    type VideoClarity,
    type VideoSeconds,
    type VideoSize,
} from "@/lib/model-capability-spec";

type ModelCapabilityFieldsProps = {
    model: string;
    spec: ModelCapabilitySpec;
    onChange: (next: ModelCapabilitySpec) => void;
};

const KIND_OPTIONS = [
    { value: IMAGE_KIND, label: "图片" },
    { value: GENERIC_VIDEO_KIND, label: "视频（通用）" },
    { value: SEEDANCE_VIDEO_KIND, label: "视频（Seedance）" },
    { value: MINIMAX_VIDEO_KIND, label: "视频（MiniMax H3）" },
    { value: GENVIDEO_VIDEO_KIND, label: "视频（GenVideo）" },
];

/** 单个模型的参数能力编辑器：类型 + 勾选清单。空清单 = 全部支持（前端按内置默认展示）。 */
export function ModelCapabilityFields({ model, spec, onChange }: ModelCapabilityFieldsProps) {
    const setKind = (kind: ModelCapabilityKind) => {
        if (kind === spec.kind) return;
        if (kind === IMAGE_KIND) onChange({ ...DEFAULT_IMAGE_CAPABILITY });
        else if (kind === SEEDANCE_VIDEO_KIND) onChange({ ...DEFAULT_SEEDANCE_VIDEO_CAPABILITY });
        else if (kind === MINIMAX_VIDEO_KIND) onChange({ ...DEFAULT_MINIMAX_VIDEO_CAPABILITY });
        else if (kind === GENVIDEO_VIDEO_KIND) onChange({ ...DEFAULT_GENVIDEO_VIDEO_CAPABILITY });
        else onChange({ ...DEFAULT_GENERIC_VIDEO_CAPABILITY });
    };
    const reset = () => {
        onChange(defaultCapabilityForModel(model) ?? { ...DEFAULT_IMAGE_CAPABILITY });
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Radio.Group size="small" optionType="button" buttonStyle="solid" options={KIND_OPTIONS} value={spec.kind} onChange={(event) => setKind(event.target.value as ModelCapabilityKind)} />
                <Button size="small" onClick={reset}>
                    恢复默认
                </Button>
            </div>
            <p className="text-xs leading-5 text-[#726d67]">勾选该模型支持的能力；不勾选 = 全部支持。保存后约 60 秒内在生成设置面板生效。</p>
            {spec.kind === IMAGE_KIND ? <ImageFields spec={spec} onChange={onChange} /> : null}
            {spec.kind === SEEDANCE_VIDEO_KIND ? <SeedanceFields spec={spec} onChange={onChange} /> : null}
            {spec.kind === MINIMAX_VIDEO_KIND ? <MiniMaxFields spec={spec} onChange={onChange} /> : null}
            {spec.kind === GENVIDEO_VIDEO_KIND ? <GenVideoFields spec={spec} onChange={onChange} /> : null}
            {spec.kind === GENERIC_VIDEO_KIND ? <GenericVideoFields spec={spec} onChange={onChange} /> : null}
        </div>
    );
}

function FieldLabel({ children }: { children: string }) {
    return <div className="mb-1 text-sm text-[#332f2a]">{children}</div>;
}

function ImageFields({ spec, onChange }: { spec: ImageCapabilitySpec; onChange: (next: ModelCapabilitySpec) => void }) {
    const view = normalizeImageCapability(spec);
    const qualityTiers = view.qualityTiers ?? [];
    const usesQualityAxis = qualityTiers.length > 0;
    return (
        <div className="space-y-2.5">
            <div>
                <FieldLabel>尺寸（宽高比，含自定义）</FieldLabel>
                <Checkbox.Group className="grid grid-cols-4 gap-x-3 gap-y-1" options={[...IMAGE_ASPECT_OPTIONS]} value={view.aspects} onChange={(values) => onChange({ ...view, aspects: values as ImageAspect[] })} />
            </div>
            <div>
                <FieldLabel>画质档位（模型用 quality 表达分辨率时勾这里）</FieldLabel>
                <Checkbox.Group
                    className="flex flex-wrap gap-x-4 gap-y-1"
                    options={[...IMAGE_QUALITY_TIER_OPTIONS]}
                    value={qualityTiers}
                    onChange={(values) => {
                        const picked = values as ImageQuality[];
                        // qualities 与 qualityTiers 保持同一份清单：面板读档位轴，服务端校验读 qualities，两者不该各说各话
                        onChange({ ...view, qualityTiers: picked, qualities: picked });
                    }}
                />
                <div className="mt-1 text-[11px] leading-4 text-[#726d67]">
                    例如 Replicate 的 gpt-image-2.5-flare（low/medium/high/xhigh/max/auto）。勾上 = 用户在生成设置面板看到的是这一行画质档位，且不再显示 1K/2K/4K 与像素尺寸（像素由上游按画质决定）。不勾 = 走下面的「分辨率」档位。
                </div>
            </div>
            {usesQualityAxis ? null : (
                <div>
                    <FieldLabel>分辨率（不勾的档位用户面板上不会出现）</FieldLabel>
                    <Checkbox.Group className="flex flex-wrap gap-x-4 gap-y-1" options={[...IMAGE_RESOLUTION_OPTIONS]} value={view.resolutions} onChange={(values) => onChange({ ...view, resolutions: values as ImageResolutionTier[] })} />
                    <div className="mt-1 text-[11px] leading-4 text-[#726d67]">各档位的积分在下方「逐模型积分定价 → 图片生成」里分别设置。</div>
                </div>
            )}
            <div className="flex items-center gap-3">
                <FieldLabel>最大生成张数</FieldLabel>
                <InputNumber min={1} max={IMAGE_MAX_COUNT_LIMIT} value={spec.maxCount} onChange={(value) => onChange({ ...view, maxCount: Math.max(1, Math.min(IMAGE_MAX_COUNT_LIMIT, Math.floor(Number(value)) || 1)) })} />
            </div>
            {usesQualityAxis ? null : (
                <div>
                    <FieldLabel>画质（高级，一般不用动）</FieldLabel>
                    <Checkbox.Group className="flex flex-wrap gap-x-4 gap-y-1" options={[...IMAGE_QUALITY_OPTIONS]} value={view.qualities} onChange={(values) => onChange({ ...view, qualities: values as ImageQuality[] })} />
                </div>
            )}
        </div>
    );
}

function SeedanceFields({ spec, onChange }: { spec: SeedanceVideoCapabilitySpec; onChange: (next: ModelCapabilitySpec) => void }) {
    return (
        <div className="space-y-2.5">
            <div>
                <FieldLabel>分辨率</FieldLabel>
                <Checkbox.Group className="flex flex-wrap gap-x-4 gap-y-1" options={[...SEEDANCE_RESOLUTION_OPTIONS]} value={spec.resolutions} onChange={(values) => onChange({ ...spec, resolutions: values as SeedanceResolution[] })} />
            </div>
            <div>
                <FieldLabel>画面比例</FieldLabel>
                <Checkbox.Group className="grid grid-cols-3 gap-x-3 gap-y-1" options={[...SEEDANCE_RATIO_OPTIONS]} value={spec.ratios} onChange={(values) => onChange({ ...spec, ratios: values as SeedanceRatio[] })} />
            </div>
            <div>
                <FieldLabel>时长</FieldLabel>
                <Checkbox.Group className="flex flex-wrap gap-x-4 gap-y-1" options={[...SEEDANCE_DURATION_OPTIONS]} value={spec.durations} onChange={(values) => onChange({ ...spec, durations: values as SeedanceDuration[] })} />
            </div>
            <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-[#332f2a]">
                    <Switch size="small" checked={spec.audio} onChange={(checked) => onChange({ ...spec, audio: checked })} />
                    生成声音
                </label>
                <label className="flex items-center gap-2 text-sm text-[#332f2a]">
                    <Switch size="small" checked={spec.watermark} onChange={(checked) => onChange({ ...spec, watermark: checked })} />
                    添加水印
                </label>
            </div>
        </div>
    );
}

function MiniMaxFields({ spec, onChange }: { spec: MiniMaxVideoCapabilitySpec; onChange: (next: ModelCapabilitySpec) => void }) {
    return (
        <div className="space-y-2.5">
            <div>
                <FieldLabel>分辨率</FieldLabel>
                <Checkbox.Group className="flex flex-wrap gap-x-4 gap-y-1" options={[...MINIMAX_RESOLUTION_OPTIONS]} value={spec.resolutions} onChange={(values) => onChange({ ...spec, resolutions: values as MiniMaxResolution[] })} />
            </div>
            <div>
                <FieldLabel>画面比例</FieldLabel>
                <Checkbox.Group className="grid grid-cols-3 gap-x-3 gap-y-1" options={[...MINIMAX_RATIO_OPTIONS]} value={spec.ratios} onChange={(values) => onChange({ ...spec, ratios: values as MiniMaxRatio[] })} />
            </div>
            <div>
                <FieldLabel>时长（秒）</FieldLabel>
                <Checkbox.Group className="flex flex-wrap gap-x-4 gap-y-1" options={[...MINIMAX_DURATION_OPTIONS]} value={spec.durations} onChange={(values) => onChange({ ...spec, durations: values as MiniMaxDuration[] })} />
            </div>
            <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm text-[#332f2a]">
                    <Switch size="small" checked={spec.audio} onChange={(checked) => onChange({ ...spec, audio: checked })} />
                    生成声音（H3 原生立体声）
                </label>
                <label className="flex items-center gap-2 text-sm text-[#332f2a]">
                    <Switch size="small" checked={spec.watermark} onChange={(checked) => onChange({ ...spec, watermark: checked })} />
                    添加水印
                </label>
            </div>
        </div>
    );
}

function GenVideoFields({ spec, onChange }: { spec: GenVideoVideoCapabilitySpec; onChange: (next: ModelCapabilitySpec) => void }) {
    return (
        <div className="space-y-2.5">
            <div>
                <FieldLabel>画面比例</FieldLabel>
                <Checkbox.Group className="grid grid-cols-3 gap-x-3 gap-y-1" options={[...GENVIDEO_RATIO_OPTIONS]} value={spec.ratios} onChange={(values) => onChange({ ...spec, ratios: values as GenVideoRatio[] })} />
            </div>
            <div>
                <FieldLabel>时长（5/10/15s 为 2.0 模式；30s 为 2.5 模式）</FieldLabel>
                <Checkbox.Group className="flex flex-wrap gap-x-4 gap-y-1" options={[...GENVIDEO_DURATION_OPTIONS]} value={spec.durations} onChange={(values) => onChange({ ...spec, durations: values as GenVideoDuration[] })} />
            </div>
        </div>
    );
}

function GenericVideoFields({ spec, onChange }: { spec: GenericVideoCapabilitySpec; onChange: (next: ModelCapabilitySpec) => void }) {
    return (
        <div className="space-y-2.5">
            <div>
                <FieldLabel>清晰度</FieldLabel>
                <Checkbox.Group className="flex flex-wrap gap-x-4 gap-y-1" options={[...VIDEO_CLARITY_OPTIONS]} value={spec.clarity} onChange={(values) => onChange({ ...spec, clarity: values as VideoClarity[] })} />
            </div>
            <div>
                <FieldLabel>尺寸</FieldLabel>
                <Checkbox.Group className="grid grid-cols-3 gap-x-3 gap-y-1" options={[...VIDEO_SIZE_OPTIONS]} value={spec.sizes} onChange={(values) => onChange({ ...spec, sizes: values as VideoSize[] })} />
            </div>
            <div>
                <FieldLabel>秒数</FieldLabel>
                <Checkbox.Group className="flex flex-wrap gap-x-4 gap-y-1" options={[...VIDEO_SECONDS_OPTIONS]} value={spec.seconds} onChange={(values) => onChange({ ...spec, seconds: values as VideoSeconds[] })} />
            </div>
        </div>
    );
}
