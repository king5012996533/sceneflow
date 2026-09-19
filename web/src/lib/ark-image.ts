/**
 * ark-image.ts —— 火山方舟（Ark / 豆包 Seedream）图片通道的入参整形（纯逻辑：无网络、无 React、无依赖）。
 *
 * 为什么单开这一层：方舟的图片接口长着 OpenAI 的形状，参数表却和别的通道不一样，照现在的通用请求体
 * 发过去会被 400 拒收。四处差异（2026-09-19 按官方《图片生成 API》+ Seedream 5.0 pro 文档核对）：
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
 *
 * 判定按 base URL（与 seedance-video.ts 认 `/api/plan/v3` 同一套惯例），**不按模型名**：
 * 中转站上的同名 seedream 走的是 `image_urls` 那条路，按名字认会把参考图整段丢掉。
 * 模块保持零 import —— scripts/*-unit-tests.mjs 是拿 node 直接跑 .ts 的，解析不了 `@/` 别名，
 * 所以这里不引 lib/image-resolution.ts（档位阈值那份口径在下面按同值抄了一份）。
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

/** 「方式 2：指定宽高像素值」的容许区间（官方文档：总像素 + 宽高比两个条件必须同时满足） */
const ARK_MIN_PIXELS = 921_600; // 1280x720
const ARK_MAX_PIXELS = 4_624_220; // 2048x2048x1.1025
const ARK_MIN_RATIO = 1 / 16;
const ARK_MAX_RATIO = 16;

/**
 * 档位阈值与 lib/image-resolution.ts 的 TIER_2K_MIN_PIXELS / TIER_4K_MIN_PIXELS 同一口径
 * （1K < 2.2MP ≤ 2K < 6MP ≤ 4K）。只影响「超区间的像素串换成哪个档位标签」，不参与计费，
 * 所以这里允许抄一份；改动 image-resolution.ts 的阈值时要同步。
 */
const TIER_2K_MIN_PIXELS = 2_200_000;
const TIER_4K_MIN_PIXELS = 6_000_000;

/** 方舟认识的档位标签（pro：1K/1.5K/2K；lite：2K/3K/4K —— 这里只放我们词汇表里有的并集） */
const ARK_SIZE_TIER_LABELS = new Set(["1K", "1.5K", "2K", "3K", "4K"]);

const ARK_PLAN_PATH = "/api/plan/v3";

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

/** 像素串是否落在方舟「方式 2」的容许区间内（总像素与宽高比两个条件都要满足） */
export function isArkPixelSizeAcceptable(width: number, height: number): boolean {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return false;
    const pixels = width * height;
    if (pixels < ARK_MIN_PIXELS || pixels > ARK_MAX_PIXELS) return false;
    const ratio = width / height;
    return ratio >= ARK_MIN_RATIO && ratio <= ARK_MAX_RATIO;
}

/** 总像素 → 档位标签（与 image-resolution.ts 的分档阈值同口径） */
export function arkSizeTierLabel(pixels: number): string {
    if (pixels >= TIER_4K_MIN_PIXELS) return "4K";
    if (pixels >= TIER_2K_MIN_PIXELS) return "2K";
    return "1K";
}

/**
 * 上游该收到的 `size`。
 *
 * 两种写法方舟都认（「方式 2：宽高像素值」/「方式 1：分辨率档位 + prompt 里的宽高比描述」），
 * 取舍是：像素值原样发（用户选的就是它，图纸与提示词里的数字也一致），**超出像素区间时才改发档位标签**
 * —— 我们的 4K 像素串（3840x2160 = 8.29MP）超过文档给的上限，而 4K 是 lite 的合法档位，
 * 发一个上游必然拒收的像素值，用户只会看到「请求失败」（画幅描述已经由 prompt 里的
 * 「宽高比 X，输出尺寸 WxHpx」那句带着，换成档位不会丢比例意图）。
 */
export function arkImageUpstreamSize(size?: string): string | undefined {
    const value = String(size ?? "").trim();
    if (!value || value.toLowerCase() === "auto") return undefined;
    const dimensions = parseArkPixelSize(value);
    if (!dimensions) {
        // 已经是档位标签就原样给上游；其余（比例串等）不发 size，让上游按 2K 默认值走
        const label = value.toUpperCase();
        return ARK_SIZE_TIER_LABELS.has(label) ? label : undefined;
    }
    if (isArkPixelSizeAcceptable(dimensions.width, dimensions.height)) return `${dimensions.width}x${dimensions.height}`;
    return arkSizeTierLabel(dimensions.width * dimensions.height);
}

/** 出图格式：方舟只认 png / jpeg（没有 webp），认不出来一律 png（也是上游默认） */
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
    /** 输出画幅：像素串（2048x1152）或档位标签（2K）；空 = 不指定，上游按 2K 默认值走 */
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
    const size = arkImageUpstreamSize(input.size);
    return {
        model: input.model,
        prompt: input.prompt,
        ...arkReferenceImagesPayload(input.images),
        ...(size ? { size } : {}),
        output_format: arkImageOutputFormat(input.outputFormat),
        // 见文件头第 3 条：不显式关掉就会带上「AI生成」角标
        watermark: ARK_IMAGE_WATERMARK,
        // 显式要链接而不是 base64：不写就按上游默认走，而默认若是 b64_json，几 MB 的图会以
        // JSON 字符串回传（代理信封 32MB 上限），失败起来很难查。链接只有 24 小时有效期，
        // 客户端拿到成品就会立刻归档一份，与其它渠道同一条链路。
        response_format: "url",
    };
}

/** 参考图张数超限时的说明（空串 = 没超限） */
export function arkReferenceCountError(images?: readonly string[]): string {
    const count = normalizeArkReferenceImages(images).length;
    if (count <= ARK_IMAGE_MAX_REFERENCES) return "";
    return `方舟图片通道最多接受 ${ARK_IMAGE_MAX_REFERENCES} 张参考图，当前 ${count} 张。请减少参考图后重试。`;
}
