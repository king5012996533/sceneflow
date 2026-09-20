/**
 * prunaai/p-video 入参口径的单测（纯逻辑，无网络、无数据库）。
 *
 * 起因（2026-09-20）：这个模型在线上被标成了一套 Seedance 的词汇表，面板因此放出 1792x1024「宽屏」，
 * 约分成 "7:4" 不在上游 aspect_ratio 枚举里 —— 上游会把整条请求 422 掉，用户点一次错一次；
 * 同时 draft 的默认值是 true，而上游默认 false，默认生成静默走低画质预览（积分照扣）。
 *
 * 所以这个文件钉住的核心是一条不变式：**面板能选到的每个档位，都必须是上游真的认的值。**
 * 面板选项来自后台标定，后台标定来自 lib/pruna-video.ts，出参归一化也走同一处 —— 这里逐项交叉核对。
 *
 * 运行：npm run test:pruna
 */
import assert from "node:assert";

import {
    PRUNA_VIDEO_ASPECT_RATIOS,
    PRUNA_VIDEO_DEFAULT_DRAFT,
    PRUNA_VIDEO_DEFAULT_RESOLUTION,
    PRUNA_VIDEO_DEFAULT_SECONDS,
    PRUNA_VIDEO_MAX_SECONDS,
    PRUNA_VIDEO_MIN_SECONDS,
    PRUNA_VIDEO_RESOLUTIONS,
    isPrunaVideoModel,
    normalizePrunaAspectRatio,
    normalizePrunaResolution,
    normalizePrunaSeconds,
    prunaVideoCapability,
} from "../src/lib/pruna-video.ts";
import { DEFAULT_GENERIC_VIDEO_CAPABILITY, defaultCapabilityForModel, sanitizeCapabilities } from "../src/lib/model-capability-spec.ts";

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

console.log("isPrunaVideoModel");

check("认得出 prunaai/p-video（含渠道前缀、大小写）", () => {
    assert.equal(isPrunaVideoModel("prunaai/p-video"), true);
    assert.equal(isPrunaVideoModel("PrunaAI/P-Video"), true);
    // 平台模型在前端是 `<channelId>::模型名`，判断必须先剥前缀，否则线上永远认不出来
    assert.equal(isPrunaVideoModel("cmsy19adf000mymtil2oza5g5::prunaai/p-video"), true);
});

check("别的模型不被误判", () => {
    assert.equal(isPrunaVideoModel("recraft-ai/recraft-v4-pro"), false);
    assert.equal(isPrunaVideoModel("openai/gpt-image-2.5-flare"), false);
    assert.equal(isPrunaVideoModel("prunaai"), false);
    assert.equal(isPrunaVideoModel(""), false);
});

console.log("normalizePrunaAspectRatio");

check("面板的三个尺寸档都落在上游枚举里", () => {
    assert.equal(normalizePrunaAspectRatio("1280x720"), "16:9");
    assert.equal(normalizePrunaAspectRatio("720x1280"), "9:16");
    assert.equal(normalizePrunaAspectRatio("1024x1024"), "1:1");
});

check("自定义像素只要约分后还在枚举里就照发", () => {
    assert.equal(normalizePrunaAspectRatio("1920x1080"), "16:9");
    assert.equal(normalizePrunaAspectRatio("1600x1200"), "4:3");
    assert.equal(normalizePrunaAspectRatio("1080x1620"), "2:3");
    assert.equal(normalizePrunaAspectRatio("16:9"), "16:9");
});

check("枚举外的档位不发（宽屏 7:4 / 长图 4:7 就是线上 422 的来源）", () => {
    // 这两个值正是那套错标定放出来的尺寸：约分得到 7:4 / 4:7，上游 aspect_ratio 枚举里没有它们。
    // 返回 undefined = 请求里不带这个字段，由上游用自己默认的 16:9，而不是让整条请求 422。
    assert.equal(normalizePrunaAspectRatio("1792x1024"), undefined);
    assert.equal(normalizePrunaAspectRatio("1024x1792"), undefined);
    assert.equal(normalizePrunaAspectRatio("21:9"), undefined);
    assert.equal(normalizePrunaAspectRatio("5:4"), undefined);
});

check("认不出来的值一律不发（不猜）", () => {
    assert.equal(normalizePrunaAspectRatio("auto"), undefined);
    assert.equal(normalizePrunaAspectRatio(""), undefined);
    assert.equal(normalizePrunaAspectRatio("横屏"), undefined);
    assert.equal(normalizePrunaAspectRatio("0x720"), undefined);
});

check("能发出去的值一定是枚举成员", () => {
    const candidates = ["1280x720", "720x1280", "1024x1024", "1792x1024", "1024x1792", "auto", "1920x1080", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "1:1", "21:9"];
    for (const value of candidates) {
        const ratio = normalizePrunaAspectRatio(value);
        if (ratio === undefined) continue;
        assert.ok(PRUNA_VIDEO_ASPECT_RATIOS.includes(ratio), `${value} → ${ratio} 不在上游枚举里`);
    }
});

console.log("normalizePrunaResolution / normalizePrunaSeconds");

check("只有 1080 能拿到 1080p，其余落到上游默认 720p", () => {
    assert.equal(normalizePrunaResolution("1080p"), "1080p");
    assert.equal(normalizePrunaResolution("1080"), "1080p");
    assert.equal(normalizePrunaResolution("720p"), PRUNA_VIDEO_DEFAULT_RESOLUTION);
    assert.equal(normalizePrunaResolution("480p"), PRUNA_VIDEO_DEFAULT_RESOLUTION);
    assert.equal(normalizePrunaResolution("4k"), PRUNA_VIDEO_DEFAULT_RESOLUTION);
    assert.equal(normalizePrunaResolution(""), PRUNA_VIDEO_DEFAULT_RESOLUTION);
    assert.ok(PRUNA_VIDEO_RESOLUTIONS.includes(normalizePrunaResolution("1080p")));
});

check("时长落在上游的 1–20 区间，缺省用上游默认 5", () => {
    assert.equal(normalizePrunaSeconds("5"), 5);
    assert.equal(normalizePrunaSeconds("12.7"), 12);
    assert.equal(normalizePrunaSeconds("30"), PRUNA_VIDEO_MAX_SECONDS);
    assert.equal(normalizePrunaSeconds(""), PRUNA_VIDEO_DEFAULT_SECONDS);
    assert.equal(normalizePrunaSeconds(undefined), PRUNA_VIDEO_DEFAULT_SECONDS);
    assert.equal(normalizePrunaSeconds("abc"), PRUNA_VIDEO_DEFAULT_SECONDS);
    assert.equal(normalizePrunaSeconds("-3"), PRUNA_VIDEO_DEFAULT_SECONDS);
});

console.log("标定 ↔ 上游枚举 交叉核对");

check("标定里的每一档都能过上游这关（面板能选 = 上游能收）", () => {
    const capability = prunaVideoCapability();
    assert.equal(capability.kind, "video");
    assert.ok(capability.clarity.length, "至少要有一档清晰度");
    for (const clarity of capability.clarity) {
        const resolution = normalizePrunaResolution(`${clarity}p`);
        assert.ok(PRUNA_VIDEO_RESOLUTIONS.includes(resolution), `清晰度 ${clarity} 归一化后 ${resolution} 不在上游枚举里`);
        // 反向也要成立：标定里放的档位不能被归一化悄悄改掉（改掉就等于用户选 1080p 出 720p）
        assert.equal(resolution, `${clarity}p`, `清晰度 ${clarity} 会被归一化改成 ${resolution}`);
    }
    for (const size of capability.sizes) {
        assert.ok(normalizePrunaAspectRatio(size), `尺寸 ${size} 约分后不在上游 aspect_ratio 枚举里，一定会 422`);
    }
    for (const seconds of capability.seconds) {
        assert.ok(seconds >= PRUNA_VIDEO_MIN_SECONDS && seconds <= PRUNA_VIDEO_MAX_SECONDS, `秒数 ${seconds} 超出上游 1–20`);
    }
    assert.ok(capability.seconds.includes(PRUNA_VIDEO_DEFAULT_SECONDS), "上游默认 5 秒要能选到");
});

check("标定里不放 1792x1024 / 1024x1792（那两档是 422 的来源）", () => {
    const capability = prunaVideoCapability();
    assert.ok(!capability.sizes.includes("1792x1024"));
    assert.ok(!capability.sizes.includes("1024x1792"));
    // 1080p 必须留着：它是这个模型的高画质档，通用词汇表的默认（720/480）表达不了
    assert.ok(capability.clarity.includes("1080"));
});

check("后台预填给的就是这份标定", () => {
    assert.deepEqual(defaultCapabilityForModel("prunaai/p-video"), prunaVideoCapability());
    assert.deepEqual(defaultCapabilityForModel("cmsy19adf000mymtil2oza5g5::prunaai/p-video"), prunaVideoCapability());
});

check("清理器不会把 1080p / 5s 砍掉", () => {
    const sanitized = sanitizeCapabilities({ "prunaai/p-video": prunaVideoCapability() });
    assert.deepEqual(sanitized["prunaai/p-video"], prunaVideoCapability());
});

check("别的通用视频模型没被连带抬高（默认仍是 720/480 与 6–20 秒）", () => {
    assert.ok(!DEFAULT_GENERIC_VIDEO_CAPABILITY.clarity.includes("1080"));
    assert.ok(!DEFAULT_GENERIC_VIDEO_CAPABILITY.seconds.includes(5));
    const other = defaultCapabilityForModel("google/veo-3");
    assert.ok(!other.clarity.includes("1080"), "未标定的通用视频模型不该凭空多出 1080p");
    assert.ok(!other.seconds.includes(5), "未标定的通用视频模型不该凭空多出 5s");
});

check("草稿模式默认关（与上游 draft 默认一致）", () => {
    assert.equal(PRUNA_VIDEO_DEFAULT_DRAFT, false);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
    for (const failure of failures) console.error(`\n${failure.name}\n${failure.error.stack}`);
    process.exit(1);
}
