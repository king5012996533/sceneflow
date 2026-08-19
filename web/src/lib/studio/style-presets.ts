import type { StudioKind, StudioStylePresetId } from "./types";

export type StudioStylePreset = {
    id: StudioStylePresetId;
    label: string;
    desc: string;
    /** 追加到图片提示词末尾（生图把光影做足，图生视频才能继承） */
    imageSuffix: string;
    /** 追加到视频提示词末尾 */
    videoSuffix: string;
};

/**
 * 内置风格预设：会话级开关，选中后发送时自动把对应关键词追加到提示词末尾。
 * 关键词按图片 / 视频分别维护：生图锁定光影基调，视频在继承基础上加运动质感。
 */
export const STUDIO_STYLE_PRESETS: StudioStylePreset[] = [
    { id: "none", label: "无", desc: "不追加任何风格关键词", imageSuffix: "", videoSuffix: "" },
    {
        id: "wuxia-film",
        label: "武侠胶片",
        desc: "港式武侠质感，去 AI 味：硬光、烟尘、低饱和、胶片颗粒",
        imageSuffix: "，港式武侠电影质感：单一硬光主光源、低光比明暗对照、侧逆光勾边、烟尘与丁达尔光、低饱和冷青色调、35mm 胶片颗粒",
        videoSuffix: "，港式武侠电影质感：单一硬光主光源、低光比明暗对照、侧逆光勾边、烟尘与丁达尔光、低饱和冷青色调、35mm 胶片颗粒、轻微手持晃动、24fps 电影帧率",
    },
    {
        id: "wuxia-hardlight",
        label: "硬光动作",
        desc: "动作戏专用：高对比硬光、速度线、尘土、镜头冲击",
        imageSuffix: "，高对比硬光、单一强光源、大范围暗部阴影、扬尘与碎石、速度感、低饱和、胶片颗粒",
        videoSuffix: "，高对比硬光、单一强光源、大范围暗部阴影、扬尘与碎石、速度线与残影、动作瞬间模糊、镜头轻微震动、低饱和、胶片颗粒",
    },
];

export function getStylePreset(id: string): StudioStylePreset {
    return STUDIO_STYLE_PRESETS.find((item) => item.id === id) ?? STUDIO_STYLE_PRESETS[0];
}

/** 把预设风格关键词追加到提示词末尾；id 为 none 时原样返回。 */
export function applyStylePreset(prompt: string, kind: StudioKind, id: StudioStylePresetId): string {
    const preset = getStylePreset(id);
    const suffix = kind === "image" ? preset.imageSuffix : preset.videoSuffix;
    if (!suffix) return prompt;
    return `${prompt.replace(/[。\s]+$/, "")}${suffix}`;
}
