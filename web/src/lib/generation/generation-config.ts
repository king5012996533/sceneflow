import { boolConfig, isSeedanceVideoConfig, normalizeSeedanceRatio, normalizeSeedanceResolution } from "@/lib/seedance-video";
import { defaultConfig, type AiConfig } from "@/stores/use-config-store";

export type GenerationMode = "text" | "image" | "video" | "audio";

type GenerationConfigNode = {
    metadata?: {
        model?: string;
        quality?: string;
        size?: string;
        count?: number;
        seconds?: string;
        vquality?: string;
        generateAudio?: string;
        watermark?: string;
        audioVoice?: string;
        audioFormat?: string;
        audioSpeed?: string;
        audioInstructions?: string;
    };
};

export function buildNodeGenerationConfig(config: AiConfig, node: GenerationConfigNode | undefined, mode: GenerationMode): AiConfig {
    const defaultModel = mode === "image" ? config.imageModel : mode === "video" ? config.videoModel : mode === "audio" ? config.audioModel : config.textModel;
    const selectedModel = node?.metadata?.model || defaultModel || (mode === "audio" ? defaultConfig.audioModel : config.model || defaultConfig.model);
    return {
        ...config,
        model: selectedModel,
        imageModel: mode === "image" ? selectedModel : config.imageModel,
        videoModel: mode === "video" ? selectedModel : config.videoModel,
        audioModel: mode === "audio" ? selectedModel : config.audioModel,
        textModel: mode === "text" ? selectedModel : config.textModel,
        quality: node?.metadata?.quality || config.quality || defaultConfig.quality,
        size: node?.metadata?.size || config.size || defaultConfig.size,
        videoSeconds: node?.metadata?.seconds || config.videoSeconds || defaultConfig.videoSeconds,
        vquality: node?.metadata?.vquality || config.vquality || defaultConfig.vquality,
        videoGenerateAudio: node?.metadata?.generateAudio || config.videoGenerateAudio || defaultConfig.videoGenerateAudio,
        videoWatermark: node?.metadata?.watermark || config.videoWatermark || defaultConfig.videoWatermark,
        audioVoice: node?.metadata?.audioVoice || config.audioVoice || defaultConfig.audioVoice,
        audioFormat: node?.metadata?.audioFormat || config.audioFormat || defaultConfig.audioFormat,
        audioSpeed: node?.metadata?.audioSpeed || config.audioSpeed || defaultConfig.audioSpeed,
        audioInstructions: node?.metadata?.audioInstructions || config.audioInstructions || defaultConfig.audioInstructions,
        count: String(node?.metadata?.count || (mode === "image" ? config.canvasImageCount || config.count : config.count) || defaultConfig.count),
    };
}

export function buildVideoGenerationConfig(config: AiConfig, model: string): AiConfig {
    const seedance = isSeedanceVideoConfig({ ...config, model });
    return {
        ...config,
        model,
        videoModel: model,
        size: seedance ? normalizeSeedanceRatio(config.size) : normalizeVideoSize(config.size),
        videoSeconds: normalizeVideoSeconds(config.videoSeconds),
        vquality: seedance ? normalizeSeedanceResolution(config.vquality, model) : normalizeVideoResolution(config.vquality),
        videoGenerateAudio: String(boolConfig(config.videoGenerateAudio, true)),
        videoWatermark: String(boolConfig(config.videoWatermark, false)),
    };
}

export function normalizeVideoSeconds(value: string) {
    if (String(value).trim() === "-1") return "-1";
    const seconds = Math.floor(Number(value) || 6);
    return String(Math.max(1, Math.min(20, seconds)));
}

export function normalizeVideoSize(value: string) {
    if (value === "auto") return "auto";
    if (/^\d+x\d+$/.test(value || "")) return value;
    return ["9:16", "2:3", "3:4"].includes(value) ? "720x1280" : "1280x720";
}

export function normalizeVideoResolution(value: string) {
    if (value === "480p" || value === "low") return "480";
    if (value === "720p" || value === "auto" || value === "high" || value === "medium") return "720";
    return String(value || "").replace(/p$/i, "") || "720";
}

/**
 * 服务端确权（H-6）：扣费前把客户端传入的生成 metadata 按服务端口径规范化。
 * - 视频时长 clamp 到 1–20 秒（-1 自动时长保留），与上游实际生成的时长范围一致；
 * - 模型名去除首尾空白；
 * 规范化结果同时用于计费与落库，客户端无法通过篡改时长/模型名影响扣费口径。
 */
export function normalizeGenerationMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
    if (!metadata) return undefined;
    const out: Record<string, unknown> = { ...metadata };
    if (out.videoSeconds !== undefined && out.videoSeconds !== null) {
        out.videoSeconds = normalizeVideoSeconds(String(out.videoSeconds));
    }
    for (const key of ["model", "imageModel", "videoModel", "textModel"] as const) {
        if (typeof out[key] === "string") {
            const trimmed = out[key].trim();
            out[key] = trimmed.length ? trimmed : undefined;
        }
    }
    return out;
}
