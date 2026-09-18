/**
 * 上游报文成品提取的纯逻辑单测：内联字节 / 远程地址 / 文件头判定。
 *
 * 起因：2026-09-18 线上账——7 天 374 条任务判「成功」，其中 370 条服务器上什么都没有。
 * 成品要么是内联 base64（OpenAI 兼容通道 response_format=b64_json），要么是上游临时直链，
 * 两者都只存在于「上游」和「用户浏览器」这两个不属于我们的地方。修法是让服务端在代理层
 * 直接从上游报文里把成品取出来归档（见 generation-rescue.server.ts）。
 *
 * 这里钉住四件事：
 *   1) 认得出真实形态：OpenAI b64_json / apimart 任务 result.images[].url 数组 / Gemini inlineData；
 *   2) 不乱认：提示词、任务号、修订提示这些字符串不得被当成成品（宁可漏认也不能乱认）；
 *   3) 声明的 MIME 不可信：落盘前按文件头复核，认不出就丢掉这一份；
 *   4) 上限不许被顺手调大（8 份 / base64 下限 512 字符）。
 *
 * 运行：npm run test:artifact
 */
import assert from "node:assert";

import { MAX_EXTRACTED_ARTIFACTS, MIN_INLINE_BASE64_CHARS, detectMediaMime, extractArtifacts, parseInlineDataUrl, resultSources, resultUrlsFromItems } from "../src/lib/generation/generation-result.ts";

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

/** 一段足够长的假 base64（PNG 文件头 + 填充），用来验证「认得出」的路径 */
const FAKE_PNG_BASE64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==`.padEnd(600, "A");

check("常量边界：单次最多 8 份、base64 下限 512 字符", () => {
    assert.strictEqual(MAX_EXTRACTED_ARTIFACTS, 8);
    assert.strictEqual(MIN_INLINE_BASE64_CHARS, 512);
});

check("OpenAI 内联成品：data[].b64_json 被认成内联字节", () => {
    const payload = { created: 1, data: [{ b64_json: FAKE_PNG_BASE64, revised_prompt: "一只猫" }] };
    const artifacts = extractArtifacts(payload);
    assert.strictEqual(artifacts.inline.length, 1);
    assert.strictEqual(artifacts.inline[0].base64, FAKE_PNG_BASE64);
    assert.strictEqual(artifacts.inline[0].mimeType, "image/png");
    assert.deepStrictEqual(artifacts.urls, []);
});

check("OpenAI 直链成品：data[].url 被认成远程地址", () => {
    const artifacts = extractArtifacts({ data: [{ url: "https://cdn.example.com/a.png" }] });
    assert.deepStrictEqual(artifacts.urls, ["https://cdn.example.com/a.png"]);
    assert.strictEqual(artifacts.inline.length, 0);
});

check("apimart 任务制取件：result.images[].url 是数组也要认得", () => {
    const payload = { code: 200, data: { status: "completed", result: { images: [{ url: ["https://getapib.org/image/xxx.png"], expires_at: 1789813697 }] } } };
    const artifacts = extractArtifacts(payload);
    assert.deepStrictEqual(artifacts.urls, ["https://getapib.org/image/xxx.png"]);
});

check("Gemini 内联成品：inlineData.data + mimeType", () => {
    const payload = { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/webp", data: FAKE_PNG_BASE64 } }] } }] };
    const artifacts = extractArtifacts(payload);
    assert.strictEqual(artifacts.inline.length, 1);
    assert.strictEqual(artifacts.inline[0].mimeType, "image/webp");
});

check("data: URL 形态的成品也能拆出来", () => {
    const artifacts = extractArtifacts({ data: [{ url: `data:image/jpeg;base64,${FAKE_PNG_BASE64}` }] });
    assert.strictEqual(artifacts.inline.length, 1);
    assert.strictEqual(artifacts.inline[0].mimeType, "image/jpeg");
    assert.deepStrictEqual(artifacts.urls, []);
});

check("不乱认：提示词、任务号、修订提示、短 base64 都不算成品", () => {
    const payload = {
        data: [{ status: "submitted", task_id: "task_01M2T4GS3KWA87PYRBJFN0NX7M", revised_prompt: "一只坐在窗台上的猫，暖色调" }],
        error: null,
        usage: { total_tokens: 12 },
        id: "chatcmpl-abc",
    };
    const artifacts = extractArtifacts(payload);
    assert.strictEqual(artifacts.inline.length, 0);
    assert.deepStrictEqual(artifacts.urls, []);
});

check("不乱认：正文里的短 data: 图片（图标）不落盘", () => {
    const artifacts = extractArtifacts({ choices: [{ message: { content: "data:image/png;base64,iVBORw0KGgo=" } }] });
    assert.strictEqual(artifacts.inline.length, 0);
});

check("去重与限量：同一份重复出现只归档一次，超过 8 份截断", () => {
    const urls = Array.from({ length: 12 }, (_, index) => `https://cdn.example.com/${index}.png`);
    const artifacts = extractArtifacts({ data: [...urls.map((url) => ({ url })), { url: urls[0] }] });
    assert.strictEqual(artifacts.urls.length, MAX_EXTRACTED_ARTIFACTS);
    assert.strictEqual(new Set(artifacts.urls).size, MAX_EXTRACTED_ARTIFACTS);
});

check("归档顺序：内联在前、远程在后（顺序即成品下标）", () => {
    const sources = resultSources({
        inline: [{ base64: FAKE_PNG_BASE64, mimeType: "image/png" }],
        urls: ["https://cdn.example.com/a.png"],
    });
    assert.deepStrictEqual(
        sources.map((source) => source.kind),
        ["inline", "url"],
    );
});

check("parseInlineDataUrl：只认 base64 图片，短的一律不要", () => {
    assert.strictEqual(parseInlineDataUrl(`data:image/png;base64,${FAKE_PNG_BASE64}`)?.mimeType, "image/png");
    assert.strictEqual(parseInlineDataUrl("data:image/png;base64,iVBORw0KGgo="), null);
    assert.strictEqual(parseInlineDataUrl("https://cdn.example.com/a.png"), null);
});

check("文件头判定：PNG / JPEG / GIF / WEBP / MP4 / WEBM 认得，文本不认", () => {
    const bytes = (...values) => new Uint8Array(values);
    assert.strictEqual(detectMediaMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), "image/png");
    assert.strictEqual(detectMediaMime(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
    assert.strictEqual(detectMediaMime(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)), "image/gif");
    assert.strictEqual(detectMediaMime(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50)), "image/webp");
    assert.strictEqual(detectMediaMime(bytes(0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d)), "video/mp4");
    assert.strictEqual(detectMediaMime(bytes(0x1a, 0x45, 0xdf, 0xa3)), "video/webm");
    assert.strictEqual(detectMediaMime(Buffer.from("{\"error\":\"boom\"}")), "");
    assert.strictEqual(detectMediaMime(new Uint8Array()), "");
});

check("真实 PNG 的 base64 解出来能被文件头认出来（端到端对齐）", () => {
    const real = Buffer.from(FAKE_PNG_BASE64, "base64");
    assert.strictEqual(detectMediaMime(real), "image/png");
});

check("记录取件：已归档走本地媒体地址，未归档退回上游直链，脏数据不列", () => {
    const urls = resultUrlsFromItems("job1", [
        { archiveKey: "job1/0", mimeType: "image/png", bytes: 10 },
        { url: "https://cdn.example.com/b.png" },
        { url: "notaurl" },
        null,
        { archiveKey: "job1/3", mimeType: "image/png", bytes: 20 },
    ]);
    assert.deepStrictEqual(urls, ["/api/generation/jobs/job1/media/0", "https://cdn.example.com/b.png", "/api/generation/jobs/job1/media/4"]);
    assert.deepStrictEqual(resultUrlsFromItems("job1", null), []);
});

// 取件下标是「items 数组里的位置」，与媒体路由读 items[index].archiveKey 的做法一致：
// 两边只要都按位置来，跳过一份识别不出的成品也不会让用户取到别人的图。
check("记录取件：按下标取，与媒体路由读 items[index] 的位置语义一致", () => {
    const urls = resultUrlsFromItems("job2", [{ url: "https://cdn.example.com/a.png" }, { archiveKey: "job2/1" }]);
    assert.strictEqual(urls[1], "/api/generation/jobs/job2/media/1");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) console.log(`failed: ${failures.join(", ")}`);
