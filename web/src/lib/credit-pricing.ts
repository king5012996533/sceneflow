/**
 * 积分定价（内置草案 + 后台全局默认 + 逐模型覆盖）与平台成本估算。
 *
 * 三层取值优先级：
 * 1. 逐模型定价（后台「平台密钥 → 逐模型定价」，按模型名精确匹配）
 * 2. 全局默认定价（后台「运营配置」，图片/视频/音频/文本各一条；未配置 = 跳过本层）
 * 3. 内置草案（本文件硬编码，仅为兜底初始值）
 *
 * ⚠️ 视频按「条」计费（与上游结算口径一致）：每条固定积分，与时长无关。
 * Phase 2 上线后必须按 GenerationJob.costCents 实账校准（D4）。
 * 本模块为纯函数（无 DB/服务端依赖），客户端预检、成本展示与服务端扣费共用。
 */

export type GenerationKind = "image" | "video" | "audio" | "text" | "tool";

/** 单个模型的后台可配置积分定价（全部可选，留空 = 该项走全局默认/内置草案） */
export type ModelPricing = {
    /** 每张图片扣积分 */
    imageCredits?: number;
    /** 每条视频扣积分（按条计费，与时长无关） */
    videoCredits?: number;
    /** 每次音频扣积分 */
    audioCredits?: number;
    /** 每次文本/工具调用扣积分 */
    textCredits?: number;
};

/** 全局默认定价（后台「运营配置」读取，逐模型定价之下、内置草案之上） */
export type PricingDefaults = {
    imageCredits?: number;
    videoCredits?: number;
    audioCredits?: number;
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

/**
 * 单次生成消耗积分（admin 跳过计费，调用方自行处理）。
 * 取值优先级：configured（后台逐模型定价）> defaults（后台全局默认）> 内置草案。
 * 视频按条计费：每条固定积分，与时长无关。
 */
export function getGenerationCreditsCost(kind: GenerationKind, metadata?: GenerationMetadata, configured?: ModelPricing, defaults?: PricingDefaults): number {
    const model = modelName(metadata);
    switch (kind) {
        case "image": {
            if (configured?.imageCredits !== undefined) return Math.max(0, Math.floor(configured.imageCredits));
            if (defaults?.imageCredits !== undefined) return Math.max(0, Math.floor(defaults.imageCredits));
            if (model.includes("gpt-image") || model.includes("dall-e")) return 10;
            if (model.includes("minimax") || model.includes("hailuo") || model.includes("h3")) return 1;
            return 2;
        }
        case "video": {
            if (configured?.videoCredits !== undefined) return Math.max(0, Math.floor(configured.videoCredits));
            if (defaults?.videoCredits !== undefined) return Math.max(0, Math.floor(defaults.videoCredits));
            if (model.includes("seedance") || model.includes("doubao")) return isHighQuality(metadata) ? 30 : 15;
            if (model.includes("replicate") || model.includes("/")) return 20;
            return 15;
        }
        case "audio":
            if (configured?.audioCredits !== undefined) return Math.max(0, Math.floor(configured.audioCredits));
            if (defaults?.audioCredits !== undefined) return Math.max(0, Math.floor(defaults.audioCredits));
            return 1;
        case "text":
        case "tool":
            // 对话/工具类默认不计积分（沿用 agent-lab 的每日配额逻辑）；后台可配
            if (configured?.textCredits !== undefined) return Math.max(0, Math.floor(configured.textCredits));
            if (defaults?.textCredits !== undefined) return Math.max(0, Math.floor(defaults.textCredits));
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
