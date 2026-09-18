/**
 * 图生图改道（编辑端点被拒 → 生成端点 + image_urls）的纯逻辑单测。
 *
 * 起因：2026-09-18 线上，用户在画布上用 qwen-image-3.0 / seedream-5-0-pro 做参考图生图，
 * 连续三次「秒失败」，后台日志当时看不到原因（表单代理只记 host、不记状态码），
 * 补日志后抓到 apimart 的原话：
 *   400 {"error":{"code":"","message":"`/v1/images/edits` only supports Grok image models.
 *        (request id: ...)","param":"","type":"apimart_error"}}
 * apimart 文档（docs.apimart.ai/cn/api-reference/images/<模型>/generation）写明图生图走生成端点 +
 * `image_urls`，公网 URL 与 Data URI 可混填；seedream 还要求 Data URI 里的格式必须小写。
 *
 * 这里钉住三件事：
 *   1) 只认「编辑端点不吃这个模型」这一类答复，别把画幅 400、内容审核误判成改道信号
 *      （改道与画幅重投是两条独立的兜底，不能互相抢）；
 *   2) 参考图规整成上游要的 Data URI（mime 小写、http(s) 原样、不破坏已有形态）；
 *   3) 改道请求体与文生图同形：像素尺寸优先、比例串优先于像素、OpenAI 官方通道才带
 *      response_format/output_format，且一定带上 image_urls。
 *
 * 运行：npm run test:refimage
 */
import assert from "node:assert";

import { buildReferenceGenerationBody, isEditsEndpointUnsupported, normalizeReferenceDataUrl } from "../src/services/api/image-reference.ts";
import { isAspectRejection } from "../src/services/api/image-ratio.ts";

let passed = 0;
const failures = [];

function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ok  ${name}`);
    } catch (error) {
        failures.push(name);
        console.error(`  FAIL ${name}\n       ${error.message}`);
        process.exitCode = 1;
    }
}

// —— 线上原样文案 ——
const EDITS_400 =
    "`/v1/images/edits` only supports Grok image models. (request id: 20260918192226650694046GA9YZtpR)";
const ASPECT_400 =
    'unsupported image aspect ratio "1824:1024", gemini-3.1-flash-image-preview supported ratios: 16:9, 1:1, auto';

check("识别：线上那句 apimart 原文命中改道信号", () => {
    assert.strictEqual(isEditsEndpointUnsupported(EDITS_400), true);
});

check("识别：带 type=apimart_error 的完整 JSON 也命中", () => {
    const json = JSON.stringify({ error: { code: "", message: EDITS_400, param: "", type: "apimart_error" } });
    assert.strictEqual(isEditsEndpointUnsupported(json), true);
});

check("识别：中文同义答复命中", () => {
    assert.strictEqual(isEditsEndpointUnsupported("编辑接口不支持当前模型，请改用 Grok 图像模型"), true);
});

check("识别：画幅 400 不得被当成改道信号（两条兜底各管各的）", () => {
    assert.strictEqual(isEditsEndpointUnsupported(ASPECT_400), false);
    assert.strictEqual(isAspectRejection(EDITS_400), false);
});

check("识别：内容审核、参数缺失、空文案都不改道", () => {
    assert.strictEqual(isEditsEndpointUnsupported("非常抱歉，生成的图片可能违反了关于暴力内容的防护限制"), false);
    assert.strictEqual(isEditsEndpointUnsupported("image_urls exceeds max 15"), false);
    assert.strictEqual(isEditsEndpointUnsupported(""), false);
});

check("规整：Data URI 的 MIME 压成小写（seedream 要求格式小写）", () => {
    assert.strictEqual(normalizeReferenceDataUrl("data:image/PNG;base64,AAA"), "data:image/png;base64,AAA");
    assert.strictEqual(normalizeReferenceDataUrl("data:image/JPEG;base64,AAA"), "data:image/jpeg;base64,AAA");
});

check("规整：已经是 http(s) 的地址原样返回（文档允许 URL 与 base64 混填）", () => {
    assert.strictEqual(normalizeReferenceDataUrl("https://example.com/shop.jpg"), "https://example.com/shop.jpg");
    assert.strictEqual(normalizeReferenceDataUrl("http://example.com/a.png"), "http://example.com/a.png");
});

check("规整：首尾空白清掉，非 Data URI 形态不破坏", () => {
    assert.strictEqual(normalizeReferenceDataUrl("  data:image/png;base64,AAA  "), "data:image/png;base64,AAA");
    assert.strictEqual(normalizeReferenceDataUrl("data:image/png,raw"), "data:image/png,raw");
    assert.strictEqual(normalizeReferenceDataUrl(""), "");
});

check("请求体：默认发像素尺寸，并一定带上 image_urls", () => {
    const body = buildReferenceGenerationBody({
        model: "qwen-image-3.0",
        prompt: "把背景换成纯白",
        n: 1,
        quality: "auto",
        size: "1824x1024",
        imageUrls: ["data:image/png;base64,AAA"],
    });
    assert.strictEqual(body.size, "1824x1024");
    assert.strictEqual(body.aspect_ratio, undefined);
    assert.deepStrictEqual(body.image_urls, ["data:image/png;base64,AAA"]);
    assert.strictEqual(body.model, "qwen-image-3.0");
    assert.strictEqual(body.quality, "auto");
});

check("请求体：上游只认比例串时发比例，不发像素尺寸", () => {
    const body = buildReferenceGenerationBody({
        model: "gemini-3.1-flash-image-preview",
        prompt: "p",
        n: 2,
        size: "1824x1024",
        aspectRatio: "16:9",
        imageUrls: ["https://example.com/a.png"],
    });
    assert.strictEqual(body.aspect_ratio, "16:9");
    assert.strictEqual(body.size, undefined);
    assert.strictEqual(body.n, 2);
});

check("请求体：OpenAI 官方通道才带 response_format/output_format", () => {
    const apimart = buildReferenceGenerationBody({ model: "qwen-image-3.0", prompt: "p", n: 1, imageUrls: ["data:image/png;base64,AAA"] });
    assert.strictEqual(apimart.response_format, undefined);
    assert.strictEqual(apimart.output_format, undefined);

    const openai = buildReferenceGenerationBody({ model: "gpt-image-1", prompt: "p", n: 1, imageUrls: [], openAiResponseFormat: true, outputFormat: "png" });
    assert.strictEqual(openai.response_format, "b64_json");
    assert.strictEqual(openai.output_format, "png");
    assert.deepStrictEqual(openai.image_urls, []);
});

console.log(`\n图生图改道单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
