// image-resolution.ts —— 图片分辨率档位（1K / 2K / 4K）：后台定价与用户面板共用的一把尺子。
//
// 为什么要这把尺子：分辨率只是「带给上游的一个参数」，但价格要按档位分。既然参数是客户端选的，
// 服务端就必须能把「这次请求到底是哪一档」算出来，且算法要保证：
//   后台配了三档价 → 用户选 4K 就按 4K 扣，选 1K 就按 1K 扣，客户端预检与实扣用同一个函数（不会显示 8 实扣 16）。
//
// 判定口径（按「上游实际会被要求画多大」取，而不是按面板上写了什么）：
//   1. size 是像素串（1024x1024 / 3840x2160 / 用户自定义）→ 按总像素分档，见 TIER_*_MIN_PIXELS；
//   2. size 是比例串（16:9）→ 像素由 quality 决定（与 services/api/image.ts 的 resolveSize 同一套口径），
//      所以档位跟着 quality 走，没给档位就是 1K（上游默认短边 1024）；
//   3. size 为空 / auto → 按 1K。上游拿不到尺寸时默认出小图，不能按 quality 多扣用户的钱。
//
// ⚠️ 不要用「最长边」分档：面板上普通 16:9 是 1824x1024（长边 1824），按最长边会被算成 2K，用户选个
// 普通 16:9 就被按 2K 扣费。按面积算：1824x1024=1.87MP→1K、2048x2048=4.19MP→2K、3840x2160=8.29MP→4K。
//
// 本模块为纯函数（无 DB / 网络 / React 依赖），客户端预检、后台编辑与服务端扣费共用。

export type ImageResolutionTier = "1k" | "2k" | "4k";

export const IMAGE_RESOLUTION_TIERS: readonly ImageResolutionTier[] = ["1k", "2k", "4k"];

/**
 * 支持的宽高比词汇（纯比例；分辨率是独立一轴，不写在比例里）。
 * 后台能力标定 / 用户面板的选项清单都由这里派生，避免两处各写一份导致漂移。
 */
export const IMAGE_BASE_ASPECTS = ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "auto"] as const;
export type ImageBaseAspect = (typeof IMAGE_BASE_ASPECTS)[number];

/** 档位选项（后台能力标定 / 逐模型定价 / 用户面板共用） */
export const IMAGE_RESOLUTION_OPTIONS: ReadonlyArray<{ value: ImageResolutionTier; label: string; hint: string }> = [
    { value: "1k", label: "1K", hint: "基础档（短边约 1024）" },
    { value: "2k", label: "2K", hint: "高清档（短边约 1536 / 方形 2048）" },
    { value: "4k", label: "4K", hint: "超清档（长边 3840）" },
];

/** 档位 → 上游 quality 参数（与 services/api/image.ts 的 QUALITY_ALIASES 同一套取值） */
const TIER_QUALITY: Record<ImageResolutionTier, string> = { "1k": "low", "2k": "medium", "4k": "high" };

/** 上游 quality 取值 → 档位（1k/2k/4k 别名与 low/medium/high、standard/hd 同义） */
const QUALITY_TIERS: Record<string, ImageResolutionTier> = {
    "1k": "1k",
    low: "1k",
    standard: "1k",
    "2k": "2k",
    medium: "2k",
    hd: "2k",
    "4k": "4k",
    high: "4k",
};

// 总像素分档阈值：1K < 2.2MP ≤ 2K < 6MP ≤ 4K
const TIER_2K_MIN_PIXELS = 2_200_000;
const TIER_4K_MIN_PIXELS = 6_000_000;

/** 各比例在 1K/2K/4K 下的定值像素（沿用面板既有取值，保证老选择渲染结果不变） */
const CANONICAL_SIZES: Record<string, Partial<Record<ImageResolutionTier, string>>> = {
    "1:1": { "1k": "1024x1024", "2k": "2048x2048" },
    "3:2": { "1k": "1536x1024" },
    "2:3": { "1k": "1024x1536" },
    "4:3": { "1k": "1360x1024" },
    "3:4": { "1k": "1024x1360" },
    "16:9": { "1k": "1824x1024", "2k": "2048x1152", "4k": "3840x2160" },
    "9:16": { "1k": "1024x1824", "2k": "1152x2048", "4k": "2160x3840" },
};

/** 解析 "1024x1024"；不是像素串返回 null */
export function parseImagePixelSize(size?: string): { width: number; height: number } | null {
    const match = String(size ?? "")
        .trim()
        .match(/^(\d+)x(\d+)$/i);
    if (!match) return null;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return null;
    return { width, height };
}

export function resolutionTierFromPixels(width: number, height: number): ImageResolutionTier {
    const pixels = Math.max(0, width) * Math.max(0, height);
    if (pixels >= TIER_4K_MIN_PIXELS) return "4k";
    if (pixels >= TIER_2K_MIN_PIXELS) return "2k";
    return "1k";
}

/** 上游 quality 参数 → 档位；auto/未知返回 undefined */
export function resolutionTierFromQuality(quality?: string): ImageResolutionTier | undefined {
    const value = String(quality ?? "")
        .trim()
        .toLowerCase();
    return value ? QUALITY_TIERS[value] : undefined;
}

export function isImageRatio(size?: string): boolean {
    return String(size ?? "").includes(":");
}

/**
 * 本次请求实际落在哪一档（服务端扣费 / 客户端预检共用，口径必须完全一致）。
 */
export function imageResolutionTier(size?: string, quality?: string): ImageResolutionTier {
    const dimensions = parseImagePixelSize(size);
    if (dimensions) return resolutionTierFromPixels(dimensions.width, dimensions.height);
    // 比例串：像素由 quality 决定（上游按 quality 换算），所以档位跟着 quality 走
    if (isImageRatio(size)) return resolutionTierFromQuality(quality) ?? "1k";
    // auto / 空：上游默认小图，按最低档算，避免多扣
    return "1k";
}

/** 档位 → 上游 quality 参数（比例串 + 档位这种派发方式要用它） */
export function qualityForResolutionTier(tier: ImageResolutionTier): string {
    return TIER_QUALITY[tier];
}

/** 标签（用户面板 / 记录页展示用），如 "2K" */
export function imageResolutionLabel(tier: ImageResolutionTier): string {
    return tier.toUpperCase();
}

/**
 * 某比例在某档位下的定值像素；没有定值的组合返回 null（例如 3:2 @ 2K），
 * 调用方改走「比例串 + 档位 quality」派发，让上游自己按 quality 换算，避免两处各写一套像素公式。
 */
export function canonicalImageSize(ratio: string, tier: ImageResolutionTier): string | null {
    return CANONICAL_SIZES[String(ratio ?? "").trim()]?.[tier] ?? null;
}

/** 该比例下是否存在定值像素（用户面板据此决定要不要显示这一档） */
export function hasCanonicalImageSize(ratio: string, tier: ImageResolutionTier): boolean {
    return canonicalImageSize(ratio, tier) !== null;
}

/** 档位 → 上游 quality 换像素时用的基准边（与 services/api/image.ts 的 QUALITY_BASE 同源：low/medium/high = 1024/2048/2880） */
const TIER_BASE_PIXELS: Record<ImageResolutionTier, number> = { "1k": 1024, "2k": 2048, "4k": 2880 };
const PIXEL_STEP = 16;

/**
 * 合成「比例 × 档位」的像素尺寸（例如 3:2 @ 2K → 2496x1664）。
 *
 * ⚠️ 这套算法与 services/api/image.ts 的 resolveSize 是同一口径（短边=基准边、16 的倍数、按面积铺满），
 * 这里是为了给「上游没给比例」的模型补上明确像素而复制的一份纯计算；
 * 定值组合优先走 canonicalImageSize，改动 image.ts 的换算规则时要同步这里（单测覆盖了边界）。
 */
export function synthesizeImagePixelSize(ratio: string, tier: ImageResolutionTier): string | null {
    const parts = String(ratio ?? "").split(":");
    if (parts.length !== 2) return null;
    const w = Number(parts[0]);
    const h = Number(parts[1]);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    const landscape = w >= h;
    const longRatio = landscape ? w / h : h / w;
    const longSide = Math.floor(Math.sqrt(TIER_BASE_PIXELS[tier] ** 2 * longRatio) / PIXEL_STEP) * PIXEL_STEP;
    const shortSide = Math.max(PIXEL_STEP, Math.round(longSide / longRatio / PIXEL_STEP) * PIXEL_STEP);
    return landscape ? `${longSide}x${shortSide}` : `${shortSide}x${longSide}`;
}

/** 面板取值：定值优先，缺的组合用合成值；"auto" 等非比例串返回 null（表示不指定尺寸） */
export function imageSizeForRatio(ratio: string, tier: ImageResolutionTier): string | null {
    return canonicalImageSize(ratio, tier) ?? synthesizeImagePixelSize(ratio, tier);
}

/** 像素串 → 命中的比例 chip（含合成值）；匹配不到返回 null（用户自定义像素） */
export function ratioForImageSize(size: string): string | null {
    for (const option of ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16"]) {
        for (const tier of IMAGE_RESOLUTION_TIERS) {
            if (imageSizeForRatio(option, tier) === size) return option;
        }
    }
    const dimensions = parseImagePixelSize(size);
    if (!dimensions) return null;
    // 自定义像素：按实际宽高比就近归到某个比例 chip（容差 2%）
    const aspect = dimensions.width / dimensions.height;
    let best: { ratio: string; delta: number } | null = null;
    for (const option of ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16"]) {
        const parts = option.split(":").map(Number);
        const delta = Math.abs(aspect - parts[0] / parts[1]) / (parts[0] / parts[1]);
        if (delta <= 0.02 && (!best || delta < best.delta)) best = { ratio: option, delta };
    }
    return best?.ratio ?? null;
}

/** 面板口径的「自定义像素」哨兵值（比例 chip 一个都不高亮） */
export const CUSTOM_IMAGE_RATIO = "__custom__";

/**
 * 当前 size 落在哪个比例 chip（面板高亮 / 收敛逻辑共用）。
 *
 * 必须同时认两种写法，否则会出事故：
 *   1. 像素串（1024x1024 / 2048x1152）→ 反推比例，推不出来算自定义；
 *   2. 比例串（"1:1"，以及旧配置的 "16:9-2k"）→ 直接就是那个比例。
 * 只认像素串的话，默认配置里的 size="1:1" 会被当成「自定义像素」，
 * 用户一点分辨率档位就被写成 "auto"（尺寸被悄悄丢掉）。
 */
export function imageRatioOf(size?: string): ImageBaseAspect | typeof CUSTOM_IMAGE_RATIO {
    const value = String(size ?? "").trim();
    if (!value || value.toLowerCase() === "auto") return "auto";
    // 比例串（含旧后缀）：按纯比例归类，后缀那部分交给分辨率档位这一轴表达
    const aspect = baseImageAspect(value);
    if (aspect) return aspect;
    if (parseImagePixelSize(value)) {
        const ratio = ratioForImageSize(value);
        return ratio && (IMAGE_BASE_ASPECTS as readonly string[]).includes(ratio) ? (ratio as ImageBaseAspect) : CUSTOM_IMAGE_RATIO;
    }
    return CUSTOM_IMAGE_RATIO;
}

/** 从允许档位里挑一个最接近当前档位的（只降不升，避免自动收敛时悄悄给用户涨价） */
export function nearestAllowedTier(current: ImageResolutionTier, allowed: readonly ImageResolutionTier[]): ImageResolutionTier {
    const list = allowed.length ? allowed : IMAGE_RESOLUTION_TIERS;
    if (list.includes(current)) return current;
    const rank = (tier: ImageResolutionTier) => IMAGE_RESOLUTION_TIERS.indexOf(tier);
    const lower = list.filter((tier) => rank(tier) <= rank(current));
    if (lower.length) return lower.reduce((best, tier) => (rank(tier) > rank(best) ? tier : best));
    return list.reduce((best, tier) => (rank(tier) < rank(best) ? tier : best));
}

/** 把任意输入收敛成合法档位清单（后台清洗 / 旧数据兼容共用），按 1K→2K→4K 固定顺序 */
export function normalizeResolutionTiers(input: unknown): ImageResolutionTier[] {
    if (!Array.isArray(input)) return [...IMAGE_RESOLUTION_TIERS];
    const picked = new Set(input.map((item) => String(item).trim().toLowerCase()));
    const tiers = IMAGE_RESOLUTION_TIERS.filter((tier) => picked.has(tier));
    return tiers.length ? [...tiers] : [...IMAGE_RESOLUTION_TIERS];
}

// ---------- 旧配置兼容：分辨率原先是写在宽高比后缀里的（16:9-2k / 9:16-4k） ----------

/** 剥掉旧后缀拿到纯比例；不是合法比例返回 null */
export function baseImageAspect(value: string): ImageBaseAspect | null {
    const stripped = String(value)
        .trim()
        .replace(/-(2k|4k)$/i, "");
    return (IMAGE_BASE_ASPECTS as readonly string[]).includes(stripped) ? (stripped as ImageBaseAspect) : null;
}

/** 宽高比清单去后缀去重；全空 = 全部比例（沿用「不勾选 = 全支持」的语义） */
export function stripAspectSuffixes(aspects: readonly string[]): ImageBaseAspect[] {
    const picked = Array.from(new Set(aspects.map((item) => baseImageAspect(item)).filter((item): item is ImageBaseAspect => Boolean(item))));
    return picked.length ? picked : [...IMAGE_BASE_ASPECTS];
}

/** 从旧宽高比清单推导分辨率档位：-2k/-4k 后缀给对应档，纯比例给 1K，全空 = 三档全给 */
export function deriveResolutionTiers(aspects: readonly string[]): ImageResolutionTier[] {
    const tiers = new Set<ImageResolutionTier>();
    for (const aspect of aspects) {
        const suffix = String(aspect)
            .trim()
            .match(/-(2k|4k)$/i);
        if (suffix) tiers.add(suffix[1].toLowerCase() as ImageResolutionTier);
        else if (baseImageAspect(aspect)) tiers.add("1k");
    }
    return tiers.size ? IMAGE_RESOLUTION_TIERS.filter((tier) => tiers.has(tier)) : [...IMAGE_RESOLUTION_TIERS];
}

/** 分辨率分档定价所需字段（ModelPricing 的子集，避免这里依赖 credit-pricing 造成运行时循环） */
export type ImageTierPricing = {
    imageCredits2k?: number;
    imageCredits4k?: number;
};

/**
 * 在「基础价」之上套用分辨率分档：2K/4K 配了专价就用专价，没配就沿用基础价。
 * 优先级 = 档位专价 > 基础价（基础价本身已按「逐模型 > 全局默认 > 内置草案」取好）。
 * 放在本模块是为了让分档规则可被 node 单测直接加载（credit-pricing 带别名/依赖，跑不起来）。
 */
export function applyImageResolutionPricing(tier: ImageResolutionTier, pricing: ImageTierPricing | undefined, baseCredits: number): number {
    const tierCredits = tier === "4k" ? pricing?.imageCredits4k : tier === "2k" ? pricing?.imageCredits2k : undefined;
    // 脏值（负数/NaN）按「没配」处理走基础价 —— 宁可少收错也不能白送
    const valid = typeof tierCredits === "number" && Number.isFinite(tierCredits) && tierCredits >= 0;
    return Math.max(0, Math.floor(valid ? (tierCredits as number) : baseCredits));
}
