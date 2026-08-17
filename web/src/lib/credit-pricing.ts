/**
 * 积分定价（内置草案 + 后台可配置覆盖）与平台成本估算。
 *
 * ⚠️ 内置数值为初始草案。后台可在「平台密钥 → 逐模型定价」按模型覆盖：
 * 图片每张、视频每秒、音频每次、文本/工具每次；未配置的模型退回此处草案。
 * Phase 2 上线后必须按 GenerationJob.costCents 实账校准（D4）。
 * 定价原则：积分成本 = ceil(平台成本(分) / 单积分价格(分) × 毛利系数)，保证毛利为正。
 * 本模块为纯函数（无 DB/服务端依赖），客户端预检、成本展示与服务端扣费共用。
 */

export type GenerationKind = "image" | "video" | "audio" | "text" | "tool";

/** 单个模型的后台可配置积分定价（全部可选，留空 = 该项走内置草案） */
export type ModelPricing = {
    /** 每张图片扣积分 */
    imageCredits?: number;
    /** 视频每秒扣积分（实际扣费 = 每秒 × 计费时长，向上取整） */
    videoCreditsPerSecond?: number;
    /** 每次音频扣积分 */
    audioCredits?: number;
    /** 每次文本/工具调用扣积分 */
    textCredits?: number;
};

/** 逐模型定价表（ProviderCredential.pricing，key = 模型名，与 capabilities 一致） */
export type CredentialPricing = Record<string, ModelPricing>;

type GenerationMetadata = Record<string, unknown>;

/** 本次生成实际使用的模型名（原样保留大小写，供定价表按精确模型名匹配） */
export function generationModel(metadata?: GenerationMetadata): string {
    return String(metadata?.model || metadata?.imageModel || metadata?.videoModel || metadata?.textModel || "");
}

/** 模型名小写（内置草案的模型名启发式匹配用） */
export function modelName(metadata?: GenerationMetadata): string {
    return generationModel(metadata).toLowerCase();
}

function isHighQuality(metadata?: GenerationMetadata): boolean {
    const vquality = String(metadata?.vquality || "");
    const quality = String(metadata?.quality || "");
    return vquality === "high" || vquality.includes("1080") || quality === "hd" || quality === "high";
}

/** 视频计费时长（秒）：videoSeconds 正整数取整；-1（seedance 自动时长）/ 非法 / 缺失 → 按 6 秒计（草案常数，可调） */
export function effectiveVideoSeconds(metadata?: GenerationMetadata): number {
    const raw = Math.floor(Number(metadata?.videoSeconds));
    if (Number.isFinite(raw) && raw > 0) return Math.max(1, Math.min(60, raw));
    return 6;
}

/**
 * 单次生成消耗积分（admin 跳过计费，调用方自行处理）。
 * configured 为后台逐模型定价（命中优先），未命中走内置草案。
 */
export function getGenerationCreditsCost(kind: GenerationKind, metadata?: GenerationMetadata, configured?: ModelPricing): number {
    const model = modelName(metadata);
    switch (kind) {
        case "image": {
            if (configured?.imageCredits !== undefined) return Math.max(0, Math.floor(configured.imageCredits));
            if (model.includes("gpt-image") || model.includes("dall-e")) return 10;
            if (model.includes("minimax") || model.includes("hailuo") || model.includes("h3")) return 1;
            return 2;
        }
        case "video": {
            if (configured?.videoCreditsPerSecond !== undefined) {
                return Math.max(0, Math.ceil(Math.floor(configured.videoCreditsPerSecond) * effectiveVideoSeconds(metadata)));
            }
            if (model.includes("seedance") || model.includes("doubao")) return isHighQuality(metadata) ? 30 : 15;
            if (model.includes("replicate") || model.includes("/")) return 20;
            if (model.includes("minimax") || model.includes("h3")) return 15;
            return 15;
        }
        case "audio":
            if (configured?.audioCredits !== undefined) return Math.max(0, Math.floor(configured.audioCredits));
            return 1;
        case "text":
        case "tool":
            // 对话/工具类默认不计积分（沿用 agent-lab 的每日配额逻辑）；后台可配
            if (configured?.textCredits !== undefined) return Math.max(0, Math.floor(configured.textCredits));
            return 0;
        default:
            return 2;
    }
}

/** 平台单次生成的估算成本（分），供对账与定价校准（公开价粗估） */
export function estimateGenerationCostCents(kind: GenerationKind, metadata?: GenerationMetadata): number | null {
    const model = modelName(metadata);
    switch (kind) {
        case "image": {
            if (model.includes("gpt-image") || model.includes("dall-e")) return 30;
            if (model.includes("minimax") || model.includes("hailuo") || model.includes("h3")) return 2;
            return 10;
        }
        case "video": {
            if (model.includes("seedance") || model.includes("doubao")) return isHighQuality(metadata) ? 80 : 40;
            if (model.includes("replicate")) return 100;
            if (model.includes("minimax") || model.includes("h3")) return 50;
            return 50;
        }
        case "audio":
            return 1;
        case "text":
        case "tool":
            return null;
        default:
            return null;
    }
}
