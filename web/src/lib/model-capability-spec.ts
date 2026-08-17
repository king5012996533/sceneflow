// model-capability-spec.ts —— 平台模型「能力标定」词汇表（与前端设置面板一一对应）
//
// 词汇来源（前端面板）：
//   - 图片          → image-settings-panel.tsx   （画质 / 宽高比 / 自定义尺寸 / 生成张数）
//   - 视频·Seedance → video-settings-panel.tsx + seedance-video.ts（分辨率 / 比例 / 时长 / 声音 / 水印）
//   - 视频·通用     → video-settings-panel.tsx   （清晰度 / 尺寸 / 秒数）
//
// 存储位置：ProviderCredential.capabilities（Json，按模型名 key）
// 数据流：后台逐模型配置 → /api/platform/catalog 下发 → stores/platform-catalog-store
//         → 图片/视频设置面板按能力过滤选项；未配置能力的模型退回内置默认（与现状一致）。
//
// 本模块不依赖任何业务库，可同时在服务端（admin 清洗）与客户端（面板过滤）使用。

import type { CredentialPricing, ModelPricing } from "@/lib/credit-pricing";

// ---------- 图片 ----------
export type ImageQuality = "auto" | "high" | "medium" | "low";
export type ImageAspect = "1:1" | "3:2" | "2:3" | "4:3" | "3:4" | "16:9" | "9:16" | "1:1-2k" | "16:9-2k" | "9:16-2k" | "16:9-4k" | "9:16-4k" | "auto";

export type ImageCapabilitySpec = {
    kind: "image";
    qualities: ImageQuality[];
    aspects: ImageAspect[];
    /** 最大生成张数 1-15 */
    maxCount: number;
};

// ---------- 视频 · Seedance ----------
export type SeedanceResolution = "480p" | "720p" | "1080p";
export type SeedanceRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9" | "adaptive";
export type SeedanceDuration = -1 | 4 | 5 | 6 | 8 | 10 | 12 | 15;

export type SeedanceVideoCapabilitySpec = {
    kind: "seedance-video";
    resolutions: SeedanceResolution[];
    ratios: SeedanceRatio[];
    durations: SeedanceDuration[];
    audio: boolean;
    watermark: boolean;
};

// ---------- 视频 · 通用 ----------
export type VideoClarity = "720" | "480";
export type VideoSize = "1280x720" | "720x1280" | "1024x1024" | "1792x1024" | "1024x1792" | "auto";
export type VideoSeconds = 6 | 10 | 12 | 16 | 20;

export type GenericVideoCapabilitySpec = {
    kind: "video";
    clarity: VideoClarity[];
    sizes: VideoSize[];
    seconds: VideoSeconds[];
};

export type ModelCapabilitySpec = ImageCapabilitySpec | SeedanceVideoCapabilitySpec | GenericVideoCapabilitySpec;
export type ModelCapabilityKind = ModelCapabilitySpec["kind"];
/** ProviderCredential.capabilities 的存储形状：模型名 → 能力标定 */
export type CredentialCapabilities = Record<string, ModelCapabilitySpec>;

export const IMAGE_KIND = "image";
export const GENERIC_VIDEO_KIND = "video";
export const SEEDANCE_VIDEO_KIND = "seedance-video";
export const MODEL_KINDS: readonly ModelCapabilityKind[] = [IMAGE_KIND, GENERIC_VIDEO_KIND, SEEDANCE_VIDEO_KIND];

// ---------- 选项清单（后台编辑器 & 面板过滤共用） ----------

export const IMAGE_QUALITY_OPTIONS: ReadonlyArray<{ value: ImageQuality; label: string }> = [
    { value: "auto", label: "自动" },
    { value: "high", label: "高" },
    { value: "medium", label: "中" },
    { value: "low", label: "低" },
];

export const IMAGE_ASPECT_OPTIONS: ReadonlyArray<{ value: ImageAspect; label: string }> = [
    { value: "1:1", label: "1:1" },
    { value: "3:2", label: "3:2" },
    { value: "2:3", label: "2:3" },
    { value: "4:3", label: "4:3" },
    { value: "3:4", label: "3:4" },
    { value: "16:9", label: "16:9" },
    { value: "9:16", label: "9:16" },
    { value: "1:1-2k", label: "1:1 (2k)" },
    { value: "16:9-2k", label: "16:9 (2k)" },
    { value: "9:16-2k", label: "9:16 (2k)" },
    { value: "16:9-4k", label: "16:9 (4k)" },
    { value: "9:16-4k", label: "9:16 (4k)" },
    { value: "auto", label: "自定义" },
];

export const SEEDANCE_RESOLUTION_OPTIONS: ReadonlyArray<{ value: SeedanceResolution; label: string }> = [
    { value: "480p", label: "480p" },
    { value: "720p", label: "720p" },
    { value: "1080p", label: "1080p" },
];

export const SEEDANCE_RATIO_OPTIONS: ReadonlyArray<{ value: SeedanceRatio; label: string }> = [
    { value: "16:9", label: "横屏" },
    { value: "9:16", label: "竖屏" },
    { value: "1:1", label: "方形" },
    { value: "4:3", label: "标准横屏" },
    { value: "3:4", label: "标准竖屏" },
    { value: "21:9", label: "宽银幕" },
    { value: "adaptive", label: "自适应" },
];

export const SEEDANCE_DURATION_OPTIONS: ReadonlyArray<{ value: SeedanceDuration; label: string }> = [
    { value: -1, label: "智能" },
    { value: 4, label: "4s" },
    { value: 5, label: "5s" },
    { value: 6, label: "6s" },
    { value: 8, label: "8s" },
    { value: 10, label: "10s" },
    { value: 12, label: "12s" },
    { value: 15, label: "15s" },
];

export const VIDEO_CLARITY_OPTIONS: ReadonlyArray<{ value: VideoClarity; label: string }> = [
    { value: "720", label: "720p" },
    { value: "480", label: "480p" },
];

export const VIDEO_SIZE_OPTIONS: ReadonlyArray<{ value: VideoSize; label: string }> = [
    { value: "1280x720", label: "横屏" },
    { value: "720x1280", label: "竖屏" },
    { value: "1024x1024", label: "方形" },
    { value: "1792x1024", label: "宽屏" },
    { value: "1024x1792", label: "长图" },
    { value: "auto", label: "自适应" },
];

export const VIDEO_SECONDS_OPTIONS: ReadonlyArray<{ value: VideoSeconds; label: string }> = [
    { value: 6, label: "6s" },
    { value: 10, label: "10s" },
    { value: 12, label: "12s" },
    { value: 16, label: "16s" },
    { value: 20, label: "20s" },
];

export const IMAGE_MAX_COUNT_LIMIT = 15;

// ---------- 内置默认能力（模型名命中时后台预填 / 前端兜底参考） ----------

export const DEFAULT_IMAGE_CAPABILITY: ImageCapabilitySpec = {
    kind: "image",
    qualities: IMAGE_QUALITY_OPTIONS.map((item) => item.value),
    aspects: IMAGE_ASPECT_OPTIONS.map((item) => item.value),
    maxCount: 4,
};

export const DEFAULT_SEEDANCE_VIDEO_CAPABILITY: SeedanceVideoCapabilitySpec = {
    kind: "seedance-video",
    resolutions: SEEDANCE_RESOLUTION_OPTIONS.map((item) => item.value),
    ratios: SEEDANCE_RATIO_OPTIONS.map((item) => item.value),
    durations: SEEDANCE_DURATION_OPTIONS.map((item) => item.value),
    audio: true,
    watermark: true,
};

export const DEFAULT_GENERIC_VIDEO_CAPABILITY: GenericVideoCapabilitySpec = {
    kind: "video",
    clarity: VIDEO_CLARITY_OPTIONS.map((item) => item.value),
    sizes: VIDEO_SIZE_OPTIONS.map((item) => item.value),
    seconds: VIDEO_SECONDS_OPTIONS.map((item) => item.value),
};

/**
 * 按模型名推断能力类型（与前端 use-config-store 的模型名启发式保持一致）。
 * 仅用于「预填默认」和「编辑默认选择」，推断不到时返回 null（文本/音频等暂不标定）。
 */
export function inferModelKindByName(model: string): ModelCapabilityKind | null {
    const value = (model.includes("::") ? model.slice(model.indexOf("::") + 2) : model).toLowerCase();
    const isAudio = value.includes("audio") || value.includes("tts") || value.includes("speech") || value.includes("voice") || value.includes("music") || value.includes("sound");
    const isVideo = value.includes("seedance") || value.includes("video") || value.includes("sora") || value.includes("veo") || value.includes("kling") || value.includes("wan") || value.includes("hailuo");
    if (isVideo) return value.includes("seedance") ? SEEDANCE_VIDEO_KIND : GENERIC_VIDEO_KIND;
    const isImage = !isAudio && (value.includes("seedream") || value.includes("gpt-image") || value.includes("image") || value.includes("dall-e") || value.includes("dalle") || value.includes("imagen") || value.includes("flux") || value.includes("sdxl") || value.includes("stable-diffusion") || value.includes("midjourney"));
    if (isImage) return IMAGE_KIND;
    return null;
}

/** 已知模型名的默认能力（深拷贝，避免共享数组被编辑器误改） */
export function defaultCapabilityForModel(model: string): ModelCapabilitySpec | null {
    const kind = inferModelKindByName(model);
    if (kind === SEEDANCE_VIDEO_KIND) {
        return { kind, resolutions: [...DEFAULT_SEEDANCE_VIDEO_CAPABILITY.resolutions], ratios: [...DEFAULT_SEEDANCE_VIDEO_CAPABILITY.ratios], durations: [...DEFAULT_SEEDANCE_VIDEO_CAPABILITY.durations], audio: true, watermark: true };
    }
    if (kind === IMAGE_KIND) {
        return { kind, qualities: [...DEFAULT_IMAGE_CAPABILITY.qualities], aspects: [...DEFAULT_IMAGE_CAPABILITY.aspects], maxCount: DEFAULT_IMAGE_CAPABILITY.maxCount };
    }
    if (kind === GENERIC_VIDEO_KIND) {
        return { kind, clarity: [...DEFAULT_GENERIC_VIDEO_CAPABILITY.clarity], sizes: [...DEFAULT_GENERIC_VIDEO_CAPABILITY.sizes], seconds: [...DEFAULT_GENERIC_VIDEO_CAPABILITY.seconds] };
    }
    return null;
}

// ---------- 服务端清洗（admin API 落库前调用，只保留合法字段） ----------

const IMAGE_QUALITY_VALUES: readonly ImageQuality[] = ["auto", "high", "medium", "low"];
const IMAGE_ASPECT_VALUES: readonly ImageAspect[] = ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "1:1-2k", "16:9-2k", "9:16-2k", "16:9-4k", "9:16-4k", "auto"];
const SEEDANCE_RESOLUTION_VALUES: readonly SeedanceResolution[] = ["480p", "720p", "1080p"];
const SEEDANCE_RATIO_VALUES: readonly SeedanceRatio[] = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"];
const SEEDANCE_DURATION_VALUES: readonly SeedanceDuration[] = [-1, 4, 5, 6, 8, 10, 12, 15];
const VIDEO_CLARITY_VALUES: readonly VideoClarity[] = ["720", "480"];
const VIDEO_SIZE_VALUES: readonly VideoSize[] = ["1280x720", "720x1280", "1024x1024", "1792x1024", "1024x1792", "auto"];
const VIDEO_SECONDS_VALUES: readonly VideoSeconds[] = [6, 10, 12, 16, 20];

function pickStrings<T extends string>(input: unknown, allowed: readonly T[]): T[] {
    if (!Array.isArray(input)) return [...allowed];
    const picked = Array.from(new Set(input.map((item) => String(item).trim()))).filter((item): item is T => (allowed as readonly string[]).includes(item));
    return picked;
}

function pickNumbers<T extends number>(input: unknown, allowed: readonly T[]): T[] {
    if (!Array.isArray(input)) return [...allowed];
    const picked = Array.from(new Set(input.map((item) => Number(item)))).filter((item): item is T => (allowed as readonly number[]).includes(item));
    return picked;
}

export function sanitizeCapabilities(input: unknown): CredentialCapabilities | undefined {
    if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
    const result: CredentialCapabilities = {};
    for (const [model, raw] of Object.entries(input as Record<string, unknown>)) {
        const name = model.trim();
        if (!name) continue;
        const spec = sanitizeSingleCapability(raw);
        if (spec) result[name] = spec;
    }
    return Object.keys(result).length ? result : undefined;
}

function sanitizeSingleCapability(raw: unknown): ModelCapabilitySpec | null {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const value = raw as Record<string, unknown>;
    const kind = MODEL_KINDS.includes(value.kind as ModelCapabilityKind) ? (value.kind as ModelCapabilityKind) : null;
    if (!kind) return null;
    if (kind === IMAGE_KIND) {
        return {
            kind,
            qualities: pickStrings(value.qualities, IMAGE_QUALITY_VALUES),
            aspects: pickStrings(value.aspects, IMAGE_ASPECT_VALUES),
            maxCount: Math.max(1, Math.min(IMAGE_MAX_COUNT_LIMIT, Math.floor(Number(value.maxCount)) || DEFAULT_IMAGE_CAPABILITY.maxCount)),
        };
    }
    if (kind === SEEDANCE_VIDEO_KIND) {
        return {
            kind,
            resolutions: pickStrings(value.resolutions, SEEDANCE_RESOLUTION_VALUES),
            ratios: pickStrings(value.ratios, SEEDANCE_RATIO_VALUES),
            durations: pickNumbers(value.durations, SEEDANCE_DURATION_VALUES),
            audio: value.audio !== false,
            watermark: value.watermark === true,
        };
    }
    return {
        kind: GENERIC_VIDEO_KIND,
        clarity: pickStrings(value.clarity, VIDEO_CLARITY_VALUES),
        sizes: pickStrings(value.sizes, VIDEO_SIZE_VALUES),
        seconds: pickNumbers(value.seconds, VIDEO_SECONDS_VALUES),
    };
}
// ---------- 逐模型积分定价清洗（admin API 落库前调用，只保留 ≥0 整数） ----------

function toPricingNumber(value: unknown): number | undefined {
    const num = Math.floor(Number(value));
    if (!Number.isFinite(num) || num < 0) return undefined;
    return num;
}

export function sanitizePricing(input: unknown): CredentialPricing | undefined {
    if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
    const result: CredentialPricing = {};
    for (const [model, raw] of Object.entries(input as Record<string, unknown>)) {
        const name = model.trim();
        if (!name) continue;
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
        const value = raw as Record<string, unknown>;
        const pricing: ModelPricing = {};
        const imageCredits = toPricingNumber(value.imageCredits);
        if (imageCredits !== undefined) pricing.imageCredits = imageCredits;
        const videoCreditsPerSecond = toPricingNumber(value.videoCreditsPerSecond);
        if (videoCreditsPerSecond !== undefined) pricing.videoCreditsPerSecond = videoCreditsPerSecond;
        const audioCredits = toPricingNumber(value.audioCredits);
        if (audioCredits !== undefined) pricing.audioCredits = audioCredits;
        const textCredits = toPricingNumber(value.textCredits);
        if (textCredits !== undefined) pricing.textCredits = textCredits;
        if (Object.keys(pricing).length) result[name] = pricing;
    }
    return Object.keys(result).length ? result : undefined;
}
