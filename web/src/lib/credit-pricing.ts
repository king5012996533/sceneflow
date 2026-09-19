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

import { applyImageQualityPricing, applyImageResolutionPricing, imageResolutionTier, parseImagePixelSize } from "@/lib/image-resolution";
import type { ImageQuality } from "@/lib/model-capability-spec";

export type GenerationKind = "image" | "video" | "audio" | "text" | "tool";

/** 单个模型的后台可配置积分定价（全部可选，留空 = 该项走全局默认/内置草案） */
export type ModelPricing = {
    /** 每张图片扣积分（= 1K 基础档；未配 2K/4K 专价时，所有档位都按这个价） */
    imageCredits?: number;
    /** 每张 1.5K 图片扣积分（留空 = 沿用 imageCredits。方舟 pro 的 1K 与 1.5K 官方同价，默认不必填） */
    imageCredits15k?: number;
    /** 每张 2K 图片扣积分（留空 = 沿用 imageCredits） */
    imageCredits2k?: number;
    /** 每张 3K 图片扣积分（留空 = 沿用 imageCredits。方舟 lite 一口价，默认不必填） */
    imageCredits3k?: number;
    /** 每张 4K 图片扣积分（留空 = 沿用 imageCredits） */
    imageCredits4k?: number;
    /**
     * 画质档位轴模型的逐档价（键 = 上游 quality 取值）。只对「标了 qualityTiers」的模型生效。
     *
     * 为什么需要它：上游六个画质档的成本跨度是 50 倍（$0.012 → $0.50），
     * 而 1K/2K/4K 三个桶最多只能表达三档，硬塞进去必然有的档位赔钱
     * （实测：极高 $0.25、最高 $0.50、自动也是 $0.25，全都挤在「4K 桶」里按最贵的收还不够）。
     *
     * 口径：低档 = 基础价 imageCredits；本表里**填了的档位按本表扣**，没填的档位回落到基础价。
     * 只要本表存在（哪怕只填一档），该模型就整条走画质档计价，不再看 2K/4K 桶 ——
     * 免得后台看不见的桶在背后生效，对不上账。
     */
    imageQualityCredits?: Partial<Record<ImageQuality, number>>;
    /** 每条视频扣积分（按条计费，与时长无关）。统一档，兼容旧配置；配了分档时被分档覆盖 */
    videoCredits?: number;
    /** 每条标准分辨率视频扣积分（768P/720p/480p 等），优先于 videoCredits */
    videoCreditsStandard?: number;
    /** 每条高清视频扣积分（2K/1080p 等，按 vquality 判定），优先于 videoCredits */
    videoCreditsHigh?: number;
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

/** 图片基础档的内置草案价（后台没配任何价时的兜底，与过去的分支完全一致） */
function imageBaseDraftCredits(model: string): number {
    if (model.includes("gpt-image") || model.includes("dall-e")) return 10;
    if (model.includes("minimax") || model.includes("hailuo") || model.includes("h3")) return 1;
    // 方舟 Seedream 5.0：官方 0.22–0.60 元/张（口径见 estimateGenerationCostCents），草案给 6 积分（≈¥0.60）。
    // 没这一条就会落到最后的 2 积分（¥0.20）—— 那是 pro 2K（¥0.60）的三分之一，每出一张赔一张。
    if (/seedream-5[.-]0/.test(model)) return 6;
    return 2;
}

function isHighQuality(metadata?: GenerationMetadata): boolean {
    const vquality = String(metadata?.vquality || "");
    // 仅看视频分辨率字段判定高清档（2K / 1080p / 显式 high）。
    // ⚠️ 不要读 metadata.quality：那是「图片清晰度」（auto/high/...），视频任务会经
    // buildNodeGenerationConfig 回退到全局图片设置，若参与判定，图片选了「高质量」的用户
    // 生成 768P 视频也会被误按高清档扣费（预览只传 vquality，显示与实扣不一致）。
    return vquality.toLowerCase().includes("2k") || vquality === "high" || vquality.includes("1080");
}

/**
 * 单次生成消耗积分（admin 跳过计费，调用方自行处理）。
 * 取值优先级：configured（后台逐模型定价）> defaults（后台全局默认）> 内置草案。
 * 视频按条计费：每条固定积分，与时长无关。
 * 图片两条口径：
 *   - 画质档位轴模型（配了 imageQualityCredits）：按用户选的 quality 逐档扣，未填的档位回落基础价；
 *   - 其余模型：按分辨率档位（1K/2K/4K）扣，档位由 metadata 的 size/quality 判定（见 image-resolution.ts），
 *     2K/4K 未单独定价时沿用 1K 基础价 —— 后台不配 = 行为与过去完全一致。
 */
export function getGenerationCreditsCost(kind: GenerationKind, metadata?: GenerationMetadata, configured?: ModelPricing, defaults?: PricingDefaults): number {
    const model = modelName(metadata);
    switch (kind) {
        case "image": {
            const quality = String(metadata?.quality ?? "")
                .trim()
                .toLowerCase();
            // 画质档位轴：逐档价优先，未填的档位回落基础价（低档本身就是基础价）
            const tierPrices = configured?.imageQualityCredits;
            if (tierPrices && Object.keys(tierPrices).length) {
                let qualityBase: number;
                if (configured?.imageCredits !== undefined) qualityBase = configured.imageCredits;
                else if (defaults?.imageCredits !== undefined) qualityBase = defaults.imageCredits;
                else qualityBase = imageBaseDraftCredits(model);
                return applyImageQualityPricing(quality, tierPrices, qualityBase);
            }
            // 分辨率分档：先取基础价（= 1K 价，逐模型 > 全局默认 > 内置草案），再套 2K/4K 专价
            const tier = imageResolutionTier(String(metadata?.size ?? ""), String(metadata?.quality ?? ""));
            let baseCredits: number;
            if (configured?.imageCredits !== undefined) baseCredits = configured.imageCredits;
            else if (defaults?.imageCredits !== undefined) baseCredits = defaults.imageCredits;
            else baseCredits = imageBaseDraftCredits(model);
            return applyImageResolutionPricing(tier, configured, baseCredits);
        }
        case "video": {
            if (configured?.videoCredits !== undefined || configured?.videoCreditsStandard !== undefined || configured?.videoCreditsHigh !== undefined) {
                // 逐模型分档定价：高清档（2K/1080p）/ 标准档（768P/720p 等）优先，统一档兜底
                if (isHighQuality(metadata) && configured.videoCreditsHigh !== undefined) return Math.max(0, Math.floor(configured.videoCreditsHigh));
                if (!isHighQuality(metadata) && configured.videoCreditsStandard !== undefined) return Math.max(0, Math.floor(configured.videoCreditsStandard));
                if (configured.videoCredits !== undefined) return Math.max(0, Math.floor(configured.videoCredits));
            }
            if (defaults?.videoCredits !== undefined) return Math.max(0, Math.floor(defaults.videoCredits));
            // GenVideo（ai-genvideo.com）：上游约 5 积分/条（2.0 / 2.5 同价），正式定价在后台逐模型配置
            if (model.includes("genvideo")) return 20;
            // MiniMax H3（秘塔）：768P ≈ ¥0.19/秒、2K ≈ ¥0.29/秒；15 秒 2K 约 ¥4.35
            if (model.includes("minimax") || model.includes("h3")) return isHighQuality(metadata) ? 40 : 20;
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

/**
 * 上游按画质档计价的模型（Replicate 的 gpt-image-2.5-flare）的单张成本，单位：分（人民币）。
 *
 * 来源：模型页公开价目表（per output image），按 1 美元 ≈ 7.1 元折算 ——
 * low $0.012 / medium $0.047 / high $0.128 / xhigh $0.25 / max $0.50，
 * 而 **auto 与 xhigh 同价（$0.25）**：上游把「自动」也按这个价收。
 * 不按档估的话后台「成本 / 毛利」那一页会严重失真（原先是所有图片一律 30 分）。
 */
const FLARE_QUALITY_COST_CENTS: Partial<Record<ImageQuality, number>> = {
    low: 9,
    medium: 33,
    high: 91,
    xhigh: 178,
    max: 355,
    auto: 178,
};

/**
 * 不做画质档、一口价按张卖的模型（Replicate 上的固定价模型）单张成本，单位：分（人民币）。
 *
 * 来源：模型页公开价目表（per output image / 打包价），按 1 美元 ≈ 7.1 元折算：
 *   recraft-ai/recraft-v4-pro —— $0.25/张（模型页写「40 张 10 美元」）→ 178 分。
 * 这类模型没有档位可选（上游不认 quality），所以是一张成本；漏了它会被算成默认的 10 分，
 * 后台「成本 / 毛利」与日报会低估 2 倍以上。
 */
const FLAT_IMAGE_COST_CENTS: ReadonlyArray<{ pattern: RegExp; cents: number }> = [{ pattern: /recraft-v4-pro/i, cents: 178 }];

/**
 * 方舟 Seedream 5.0（火山方舟官方）的单张成本，单位：分（人民币）。
 *
 * 来源：官方《模型价格》「图片生成模型」表（2026-09-19 抓取）—— **按张计价，且按输出像素分档**：
 *   pro —— ≤ 261 万像素（1K/1.5K）0.30 元/张（30 分）；> 261 万像素（2K）0.60 元/张（60 分）；
 *          输入参考图首张免费、第 2 张起 0.02 元/张（上限 10 张 → 输入侧最多再加 18 分）。
 *   lite —— 0.22 元/张（22 分，2K/3K/4K 同价），输入参考图免费。
 * 按**实际像素**判档而不是按 1K/2K/4K 桶：pro 的 2K 里 16:9 是 2048x1152（2.36MP ≤ 261 万）上游只收 30 分，
 * 按档位估会把成本多算一倍 —— 这张表是拿来对账的，宁可算准。
 * 中转站上同名的 seedream-5-0 也按这套官方价估（上游档位一致，误差可接受）。
 */
const ARK_SEEDREAM_PRO_PIXEL_BOUNDARY = 2_610_000;

function arkSeedreamCostCents(model: string, metadata?: GenerationMetadata): number {
    // lite 不分像素档，参考图也不另收
    if (!model.includes("pro")) return 22;
    const size = String(metadata?.size ?? "");
    const dimensions = parseImagePixelSize(size);
    // 没给像素（比例串 / auto）时退回档位判：落进 2K 就按贵的那档算，宁可高估成本
    const highBand = dimensions ? dimensions.width * dimensions.height > ARK_SEEDREAM_PRO_PIXEL_BOUNDARY : imageResolutionTier(size, String(metadata?.quality ?? "")) !== "1k";
    const references = Math.max(0, Math.floor(Number(metadata?.referenceCount) || 0));
    return (highBand ? 60 : 30) + Math.max(0, references - 1) * 2;
}

/** 平台单次生成的估算成本（分），供对账与定价校准（公开价粗估） */
export function estimateGenerationCostCents(kind: GenerationKind, metadata?: GenerationMetadata): number | null {
    const model = modelName(metadata);
    switch (kind) {
        case "image": {
            // 方舟 Seedream 5.0：官方按张 + 像素档计价（见 arkSeedreamCostCents）
            if (/seedream-5[.-]0/.test(model)) return arkSeedreamCostCents(model, metadata);
            if (/gpt-image-2\.5-flare/.test(model)) {
                const quality = String(metadata?.quality ?? "")
                    .trim()
                    .toLowerCase();
                const cost = FLARE_QUALITY_COST_CENTS[quality as ImageQuality];
                if (typeof cost === "number") return cost;
            }
            const flat = FLAT_IMAGE_COST_CENTS.find((item) => item.pattern.test(model));
            if (flat) return flat.cents;
            if (model.includes("gpt-image") || model.includes("dall-e")) return 30;
            if (model.includes("minimax") || model.includes("hailuo") || model.includes("h3")) return 2;
            return 10;
        }
        case "video": {
            if (model.includes("genvideo")) return 30;
            if (model.includes("seedance") || model.includes("doubao")) return isHighQuality(metadata) ? 80 : 40;
            if (model.includes("replicate")) return 100;
            if (model.includes("minimax") || model.includes("h3")) return isHighQuality(metadata) ? 70 : 40;
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
