import { normalizeVideoSize } from "@/lib/generation/generation-config";
import { normalizeSeedanceRatio } from "@/lib/seedance-video";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";
import type { StudioKind } from "./types";

/**
 * 视频信号词：命中即优先判定为视频。
 * 「15 秒」这类时长表达是强信号（配视频模型）；「秒钟/秒表/秒针」不算。
 */
const VIDEO_SIGNAL_PATTERN = /动起来|动态|视频|镜头|运镜|分镜|舞蹈|动作|转场|慢动作|特写|推近|拉远|摇镜|跟拍|移动|运动|表演|场景切换|帧率|片段|\d+\s*秒(?!钟|表|针)|movie|video|animation|motion|pan\b|zoom|dolly|shot|scene\b/i;

/**
 * 自动判定本轮生成类型：
 * - 带了视频/音频参考素材 → 视频
 * - 提示词含视频信号词 → 视频
 * - 否则 → 图片（纯图片参考 + 文本默认走图生图）
 */
export function detectStudioKind(prompt: string, references: ReferenceImage[], videoReferences: ReferenceVideo[], audioReferences: ReferenceAudio[]): StudioKind {
    if (videoReferences.length > 0 || audioReferences.length > 0) return "video";
    if (VIDEO_SIGNAL_PATTERN.test(prompt)) return "video";
    return "image";
}

/**
 * 图片 → 视频：size 口径从比例（"1:1"）转成像素（"1280x720"）。
 * 已是像素则原样保留；比例交给 normalizeVideoSize 映射默认尺寸。
 */
export function imageSizeToVideoSize(size: string): string {
    if (/^\d+x\d+$/.test(size || "")) return size;
    return normalizeVideoSize(size || "1:1");
}

/**
 * 视频 → 图片：size 口径从像素（"1280x720"）转成比例（"16:9"）。
 * normalizeSeedanceRatio 负责像素→最近比例；自适应归为 1:1。
 */
export function videoSizeToImageSize(size: string): string {
    if (!size) return "1:1";
    const ratio = normalizeSeedanceRatio(size);
    return ratio === "adaptive" ? "1:1" : ratio;
}
