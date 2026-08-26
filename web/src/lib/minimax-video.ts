// minimax-video.ts —— MiniMax H3（海螺三代）视频生成参数归一化与渠道识别
//
// 与 seedance-video.ts 对齐的结构。H3 接口（V2 REST）关键参数：
//   - resolution: "768P" | "2K"
//   - ratio: "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "21:9"
//   - duration: 4-15（秒，整数）
//   - 原生立体声音频（H3 自带音频，不依赖额外 TTS）

import { modelOptionName, resolveModelRequestConfig, type AiConfig } from "@/stores/use-config-store";
import { getPlatformCapability } from "@/stores/platform-catalog-store";
import { MINIMAX_DURATION_OPTIONS, MINIMAX_RATIO_OPTIONS, MINIMAX_RESOLUTION_OPTIONS } from "@/lib/model-capability-spec";

export const MINIMAX_REFERENCE_LIMITS = {
    images: 9,
    videos: 3,
    audios: 3,
    imageMaxBytes: 30 * 1024 * 1024,
    videoMaxBytes: 50 * 1024 * 1024,
    audioMaxBytes: 15 * 1024 * 1024,
};

export function isMiniMaxVideoConfig(config: AiConfig | (Pick<AiConfig, "model" | "videoModel" | "baseUrl"> & { apiFormat?: AiConfig["apiFormat"] })) {
    const requestConfig = "channels" in config ? resolveModelRequestConfig(config, config.videoModel || config.model) : config;
    const model = modelOptionName(requestConfig.model || requestConfig.videoModel);
    // 供应商格式优先：显式标注为 MiniMax 的渠道按 H3 接口处理
    if (requestConfig.apiFormat === "minimax") return true;
    // 平台能力标定优先：后台显式标定 kind 时以标定为准
    const spec = getPlatformCapability(model);
    if (spec?.kind === "minimax-video") return true;
    if (spec?.kind === "seedance-video" || spec?.kind === "video") return false;
    return isMiniMaxVideoModel(model) || isMiniMaxBaseUrl(requestConfig.baseUrl);
}

export function isMiniMaxVideoModel(model: string) {
    const value = model.toLowerCase();
    return value.includes("minimax") || value === "h3" || value.includes("h3-video") || value.includes("hailuo-h3");
}

export function isMiniMaxBaseUrl(baseUrl: string) {
    const value = baseUrl.toLowerCase();
    return value.includes("minimaxi.com") || value.includes("minimax.io") || value.includes("metaso.cn/api/minimax");
}

// ---------- 参数归一化 ----------

/** 归一化 H3 分辨率：只接受 "768P" / "2K"；非法值回落默认 768P */
export function normalizeMiniMaxResolution(value: string): "768P" | "2K" {
    const normalized = String(value || "")
        .trim()
        .toLowerCase();
    if (normalized === "2k" || normalized === "2160p") return "2K";
    // 老值（通用面板的 vquality 可能是 "720" / "480"）统一按 768P 处理
    if (normalized === "768p" || normalized === "768") return "768P";
    if (normalized === "low" || normalized === "medium" || normalized === "480" || normalized === "720") return "768P";
    return "768P";
}

/** 归一化 H3 比例：支持 "16:9" 等字符串与像素对（如 "1280x720"） */
export function normalizeMiniMaxRatio(value: string): string | undefined {
    if (!value || value === "auto" || value === "adaptive") return undefined;
    if (MINIMAX_RATIO_OPTIONS.some((item) => item.value === value)) return value;
    const match = value.match(/^(\d+)x(\d+)$/);
    if (!match) return undefined;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!width || !height) return undefined;
    const ratio = width / height;
    const candidates: Array<[string, number]> = [
        ["16:9", 16 / 9],
        ["4:3", 4 / 3],
        ["1:1", 1],
        ["3:4", 3 / 4],
        ["9:16", 9 / 16],
        ["21:9", 21 / 9],
    ];
    let best = candidates[0];
    let bestDiff = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
        const diff = Math.abs(candidate[1] - ratio);
        if (diff < bestDiff) {
            bestDiff = diff;
            best = candidate;
        }
    }
    return best[0];
}

/** 归一化 H3 时长：4-15 秒整数，越界取边界 */
export function normalizeMiniMaxDuration(value: string | number): number {
    const seconds = Math.round(Number(value) || 6);
    return Math.max(4, Math.min(15, seconds));
}

export function isMiniMaxDurationOption(value: number): boolean {
    return MINIMAX_DURATION_OPTIONS.some((item) => item.value === value);
}

export { MINIMAX_RESOLUTION_OPTIONS, MINIMAX_RATIO_OPTIONS, MINIMAX_DURATION_OPTIONS };
