/**
 * 生成失败分类器的单元测试。
 *
 * 起因：线上 9 次 seedance2.5 视频生成失败，真实报错是
 * 「GenVideo 视频接口暂不支持参考视频/参考音频，请移除相关参考素材或改用 Seedance 模型」，
 * 但界面上显示成「模型配置异常 —— 请检查后台模型标识、服务商配置和当前节点选择的模型」，
 * 把用户引去看后台模型配置，与真实原因（当前渠道不接受参考视频）完全无关。
 * 原因是「模型」兜底规则太贪，把含「模型」二字的信息性报错全吞了。
 *
 * 所以这里直接拿线上那几条真实文案当用例，两个方向都要守住：
 *   该归到「不支持参考视频/音频」的必须归对；
 *   参考素材自身有问题的（时长超限、不能单独使用、必须是公网 URL）不能被误归过去。
 *
 * 运行：npm run test:error
 */
import assert from "node:assert";

import { summarizeCanvasGenerationError } from "../src/app/(user)/canvas/utils/canvas-generation-error.ts";

// 线上原样文案
const GENVIDEO_REFERENCE =
    "GenVideo 视频接口暂不支持参考视频/参考音频，请移除相关参考素材或改用 Seedance 模型";
const GENERIC_REFERENCE =
    "当前视频接口不支持参考视频或参考音频，请切换到 Seedance 2.0 / 火山 Agent Plan 模型，或移除参考素材";
const REPLICATE_REFERENCE =
    "当前 Replicate 视频模型只支持提示词和参考图，参考视频/音频仅 bytedance/seedance-2.0 支持";

let passed = 0;

function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ok  ${name}`);
    } catch (error) {
        console.error(`  FAIL ${name}\n       ${error.message}`);
        process.exitCode = 1;
    }
}

console.log("生成失败分类：参考视频/音频不被渠道接受");

check("GenVideo 那条线上文案：不能再显示「模型配置异常」", () => {
    const view = summarizeCanvasGenerationError(GENVIDEO_REFERENCE);
    assert.equal(view.title, "该模型不支持参考视频/音频");
    assert.ok(view.hint.includes("参考视频"), "提示应指向参考视频，而不是后台模型配置");
});

check("通用视频渠道的同类文案：同样归到参考素材问题", () => {
    assert.equal(summarizeCanvasGenerationError(GENERIC_REFERENCE).title, "该模型不支持参考视频/音频");
});

check("Replicate 那条（「仅 … 支持」句式）：也要命中", () => {
    assert.equal(summarizeCanvasGenerationError(REPLICATE_REFERENCE).title, "该模型不支持参考视频/音频");
});

check("request id 仍然透出", () => {
    const view = summarizeCanvasGenerationError(`${GENVIDEO_REFERENCE} (request id: abc123def)`);
    assert.equal(view.title, "该模型不支持参考视频/音频");
    assert.equal(view.requestId, "abc123def");
});

console.log("\n生成失败分类：参考素材自身的问题不能被误归");

check("参考视频时长超限：不该说成渠道不支持", () => {
    const view = summarizeCanvasGenerationError("Seedance 参考视频单个时长需要在 2-15 秒之间");
    assert.notEqual(view.title, "该模型不支持参考视频/音频");
});

check("参考视频总时长超限：不该说成渠道不支持", () => {
    const view = summarizeCanvasGenerationError("Seedance 参考视频总时长不能超过 15 秒");
    assert.notEqual(view.title, "该模型不支持参考视频/音频");
});

check("参考音频不能单独使用：不该说成渠道不支持", () => {
    const view = summarizeCanvasGenerationError("Seedance 参考音频不能单独使用，请同时添加参考图或参考视频");
    assert.notEqual(view.title, "该模型不支持参考视频/音频");
});

check("参考视频必须是公网 URL：不该说成渠道不支持", () => {
    const view = summarizeCanvasGenerationError("参考视频必须是公网 URL、素材 ID，或本地已保存的视频");
    assert.notEqual(view.title, "该模型不支持参考视频/音频");
});

console.log("\n生成失败分类：既有分类没有回归");

check("模型名写错（真·配置问题）：仍然显示「模型配置异常」", () => {
    assert.equal(summarizeCanvasGenerationError("model gpt-image-3 does not exist").title, "模型配置异常");
});

check("积分余额不足：仍归「额度或并发不足」", () => {
    assert.equal(summarizeCanvasGenerationError("H3 积分余额不足 (1008)").title, "额度或并发不足");
});

check("鉴权失败：仍归「模型鉴权失败」", () => {
    assert.equal(summarizeCanvasGenerationError("401 Unauthorized: invalid api key").title, "模型鉴权失败");
});

console.log("\n生成失败分类：平台渠道凭证失效（2026-09-20 Replicate 令牌被吊销那条线上反馈）");

// 服务端在凭证类失败时回的原样文案（唯一来源：lib/credential-health.ts 的 channelMaintenanceMessage，
// 拼进 composeUpstreamFailure 后就是下面这种形态：渠道维护说明 + 上游原话 + 状态码）。
const CHANNEL_DOWN =
    "模型「prunaai/p-video」所在渠道正在维护（上游凭证失效），已通知管理员，请稍后重试或先换用其它模型。；上游原话：You did not pass a valid authentication token；Replicate 建单失败（HTTP 401）";

check("平台渠道失效：显示「该模型所在渠道维护中」，而不是「模型鉴权失败」", () => {
    const view = summarizeCanvasGenerationError(CHANNEL_DOWN);
    assert.equal(view.title, "该模型所在渠道维护中");
});

check("提示里不许再叫用户去查 Base URL / API Key（他看不到也改不了，正是这次误报的根源）", () => {
    const view = summarizeCanvasGenerationError(CHANNEL_DOWN);
    for (const forbidden of ["Base URL", "API Key", "密钥"]) {
        assert.ok(!view.hint.includes(forbidden), `提示里不该出现「${forbidden}」：${view.hint}`);
    }
    assert.ok(view.hint.includes("不会扣积分"), `要说明这次不扣分：${view.hint}`);
    assert.ok(view.hint.includes("换用其它模型"), `要给出可行动的下一步：${view.hint}`);
});

check("渠道维护判定要压过 502 分支与鉴权分支（响应体里同时带 502 与上游 401 原话）", () => {
    const view = summarizeCanvasGenerationError(`502 Bad Gateway：${CHANNEL_DOWN}`);
    assert.equal(view.title, "该模型所在渠道维护中");
});

check("熔断窗口内直接拒绝（503 + 同一句话术）：同样归到渠道维护", () => {
    const view = summarizeCanvasGenerationError("模型「openai/gpt-image-2.5-flare」所在渠道正在维护（上游凭证失效），已通知管理员，请稍后重试或先换用其它模型。");
    assert.equal(view.title, "该模型所在渠道维护中");
});

check("用户自带 Key 填错（真·鉴权问题）：仍然提示去检查 Key，不能被渠道维护吞掉", () => {
    assert.equal(summarizeCanvasGenerationError("401 Unauthorized: invalid api key").title, "模型鉴权失败");
    assert.equal(summarizeCanvasGenerationError("鉴权失败：请检查 API Key").title, "模型鉴权失败");
});

check("空错误：仍走通用兜底", () => {
    const view = summarizeCanvasGenerationError("");
    assert.equal(view.title, "生成失败");
    assert.equal(view.hint, "请调整提示词或参考素材后重试。");
});

if (process.exitCode) console.error(`\n${passed} 项通过，存在失败`);
else console.log(`\n${passed} 项通过，全部通过`);
