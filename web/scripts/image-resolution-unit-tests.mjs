/**
 * 图片分辨率分档定价的单测（纯逻辑）。
 *
 * 起因（2026-09-19）：老板要在后台按「尺寸 / 分辨率 / 张数」三轴配参数，并且**每个分辨率单独定价**
 * —— 过去所有分辨率一个价，2K/4K 按 1K 的价卖，越卖越亏。价格一旦分档，"这次算哪一档"就成了
 * 直接扣钱的判定，所以把口径钉在这里：
 *   1. 档位按「上游实际会被要求画多大」判（总像素），不按最长边 —— 否则普通 16:9（1824x1024）会被算成 2K；
 *   2. 2K/4K 专价优先，没配就沿用基础价（后台不配 = 与过去完全一致，不会上线就变价）；
 *   3. 自定义像素 / 比例串 / auto 三种写法都要落到确定的一档（不能出现"算不出档位就不扣钱"）。
 *
 * 运行：npm run test:resolution
 */
import assert from "node:assert";

import {
    IMAGE_RESOLUTION_TIERS,
    applyImageResolutionPricing,
    baseImageAspect,
    deriveResolutionTiers,
    imageResolutionTier,
    imageSizeForRatio,
    nearestAllowedTier,
    normalizeResolutionTiers,
    parseImagePixelSize,
    ratioForImageSize,
    resolutionTierFromPixels,
    stripAspectSuffixes,
    synthesizeImagePixelSize,
} from "../src/lib/image-resolution.ts";

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

// ---------- 档位判定 ----------

check("分档按总像素：面板上每个定值像素落在预期档位", () => {
    assert.strictEqual(resolutionTierFromPixels(1024, 1024), "1k"); // 1:1
    assert.strictEqual(resolutionTierFromPixels(1824, 1024), "1k"); // 普通 16:9（长边 1824 > 1600，按最长边会误判成 2K）
    assert.strictEqual(resolutionTierFromPixels(1536, 1024), "1k"); // 3:2
    assert.strictEqual(resolutionTierFromPixels(1360, 1024), "1k"); // 4:3
    assert.strictEqual(resolutionTierFromPixels(2048, 2048), "2k"); // 1:1 (2k)
    assert.strictEqual(resolutionTierFromPixels(2048, 1152), "2k"); // 16:9 (2k)
    assert.strictEqual(resolutionTierFromPixels(1152, 2048), "2k"); // 9:16 (2k)
    assert.strictEqual(resolutionTierFromPixels(3840, 2160), "4k"); // 16:9 (4k)
    assert.strictEqual(resolutionTierFromPixels(2160, 3840), "4k"); // 9:16 (4k)
    assert.strictEqual(resolutionTierFromPixels(2880, 2880), "4k"); // high 档方形
});

check("判定入口：像素串 > 比例串（看 quality）> auto（按 1K）", () => {
    // 像素串：以像素为准，quality 不参与
    assert.strictEqual(imageResolutionTier("3840x2160", "low"), "4k");
    assert.strictEqual(imageResolutionTier("1024x1024", "high"), "1k");
    // 比例串：像素由 quality 换算，档位跟着 quality 走
    assert.strictEqual(imageResolutionTier("16:9", "2k"), "2k");
    assert.strictEqual(imageResolutionTier("16:9", "4k"), "4k");
    assert.strictEqual(imageResolutionTier("16:9", "medium"), "2k");
    assert.strictEqual(imageResolutionTier("16:9", "high"), "4k");
    assert.strictEqual(imageResolutionTier("16:9", "auto"), "1k");
    assert.strictEqual(imageResolutionTier("16:9", undefined), "1k");
    // auto / 空：上游默认小图，按最低档算，不能按 quality 多扣
    assert.strictEqual(imageResolutionTier("auto", "high"), "1k");
    assert.strictEqual(imageResolutionTier("", "4k"), "1k");
    assert.strictEqual(imageResolutionTier(undefined, undefined), "1k");
});

check("像素串解析：合法才认，垃圾输入不猜（落到 1K 而不是乱算）", () => {
    assert.deepStrictEqual(parseImagePixelSize("1024x1024"), { width: 1024, height: 1024 });
    assert.strictEqual(parseImagePixelSize("1024*1024"), null);
    assert.strictEqual(parseImagePixelSize("auto"), null);
    assert.strictEqual(parseImagePixelSize(""), null);
    assert.strictEqual(imageResolutionTier("不是尺寸", "4k"), "1k");
});

// ---------- 分档定价 ----------

check("定价：配了 2K/4K 专价就按专价扣", () => {
    const pricing = { imageCredits: 8, imageCredits2k: 16, imageCredits4k: 32 };
    assert.strictEqual(applyImageResolutionPricing("1k", pricing, 8), 8);
    assert.strictEqual(applyImageResolutionPricing("2k", pricing, 8), 16);
    assert.strictEqual(applyImageResolutionPricing("4k", pricing, 8), 32);
});

check("定价：只配了 4K 时，2K 沿用基础价（不会串档）", () => {
    const pricing = { imageCredits: 8, imageCredits4k: 32 };
    assert.strictEqual(applyImageResolutionPricing("1k", pricing, 8), 8);
    assert.strictEqual(applyImageResolutionPricing("2k", pricing, 8), 8);
    assert.strictEqual(applyImageResolutionPricing("4k", pricing, 8), 32);
});

check("定价：后台什么都没配 = 三档同价（与分档上线前的行为一致）", () => {
    for (const tier of IMAGE_RESOLUTION_TIERS) assert.strictEqual(applyImageResolutionPricing(tier, undefined, 10), 10);
    for (const tier of IMAGE_RESOLUTION_TIERS) assert.strictEqual(applyImageResolutionPricing(tier, {}, 2), 2);
});

check("定价：0 是合法价（可以配成免费档），不能被当成「没配」", () => {
    assert.strictEqual(applyImageResolutionPricing("4k", { imageCredits: 8, imageCredits4k: 0 }, 8), 0);
});

check("定价：负数/小数被夹成非负整数（后台输入脏数据也不会扣出负积分）", () => {
    assert.strictEqual(applyImageResolutionPricing("2k", { imageCredits2k: -5 }, 8), 8);
    assert.strictEqual(applyImageResolutionPricing("2k", { imageCredits2k: 15.9 }, 8), 15);
});

// ---------- 面板取值 ----------

check("面板：比例 × 档位 → 像素（定值组合沿用历史取值，不改变老选择的渲染结果）", () => {
    assert.strictEqual(imageSizeForRatio("16:9", "1k"), "1824x1024");
    assert.strictEqual(imageSizeForRatio("16:9", "2k"), "2048x1152");
    assert.strictEqual(imageSizeForRatio("16:9", "4k"), "3840x2160");
    assert.strictEqual(imageSizeForRatio("1:1", "2k"), "2048x2048");
    assert.strictEqual(imageSizeForRatio("9:16", "4k"), "2160x3840");
});

check("面板：没有定值的组合要算得出像素，且满足上游校验（16 倍数、长边 ≤3840、面积 ≤8294400）", () => {
    for (const ratio of ["3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "1:1"]) {
        for (const tier of IMAGE_RESOLUTION_TIERS) {
            const size = imageSizeForRatio(ratio, tier);
            const dimensions = parseImagePixelSize(size);
            assert.ok(dimensions, `${ratio} @ ${tier} 应能算出像素，实际 ${size}`);
            assert.strictEqual(dimensions.width % 16, 0, `${ratio} @ ${tier} 宽不是 16 的倍数`);
            assert.strictEqual(dimensions.height % 16, 0, `${ratio} @ ${tier} 高不是 16 的倍数`);
            assert.ok(Math.max(dimensions.width, dimensions.height) <= 3840, `${ratio} @ ${tier} 长边超 3840`);
            assert.ok(dimensions.width * dimensions.height <= 8294400, `${ratio} @ ${tier} 面积超标`);
            assert.ok(dimensions.width * dimensions.height >= 655360, `${ratio} @ ${tier} 面积过小`);
            // 算出来的像素要能反推回同一档位（面板显示与扣费口径必须一致）
            assert.strictEqual(imageResolutionTier(size), tier, `${ratio} @ ${tier} 算出的 ${size} 反推档位不一致`);
        }
    }
});

check("面板：像素反推比例（选中的 chip 要认得出来）", () => {
    assert.strictEqual(ratioForImageSize("2048x1152"), "16:9");
    assert.strictEqual(ratioForImageSize("1824x1024"), "16:9");
    assert.strictEqual(ratioForImageSize("2160x3840"), "9:16");
    assert.strictEqual(ratioForImageSize("1024x1024"), "1:1");
    assert.strictEqual(ratioForImageSize("auto"), null);
    assert.strictEqual(ratioForImageSize("1234x999"), null); // 真·自定义像素，不硬归到某个比例
});

check("面板：自定义像素换算到允许档位时保持原宽高比（用户输入不被丢掉）", () => {
    assert.strictEqual(synthesizeImagePixelSize("1200:1200", "4k"), "2880x2880");
    const wide = synthesizeImagePixelSize("2400:1000", "2k");
    const dimensions = parseImagePixelSize(wide);
    assert.ok(dimensions, "自定义比例也应能算出像素");
    assert.ok(Math.abs(dimensions.width / dimensions.height - 2.4) < 0.05, `宽高比应保持 2.4，实际 ${wide}`);
});

// ---------- 能力标定收敛 ----------

check("收敛：档位不在标定里时只降不升（不悄悄给用户涨价）", () => {
    assert.strictEqual(nearestAllowedTier("4k", ["1k", "2k"]), "2k");
    assert.strictEqual(nearestAllowedTier("4k", ["1k"]), "1k");
    assert.strictEqual(nearestAllowedTier("1k", ["1k"]), "1k");
    // 模型只支持 4K（少见）：至少给出一个允许值，不能返回不允许的档
    assert.strictEqual(nearestAllowedTier("1k", ["4k"]), "4k");
    assert.strictEqual(nearestAllowedTier("2k", []), "2k"); // 空清单按「全支持」处理
});

check("清洗：档位清单去重去脏值，空/非法 = 三档全给（后台不标定 = 全支持）", () => {
    assert.deepStrictEqual(normalizeResolutionTiers(["2k", "2k", "1k"]), ["1k", "2k"]);
    assert.deepStrictEqual(normalizeResolutionTiers(["8k", "x"]), [...IMAGE_RESOLUTION_TIERS]);
    assert.deepStrictEqual(normalizeResolutionTiers(undefined), [...IMAGE_RESOLUTION_TIERS]);
    assert.deepStrictEqual(normalizeResolutionTiers([]), [...IMAGE_RESOLUTION_TIERS]);
});

// ---------- 旧配置兼容（分辨率原先是写在宽高比后缀里的：16:9-2k / 9:16-4k） ----------

check("旧数据：老配置（分辨率藏在 aspect 后缀）能推出档位，不用手工迁移数据", () => {
    const legacy = ["1:1", "16:9", "9:16", "1:1-2k", "16:9-2k", "9:16-4k"];
    assert.deepStrictEqual(stripAspectSuffixes(legacy), ["1:1", "16:9", "9:16"]); // 后缀被剥掉，只留纯比例
    assert.deepStrictEqual(deriveResolutionTiers(legacy), ["1k", "2k", "4k"]);
});

check("旧数据：管理员当时没勾 2k/4k 的模型，升级后也不会突然多出高档位", () => {
    assert.deepStrictEqual(deriveResolutionTiers(["1:1", "16:9"]), ["1k"]);
    assert.deepStrictEqual(deriveResolutionTiers(["16:9-2k", "16:9"]), ["1k", "2k"]);
});

check("旧数据：剥后缀只认合法比例，垃圾值不会变成选项", () => {
    assert.strictEqual(baseImageAspect("16:9-2k"), "16:9");
    assert.strictEqual(baseImageAspect("1:1-4k"), "1:1");
    assert.strictEqual(baseImageAspect("21:9"), null);
    assert.strictEqual(baseImageAspect(""), null);
    assert.deepStrictEqual(stripAspectSuffixes(["21:9", "垃圾"]), ["1:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16", "auto"]); // 全不合法 = 回退到全比例
});

check("旧数据：清单为空 = 三档全给（沿用「不勾选 = 全支持」的语义）", () => {
    assert.deepStrictEqual(deriveResolutionTiers([]), [...IMAGE_RESOLUTION_TIERS]);
    assert.deepStrictEqual(stripAspectSuffixes([]).length, 8);
});

console.log(`\n图片分辨率分档单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
