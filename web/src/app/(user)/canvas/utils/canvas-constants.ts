// canvas-constants.ts — 画布常量定义

import type { AssetCategory } from "@/stores/use-asset-store";

// ========== 尺寸常量 ==========

export const VIDEO_NODE_MAX_WIDTH = 420;
export const VIDEO_NODE_MAX_HEIGHT = 420;
export const CONNECTION_HANDLE_HIT_RADIUS = 40;
export const CONNECTION_NODE_HIT_PADDING = 32;

// ========== 节点状态常量 ==========

export const NODE_STATUS_IDLE = "idle" as const;
export const NODE_STATUS_LOADING = "loading" as const;
export const NODE_STATUS_SUCCESS = "success" as const;
export const NODE_STATUS_ERROR = "error" as const;

// ========== 其他常量 ==========

export const DIRECTOR_DESK_URL = process.env.NEXT_PUBLIC_DIRECTOR_DESK_URL || "/director-desk/";
export const AUTO_ARCHIVE_CATEGORIES = new Set<AssetCategory>(["character", "character-turnaround", "scene", "style", "storyboard", "keyframe", "video-shot", "template"]);

export const IMAGE_PROMPT_REVERSE_PRESET = `请根据参考图片反推一段适合用于 AI 生图的提示词。

要求：
1. 只输出提示词正文，不要解释。
2. 覆盖主体、构图、风格、光线、色彩、材质、镜头和氛围。
3. 尽量写成可直接用于生图模型的完整提示词。`;
