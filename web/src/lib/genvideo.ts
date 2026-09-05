// genvideo.ts —— GenVideo（ai-genvideo.com）视频生成参数归一化与渠道识别
//
// 与 minimax-video.ts 对齐的结构。GenVideo 接口关键参数：
//   - mode: "2.0"（默认，时长 5/10/15 秒）| "2.5"（固定 30 秒）
//   - ratio: "21:9" | "16:9" | "4:3" | "1:1" | "3:4" | "9:16"
//   - durationSeconds: 2.0 模式 5/10/15；2.5 模式固定 30
//   - images: 参考图（最多 10 张，必须是公网 http/https URL，不接受 data:/blob:）
//   - 任务 id 为长整型（接口以字符串返回，务必保持字符串，避免 JS 精度丢失）

import { modelOptionName, resolveModelRequestConfig, type AiConfig } from "@/stores/use-config-store";
import { getPlatformCapability } from "@/stores/platform-catalog-store";
import { GENVIDEO_DURATION_OPTIONS, GENVIDEO_RATIO_OPTIONS } from "@/lib/model-capability-spec";

export const GENVIDEO_REFERENCE_LIMITS = {
    images: 10,
};

export function isGenvideoVideoConfig(config: AiConfig | (Pick<AiConfig, "model" | "videoModel" | "baseUrl"> & { apiFormat?: AiConfig["apiFormat"] })) {
    const requestConfig = "channels" in config ? resolveModelRequestConfig(config, config.videoModel || config.model) : config;
    const model = modelOptionName(requestConfig.model || requestConfig.videoModel);
    // 供应商格式优先：显式标注为 GenVideo 的渠道按 ai-genvideo.com 接口处理
    if (requestConfig.apiFormat === "genvideo") return true;
    // 平台能力标定优先：后台显式标定 kind 时以标定为准
    const spec = getPlatformCapability(model);
    if (spec?.kind === "genvideo") return true;
    if (spec?.kind === "seedance-video" || spec?.kind === "video" || spec?.kind === "minimax-video") return false;
    return isGenvideoVideoModel(model) || isGenvideoBaseUrl(requestConfig.baseUrl);
}

export function isGenvideoVideoModel(model: string) {
    return model.toLowerCase().includes("genvideo");
}

export function isGenvideoBaseUrl(baseUrl: string) {
    return baseUrl.toLowerCase().includes("ai-genvideo.com");
}

// ---------- 参数归一化 ----------

/** 按时长推断 GenVideo 模式：≥30 秒视为 2.5 模式，其余按 2.0 */
export function genvideoModeForDuration(seconds: number): "2.0" | "2.5" {
    return Number(seconds) >= 30 ? "2.5" : "2.0";
}

/** 归一化 GenVideo 时长：2.0 模式取最近的 5/10/15；≥30 一律按 2.5 模式的 30 秒 */
export function normalizeGenvideoDuration(value: string | number): number {
    const seconds = Math.round(Number(value) || 5);
    if (seconds >= 30) return 30;
    const candidates = [5, 10, 15];
    let best = candidates[0];
    let bestDiff = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
        const diff = Math.abs(candidate - seconds);
        if (diff < bestDiff) {
            bestDiff = diff;
            best = candidate;
        }
    }
    return best;
}

/** 归一化 GenVideo 比例：支持 "16:9" 等字符串与像素对（如 "1280x720"）；auto/空返回 undefined */
export function normalizeGenvideoRatio(value: string): string | undefined {
    if (!value || value === "auto" || value === "adaptive") return undefined;
    if (GENVIDEO_RATIO_OPTIONS.some((item) => item.value === value)) return value;
    const match = value.match(/^(\d+)x(\d+)$/);
    if (!match) return undefined;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!width || !height) return undefined;
    const ratio = width / height;
    const candidates: Array<[string, number]> = [
        ["21:9", 21 / 9],
        ["16:9", 16 / 9],
        ["4:3", 4 / 3],
        ["1:1", 1],
        ["3:4", 3 / 4],
        ["9:16", 9 / 16],
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

export function isGenvideoDurationOption(value: number): boolean {
    return GENVIDEO_DURATION_OPTIONS.some((item) => item.value === value);
}

export { GENVIDEO_RATIO_OPTIONS, GENVIDEO_DURATION_OPTIONS };
