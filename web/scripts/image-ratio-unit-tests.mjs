/**
 * 上游「画幅写法」兜底的纯逻辑单元测试。
 *
 * 起因：画布 16:9 预设是像素尺寸 1824x1024，而 apimart 上挂的
 * gemini-3.1-flash-image-preview 只认比例串，回 400：
 *   unsupported image aspect ratio "1824:1024", gemini-3.1-flash-image-preview
 *   supported ratios: 16:9, 1:1, 1:4, 1:8, 21:9, 2:3, 3:2, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16, auto
 * 下面用**线上原样文案**当夹具，钉住三件事：认得出这种拒绝、解析得出可用比例、
 * 挑得出「最接近且同向」的那个（1824x1024 要落到 16:9，不能落到 21:9 或竖版）。
 *
 * 注意：resolveRequestAspect（image.ts）会把 1824x1024 约分成 57:32、把 1024x1824 约分成 32:57，
 * 所以这里的目标画幅用这两个值，与线上实际传入的一致。
 *
 * 运行：npm run test:ratio
 */
import assert from "node:assert";

import { aspectRetryBody, isAspectRejection, parseSupportedRatios, pickSupportedRatio } from "../src/services/api/image-ratio.ts";

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
const ASPECT_400 =
    'unsupported image aspect ratio "1824:1024", gemini-3.1-flash-image-preview supported ratios: 16:9, 1:1, 1:4, 1:8, 21:9, 2:3, 3:2, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16, auto';
const SUPPORTED = parseSupportedRatios(ASPECT_400);

check("解析：线上文案里的可用比例全部取出（含 auto，去重）", () => {
    assert.deepStrictEqual(SUPPORTED, ["16:9", "1:1", "1:4", "1:8", "21:9", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "auto"]);
});

check("解析：没有这句时返回空数组（不得瞎猜）", () => {
    assert.deepStrictEqual(parseSupportedRatios(""), []);
    assert.deepStrictEqual(parseSupportedRatios('{"error":{"message":"内容审核未通过"}}'), []);
});

check("识别：只认「画幅不支持」这一类 400", () => {
    assert.strictEqual(isAspectRejection(ASPECT_400), true);
    assert.strictEqual(isAspectRejection('unsupported image aspect ratio "1536:1024"'), true);
    // 下面这些都不能被当成画幅问题，否则会盲目重投（内容审核、余额、任务失败）
    assert.strictEqual(isAspectRejection("非常抱歉，生成的图片可能违反了关于暴力内容的防护限制。"), false);
    assert.strictEqual(isAspectRejection("当前服务器没有可用账号，自动补号启动，请重试"), false);
    assert.strictEqual(isAspectRejection("内容审核未通过"), false);
    assert.strictEqual(isAspectRejection(""), false);
});

check("挑比例：画布 16:9（1824x1024 → 57:32）落到 16:9", () => {
    assert.strictEqual(pickSupportedRatio("57:32", SUPPORTED), "16:9");
});

check("挑比例：画布 9:16（1024x1824 → 32:57）落到 9:16（不得翻成横版）", () => {
    assert.strictEqual(pickSupportedRatio("32:57", SUPPORTED), "9:16");
});

check("挑比例：画布 3:2（1536x1024 → 3:2）用到上游同名的 3:2", () => {
    assert.strictEqual(pickSupportedRatio("3:2", SUPPORTED), "3:2");
});

check("挑比例：完全一致时优先精确匹配", () => {
    assert.strictEqual(pickSupportedRatio("4:3", SUPPORTED), "4:3");
    assert.strictEqual(pickSupportedRatio("21:9", SUPPORTED), "21:9");
});

check("挑比例：可选集合里没有接近的横版时，宁可选同向的 1:1", () => {
    assert.strictEqual(pickSupportedRatio("16:9", ["1:1", "9:16", "auto"]), "1:1");
});

check("挑比例：只有 auto 可用时返回 null（等于放弃画幅意图，不如把上游原话抛给用户）", () => {
    assert.strictEqual(pickSupportedRatio("16:9", ["auto"]), null);
    assert.strictEqual(pickSupportedRatio("16:9", []), null);
});

check("挑比例：目标画幅读不出来时不重投", () => {
    assert.strictEqual(pickSupportedRatio("", SUPPORTED), null);
    assert.strictEqual(pickSupportedRatio(undefined, SUPPORTED), null);
    assert.strictEqual(pickSupportedRatio("auto", SUPPORTED), null);
});

check("组合：拿到线上那句 400，端到端应当重投 16:9", () => {
    const ratio = isAspectRejection(ASPECT_400) ? pickSupportedRatio("57:32", parseSupportedRatios(ASPECT_400)) : null;
    assert.strictEqual(ratio, "16:9");
});

// —— 重投请求体（服务端执行路径用它，客户端那条路用的是 image.ts 里同一套判据） ——
check("重投体：像素尺寸换成上游列出的比例串，size 去掉、其余字段原样带过去", () => {
    const body = { model: "gemini-3.1-flash-image-preview", prompt: "一只猫", n: 1, size: "1824x1024", response_format: "b64_json" };
    assert.deepStrictEqual(aspectRetryBody(body, ASPECT_400), {
        model: "gemini-3.1-flash-image-preview",
        prompt: "一只猫",
        n: 1,
        response_format: "b64_json",
        aspect_ratio: "16:9",
    });
});

check("重投体：请求体里没有画幅时返回 null（这不是画幅问题，别乱重投）", () => {
    assert.strictEqual(aspectRetryBody({ model: "m", prompt: "p" }, ASPECT_400), null);
    assert.strictEqual(aspectRetryBody({}, ASPECT_400), null);
});

check("重投体：上游报的明显不是画幅问题（内容审核/余额）时一律不重投", () => {
    const body = { size: "1824x1024", prompt: "p" };
    assert.strictEqual(aspectRetryBody(body, "内容审核未通过"), null);
    assert.strictEqual(aspectRetryBody(body, "当前服务器没有可用账号，自动补号启动，请重试"), null);
    assert.strictEqual(aspectRetryBody(body, ""), null);
});

check("重投体：只认得出 auto 时返回 null（等于放弃画幅意图，不如把上游原话抛给用户）", () => {
    assert.strictEqual(aspectRetryBody({ size: "1824x1024" }, 'unsupported image aspect ratio "1824:1024" supported ratios: auto'), null);
});

check("重投体：非对象请求体（字符串/数组/null）不得崩，也不得乱改", () => {
    assert.strictEqual(aspectRetryBody("model=m&size=1824x1024", ASPECT_400), null);
    assert.strictEqual(aspectRetryBody(["1824x1024"], ASPECT_400), null);
    assert.strictEqual(aspectRetryBody(null, ASPECT_400), null);
});

check("重投体：已经带 aspect_ratio 的请求体也能被改（用它的值当目标画幅）", () => {
    const body = { prompt: "p", aspect_ratio: "1824x1024" };
    assert.deepStrictEqual(aspectRetryBody(body, ASPECT_400), { prompt: "p", aspect_ratio: "16:9" });
});

console.log(failures.length === 0 ? `\n全部通过：${passed} 项` : `\n通过 ${passed} 项，失败 ${failures.length} 项：${failures.join("、")}`);
