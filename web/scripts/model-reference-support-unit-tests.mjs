/**
 * 「这个模型吃不吃参考图」判定的单测（纯逻辑）。
 *
 * 起因（2026-09-19）：新接的 recraft-ai/recraft-v4-pro 入参里**没有图像字段**（只有 prompt /
 * aspect_ratio / size，v3 多一个 style），而应用无条件把参考图塞进 input_images。上游对多余的
 * 输入字段是**静默忽略**而非报错 —— 线上实测：任务带 1 张参考图，29 秒 succeeded、成图与参考图
 * 毫无关系，积分照扣。这种错永远不会以报错的形式暴露，所以必须在客户端就把它挡住。
 *
 * 判定必须「缺省即支持」：名单里只有明确登记过的模型才返回 false，否则一有误判就会把正常模型的
 * 参考图入口也关掉（比原来的问题更严重）。
 *
 * 运行：npm run test:refsupport
 */
import assert from "node:assert";

import { REFERENCE_UNSUPPORTED_HINT, modelNameSupportsReferences, stripModelChannelPrefix } from "../src/lib/model-reference-support.ts";

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

console.log("modelNameSupportsReferences");

check("recraft 系（上游没有图像入参）→ 不支持", () => {
    assert.equal(modelNameSupportsReferences("recraft-ai/recraft-v4-pro"), false);
    assert.equal(modelNameSupportsReferences("recraft-ai/recraft-v4"), false);
    assert.equal(modelNameSupportsReferences("recraft-ai/recraft-v3"), false);
    assert.equal(modelNameSupportsReferences("recraft-ai/recraft-20b"), false);
    // 大小写不该影响判定（后台可能手填成 Recraft-AI/Recraft-V4-Pro）
    assert.equal(modelNameSupportsReferences("Recraft-AI/Recraft-V4-Pro"), false);
});

check("支持参考图的模型 → 支持", () => {
    assert.equal(modelNameSupportsReferences("openai/gpt-image-2.5-flare"), true);
    assert.equal(modelNameSupportsReferences("gpt-image-2"), true);
    assert.equal(modelNameSupportsReferences("qwen-image-3.0"), true);
    assert.equal(modelNameSupportsReferences("seedream-5-0-pro"), true);
    // 视频模型走的是另一套参考能力，这里不该拦
    assert.equal(modelNameSupportsReferences("seedance2.5"), true);
});

check("渠道前缀（chan::model）先剥掉再判", () => {
    assert.equal(modelNameSupportsReferences("chan-1::recraft-ai/recraft-v4-pro"), false);
    // owner/name 本身带斜杠，剥前缀不能把斜杠当分隔符
    assert.equal(stripModelChannelPrefix("recraft-ai/recraft-v4-pro"), "recraft-ai/recraft-v4-pro");
    assert.equal(stripModelChannelPrefix("chan-1::recraft-v3"), "recraft-v3");
    assert.equal(stripModelChannelPrefix("  纯空白前后缀  "), "纯空白前后缀");
});

check("缺省即支持（名单外的一律放行，避免误伤）", () => {
    assert.equal(modelNameSupportsReferences("some-brand-new-thing"), true);
    assert.equal(modelNameSupportsReferences(""), true);
    assert.equal(modelNameSupportsReferences("   "), true);
    assert.equal(modelNameSupportsReferences(null), true);
    assert.equal(modelNameSupportsReferences(undefined), true);
});

check("提示文案不为空（界面直接显示给用户）", () => {
    assert.equal(typeof REFERENCE_UNSUPPORTED_HINT, "string");
    assert.ok(REFERENCE_UNSUPPORTED_HINT.includes("不支持参考图"), "文案要说清是不支持参考图");
});

if (failures.length) {
    console.error(`\n${failures.length} 项失败 / 共 ${passed + failures.length} 项`);
    process.exit(1);
}
console.log(`\n全部通过（${passed} 项）`);
