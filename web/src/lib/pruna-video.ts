// pruna-video.ts —— Replicate 上 prunaai/p-video 的入参口径（面板选项 / 出参归一化 / 标定预填共用）
//
// 上游 schema（GET api.replicate.com/v1/models/prunaai/p-video，version 50e52eaadc2a1648c1c4f854695c2ac7d56c23068802e8cafb8b69f1100b9ece，2026-09-20 核对）：
//   prompt              string   必填 —— 全模型唯一必填项，所以文生视频可用，不挂参考图也能出片
//   image               string   可选 —— 给了它上游会忽略 aspect_ratio
//   audio / last_frame_image     可选
//   duration            integer  1–20，默认 5（给了 audio 时忽略）
//   resolution          enum     ["720p", "1080p"]，默认 "720p"
//   aspect_ratio        enum     ["16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "1:1"]，默认 "16:9"
//   fps                 enum     [24, 48]，默认 24
//   draft               boolean  默认 false（false = 完整推理；true 才是低画质预览）
//   prompt_upsampling   boolean  默认 true
//   save_audio          boolean  默认 true
//   seed / no_op                 可选（no_op 是健康检查，不跑推理）
//
// 为什么单独一个模块：这些枚举既是「面板给哪些选项」的依据，也是「请求发什么值」的依据。
// 两处各写一份就会漏 —— 线上 prunaai/p-video 曾被标成 seedance 的词汇表，面板因此放出 1792x1024
// 「宽屏」，约分成 "7:4" 不在枚举里，上游直接把整条请求 422 掉（用户点一次错一次）。
// 现在面板选项、出参归一化、后台标定预填都从这里取，改一处就全对。

import type { GenericVideoCapabilitySpec } from "@/lib/model-capability-spec";

export const PRUNA_VIDEO_MODEL = "prunaai/p-video";

/** 上游 aspect_ratio 枚举（顺序与上游文档一致） */
export const PRUNA_VIDEO_ASPECT_RATIOS = ["16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "1:1"] as const;

/** 上游 resolution 枚举 */
export const PRUNA_VIDEO_RESOLUTIONS = ["720p", "1080p"] as const;
export const PRUNA_VIDEO_DEFAULT_RESOLUTION = "720p";

/** 上游 duration 范围（含端点）与默认值 */
export const PRUNA_VIDEO_MIN_SECONDS = 1;
export const PRUNA_VIDEO_MAX_SECONDS = 20;
export const PRUNA_VIDEO_DEFAULT_SECONDS = 5;

/** 上游 draft 默认值 —— 我们那个「草稿模式」开关的默认必须跟它一致，否则默认就在偷偷降画质 */
export const PRUNA_VIDEO_DEFAULT_DRAFT = false;

/**
 * 是否 prunaai/p-video。渠道前缀（`<channelId>::model`）先剥掉再比，
 * 与 stores/use-config-store 的 modelOptionName 同一口径，避免调用方各自写一份判断。
 */
export function isPrunaVideoModel(value: string) {
    const separator = value.indexOf("::");
    const model = (separator < 0 ? value : value.slice(separator + 2)).trim().toLowerCase();
    return model === PRUNA_VIDEO_MODEL || model.includes(PRUNA_VIDEO_MODEL);
}

/**
 * 面板的「尺寸」档位 → 上游 aspect_ratio。
 *
 * 只放行枚举内的值：认不出（"auto" / 空）或约分后落在枚举外（1792x1024 → "7:4"）一律返回
 * undefined，调用方就不发这个字段，由上游用它自己的默认 16:9。
 * 宁可少发一个可选参数，也不能发一个枚举外的值 —— 那会把整条请求打成 422，用户点一次错一次。
 */
export function normalizePrunaAspectRatio(value: string): string | undefined {
    const raw = String(value ?? "").trim();
    if (!raw || raw === "auto") return undefined;
    const ratio = /^\d+:\d+$/.test(raw) ? raw : reducePixelSize(raw);
    if (!ratio) return undefined;
    return (PRUNA_VIDEO_ASPECT_RATIOS as readonly string[]).includes(ratio) ? ratio : undefined;
}

/**
 * 面板的清晰度 → 上游 resolution。上游只有 720p / 1080p 两档，
 * 其余一律落到默认 720p（面板已按标定只放这两档，这里是兜底）。
 */
export function normalizePrunaResolution(value: string): string {
    const normalized = String(value ?? "")
        .trim()
        .toLowerCase();
    return normalized === "1080p" || normalized === "1080" ? "1080p" : PRUNA_VIDEO_DEFAULT_RESOLUTION;
}

/** 上游 duration 归一化：非数字回默认 5，越界 clamp 到 1–20 */
export function normalizePrunaSeconds(value: unknown): number {
    const seconds = Math.floor(Number(value));
    if (!Number.isFinite(seconds) || seconds <= 0) return PRUNA_VIDEO_DEFAULT_SECONDS;
    return Math.min(PRUNA_VIDEO_MAX_SECONDS, Math.max(PRUNA_VIDEO_MIN_SECONDS, seconds));
}

/** 像素串（1792x1024）→ 约分后的比例串（7:4）；不是像素串返回 undefined */
function reducePixelSize(value: string): string | undefined {
    const match = value.match(/^(\d+)x(\d+)$/i);
    if (!match) return undefined;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!width || !height) return undefined;
    const divisor = gcd(width, height);
    return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function gcd(a: number, b: number): number {
    let x = Math.abs(Math.round(a));
    let y = Math.abs(Math.round(b));
    while (y) {
        const next = x % y;
        x = y;
        y = next;
    }
    return x || 1;
}

/**
 * 后台标定的默认（也是应写入生产的那份）：面板只会放出上游真的认的值 ——
 * 清晰度 720p/1080p、尺寸只留能约分成枚举内比例的三档、秒数落在 1–20 内。
 * 「宽屏 1792x1024 / 长图 1024x1792」故意不给：它们约分成 7:4 / 4:7，发出去就是 422。
 */
export function prunaVideoCapability(): GenericVideoCapabilitySpec {
    return {
        kind: "video",
        clarity: ["720", "1080"],
        sizes: ["1280x720", "720x1280", "1024x1024"],
        seconds: [5, 6, 10, 12, 16, 20],
    };
}
