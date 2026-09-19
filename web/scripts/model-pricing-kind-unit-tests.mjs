/**
 * 「模型按哪一类计费」判定的单测（纯逻辑）。
 *
 * 起因（2026-09-19）：后台「逐模型积分定价」过去对每个模型都铺开图片分档 + 音频 + 文本 + 视频四组字段，
 * 文本模型的价格被埋在图片/视频字段中间，管理员（老板）误以为「文本模型不能定价」。
 * 改成按类型只显示相关字段后，"这是哪一类"的判定就直接决定管理员能不能配到价：
 *   1. 能力标定里写死的 kind 优先（人工声明 > 名字猜测）；
 *   2. 名字里带 audio/tts/voice 的先判音频（否则 "minimax-tts" 会被 minimax 判成视频）；
 *   3. 判不出类型的一律算文本 —— 对话/工具类默认不计费，这也是最不容易误伤的兜底。
 *
 * 运行：npm run test:pricingkind
 */
import assert from "node:assert";

import { inferPricingKind } from "../src/lib/model-pricing-kind.ts";

let passed = 0;
const failures = [];

function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ok  ${name}`);
    } catch (error) {
        failures.push({ name, error });
        console.log(`  FAIL ${name}: ${error.message}`);
    }
}

console.log("inferPricingKind");

check("线上真实模型名：图片类", () => {
    assert.equal(inferPricingKind("gpt-image-2"), "image");
    assert.equal(inferPricingKind("gpt-image-2.5-sunburst-c"), "image");
    assert.equal(inferPricingKind("qwen-image-3.0"), "image");
    assert.equal(inferPricingKind("seedream-5-0-pro"), "image");
    assert.equal(inferPricingKind("flux-2-pro"), "image");
    // 2026-09-19 接 recraft 时发现：上游用 owner/name（recraft-ai/recraft-v4-pro），
    // 关键词表漏了它 → 判成 text → 用户端价目表（/api/billing/packages 的 rateCard）整行漏掉这个模型。
    assert.equal(inferPricingKind("recraft-ai/recraft-v4-pro"), "image");
    assert.equal(inferPricingKind("recraft-ai/recraft-v3"), "image");
});

check("线上真实模型名：视频类", () => {
    assert.equal(inferPricingKind("H3"), "video");
    assert.equal(inferPricingKind("seedance2.5"), "video");
    assert.equal(inferPricingKind("prunaai/p-video"), "video");
    assert.equal(inferPricingKind("seedance-2.0-pro"), "video");
});

check("线上真实模型名：文本类（对话/Agent 用）", () => {
    assert.equal(inferPricingKind("deepseek-flash"), "text");
    assert.equal(inferPricingKind("deepseek-v4-pro"), "text");
    assert.equal(inferPricingKind("gpt-5.6-terra"), "text");
    assert.equal(inferPricingKind("DeepSeek-V4.1-Flash"), "text");
});

check("音频关键词优先于视频/图片关键词", () => {
    assert.equal(inferPricingKind("minimax-tts"), "audio");
    assert.equal(inferPricingKind("gpt-image-voice"), "audio");
    assert.equal(inferPricingKind("suno-music-v2"), "audio");
});

check("能力标定优先于名字猜测", () => {
    assert.equal(inferPricingKind("my-model", "image"), "image");
    assert.equal(inferPricingKind("my-model", "genvideo"), "video");
    assert.equal(inferPricingKind("my-model", "seedance-video"), "video");
    assert.equal(inferPricingKind("gpt-image-2", "genvideo"), "video");
});

check("渠道前缀（channel::model）不影响判定", () => {
    assert.equal(inferPricingKind("chan-1::deepseek-flash"), "text");
    assert.equal(inferPricingKind("chan-1::gpt-image-2"), "image");
});

check("判不出来的一律算文本（对话/工具默认不扣费）", () => {
    assert.equal(inferPricingKind(""), "text");
    assert.equal(inferPricingKind("some-brand-new-thing"), "text");
    assert.equal(inferPricingKind("some-brand-new-thing", null), "text");
});

if (failures.length) {
    console.error(`\n${failures.length} 项失败 / 共 ${passed + failures.length} 项`);
    process.exit(1);
}
console.log(`\n全部通过（${passed} 项）`);
