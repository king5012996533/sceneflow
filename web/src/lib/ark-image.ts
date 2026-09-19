/**
 * ark-image.ts —— 火山方舟（Ark / 豆包 Seedream）图片通道的入参整形（纯逻辑：无网络、无 React、无依赖）。
 *
 * 为什么单开这一层：方舟的图片接口长着 OpenAI 的形状，参数表却和别的通道不一样，照现在的通用请求体
 * 发过去会被 400 拒收。五处差异（2026-09-19 按官方《图片生成 API》+ Seedream 5.0 文档核对，
 * 每一条都用真 key 打到上游复验过 —— 文档与实测不一致的地方以实测为准，见下面各处的注释）：
 *
 *   1. **参考图字段叫 `image`**（单张给字符串、多张给数组），不是我们 generations 回退路径用的
 *      `image_urls` —— 上游对不认识的字段是**静默忽略**的，发错了不会报错，只会照常出图、照常计费，
 *      而成图与参考图无关（同款事故见 lib/model-reference-support.ts 里 recraft 那段）。
 *   2. **没有 `n`、也没有 `quality`** —— 通用请求体恒定带这两个字段，上游一个都不认（严格校验 → 400）。
 *      张数在方舟是另一个参数（`sequential_image_generation`）且 pro 不支持，本轮不接。
 *   3. **不传 `watermark` 就按上游默认走**（方舟会在右下角加「AI生成」角标），必须显式关掉，
 *      否则同一个模型会比其它渠道多一个角标。
 *   4. **没有 `/images/edits` 端点** —— 参考图生图只能走 `/images/generations` + `image`。
 *      我们默认那条 multipart 编辑链路对方舟是死路（点进去是 404，不是「编辑端点不支持这个模型」，
 *      所以 image-reference.ts 的重投也救不回来）。
 *   5. **尺寸的接受区间是逐模型的** —— 像素方法不是全模型通用：实测 lite 拒收 3686400 像素以下的
 *      （我们 2K 的 16:9 = 2048x1152 = 2.36MP 正好落在它下限之下），pro 拒收 4624220 像素以上的
 *      （4K 的 3840x2160 = 8.29MP）。两家都认档位标签，所以尺寸要按模型算着发，见 arkImageUpstreamSize。
 *
 * 判定按 base URL（与 seedance-video.ts 认 `/api/plan/v3` 同一套惯例），**不按模型名**：
 * 中转站上的同名 seedream 走的是 `image_urls` 那条路，按名字认会把参考图整段丢掉。
 * （唯一的例外是尺寸边界：那两组数字取自方舟自家模型的实测，只在这条通道内按模型名取用。）
 * 模块保持零 import —— scripts/*-unit-tests.mjs 是拿 node 直接跑 .ts 的，解析不了 `@/` 别名，
 * 所以这里不引 lib/image-resolution.ts（档位词汇在下面按同义抄了一份，只用于换标签，不参与计费）。
 */

/** 方舟图片生成端点。参考图生图也走这里（方舟没有 /images/edits） */
export const ARK_IMAGE_PATH = "/images/generations";

/** 参考图入参字段名（官方示例：单张给字符串，多张给数组） */
export const ARK_IMAGE_REFERENCE_FIELD = "image";

/** 参考图张数上限（官方「图片生成场景」限制：最多传入 10 张参考图） */
export const ARK_IMAGE_MAX_REFERENCES = 10;

/** 方舟默认给输出图加「AI生成」角标，显式关掉，与其它渠道的出图口径保持一致 */
export const ARK_IMAGE_WATERMARK = false;

/**
 * 方舟图片通道一次只出一张。
 * 张数在方舟是 `sequential_image_generation`（文生组图），pro 明确「暂不支持」，本轮也没接，
 * 所以请求体里不发张数 → 上游永远只回一张。credential-store.server.ts 据此把 Ark 渠道的
 * maxCount 夹到 1：扣费是按 count 乘出来的，不夹就是「按 4 张扣钱、只回 1 张」。
 */
export const ARK_IMAGE_MAX_OUTPUTS = 1;

/** 方舟图片接口没有蒙版入参（mask / 局部重绘不在它的参数表里） */
export const ARK_IMAGE_MASK_UNSUPPORTED = "方舟图片通道没有蒙版入参：带蒙版的重绘发过去只会被忽略（等于按整图重画、照样计费）。请改用文字描述要修改的区域，或换支持蒙版的模型。";

/** Seedance 视频通道（同一个 host、同一个账号）的路径前缀，认成图片通道会把视频请求塞进图片请求体 */
const ARK_PLAN_PATH = "/api/plan/v3";

/**
 * 「方式 2：指定宽高像素值」的宽高比容许区间（官方文档：总像素与宽高比两个条件必须同时满足）。
 * 总像素那一半不是常数 —— 它逐模型不同，见下面两组边界。
 */
const ARK_MIN_RATIO = 1 / 16;
const ARK_MAX_RATIO = 16;

/** 方舟的档位标签词汇表，从低到高（pro 与 lite 各自支持其中一段） */
const ARK_TIER_LADDER = ["1K", "1.5K", "2K", "3K", "4K"] as const;

/**
 * 档位标签对应的像素下沿（实测输出反推：pro 的 1K→1248x832、1.5K→1872x1248、2K→2816x1584，
 * lite 的 3K→3072x3072、4K→4096x4096）。只用来把「面积」翻译成「该发哪个标签」，不参与计费。
 */
const ARK_TIER_MIN_PIXELS: Record<string, number> = {
    "1K": 0,
    "1.5K": 2_200_000,
    "2K": 4_300_000,
    "3K": 8_000_000,
    "4K": 12_000_000,
};

/** 某个模型对像素方法的接受区间，以及它认得的档位标签 */
type ArkImageSizeLimits = { minPixels: number; maxPixels: number; tiers: readonly string[] };

/**
 * 两个已知模型的边界（2026-09-19 用真 key 逐档实测；官方文档只写了 pro 支持 1K/1.5K/2K、
 * lite 支持 2K/3K/4K，像素方法的下限/上限是这么试出来的）：
 *   pro（doubao-seedream-5-0-pro-260628）：上沿就是文档「方式 2」的 4624220，下沿宽松（1024x1024 能出图）；
 *   lite（doubao-seedream-5-0-260128 及 -lite- 别名）：下限 3686400（1824x1024 / 1024x1024 都是 400
 *        「image size must be at least 3686400 pixels」），上沿至少到 16.7MP（4096x4096 能出图）。
 *
 * 「发像素串还是发档位标签」就是这两组边界决定的：像素串最忠实（用户选的就是它），
 * 但只要有一方会拒收就必须换成档位标签 —— 被拒是硬失败（上游照样算一次调用，用户扣了费拿不到图）。
 */
const ARK_SEEDREAM_PRO_LIMITS: ArkImageSizeLimits = { minPixels: 921_600, maxPixels: 4_624_220, tiers: ["1K", "1.5K", "2K"] };
const ARK_SEEDREAM_LITE_LIMITS: ArkImageSizeLimits = { minPixels: 3_686_400, maxPixels: 16_777_216, tiers: ["2K", "3K", "4K"] };
/**
 * 认不出模型时（别人自建的方舟渠道、或方舟上别家的模型）只走「两家都认」的交集：
 * 像素串只发 3.68–4.62MP 这段安全带，其余一律退到双方共有的 2K 档。
 * 宁可出图比用户要的小一点，也不要发一个上游必然拒收的尺寸（拒收 = 钱花了、图没有）。
 */
const ARK_UNKNOWN_MODEL_LIMITS: ArkImageSizeLimits = { minPixels: 3_686_400, maxPixels: 4_624_220, tiers: ["2K"] };

/**
 * 按模型名认边界。只认方舟自家的 seedream 5.0 两个 id：
 * pro 的 id 里带 `pro`（doubao-seedream-5-0-pro-260628），lite 的 id 不带（doubao-seedream-5-0-260128），
 * 所以判据是「带 pro 算 pro，其余 seedream-5.0 算 lite」，而不是去找 `lite` 这个词。
 */
function arkImageSizeLimits(model?: string): ArkImageSizeLimits {
    const name = String(model ?? "")
        .trim()
        .toLowerCase();
    if (!name.includes("seedream-5-0") && !name.includes("seedream-5.0")) return ARK_UNKNOWN_MODEL_LIMITS;
    return name.includes("pro") ? ARK_SEEDREAM_PRO_LIMITS : ARK_SEEDREAM_LITE_LIMITS;
}

function arkTierIndex(label: string): number {
    return (ARK_TIER_LADDER as readonly string[]).indexOf(
        String(label ?? "")
            .trim()
            .toUpperCase(),
    );
}

/** 总像素 → 档位标签（按 ARK_TIER_MIN_PIXELS 的分档，upstream 的档位语义比我们的 1K/2K/4K 细） */
export function arkSizeTierLabel(pixels: number): string {
    let label: string = ARK_TIER_LADDER[0];
    for (const candidate of ARK_TIER_LADDER) {
        if (pixels >= ARK_TIER_MIN_PIXELS[candidate]) label = candidate;
    }
    return label;
}

/**
 * 把档位标签收敛到该模型支持的档：取「不低于它的最小支持档」，支持里全都比它低就取最高的那个。
 * 只往高走是刻意的 —— 发一个上游不认的标签是 400，退到低一档则是「图小一点但出得来」。
 */
function arkClampTierLabel(label: string, tiers: readonly string[]): string {
    const supported = tiers
        .map(arkTierIndex)
        .filter((index) => index >= 0)
        .sort((left, right) => left - right);
    if (!supported.length) return label;
    const need = arkTierIndex(label);
    return ARK_TIER_LADDER[supported.find((index) => index >= need) ?? supported[supported.length - 1]];
}

/**
 * 上游该收到的 `size`。
 *
 * 方舟两种写法都认（「方式 2：像素值」/「方式 1：档位」），取舍按模型算：
 *   1. 像素串在该模型的接受区间内（且宽高比在 [1/16,16]）→ 原样发：用户选的就是它，最忠实，也最省
 *      （上游按输出像素计 token，档位标签会让它自己映射成一个未必更小的尺寸）；
 *   2. 区间外 → 换成档位标签，并收敛到该模型支持的档（lite 收到 2K 的 16:9 会被拒，改发 "2K"；
 *      pro 收到 4K 会被拒，但 pro 本来也只支持到 2K）。
 * 比例串（"16:9"）不发 size —— 方舟的 size 只认像素值与档位标签，画幅描述由 prompt 里那句带着。
 */
export function arkImageUpstreamSize(size?: string, model?: string): string | undefined {
    const value = String(size ?? "").trim();
    if (!value || value.toLowerCase() === "auto") return undefined;
    const limits = arkImageSizeLimits(model);
    const dimensions = parseArkPixelSize(value);
    if (!dimensions) {
        // 已经是档位标签：收敛到该模型支持的档；其余写法（比例串等）不发 size，让上游按默认值走
        return arkTierIndex(value) >= 0 ? arkClampTierLabel(value, limits.tiers) : undefined;
    }
    const { width, height } = dimensions;
    const pixels = width * height;
    const ratio = width / height;
    if (pixels >= limits.minPixels && pixels <= limits.maxPixels && ratio >= ARK_MIN_RATIO && ratio <= ARK_MAX_RATIO) {
        return `${width}x${height}`;
    }
    return arkClampTierLabel(arkSizeTierLabel(pixels), limits.tiers);
}

/**
 * 这个 base URL 是不是方舟的**图片**端点。
 *
 * `/api/plan/v3` 是 Seedance 视频通道（同一个 host、同一个账号），不能算成图片通道：
 * 认错了视频请求会被塞进图片请求体。
 */
export function isArkImageBaseUrl(baseUrl?: string): boolean {
    const value = String(baseUrl ?? "")
        .trim()
        .toLowerCase();
    if (!value) return false;
    if (value.includes(ARK_PLAN_PATH)) return false;
    const isArkHost = value.includes("volces.com") || value.includes("bytepluses.com");
    return isArkHost && value.includes("/api/v3");
}

/** 图片请求是否要按方舟口径整形（供应商格式优先：显式标成 gemini/replicate 等的渠道一律不算） */
export function isArkImageChannel(config: { apiFormat?: string; baseUrl?: string }): boolean {
    if (config.apiFormat && config.apiFormat !== "openai") return false;
    return isArkImageBaseUrl(config.baseUrl);
}

function parseArkPixelSize(value: string): { width: number; height: number } | null {
    const match = value.match(/^(\d+)\s*x\s*(\d+)$/i);
    if (!match) return null;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return null;
    return { width, height };
}

/** 出图格式：方舟只认 png / jpeg（没有 webp）；认不出来一律 png —— 实测上游默认是 jpeg，必须显式发 */
export function arkImageOutputFormat(configured?: string): "png" | "jpeg" {
    return String(configured ?? "")
        .trim()
        .toLowerCase() === "jpeg"
        ? "jpeg"
        : "png";
}

/** 参考图规整：去空白、去空项（顺序即 image 数组顺序，别去重 —— 同一张图放两次是用户的意图） */
export function normalizeArkReferenceImages(images?: readonly string[]): string[] {
    return (images ?? []).map((item) => String(item ?? "").trim()).filter(Boolean);
}

/** 参考图入参：单张给字符串、多张给数组（官方两种写法都支持，示例里单张就是字符串） */
export function arkReferenceImagesPayload(images?: readonly string[]): Record<string, unknown> {
    const list = normalizeArkReferenceImages(images);
    if (!list.length) return {};
    return { [ARK_IMAGE_REFERENCE_FIELD]: list.length === 1 ? list[0] : list };
}

export type ArkImageBodyInput = {
    model: string;
    prompt: string;
    /** 输出画幅：像素串（2048x2048）或档位标签（2K）；空 = 不指定，上游按自己的默认档走 */
    size?: string;
    /** 参考图（Data URI 或可被上游访问的 URL）；空 = 文生图 */
    images?: readonly string[];
    /** 用户选的出图格式（面板口径 webp/png/jpeg）；方舟只认 png/jpeg */
    outputFormat?: string;
};

/**
 * 方舟图片请求体。**只有这一处允许出现 `image` 字段的拼装** —— 参考图字段名发错是静默失效的
 * （不报错、不出效果、照样收费），不允许散在两条调用路径里各写一遍。
 */
export function buildArkImageBody(input: ArkImageBodyInput): Record<string, unknown> {
    const size = arkImageUpstreamSize(input.size, input.model);
    return {
        model: input.model,
        prompt: input.prompt,
        ...arkReferenceImagesPayload(input.images),
        ...(size ? { size } : {}),
        output_format: arkImageOutputFormat(input.outputFormat),
        // 见文件头第 3 条：不显式关掉就会带上「AI生成」角标
        watermark: ARK_IMAGE_WATERMARK,
        // 显式要链接而不是 base64：默认值没有保证，而 b64 的图是十几 MB 的 JSON 字符串
        // （实测一张 1K 的 png 就有 2.1MB base64，4K 能顶到代理信封 32MB 上限附近），
        // 一旦超限就是「扣了费、拿不到图」且现场只留一个截断的响应，很难查。
        // 链接只有 24 小时有效期，客户端拿到成品就会立刻归档一份，与其它渠道同一条链路。
        response_format: "url",
    };
}

/** 参考图张数超限时的说明（空串 = 没超限） */
export function arkReferenceCountError(images?: readonly string[]): string {
    const count = normalizeArkReferenceImages(images).length;
    if (count <= ARK_IMAGE_MAX_REFERENCES) return "";
    return `方舟图片通道最多接受 ${ARK_IMAGE_MAX_REFERENCES} 张参考图，当前 ${count} 张。请减少参考图后重试。`;
}
