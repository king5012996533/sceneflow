import type { GuardedVideoGenerationTask } from "@/lib/generation/generation-request";
import type { AiConfig } from "@/stores/use-config-store";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";

/** 一次生成的目标类型：图片或视频 */
export type StudioKind = "image" | "video";

/** 内置风格预设 id（会话级，见 style-presets.ts） */
export type StudioStylePresetId = "none" | "wuxia-film" | "wuxia-hardlight";

/** 图片生成结果（与生图工作台的 GeneratedImage 对应） */
export type StudioImageResult = {
    kind: "image";
    id: string;
    dataUrl: string;
    storageKey?: string;
    width: number;
    height: number;
    bytes: number;
    durationMs: number;
};

/** 视频生成结果（与视频创作台的 GeneratedVideo 对应） */
export type StudioVideoResult = {
    kind: "video";
    id: string;
    url: string;
    storageKey?: string;
    width: number;
    height: number;
    bytes?: number;
    mimeType?: string;
    durationMs: number;
};

export type StudioResult = StudioImageResult | StudioVideoResult;

/** 会话里的一条消息：用户提问，或一条生成结果（assistant） */
export type StudioMessage = {
    id: string;
    role: "user" | "assistant";
    kind: StudioKind;
    prompt: string;
    references: ReferenceImage[];
    videoReferences: ReferenceVideo[];
    audioReferences: ReferenceAudio[];
    results: StudioResult[];
    status: "pending" | "success" | "failed";
    error?: string;
    /** 视频异步任务句柄；页面刷新后凭它恢复轮询 */
    task?: GuardedVideoGenerationTask;
    /** 发送时应用的风格预设 id（无则省略） */
    stylePreset?: StudioStylePresetId;
    createdAt: number;
};

/** 一个创作会话：一段对话流 + 配置快照 */
export type StudioSession = {
    id: string;
    title: string;
    messages: StudioMessage[];
    config: AiConfig;
    /** 会话级风格预设 id（默认 none） */
    stylePreset?: StudioStylePresetId;
    createdAt: number;
    updatedAt: number;
};

/**
 * 生成指令抽象（v2 导演通道预留）。
 * v1 由对话 UI 直接构造（直连生成）；v2 由 chatbot 输出同一结构，UI 与执行层不动。
 */
export type StudioInstruction = {
    kind: StudioKind;
    prompt: string;
    references: ReferenceImage[];
    videoReferences: ReferenceVideo[];
    audioReferences: ReferenceAudio[];
    config: AiConfig;
};
