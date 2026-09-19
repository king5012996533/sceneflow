// model-pricing-kind.ts —— 「这个模型该按哪一类计费」的判定（纯逻辑，无任何运行时依赖）
//
// 为什么单独一个模块：后台「逐模型积分定价」要为每个模型显示该类型的价格字段。
// 文本模型过去被埋在图片分档 / 视频分档中间（2026-09-19 老板反馈「文本模型还不能定义价格」
// —— 其实是能配，但在一屏图片/视频字段里根本看不见）。定价器要按类型只显示相关字段，
// "这是哪一类"的判定就成了直接影响「管理员能不能配到价」的一步，所以单独放出来、配单测钉死。
//
// 判定优先级：
//   1. 管理员在「能力标定」里显式标过的 kind（capabilityKind）——人为声明优先于名字猜测；
//   2. 名字启发式（与 use-config-store / model-capability-spec 的口径一致，含 audio 关键词优先）；
//   3. 都判不出来 → "text"（既不是图片也不是视频、音频的，在对话/工具里按文本计费）。
//
// 与 model-capability-spec.ts 的 inferModelKindByName 的关系：那个函数回答「这个模型要怎么标定能力」
// （文本/音频返回 null）；这里回答「这个模型按哪一类扣费」（永远给得出一个类型）。两处关键词表保持一致，
// 改一处务必对照另一处。

export type PricingKind = "image" | "video" | "audio" | "text";

/** 已知的视频类能力类型（对应 model-capability-spec.ts 的 MODEL_KINDS 去掉 image） */
const VIDEO_CAPABILITY_KINDS = new Set(["video", "seedance-video", "minimax-video", "genvideo"]);

const AUDIO_KEYWORDS = ["audio", "tts", "speech", "voice", "music", "sound"];
const VIDEO_KEYWORDS = ["seedance", "video", "sora", "veo", "kling", "wan", "hailuo", "minimax", "h3"];
const IMAGE_KEYWORDS = ["seedream", "gpt-image", "image", "dall-e", "dalle", "imagen", "flux", "sdxl", "stable-diffusion", "midjourney"];

function bareModelName(model: string) {
    const value = String(model || "");
    const separator = value.indexOf("::");
    return (separator >= 0 ? value.slice(separator + 2) : value).trim().toLowerCase();
}

/**
 * 按「能力标定」+「模型名」判断计费类型。
 * capabilityKind 传 model-capability-spec 的能力 kind（image / video / seedance-video / minimax-video / genvideo）。
 */
export function inferPricingKind(model: string, capabilityKind?: string | null): PricingKind {
    const declared = typeof capabilityKind === "string" ? capabilityKind.trim() : "";
    if (declared) return declared === "image" ? "image" : VIDEO_CAPABILITY_KINDS.has(declared) ? "video" : declared === "audio" ? "audio" : "text";

    const value = bareModelName(model);
    if (!value) return "text";
    if (AUDIO_KEYWORDS.some((keyword) => value.includes(keyword))) return "audio";
    // genvideo 这类「不叫 video 但确实是视频」的名字，靠 video 关键词表覆盖（genvideo 含 video 子串）
    if (VIDEO_KEYWORDS.some((keyword) => value.includes(keyword))) return "video";
    if (IMAGE_KEYWORDS.some((keyword) => value.includes(keyword))) return "image";
    return "text";
}

/** 定价编辑器里每个类型该显示的字段分组名（顺序 = 显示顺序） */
export const PRICING_KIND_LABEL: Record<PricingKind, string> = {
    image: "图片模型",
    video: "视频模型",
    audio: "音频模型",
    text: "文本模型",
};
