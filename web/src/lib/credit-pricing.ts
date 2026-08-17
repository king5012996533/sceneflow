/**
 * 积分定价表（草案）与平台成本估算。
 *
 * ⚠️ 数值为初始草案，Phase 2 上线后必须按 GenerationJob.costCents 实账校准（D4）。
 * 定价原则：积分成本 = ceil(平台成本(分) / 单积分价格(分) × 毛利系数)，保证毛利为正。
 */

export type GenerationKind = "image" | "video" | "audio" | "text" | "tool";

type GenerationMetadata = Record<string, unknown>;

function modelName(metadata?: GenerationMetadata): string {
    return String(metadata?.model || metadata?.imageModel || metadata?.videoModel || metadata?.textModel || "").toLowerCase();
}

function isHighQuality(metadata?: GenerationMetadata): boolean {
    const vquality = String(metadata?.vquality || "");
    const quality = String(metadata?.quality || "");
    return vquality === "high" || vquality.includes("1080") || quality === "hd" || quality === "high";
}

/** 单次生成消耗积分（admin 跳过计费，调用方自行处理） */
export function getGenerationCreditsCost(kind: GenerationKind, metadata?: GenerationMetadata): number {
    const model = modelName(metadata);
    switch (kind) {
        case "image": {
            if (model.includes("gpt-image") || model.includes("dall-e")) return 10;
            if (model.includes("minimax") || model.includes("hailuo") || model.includes("h3")) return 1;
            return 2;
        }
        case "video": {
            if (model.includes("seedance") || model.includes("doubao")) return isHighQuality(metadata) ? 30 : 15;
            if (model.includes("replicate") || model.includes("/")) return 20;
            if (model.includes("minimax") || model.includes("h3")) return 15;
            return 15;
        }
        case "audio":
            return 1;
        case "text":
        case "tool":
            // 对话/工具类暂不计积分（沿用 agent-lab 的每日配额逻辑）
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
