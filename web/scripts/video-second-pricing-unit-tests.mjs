/**
 * 视频「按秒计价」的单测（纯逻辑，无数据库、无网络）。
 *
 * 起因（2026-09-21 老板反馈「价格不对」）：Replicate 的 prunaai/p-video 按**输出秒数**收费 ——
 * 720p 标准 $0.02/秒、720p 草稿 $0.005/秒、1080p 标准 $0.04/秒、1080p 草稿 $0.01/秒。
 * 而我们的视频定价过去只有「每条固定积分」一个维度：5 秒和 20 秒同价，
 * 20 秒 1080p 的真实成本是 ¥5.68，按 20 积分（¥2）卖，每出一条赔 ¥3.68。
 *
 * 改成「按秒成本 × 全局倍率」之后，计费里第一次同时出现**时长、清晰度、草稿档**三个轴，
 * 任何一个轴认错都是直接漏钱或多收，而且错得很安静（只进流水，不进报错）。所以这里把每个轴钉住：
 *
 *   1) 四档成本 ↔ 上游价目表一一对应（含四位小数不被抹平）；
 *   2) 售价 = 成本 × 倍率的取整规则（向上取整、最低 1 积分）；
 *   3) 认不出秒数时**退回按条价**，绝不制造 0 元单；
 *   4) 成本估算与扣费同口径（后台「成本 / 毛利」页不再是写死的 50 分）；
 *   5) 没配按秒价的模型（Seedance / MiniMax / GenVideo）行为一个字都不变。
 *
 * 运行：npm run test:videopricing
 */
import assert from "node:assert";

import {
    estimateGenerationCostCents,
    getGenerationCreditsCost,
    hasVideoCostPricing,
    isVideoDraftMetadata,
    videoCostCents,
    videoCostRate,
    videoSecondsFromMetadata,
    videoTurnCredits,
    VIDEO_PRICING_MULTIPLIER_DEFAULT,
    VIDEO_PRICING_MULTIPLIER_KEY,
} from "../src/lib/credit-pricing.ts";
import { sanitizePricing } from "../src/lib/model-capability-spec.ts";
import { normalizeGenerationMetadata } from "../src/lib/generation/generation-config.ts";

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

/** prunaai/p-video 的线上价目表（元/秒，按 1 美元 ≈ 7.1 元折算） */
const PRUNA = {
    videoCostYuanPerSecondStandard: 0.142,
    videoCostYuanPerSecondStandardDraft: 0.0355,
    videoCostYuanPerSecondHigh: 0.284,
    videoCostYuanPerSecondHighDraft: 0.071,
};

const video = (seconds, extra = {}) => ({ model: "prunaai/p-video", videoSeconds: String(seconds), ...extra });
const credits = (metadata, configured = PRUNA, defaults = undefined) => getGenerationCreditsCost("video", metadata, configured, defaults);

// —— 1. 档位判定：清晰度 × 草稿，两个轴都要认对 ——

check("四档取值与上游一一对应（720/1080 × 标准/草稿）", () => {
    assert.deepStrictEqual(videoCostRate(PRUNA, video(5, { vquality: "720" })), { tier: "standard", yuanPerSecond: 0.142 });
    assert.deepStrictEqual(videoCostRate(PRUNA, video(5, { vquality: "1080" })), { tier: "high", yuanPerSecond: 0.284 });
    assert.deepStrictEqual(videoCostRate(PRUNA, video(5, { vquality: "720", videoDraft: "true" })), { tier: "standardDraft", yuanPerSecond: 0.0355 });
    assert.deepStrictEqual(videoCostRate(PRUNA, video(5, { vquality: "1080", videoDraft: "true" })), { tier: "highDraft", yuanPerSecond: 0.071 });
});

check("草稿标记三种写法都认，其余一律当关闭（上游 draft 默认 false）", () => {
    for (const raw of [true, "true", "TRUE", " true ", "1"]) assert.strictEqual(isVideoDraftMetadata({ videoDraft: raw }), true, `${String(raw)} 应判为开启`);
    for (const raw of [false, "false", "0", "", undefined, null]) assert.strictEqual(isVideoDraftMetadata({ videoDraft: raw }), false, `${String(raw)} 应判为关闭`);
});

check("1080p 与 2K 都算高清档（vquality 的写法历来不统一）", () => {
    assert.strictEqual(videoCostRate(PRUNA, video(5, { vquality: "1080p" })).tier, "high");
    assert.strictEqual(videoCostRate(PRUNA, video(5, { vquality: "2K" })).tier, "high");
    assert.strictEqual(videoCostRate(PRUNA, video(5, { vquality: "768P" })).tier, "standard");
});

// —— 2. 成本（分）：秒数 × 每秒成本 ——

check("成本 = 每秒成本 × 秒数（四档各算一遍，含四舍五入到分）", () => {
    assert.strictEqual(videoCostCents(PRUNA, video(5, { vquality: "720" })), 71);
    assert.strictEqual(videoCostCents(PRUNA, video(5, { vquality: "1080" })), 142);
    assert.strictEqual(videoCostCents(PRUNA, video(5, { vquality: "720", videoDraft: "true" })), 18, "¥0.1775 → 17.75 分 → 18 分");
    assert.strictEqual(videoCostCents(PRUNA, video(5, { vquality: "1080", videoDraft: "true" })), 36);
    assert.strictEqual(videoCostCents(PRUNA, video(20, { vquality: "720" })), 284);
    assert.strictEqual(videoCostCents(PRUNA, video(20, { vquality: "1080" })), 568, "20 秒 1080p 的真实成本 —— 这就是按条卖会赔掉的那一笔");
});

check("草稿档成本是标准档的 1/4（上游定价如此，别把两档当一个价）", () => {
    const standard = videoCostCents(PRUNA, video(10, { vquality: "1080" }));
    const draft = videoCostCents(PRUNA, video(10, { vquality: "1080", videoDraft: "true" }));
    assert.ok(Math.abs(draft / standard - 0.25) < 0.02, `草稿 ${draft} 分 vs 标准 ${standard} 分`);
});

// —— 3. 售价（积分）：成本 × 倍率，向上取整 ——

check("售价 = 成本 × 倍率，向上取整（倍率 3 的四档实价）", () => {
    assert.strictEqual(credits(video(5, { vquality: "720" })), 22, "¥0.71 × 3 = 2.13 元 = 21.3 积分 → 22");
    assert.strictEqual(credits(video(5, { vquality: "1080" })), 43);
    assert.strictEqual(credits(video(5, { vquality: "720", videoDraft: "true" })), 6);
    assert.strictEqual(credits(video(5, { vquality: "1080", videoDraft: "true" })), 11);
    assert.strictEqual(credits(video(20, { vquality: "720" })), 86);
    assert.strictEqual(credits(video(20, { vquality: "1080" })), 171);
    assert.strictEqual(credits(video(20, { vquality: "1080", videoDraft: "true" })), 43);
});

check("倍率是旋钮：同一单在倍率 2 / 3 / 缺省下的价（缺省 = 内置 3 倍）", () => {
    const meta = video(5, { vquality: "720" });
    assert.strictEqual(credits(meta, PRUNA, { videoMultiplier: 2 }), 15);
    assert.strictEqual(credits(meta, PRUNA, { videoMultiplier: 3 }), 22);
    assert.strictEqual(credits(meta, PRUNA, {}), 22, "客户端旧缓存里没有这个字段 → 落回内置默认");
    assert.strictEqual(credits(meta, PRUNA, { videoMultiplier: 0 }), 22, "0 视为填错 → 落回默认，不是免费");
    assert.strictEqual(credits(meta, PRUNA, { videoMultiplier: -2 }), 22);
    assert.strictEqual(VIDEO_PRICING_MULTIPLIER_DEFAULT, 3);
    assert.strictEqual(VIDEO_PRICING_MULTIPLIER_KEY, "video_pricing_multiplier");
});

check("时长与清晰度都真的影响价格（过去这两个轴上价格是平的）", () => {
    assert.ok(credits(video(20, { vquality: "720" })) > credits(video(5, { vquality: "720" })), "长片必须更贵");
    assert.ok(credits(video(5, { vquality: "1080" })) > credits(video(5, { vquality: "720" })), "高清必须更贵");
    assert.ok(credits(video(5, { vquality: "720", videoDraft: "true" })) < credits(video(5, { vquality: "720" })), "草稿必须更便宜");
});

check("最低 1 积分：再便宜的组合也不会被取整抹成 0（那是白送）", () => {
    const cheap = { videoCostYuanPerSecondStandardDraft: 0.0001 };
    assert.strictEqual(videoTurnCredits(cheap, video(1, { videoDraft: "true" }), 3), 1);
});

// —— 4. 认不出秒数时的兜底：退回按条价，绝不 0 元单 ——

check("秒数认不出来（缺失 / 自动时长 -1 / 脏值）→ 退回按条价", () => {
    assert.strictEqual(videoSecondsFromMetadata(video(5)), 5);
    assert.strictEqual(videoSecondsFromMetadata({ videoSeconds: "-1" }), 0, "-1 是「自动时长」，按秒算不准");
    assert.strictEqual(videoSecondsFromMetadata({ videoSeconds: "abc" }), 0);
    assert.strictEqual(videoSecondsFromMetadata({}), 0);
    assert.strictEqual(videoCostCents(PRUNA, { model: "prunaai/p-video" }), null);
    // 配了按条价时落回按条价，而不是 0
    assert.strictEqual(credits({ model: "prunaai/p-video" }, { ...PRUNA, videoCredits: 20 }), 20);
    // 什么都没配时落回内置草案（pruna 走 "/" 那条）
    assert.strictEqual(credits({ model: "prunaai/p-video" }, undefined), 20);
});

check("按秒价与按条价同时存在时，按秒说了算", () => {
    const both = { ...PRUNA, videoCredits: 20 };
    assert.strictEqual(credits(video(20, { vquality: "1080" }), both), 171, "20 秒 1080p 必须按按秒价收，不能被 20 积分的按条价盖住");
    assert.strictEqual(credits(video(5, { vquality: "720" }), both), 22);
});

check("只填了标准档时的回落：高清与草稿都按标准档算（已知取舍，后台要提示填全）", () => {
    const onlyStandard = { videoCostYuanPerSecondStandard: 0.142 };
    assert.strictEqual(videoCostRate(onlyStandard, video(5, { vquality: "1080" })).tier, "standard");
    assert.strictEqual(videoCostRate(onlyStandard, video(5, { vquality: "720", videoDraft: "true" })).tier, "standard");
    assert.strictEqual(hasVideoCostPricing(onlyStandard), true);
});

check("一档都没填 / 填 0 → 不启用按秒计价（0 是脏值，不能变成免费）", () => {
    assert.strictEqual(hasVideoCostPricing({}), false);
    assert.strictEqual(hasVideoCostPricing({ videoCredits: 20 }), false);
    assert.strictEqual(videoCostRate({ videoCostYuanPerSecondStandard: 0 }, video(5)), null);
    assert.strictEqual(videoCostRate({ videoCostYuanPerSecondStandard: Number.NaN }, video(5)), null);
});

// —— 5. 成本估算与扣费同口径（后台「成本 / 毛利」页） ——

check("estimateGenerationCostCents 用同一份按秒口径，不再写死 50 分", () => {
    assert.strictEqual(estimateGenerationCostCents("video", video(5, { vquality: "720" }), PRUNA), 71);
    assert.strictEqual(estimateGenerationCostCents("video", video(20, { vquality: "1080" }), PRUNA), 568);
    assert.strictEqual(estimateGenerationCostCents("video", video(5, { vquality: "1080", videoDraft: "true" }), PRUNA), 36);
});

check("成本估算的兜底路径没被带偏（没配按秒价时仍是过去那几条草案）", () => {
    assert.strictEqual(estimateGenerationCostCents("video", video(20, { vquality: "1080" }), undefined), 50);
    assert.strictEqual(estimateGenerationCostCents("video", { model: "genvideo-2.0" }, undefined), 30);
    assert.strictEqual(estimateGenerationCostCents("video", { model: "seedance-1-pro", vquality: "1080p" }, undefined), 80);
    assert.strictEqual(estimateGenerationCostCents("video", { model: "MiniMax-H3" }, undefined), 40);
});

// —— 6. 没配按秒价的模型：行为一个字不变 ——

check("Seedance / MiniMax / GenVideo 的按条价保持原样", () => {
    assert.strictEqual(getGenerationCreditsCost("video", { model: "seedance-1-pro" }, undefined), 15);
    assert.strictEqual(getGenerationCreditsCost("video", { model: "seedance-1-pro", vquality: "1080p" }, undefined), 30);
    assert.strictEqual(getGenerationCreditsCost("video", { model: "MiniMax-H3", vquality: "2K" }, undefined), 40);
    assert.strictEqual(getGenerationCreditsCost("video", { model: "genvideo-2.5" }, undefined), 20);
    assert.strictEqual(getGenerationCreditsCost("video", { model: "whatever-video" }, { videoCreditsStandard: 7, videoCreditsHigh: 9 }, undefined), 7);
    assert.strictEqual(getGenerationCreditsCost("video", { model: "whatever-video", vquality: "1080p" }, { videoCreditsStandard: 7, videoCreditsHigh: 9 }, undefined), 9);
});

// —— 7. 后台配置的清洗：四位小数不许被抹平 ——

check("sanitizePricing 保留四位小数（两位会把 ¥0.0355 抹成 ¥0.04，差 13%）", () => {
    assert.deepStrictEqual(sanitizePricing({ "prunaai/p-video": PRUNA }), { "prunaai/p-video": PRUNA });
});

check("sanitizePricing 拒绝负值与离谱值，接受字符串数字", () => {
    assert.deepStrictEqual(sanitizePricing({ m: { videoCostYuanPerSecondStandard: -1 } }), undefined);
    assert.deepStrictEqual(sanitizePricing({ m: { videoCostYuanPerSecondStandard: 1001 } }), undefined);
    assert.deepStrictEqual(sanitizePricing({ m: { videoCostYuanPerSecondStandard: "0.142" } }), { m: { videoCostYuanPerSecondStandard: 0.142 } });
});

check("清洗后回读：配了按秒价即进入按秒计价，且价一分不差", () => {
    const configured = sanitizePricing({ "prunaai/p-video": PRUNA })["prunaai/p-video"];
    assert.strictEqual(hasVideoCostPricing(configured), true);
    assert.strictEqual(credits(video(20, { vquality: "1080", videoDraft: "true" }), configured), 43);
});

// —— 8. 服务端确权：草稿标记要归一，别让计费认一种、落库写另一种 ——

check("normalizeGenerationMetadata 把 videoDraft 归一成 \"true\"/\"false\"", () => {
    for (const raw of [true, "true", "1", "TRUE"]) {
        assert.strictEqual(normalizeGenerationMetadata({ videoDraft: raw, videoSeconds: "5" }).videoDraft, "true", `${String(raw)}`);
    }
    for (const raw of [false, "false", 0, ""]) {
        assert.strictEqual(normalizeGenerationMetadata({ videoDraft: raw, videoSeconds: "5" }).videoDraft, "false", `${String(raw)}`);
    }
    assert.strictEqual(normalizeGenerationMetadata({ videoSeconds: "5" }).videoDraft, undefined, "没带这个字段就不凭空造一个");
    assert.strictEqual(normalizeGenerationMetadata({ videoDraft: "true", videoSeconds: "999" }).videoSeconds, "20", "时长仍按老规矩 clamp 1–20");
});

check("归一后的 metadata 与计费认的是同一档", () => {
    const normalized = normalizeGenerationMetadata({ model: "prunaai/p-video", videoSeconds: "10", vquality: "1080", videoDraft: "1" });
    assert.strictEqual(videoCostRate(PRUNA, normalized).tier, "highDraft");
});

console.log(`\n${passed} passed, ${failures.length} failed`);
