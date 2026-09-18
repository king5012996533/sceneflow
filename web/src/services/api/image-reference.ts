// image-reference.ts —— 中转站「图生图」的第二种写法（纯逻辑，不碰网络）
//
// 背景（2026-09-18 线上）：参考图生图一直走 multipart 的 /v1/images/edits，但在 apimart 上
// 该端点只接受 Grok 图像模型，qwen / seedream / gemini 一律被秒拒：
//   400 {"message":"`/v1/images/edits` only supports Grok image models.","type":"apimart_error"}
// 查 apimart 文档（docs.apimart.ai/cn/api-reference/images/*/generation）确认，图生图在那边是
// 走**生成端点** + `image_urls`（OpenAI 标准字段，公网 URL 与 Data URI 可混填）：
//   qwen-image-3.0 1-3 张 / seedream-5-0-pro 至多 10 张 / gemini-3.1-flash 至多 14 张 / gpt-image-2 至多 15 张。
// 所以收到「编辑端点不吃这个模型」这种答复时，按 generations + image_urls 改道重投一次。
//
// 这次重投是免费的：该答复是上游直接拒收（没建任务、没计费），实测三次全部原样退款；
// 与 image-ratio.ts 的画幅重投是同一套思路 —— 只对「上游明确说这条路走不通」的 400 重投一次。
//
// 本模块只负责「认出这句话」「把参考图规整成上游要的 Data URI」「拼出生成端点的请求体」，不碰网络。

/** 上游是否明确在说「编辑端点不支持这个模型」（而不是别的 400：内容审核、参数缺失等） */
export function isEditsEndpointUnsupported(message: string): boolean {
    if (!message) return false;
    return /images\/edits[\s\S]{0,60}only supports|only supports[\s\S]{0,40}image models|编辑(接口|端点)[\s\S]{0,20}不支持/i.test(message);
}

/**
 * 参考图规整成上游要的 Data URI。
 * seedream 文档明确要求 `<格式>` **必须小写**（`data:image/<格式>;base64,...`），
 * 而浏览器给 blob.type 的大小写不保证，所以统一把 data URI 里的 MIME 压成小写；
 * 已经是 http(s) 的地址原样返回（文档允许两者混填）。
 */
export function normalizeReferenceDataUrl(url: string): string {
    const value = (url || "").trim();
    if (!value) return value;
    if (/^https?:\/\//i.test(value)) return value;
    return value.replace(/^(data:)([^;,]*)(;base64,)/i, (_match, prefix: string, mime: string, suffix: string) => `${prefix}${mime.toLowerCase()}${suffix}`);
}

export type ReferenceGenerationInput = {
    model: string;
    prompt: string;
    n: number;
    quality?: string;
    /** 画布选的是像素尺寸就发它；上游只认比例串时改发 aspectRatio（与文生图同一套取舍） */
    size?: string;
    aspectRatio?: string;
    imageUrls: string[];
    /** OpenAI 官方通道才带 response_format/output_format */
    openAiResponseFormat?: boolean;
    outputFormat?: string;
};

/** 生成端点（图生图模式）的请求体：与文生图同形，多一个 image_urls */
export function buildReferenceGenerationBody(input: ReferenceGenerationInput): Record<string, unknown> {
    return {
        model: input.model,
        prompt: input.prompt,
        n: input.n,
        ...(input.quality ? { quality: input.quality } : {}),
        ...(input.aspectRatio ? { aspect_ratio: input.aspectRatio } : input.size ? { size: input.size } : {}),
        ...(input.openAiResponseFormat ? { response_format: "b64_json" } : {}),
        ...(input.openAiResponseFormat && input.outputFormat ? { output_format: input.outputFormat } : {}),
        image_urls: input.imageUrls,
    };
}
