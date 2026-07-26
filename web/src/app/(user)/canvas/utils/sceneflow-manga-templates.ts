// sceneflow-manga-templates.ts — SceneFlow 漫剧流水线模板包
//
// 本文件是"提示词库 + Agent 模板"，不侵入流水线内核。
// 所有模板定义只做两件事：
//   1. 定义结构化数据的 TypeScript 类型
//   2. 提供预置的模板常量和字段映射
//
// Agent 可以在生成 SceneFlow 节点时引用这些模板来构建:
//   Text 节点 → 剧情梗概 / 剧本
//   Config 节点 → 图片/视频生成参数
//   分镜数据 → 通过 node.metadata.shotPack 存储
//   Video 节点 → Seedance 续帧/镜头生成
//
// 与 CanvasNodeMetadata 字段的映射关系见配套文档。

import type { CanvasNodeMetadata, CanvasShotPackShot } from "../types";
import { CanvasNodeType } from "../types";

// ========== 类型定义 ==========

/** 漫剧赛道类型 */
export type MangaGenre = "power-fantasy" | "sweet-romance" | "suspense" | "comedy";

/** 漫剧赛道的中文标签 */
export const MANGA_GENRE_LABELS: Record<MangaGenre, string> = {
  "power-fantasy": "爽文",
  "sweet-romance": "甜宠",
  "suspense": "悬疑",
  "comedy": "搞笑",
};

/** 目标平台 */
export type TargetPlatform = "douyin" | "kuaishou" | "bilibili" | "xiaohongshu";

/** AI 工具偏好 */
export type AiToolPreference = "seedance-2" | "midjourney" | "stable-diffusion" | "flux" | "comfyui";

// ========== 1. 节奏模型 ==========

/** 一个赛道节奏模型的完整定义 */
export interface RhythmModel {
  /** 节奏公式 */
  formula: string;
  /** 阶段划分 */
  phases: Array<{
    name: string;
    duration: string;
    description: string;
  }>;
  /** 核心爽感来源 */
  coreSatisfaction: string;
}

/** 四大赛道节奏模型 */
export const MANGA_RHYTHM_MODELS: Record<MangaGenre, RhythmModel> = {
  "power-fantasy": {
    formula: "压抑 → 揭晓/觉醒 → 降维打击",
    phases: [
      { name: "开局受辱", duration: "0-3秒", description: "主角被碾压，制造情绪压抑" },
      { name: "持续受压", duration: "3-23秒", description: "压力累积，观众期待反转" },
      { name: "身份揭晓", duration: "23-28秒", description: "第一个反转信号" },
      { name: "碾压反击", duration: "28-60秒", description: "降维打击，释放爽感" },
    ],
    coreSatisfaction: "反差+碾压。压得越狠，爆发越爽",
  },
  "sweet-romance": {
    formula: "误会/试探 → 心动瞬间 → 确认心意",
    phases: [
      { name: "日常破冰", duration: "0-3秒", description: "日常场景切入，快速代入" },
      { name: "意外亲密", duration: "3-18秒", description: "肢体/眼神意外接触" },
      { name: "心动暗示", duration: "18-38秒", description: "暧昧积累，微表情推拉" },
      { name: "甜蜜高光", duration: "38-60秒", description: "关系确认或甜蜜高潮" },
    ],
    coreSatisfaction: "心跳加速的粉红泡泡感，靠微表情和暧昧距离",
  },
  "suspense": {
    formula: "异常 → 追查 → 真相比想象更恐怖",
    phases: [
      { name: "诡异画面", duration: "0-3秒", description: "反常现象直接开场" },
      { name: "线索拼图", duration: "3-33秒", description: "主角发现线索，层层推进" },
      { name: "第一层真相", duration: "33-43秒", description: "以为真相已现" },
      { name: "终极反转", duration: "43-60秒", description: "揭露更大阴谋" },
    ],
    coreSatisfaction: "认知颠覆。让观众以为自己猜到了，然后打脸",
  },
  "comedy": {
    formula: "正经铺垫 → 荒诞转折 → 连环打脸",
    phases: [
      { name: "正常场景", duration: "0-3秒", description: "建立正经氛围" },
      { name: "第一个包袱", duration: "3-13秒", description: "引入荒诞元素" },
      { name: "递进", duration: "13-28秒", description: "笑点升级，连环打脸" },
      { name: "终极反转", duration: "28-40秒", description: "最大笑点收尾" },
    ],
    coreSatisfaction: "预期违背。越正经的铺垫，越离谱的转折",
  },
};

// ========== 2. 角色卡模板 ==========

/** 角色情绪的表情-标签映射 */
export interface EmotionExpression {
  anger: string[];
  cold: string[];
  surprise: string[];
  sweet: string[];
  cry: string[];
}

/** 角色设定卡的完整字段 */
export interface CharacterCard {
  name: string;
  archetype: string;
  personalityHighlights: string[];
  personalityFlaw: string;
  visualAnchors: {
    hair: string;
    facialFeatures: string[];
    bodyType: string;
    signatureItem: string;
  };
  /** AI 英文标签组 —— 所有分镜强制复用 */
  aiTags: {
    gender: string;
    hair: string;
    eyes: string;
    clothing: string;
    distinctiveFeature: string;
    bodyType: string;
  };
  /** 情绪表情标签库（英文） */
  emotionExpressions: EmotionExpression;
}

/** 默认情绪标签库（可从任何角色卡引用） */
export const DEFAULT_EMOTION_LABELS: EmotionExpression = {
  anger: ["clenched jaw", "furrowed brows", "veins on forehead"],
  cold: ["half-lidded eyes", "slight smirk", "relaxed posture"],
  surprise: ["wide eyes", "parted lips", "leaning back"],
  sweet: ["soft smile", "blushing cheeks", "gentle gaze"],
  cry: ["teary eyes", "trembling lips", "looking down"],
};

// ========== 3. 分镜头字段规范 ==========

/** 一个分镜条目的完整字段 */
export interface StoryboardShot extends CanvasShotPackShot {
  /** 镜头景别 */
  shotSize?: "大远景" | "远景" | "全景" | "中景" | "近景" | "特写" | "大特写";
  /** 时间戳 */
  timeCode?: string;
  /** 光影氛围描述 */
  lighting?: string;
  /** 台词内容 */
  line?: string;
  /** 台词情绪标签 */
  lineEmotion?: string;
  /** 转场效果 */
  transition?: "硬切" | "溶解" | "推入" | "缩放" | "闪白" | "闪黑" | "甩镜";
  /** 画面内动效 */
  motionEffect?: string;
  /** 构图类型 */
  composition?: string;
  /** AI 提示词（已适配目标工具格式） */
  aiPrompt?: string;
}

/** 分镜表结构 */
export interface StoryboardTable {
  episodeTitle: string;
  genre: MangaGenre;
  shots: StoryboardShot[];
}

// ========== 4. Agent 提示词模板 ==========

/**
 * Agent 提示词构建器：短剧/故事 → 漫剧脚本
 *
 * 用法: Agent 将用户输入 + 此模板 → 生成符合 SceneFlow 节点结构的输出
 */
export function buildScriptGenerationPrompt(input: {
  topic: string;
  genre?: MangaGenre;
  platform?: TargetPlatform;
  characters?: Array<{ name: string; description: string }>;
}): string {
  const genreLabel = input.genre ? MANGA_GENRE_LABELS[input.genre] : "自动判断";
  const model = MANGA_RHYTHM_MODELS[input.genre || "power-fantasy"];
  return [
    `## 漫剧脚本生成任务`,
    ``,
    `### 输入`,
    `主题: ${input.topic}`,
    `赛道: ${genreLabel}`,
    `平台: ${input.platform || "抖音"}`,
    input.characters?.length ? `角色: ${input.characters.map((c) => `${c.name}(${c.description})`).join("、")}` : "",
    ``,
    `### 节奏模型`,
    `公式: ${model.formula}`,
    ...model.phases.map((p) => `- ${p.name}(${p.duration}): ${p.description}`),
    `核心爽感: ${model.coreSatisfaction}`,
    ``,
    `### 输出要求`,
    `1. 角色设定卡: 每个角色含视觉锚点 + AI英文标签组 + 情绪表情库`,
    `2. 单集脚本: 500字以内, 每10秒一个小高潮, 所有情感具象化为动作`,
    `3. 时间轴标注: 格式 [场景N] HH:MM-HH:MM（景别 | 光影）`,
    `4. 台词控制在15字以内, 标注情绪`,
    `5. 结尾必须有悬念钩子 + 下集预告`,
    ``,
    `### 输出格式（SceneFlow节点映射）`,
    `- 角色设定 → metadata中的 consistencyNotes 字段`,
    `- AI标签组 → metadata 中自行组装`,
    `- 分镜表 → metadata.shotPack 的 shots 数组`,
    `- 生成参数 → Config 节点的 metadata`,
  ].filter(Boolean).join("\n");
}

// ========== 5. Seedance 2.0 提示词模板 ==========

/**
 * Seedance 2.0 视频分镜提示词构建器
 *
 * Seedance 使用中文自然语言, @图片N 引用参考图, 时间戳分镜控制.
 * 每段 ≤15秒, 提示词总字数 ≤2000字.
 */
export interface SeedanceSegment {
  /** 片段序号 */
  segmentIndex: number;
  /** 时长（秒） */
  duration: number;
  /** @图片引用 */
  referenceImageTag: string;
  /** 时间戳分镜 */
  timestampBreakdown: Array<{
    range: string;
    visual: string;
    camera: string;
  }>;
  /** 台词 */
  dialogue: Array<{
    character: string;
    emotion: string;
    line: string;
  }>;
  /** 音效 */
  soundEffects: string[];
  /** 衔接描述（上一段结尾状态） */
 衔接点?: string;
}

/** 将 SeedanceSegment 渲染为完整提示词文本 */
export function renderSeedancePrompt(segment: SeedanceSegment): string {
  const lines: string[] = [];

  // 风格总纲
  lines.push(`[风格/画质总纲]，${segment.referenceImageTag} + [场景环境]`);
  lines.push("");

  // 时间戳分镜
  for (const ts of segment.timestampBreakdown) {
    lines.push(`${ts.range}：${ts.visual}，${ts.camera}`);
  }
  lines.push("");

  // 台词
  for (const d of segment.dialogue) {
    lines.push(`${d.character}（${d.emotion}）："${d.line}"`);
  }
  if (segment.dialogue.length > 0) lines.push("");

  // 音效
  if (segment.soundEffects.length > 0) {
    lines.push(`音效：${segment.soundEffects.join("，")}`);
    lines.push("");
  }

  // 衔接点
  if (segment.衔接点) {
    lines.push(`衔接点：${segment.衔接点}`);
    lines.push("");
  }

  lines.push(`时长：${segment.duration}秒`);
  lines.push("禁止：文字、字幕、LOGO、水印");

  return lines.join("\n");
}

// ========== 6. AI 工具适配模板 ==========

/** AI 工具适配信息 */
export interface AiToolAdapter {
  name: string;
  /** 提示词语言 */
  promptLanguage: "zh" | "en";
  /** 提示词格式描述 */
  formatDescription: string;
  /** 宽高比参数 */
  aspectRatioFlag: string;
  /** 额外参数 */
  extraFlags?: string;
}

/** 适配规则表 */
export const AI_TOOL_ADAPTERS: Record<AiToolPreference, AiToolAdapter> = {
  "seedance-2": {
    name: "Seedance 2.0",
    promptLanguage: "zh",
    formatDescription: "中文自然语言，时间戳分镜，@图片N引用，台词用引号，音效单独成行",
    aspectRatioFlag: "9:16",
    extraFlags: "单段≤15秒，总提示词≤2000字，结尾加禁止项",
  },
  "midjourney": {
    name: "Midjourney",
    promptLanguage: "en",
    formatDescription: "自然语言英文描述",
    aspectRatioFlag: "--ar 9:16",
    extraFlags: "--s 750 --niji 6",
  },
  "stable-diffusion": {
    name: "Stable Diffusion / ComfyUI",
    promptLanguage: "en",
    formatDescription: "标签式英文，负面提示词单独列出",
    aspectRatioFlag: "9:16",
    extraFlags: "DPM++ 2M Karras, Steps: 28-35, CFG: 7-8",
  },
  "flux": {
    name: "Flux",
    promptLanguage: "en",
    formatDescription: "自然语言描述，侧重场景叙述",
    aspectRatioFlag: "9:16",
  },
  "comfyui": {
    name: "ComfyUI",
    promptLanguage: "en",
    formatDescription: "标签式英文，负面提示词单独列出",
    aspectRatioFlag: "9:16",
    extraFlags: "同 Stable Diffusion，建议附简易工作流说明",
  },
};

// ========== 7. 通用负面提示词 ==========

/** 适用于 SD/MJ 的通用负面提示词 */
export const DEFAULT_NEGATIVE_PROMPT = [
  "(worst quality:1.4)",
  "(low quality:1.4)",
  "deformed",
  "bad anatomy",
  "extra limbs",
  "missing fingers",
  "blurry",
  "watermark",
  "text",
  "signature",
  "multiple views",
  "inconsistent design",
].join(", ");

// ========== 8. 三个入口的 Agent Prompt 模板 ==========

/**
 * 入口1: 短剧 → 漫剧转换
 */
export function buildShortVideoToMangaPrompt(shortScript: string): string {
  return [
    `## 短剧转漫剧任务`,
    ``,
    `将以下短剧脚本转换为漫剧格式。`,
    `要求:`,
    `- 保留原剧情线和核心冲突`,
    `- 补全角色视觉锚点和AI标签`,
    `- 按节奏模型重新分配时间轴`,
    `- 每10秒一个小高潮`,
    `- 输出格式: 角色卡 + 单集脚本 + 分镜表`,
    ``,
    `### 原始短剧脚本`,
    shortScript,
  ].join("\n");
}

/**
 * 入口2: 小说片段 → 分镜表
 */
export function buildNovelToStoryboardPrompt(excerpt: string): string {
  return [
    `## 小说片段转分镜任务`,
    ``,
    `将以下小说片段转化为AI分镜表。`,
    `要求:`,
    `- 所有情感描写必须具象化为可视动作`,
    `- 每个场景标注景别和光影`,
    `- 台词控制在15字以内`,
    `- 输出格式: 分镜表格（# | 时间 | 景别 | 画面描述 | 台词 | 转场 | AI提示词）`,
    `- 自动判断赛道类型并应用对应节奏模型`,
    ``,
    `### 小说片段`,
    excerpt,
  ].join("\n");
}

/**
 * 入口3: 角色设定 + 剧情梗概 → 分集脚本
 */
export function buildOutlineToEpisodePrompt(梗概: string, characters: CharacterCard[]): string {
  const characterSection = characters.map((c) =>
    [
      `角色: ${c.name}`,
      `  类型: ${c.archetype}`,
      `  视觉锚点: ${c.visualAnchors.hair}, ${c.visualAnchors.signatureItem}`,
      `  AI标签: ${Object.values(c.aiTags).join(", ")}`,
    ].join("\n")
  ).join("\n");

  return [
    `## 剧情梗概 → 分集脚本任务`,
    ``,
    `### 剧情梗概`,
   梗概,
    ``,
    `### 角色设定`,
    characterSection,
    ``,
    `### 要求`,
    `- 第1集包含: 黄金开局(前3秒) + 中段密度 + 结尾钩子`,
    `- 自动选择赛道节奏模型`,
    `- 每集500字以内`,
    `- 输出: 分集标题 + 场景脚本 + 分镜表 + 下集预告`,
  ].join("\n");
}
