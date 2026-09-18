// edit-fallback.ts —— 「编辑端点不吃这个模型」时的改道信封（构造逻辑，不触网）
//
// 背景（与 services/api/image-reference.ts 同一件事）：参考图生图走 multipart 的
// /v1/images/edits，而 apimart 上该端点只接受 Grok 图像模型，qwen / seedream / gemini 一律被秒拒：
//   400 {"message":"`/v1/images/edits` only supports Grok image models.","type":"apimart_error"}
// 客户端本来会在收到这句话之后当场改走「生成端点 + image_urls」重投一次。
//
// 可阶段 2（服务端替浏览器执行）里没人替它改道了：那次调用由服务端发起，浏览器只轮询任务状态。
// 所以提交那一刻就把这条路备好 —— 参考素材在这里转成 Data URI，与主信封一起落盘，
// 之后不管浏览器还在不在，服务端都能自己走完这一单。
//
// 与客户端一致的取舍：带蒙版时不备（生成端点不接蒙版），参考素材为空时不备。
// 放在 lib 里而不是代理路由里：路由只该做「收请求、发请求、结账」，构造信封是纯逻辑，
// 单独放一处才能被单测与人工复核（路由里的代码没法在 Node 下直接跑）。

import { buildReferenceGenerationBody, normalizeReferenceDataUrl } from "@/services/api/image-reference";

export type EditFallbackEnvelope = {
    url: string;
    method: string;
    headers: Record<string, string>;
    contentType: string;
    origin: "defer";
    /** 已经序列化好的请求体（落盘时按字节写，不再二次序列化） */
    json: string;
};

/** 从 multipart 表单里取值（取值失败一律退回「不备这条改道」，绝不因此让本次生成失败） */
function readField(form: FormData, name: string): string {
    const value = form.get(name);
    return typeof value === "string" ? value : "";
}

export async function buildEditFallback(input: {
    /** `req.formData()` 返回的原生表单（含参考图二进制） */
    form: FormData;
    /** 本次要发往的上游地址（只有指向 /images/edits 的才需要备改道） */
    target: string;
    model: string;
    /** 非鉴权头（鉴权头由服务端在发送那一刻重新签发，不进信封） */
    headers: Record<string, string>;
    hasMask: boolean;
}): Promise<EditFallbackEnvelope | null> {
    if (input.hasMask || !/\/images\/edits/i.test(input.target)) return null;

    const images = input.form.getAll("image").filter((value): value is File => typeof File !== "undefined" && value instanceof File);
    if (!images.length) return null;

    const imageUrls: string[] = [];
    for (const file of images) {
        const buffer = Buffer.from(await file.arrayBuffer());
        if (!buffer.byteLength) continue;
        imageUrls.push(normalizeReferenceDataUrl(`data:${file.type || "image/png"};base64,${buffer.toString("base64")}`));
    }
    if (!imageUrls.length) return null;

    const size = readField(input.form, "size");
    const aspectRatio = readField(input.form, "aspect_ratio");
    const quality = readField(input.form, "quality");
    const outputFormat = readField(input.form, "output_format");
    const body = buildReferenceGenerationBody({
        model: input.model,
        prompt: readField(input.form, "prompt"),
        n: Math.max(1, Math.min(15, Math.floor(Number(readField(input.form, "n")) || 1))),
        quality: quality || undefined,
        size: size || undefined,
        aspectRatio: aspectRatio || undefined,
        imageUrls,
        openAiResponseFormat: input.form.get("response_format") === "b64_json",
        outputFormat: outputFormat || undefined,
    });

    return {
        url: input.target.replace(/\/images\/edits/i, "/images/generations"),
        method: "POST",
        headers: input.headers,
        contentType: "application/json",
        origin: "defer",
        json: JSON.stringify(body),
    };
}
