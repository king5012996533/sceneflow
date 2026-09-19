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
import { IMAGE_BASE_ASPECTS, IMAGE_RESOLUTION_TIERS, deriveResolutionTiers, normalizeResolutionTiers, stripAspectSuffixes, type ImageResolutionTier } from "@/lib/image-resolution";
import { modelNameSupportsReferences } from "@/lib/model-reference-support";

// ---------- 图片 ----------
/** 出图保真度档（上游 quality 参数）。low/medium/high 是三档老词汇，xhigh/max 是顶档（Replicate gpt-image-2.5-flare 有六档） */
export type ImageQuality = "auto" | "high" | "medium" | "low" | "xhigh" | "max";
export type ImageAspect = "1:1" | "3:2" | "2:3" | "4:3" | "3:4" | "16:9" | "9:16" | "1:1-2k" | "16:9-2k" | "9:16-2k" | "16:9-4k" | "9:16-4k" | "auto";
/** 出图文件格式（上游 output_format）。webp 最省，png 无损且支持透明底，jpeg 无 alpha 通道 */
export type ImageOutputFormat = "webp" | "png" | "jpeg";

export type ImageCapabilitySpec = {
    kind: "image";
    qualities: ImageQuality[];
    /** 支持的宽高比（纯比例；分辨率不写在这里，见 resolutions） */
    aspects: ImageAspect[];
    /** 支持的分辨率档位（1k/2k/4k）。旧配置缺这一项时由 normalizeImageCapability 从 aspects 后缀推导 */
    resolutions?: ImageResolutionTier[];
    /**
     * 画质档位轴：模型用 quality 直接表达出图保真度/分辨率时标这一项
     * （Replicate 的 gpt-image-2.5-flare：low / medium / high / xhigh / max / auto，
     * 它没有「1K/2K/4K」这种像素档概念，面板上的分辨率档对它发不出任何东西）。
     *
     * 标了它 = 告诉面板「这个模型的『分辨率』就是画质档」：
     *   - 用户面板把 1K/2K/4K 那一行整行换成这里的档位，选项写进 config.quality（而不是像素尺寸）；
     *   - 尺寸只留宽高比，不再显示像素值与 W/H 输入（像素由上游按 quality 决定，我们给不出准确数字）；
     *   - 后台定价按画质档逐档收（低 = 基础价，其余档位见 ModelPricing.imageQualityCredits）。
     *
     * 不标（undefined / 空）= 沿用原有「分辨率档位」口径，其它渠道行为完全不变。
     */
    qualityTiers?: ImageQuality[];
    /**
     * 支持出图格式（上游 output_format 参数）。标了才在用户面板出现「格式」这一行。
     *
     * 为什么不给所有模型都显示：平台请求里 output_format 是我们显式带上的字段，不传就用上游默认，
     * 大多数渠道只有 webp/png 两种甚至完全不认这个字段。所以「能不能选格式」按模型标定，
     * 不标 = 面板不出现这一行、行为与过去完全一致。
     *
     * webp = 体积最小（1024² 约 26–33 万字节）；png = 无损、支持透明底；jpeg = 无 alpha 通道，
     * 与「透明底」互斥，不建议开放给用户。
     */
    outputFormats?: ImageOutputFormat[];
    /**
     * 只吃宽高比的模型：上游没有「分辨率 / 画质」这两轴，像素完全由它自己定。
     *
     * 典型是 Replicate 的 recraft-ai/recraft-v4-pro：入参只有 prompt / aspect_ratio / size，
     * 而 size 明文写「设了 aspect_ratio 就被忽略」，出图约 400 万像素级（9:16 实测 1536×2688，
     * 1:1 按模型页约 2048×2048），也没有 quality 参数。
     * 这种模型如果照旧走「1K/2K/4K + 画质（高级）」那一套，面板会给出两样假东西：
     *   - 比例 chip 上的像素提示（1024² 这种）+ W/H 输入框——上游根本不看；
     *   - 分辨率档位与画质档位——选了不起作用，却会按档位算价（选 4K 多扣钱等于白收）。
     *
     * 标了它 = 告诉面板：尺寸行只留宽高比（不显示像素、不给 W/H），
     * 05 那一行只写「由上游定」不放档位，画质（高级）整块不出现，扣费走一口价（基础价）。
     * 与 qualityTiers 的区别：qualityTiers 是「分辨率轴换成画质档」，这一项是「压根没有这一轴」。
     */
    aspectOnly?: boolean;
    /**
     * 是否接受参考图（图生图 / 参考图生图）。**三态**：
     *   - true  = 管理员明确标为「支持」；
     *   - false = 管理员明确标为「不支持」；
     *   - 缺字段 = 没标定过，按模型名回落到名单（见 lib/model-reference-support.ts）。
     *     线上所有老标定都没有这个字段，所以缺字段时**不能**当成支持 —— 名单会因此永不生效。
     *
     * 典型是 Replicate 的 recraft 系（recraft-v4-pro / v4 / v3 / recraft-20b）：入参只有
     * prompt / aspect_ratio / size，没有任何图像字段。上游对多余的输入字段是**忽略**而非报错，
     * 于是参考图照发、任务照样成功、照样扣费，只是参考图完全没被用上 —— 用户以为在做参考图生图，
     * 拿到的却是与参考图无关的图（2026-09-19 线上实测确认）。
     *
     * 标成不支持 = 用户面板把「添加图片 / 从剪贴板添加 / 从素材库添加」三个入口关掉并写明原因，
     * 画布节点面板提示上游图片不会被使用，且构造请求时不再把它当参考图（不发 input_images）。
     */
    references?: boolean;
    /** 最大生成张数 1-15 */
    maxCount: number;
};

/** 归一化后的图片能力（resolutions 必定存在），后台编辑器与用户面板都读这个形状 */
export type ImageCapabilityView = Omit<ImageCapabilitySpec, "resolutions"> & { resolutions: ImageResolutionTier[] };

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

// ---------- 视频 · MiniMax（H3：768P / 2K） ----------
export type MiniMaxResolution = "768P" | "2K";
export type MiniMaxRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";
export type MiniMaxDuration = 4 | 5 | 6 | 8 | 10 | 12 | 15;

export type MiniMaxVideoCapabilitySpec = {
    kind: "minimax-video";
    resolutions: MiniMaxResolution[];
    ratios: MiniMaxRatio[];
    durations: MiniMaxDuration[];
    audio: boolean;
    watermark: boolean;
};

// ---------- 视频 · GenVideo（ai-genvideo.com：mode 2.0/2.5） ----------
export type GenVideoRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9";
export type GenVideoDuration = 5 | 10 | 15 | 30;

export type GenVideoVideoCapabilitySpec = {
    kind: "genvideo";
    ratios: GenVideoRatio[];
    durations: GenVideoDuration[];
};

export type ModelCapabilitySpec = ImageCapabilitySpec | SeedanceVideoCapabilitySpec | GenericVideoCapabilitySpec | MiniMaxVideoCapabilitySpec | GenVideoVideoCapabilitySpec;
export type ModelCapabilityKind = ModelCapabilitySpec["kind"];
/** ProviderCredential.capabilities 的存储形状：模型名 → 能力标定 */
export type CredentialCapabilities = Record<string, ModelCapabilitySpec>;

export const IMAGE_KIND = "image";
export const GENERIC_VIDEO_KIND = "video";
export const SEEDANCE_VIDEO_KIND = "seedance-video";
export const MINIMAX_VIDEO_KIND = "minimax-video";
export const GENVIDEO_VIDEO_KIND = "genvideo";
export const MODEL_KINDS: readonly ModelCapabilityKind[] = [IMAGE_KIND, GENERIC_VIDEO_KIND, SEEDANCE_VIDEO_KIND, MINIMAX_VIDEO_KIND, GENVIDEO_VIDEO_KIND];

// ---------- 选项清单（后台编辑器 & 面板过滤共用） ----------

export const IMAGE_QUALITY_OPTIONS: ReadonlyArray<{ value: ImageQuality; label: string }> = [
    { value: "auto", label: "自动" },
    { value: "high", label: "高" },
    { value: "medium", label: "中" },
    { value: "low", label: "低" },
    { value: "xhigh", label: "极高" },
    { value: "max", label: "最高" },
];

/**
 * 画质档位轴的选项（按保真度从低到高，自动收尾）—— 与上游枚举顺序一致，用户面板直接铺这一行。
 * 只有标了 qualityTiers 的模型才用这一套；其余模型照旧走 IMAGE_QUALITY_OPTIONS / 分辨率档位。
 */
export const IMAGE_QUALITY_TIER_OPTIONS: ReadonlyArray<{ value: ImageQuality; label: string; hint: string }> = [
    { value: "low", label: "低", hint: "最快最省，适合打草稿" },
    { value: "medium", label: "中", hint: "速度与质量的平衡" },
    { value: "high", label: "高", hint: "细节与保真更好，更慢" },
    { value: "xhigh", label: "极高", hint: "更高的细节与保真" },
    { value: "max", label: "最高", hint: "最高保真，最慢最贵" },
    { value: "auto", label: "自动", hint: "由模型自行决定" },
];

/**
 * 出图格式选项。第一项是平台默认（也是上游默认）：webp —— 1024² 实测 26–33 万字节，
 * 比 png 小一个量级，浏览器显示完全一致。
 * jpeg 留在清单里只是给后台留个口子（例如以后接只认 jpg 的老工具），默认不给用户开。
 */
export const IMAGE_OUTPUT_FORMAT_OPTIONS: ReadonlyArray<{ value: ImageOutputFormat; label: string; hint: string }> = [
    { value: "webp", label: "WebP", hint: "体积最小，网页/画布显示与 png 无差别" },
    { value: "png", label: "PNG", hint: "无损，支持透明底；文件更大" },
    { value: "jpeg", label: "JPEG", hint: "无透明通道，与「透明底」互斥" },
];

/** 宽高比选项（后台能力标定用；分辨率是独立一轴，不写在这里） */
export const IMAGE_ASPECT_OPTIONS: ReadonlyArray<{ value: ImageAspect; label: string }> = IMAGE_BASE_ASPECTS.map((value) => ({ value, label: value === "auto" ? "自定义" : value }));

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

export const MINIMAX_RESOLUTION_OPTIONS: ReadonlyArray<{ value: MiniMaxResolution; label: string }> = [
    { value: "768P", label: "768P" },
    { value: "2K", label: "2K" },
];

export const MINIMAX_RATIO_OPTIONS: ReadonlyArray<{ value: MiniMaxRatio; label: string }> = [
    { value: "16:9", label: "横屏" },
    { value: "9:16", label: "竖屏" },
    { value: "1:1", label: "方形" },
    { value: "4:3", label: "标准横屏" },
    { value: "3:4", label: "标准竖屏" },
    { value: "21:9", label: "宽银幕" },
];

export const MINIMAX_DURATION_OPTIONS: ReadonlyArray<{ value: MiniMaxDuration; label: string }> = [
    { value: 4, label: "4s" },
    { value: 5, label: "5s" },
    { value: 6, label: "6s" },
    { value: 8, label: "8s" },
    { value: 10, label: "10s" },
    { value: 12, label: "12s" },
    { value: 15, label: "15s" },
];

export const GENVIDEO_RATIO_OPTIONS: ReadonlyArray<{ value: GenVideoRatio; label: string }> = [
    { value: "16:9", label: "横屏" },
    { value: "9:16", label: "竖屏" },
    { value: "1:1", label: "方形" },
    { value: "4:3", label: "标准横屏" },
    { value: "3:4", label: "标准竖屏" },
    { value: "21:9", label: "宽银幕" },
];

export const GENVIDEO_DURATION_OPTIONS: ReadonlyArray<{ value: GenVideoDuration; label: string }> = [
    { value: 5, label: "5s" },
    { value: 10, label: "10s" },
    { value: 15, label: "15s" },
    { value: 30, label: "30s（2.5 模式）" },
];

export const IMAGE_MAX_COUNT_LIMIT = 15;

// ---------- 内置默认能力（模型名命中时后台预填 / 前端兜底参考） ----------

export const DEFAULT_IMAGE_CAPABILITY: ImageCapabilitySpec = {
    kind: "image",
    qualities: IMAGE_QUALITY_OPTIONS.map((item) => item.value),
    aspects: IMAGE_ASPECT_OPTIONS.map((item) => item.value),
    resolutions: [...IMAGE_RESOLUTION_TIERS],
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

export const DEFAULT_MINIMAX_VIDEO_CAPABILITY: MiniMaxVideoCapabilitySpec = {
    kind: "minimax-video",
    resolutions: MINIMAX_RESOLUTION_OPTIONS.map((item) => item.value),
    ratios: MINIMAX_RATIO_OPTIONS.map((item) => item.value),
    durations: MINIMAX_DURATION_OPTIONS.map((item) => item.value),
    audio: true,
    watermark: false,
};

export const DEFAULT_GENVIDEO_VIDEO_CAPABILITY: GenVideoVideoCapabilitySpec = {
    kind: "genvideo",
    ratios: GENVIDEO_RATIO_OPTIONS.map((item) => item.value),
    durations: GENVIDEO_DURATION_OPTIONS.map((item) => item.value),
};

/**
 * 按模型名推断能力类型（与前端 use-config-store 的模型名启发式保持一致）。
 * 仅用于「预填默认」和「编辑默认选择」，推断不到时返回 null（文本/音频等暂不标定）。
 *
 * 上游用的是「owner/模型名」（Replicate）时没有通用后缀可认（如 recraft-ai/recraft-v4-pro），
 * 只能逐个登记关键词；漏登记不会 500，但后台那行的标定字段会被判定成「无需标定」而锁死，
 * 用户端价目表也会漏掉这个模型 —— 接新模型时先在这里与 model-pricing-kind.ts 各加一处。
 */
export function inferModelKindByName(model: string): ModelCapabilityKind | null {
    const value = (model.includes("::") ? model.slice(model.indexOf("::") + 2) : model).toLowerCase();
    const isAudio = value.includes("audio") || value.includes("tts") || value.includes("speech") || value.includes("voice") || value.includes("music") || value.includes("sound");
    // MiniMax H3（海螺三代）：分辨率 768P / 2K，单独能力类型；优先于通用视频分类
    if (value.includes("minimax") || value === "h3" || value.includes("h3-video") || value.includes("hailuo-h3")) return MINIMAX_VIDEO_KIND;
    // GenVideo（ai-genvideo.com）：模型名含 "genvideo"，必须先于通用 video 关键词判断
    if (value.includes("genvideo")) return GENVIDEO_VIDEO_KIND;
    const isVideo = value.includes("seedance") || value.includes("video") || value.includes("sora") || value.includes("veo") || value.includes("kling") || value.includes("wan") || value.includes("hailuo");
    if (isVideo) return value.includes("seedance") ? SEEDANCE_VIDEO_KIND : GENERIC_VIDEO_KIND;
    const isImage =
        !isAudio &&
        (value.includes("seedream") ||
            value.includes("gpt-image") ||
            value.includes("image") ||
            value.includes("dall-e") ||
            value.includes("dalle") ||
            value.includes("imagen") ||
            value.includes("flux") ||
            value.includes("sdxl") ||
            value.includes("stable-diffusion") ||
            value.includes("recraft") ||
            value.includes("midjourney"));
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
        // 参考图默认值按名字名单给：recraft 这类上游没有图像入参的模型必须默认关掉，
        // 否则后台预填、用户面板兜底都会显示成「支持参考图」，用户挂了也白挂（上游只会忽略）。
        return {
            kind,
            qualities: [...DEFAULT_IMAGE_CAPABILITY.qualities],
            aspects: [...DEFAULT_IMAGE_CAPABILITY.aspects],
            resolutions: [...IMAGE_RESOLUTION_TIERS],
            maxCount: DEFAULT_IMAGE_CAPABILITY.maxCount,
            ...(modelNameSupportsReferences(model) ? {} : { references: false }),
        };
    }
    if (kind === GENERIC_VIDEO_KIND) {
        return { kind, clarity: [...DEFAULT_GENERIC_VIDEO_CAPABILITY.clarity], sizes: [...DEFAULT_GENERIC_VIDEO_CAPABILITY.sizes], seconds: [...DEFAULT_GENERIC_VIDEO_CAPABILITY.seconds] };
    }
    if (kind === MINIMAX_VIDEO_KIND) {
        return { kind, resolutions: [...DEFAULT_MINIMAX_VIDEO_CAPABILITY.resolutions], ratios: [...DEFAULT_MINIMAX_VIDEO_CAPABILITY.ratios], durations: [...DEFAULT_MINIMAX_VIDEO_CAPABILITY.durations], audio: true, watermark: false };
    }
    if (kind === GENVIDEO_VIDEO_KIND) {
        return { kind, ratios: [...DEFAULT_GENVIDEO_VIDEO_CAPABILITY.ratios], durations: [...DEFAULT_GENVIDEO_VIDEO_CAPABILITY.durations] };
    }
    return null;
}

// ---------- 服务端清洗（admin API 落库前调用，只保留合法字段） ----------

const IMAGE_QUALITY_VALUES: readonly ImageQuality[] = ["auto", "high", "medium", "low", "xhigh", "max"];
// 允许出现的宽高比（含旧配置里的 -2k/-4k 后缀写法，落库前统一剥成纯比例，见 baseImageAspect）
const IMAGE_ASPECT_VALUES: readonly ImageAspect[] = ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "1:1-2k", "16:9-2k", "9:16-2k", "16:9-4k", "9:16-4k", "auto"];
const SEEDANCE_RESOLUTION_VALUES: readonly SeedanceResolution[] = ["480p", "720p", "1080p"];
const SEEDANCE_RATIO_VALUES: readonly SeedanceRatio[] = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "adaptive"];
const SEEDANCE_DURATION_VALUES: readonly SeedanceDuration[] = [-1, 4, 5, 6, 8, 10, 12, 15];
const VIDEO_CLARITY_VALUES: readonly VideoClarity[] = ["720", "480"];
const VIDEO_SIZE_VALUES: readonly VideoSize[] = ["1280x720", "720x1280", "1024x1024", "1792x1024", "1024x1792", "auto"];
const VIDEO_SECONDS_VALUES: readonly VideoSeconds[] = [6, 10, 12, 16, 20];
const MINIMAX_RESOLUTION_VALUES: readonly MiniMaxResolution[] = ["768P", "2K"];
const MINIMAX_RATIO_VALUES: readonly MiniMaxRatio[] = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];
const MINIMAX_DURATION_VALUES: readonly MiniMaxDuration[] = [4, 5, 6, 8, 10, 12, 15];
const GENVIDEO_RATIO_VALUES: readonly GenVideoRatio[] = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];
const GENVIDEO_DURATION_VALUES: readonly GenVideoDuration[] = [5, 10, 15, 30];

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

// ---------- 图片能力归一化（旧数据把分辨率写在宽高比后缀里：16:9-2k / 9:16-4k） ----------

/**
 * 读取侧归一化：宽高比只留纯比例，分辨率档位缺失时从旧后缀推导。
 * 纯函数在 image-resolution.ts（可被 node 单测直接加载）；这里只做类型收口。
 * 用于「库里存的是旧形状」的模型（管理员重新保存即自动升级为新形状）。
 */
export function normalizeImageCapability(spec: ImageCapabilitySpec): ImageCapabilityView {
    const aspects = stripAspectSuffixes(spec.aspects as readonly string[]) as ImageAspect[];
    const explicit = Array.isArray(spec.resolutions) && spec.resolutions.length ? normalizeResolutionTiers(spec.resolutions) : null;
    return {
        ...spec,
        aspects,
        resolutions: explicit ?? deriveResolutionTiers(spec.aspects as readonly string[]),
        qualityTiers: normalizeQualityTiers(spec.qualityTiers),
        outputFormats: normalizeOutputFormats(spec.outputFormats),
        aspectOnly: spec.aspectOnly === true,
        // 参考图是三态：true/false = 管理员明确标定，缺字段 = 没标过（回落名字名单，见 resolveReferenceSupport）。
        // 老标定全都没这个字段，这里绝不能补成 true —— 那等于替管理员宣布「支持」，名单就永远不生效。
        ...(typeof spec.references === "boolean" ? { references: spec.references } : {}),
    };
}

/**
 * 出图格式归一化：只留合法取值、按 IMAGE_OUTPUT_FORMAT_OPTIONS 的顺序去重排序。
 * 空/缺 = 该模型不开放格式选择（返回 undefined，面板不出现这一行）。
 */
export function normalizeOutputFormats(input: unknown): ImageOutputFormat[] | undefined {
    if (!Array.isArray(input)) return undefined;
    const picked = new Set(input.map((item) => String(item).trim().toLowerCase()));
    const formats = IMAGE_OUTPUT_FORMAT_OPTIONS.map((item) => item.value).filter((value) => picked.has(value));
    return formats.length ? formats : undefined;
}

/**
 * 单个格式取值的归一化：认不出来就回默认值 webp。
 * 请求体里 output_format 是我们显式发的字段，发一个上游不认的值会被直接 422 ——
 * 所以任何来自本地存储 / 节点元数据的值都在这里收口。
 */
export function normalizeImageOutputFormat(input: unknown, fallback: ImageOutputFormat = "webp"): ImageOutputFormat {
    const value = String(input ?? "")
        .trim()
        .toLowerCase();
    return IMAGE_OUTPUT_FORMAT_OPTIONS.some((item) => item.value === value) ? (value as ImageOutputFormat) : fallback;
}

/**
 * 画质档位轴归一化：只留合法取值、按保真度排序、去重；空/缺 = 该模型不用这条轴（返回 undefined）。
 * 「没标」与「标了但一个都没勾」必须区分开：前者走分辨率档位，后者是后台配置写坏了 ——
 * 这里统一按「没用这条轴」处理，不让面板出现一行空档位。
 */
export function normalizeQualityTiers(input: unknown): ImageQuality[] | undefined {
    if (!Array.isArray(input)) return undefined;
    const picked = new Set(input.map((item) => String(item).trim()));
    const tiers = IMAGE_QUALITY_TIER_OPTIONS.map((item) => item.value).filter((value) => picked.has(value));
    return tiers.length ? tiers : undefined;
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
        // 宽高比统一落成纯比例（旧值 16:9-2k 剥成 16:9），分辨率档位单独存；
        // 旧配置没带 resolutions 时从后缀推导，管理员下次保存即完成升级，无需数据迁移。
        const pickedAspects = pickStrings(value.aspects, IMAGE_ASPECT_VALUES);
        const resolutions = Array.isArray(value.resolutions) && value.resolutions.length ? normalizeResolutionTiers(value.resolutions) : deriveResolutionTiers(pickedAspects);
        const qualityTiers = normalizeQualityTiers(value.qualityTiers);
        const outputFormats = normalizeOutputFormats(value.outputFormats);
        return {
            kind,
            qualities: pickStrings(value.qualities, IMAGE_QUALITY_VALUES),
            aspects: stripAspectSuffixes(pickedAspects) as ImageAspect[],
            resolutions,
            // 没标就整个字段不落库：留一个空数组会让「标了但没勾」和「没标」分不清
            ...(qualityTiers ? { qualityTiers } : {}),
            ...(outputFormats ? { outputFormats } : {}),
            ...(value.aspectOnly === true ? { aspectOnly: true } : {}),
            // 三态：只有管理员明确勾了「支持/不支持」才落库，没动过就保持缺字段（回落名字名单）
            ...(typeof value.references === "boolean" ? { references: value.references } : {}),
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
    if (kind === MINIMAX_VIDEO_KIND) {
        return {
            kind,
            resolutions: pickStrings(value.resolutions, MINIMAX_RESOLUTION_VALUES),
            ratios: pickStrings(value.ratios, MINIMAX_RATIO_VALUES),
            durations: pickNumbers(value.durations, MINIMAX_DURATION_VALUES),
            audio: value.audio !== false,
            watermark: value.watermark === true,
        };
    }
    if (kind === GENVIDEO_VIDEO_KIND) {
        return {
            kind,
            ratios: pickStrings(value.ratios, GENVIDEO_RATIO_VALUES),
            durations: pickNumbers(value.durations, GENVIDEO_DURATION_VALUES),
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

/**
 * 逐档价清洗：只留画质档位轴认识的那几档（低档不在这里 —— 它就是基础价 imageCredits）。
 * 一档都没填 = 返回 undefined，整个字段不落库（回到「全按基础价扣」的老口径）。
 */
export function sanitizeQualityCredits(input: unknown): Partial<Record<ImageQuality, number>> | undefined {
    if (!input || typeof input !== "object" || Array.isArray(input)) return undefined;
    const value = input as Record<string, unknown>;
    const result: Partial<Record<ImageQuality, number>> = {};
    for (const tier of IMAGE_QUALITY_TIER_OPTIONS) {
        if (tier.value === "low") continue;
        const credits = toPricingNumber(value[tier.value]);
        if (credits !== undefined) result[tier.value] = credits;
    }
    return Object.keys(result).length ? result : undefined;
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
        const imageCredits2k = toPricingNumber(value.imageCredits2k);
        if (imageCredits2k !== undefined) pricing.imageCredits2k = imageCredits2k;
        const imageCredits4k = toPricingNumber(value.imageCredits4k);
        if (imageCredits4k !== undefined) pricing.imageCredits4k = imageCredits4k;
        // 画质档位轴的逐档价（低档不在这里，它是 imageCredits 基础价）
        const qualityCredits = sanitizeQualityCredits(value.imageQualityCredits);
        if (qualityCredits) pricing.imageQualityCredits = qualityCredits;
        const videoCredits = toPricingNumber(value.videoCredits);
        if (videoCredits !== undefined) pricing.videoCredits = videoCredits;
        const videoCreditsStandard = toPricingNumber(value.videoCreditsStandard);
        if (videoCreditsStandard !== undefined) pricing.videoCreditsStandard = videoCreditsStandard;
        const videoCreditsHigh = toPricingNumber(value.videoCreditsHigh);
        if (videoCreditsHigh !== undefined) pricing.videoCreditsHigh = videoCreditsHigh;
        const audioCredits = toPricingNumber(value.audioCredits);
        if (audioCredits !== undefined) pricing.audioCredits = audioCredits;
        const textCredits = toPricingNumber(value.textCredits);
        if (textCredits !== undefined) pricing.textCredits = textCredits;
        if (Object.keys(pricing).length) result[name] = pricing;
    }
    return Object.keys(result).length ? result : undefined;
}
