/**
 * 渠道健康（熔断）纯逻辑单测。
 *
 * 起因：线上的 Replicate 平台令牌被吊销后，用户看到的是「模型鉴权失败 —— 请检查 Base URL、
 * API Key、模型名是否正确」（这条文案本来是写给管理员的，见 canvas-generation-error.ts），
 * 同一个人连撞两次都只拿到一句 502。平台侧其实知道是哪张凭证、什么状态码。
 *
 * 这套逻辑要守住的口径：
 *   1) 只有 401/403 才算「钥匙坏了」—— 400（参数/内容审核）、429（限流）、5xx（上游波动）
 *      算进来会让一次内容审核失败就把整条渠道掐掉；
 *   2) 连击到阈值才开窗，成功一次立刻清零（真实流量即探针，我们的调用量撑不起慢恢复）；
 *   3) 窗口到期自动半开，不做「永久熔断」—— 否则换好钥匙还得有人记得来解锁；
 *   4) 面向用户的文案不许叫用户去查 Base URL / API Key（他看不到也改不了）。
 *
 * 运行：npm run test:credentialhealth
 */
import assert from "node:assert";

import {
    CHANNEL_DOWN_TAG,
    CREDENTIAL_CIRCUIT_WINDOW_MS,
    CREDENTIAL_FAILURE_THRESHOLD,
    channelMaintenanceMessage,
    computeModelAvailability,
    describeCredentialHealth,
    isCredentialAuthStatus,
    isCredentialCircuitOpen,
    manualHealthResetPatch,
    nextHealthAfterFailure,
    nextHealthAfterSuccess,
} from "../src/lib/credential-health.ts";

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

const NOW = new Date("2026-09-20T08:00:00.000Z");
const minutes = (n) => n * 60 * 1000;

console.log("渠道健康：只有鉴权失败算「钥匙坏了」");

check("401 / 403 是凭证类失败", () => {
    assert.strictEqual(isCredentialAuthStatus(401), true);
    assert.strictEqual(isCredentialAuthStatus(403), true);
});

check("参数错、限流、上游 5xx、成功都不是凭证类失败（否则一次内容审核失败就掐掉渠道）", () => {
    for (const status of [200, 400, 402, 404, 413, 422, 429, 500, 502, 503]) {
        assert.strictEqual(isCredentialAuthStatus(status), false, `HTTP ${status} 不该判成凭证类失败`);
    }
});

console.log("\n渠道健康：熔断窗口");

check("没熔断过（healthDownUntil 为空）不算开窗", () => {
    assert.strictEqual(isCredentialCircuitOpen({ healthDownUntil: null }, NOW), false);
    assert.strictEqual(isCredentialCircuitOpen({}, NOW), false);
});

check("窗口未到期 = 开窗；已过期 = 自动半开", () => {
    assert.strictEqual(isCredentialCircuitOpen({ healthDownUntil: new Date(NOW.getTime() + minutes(1)) }, NOW), true);
    assert.strictEqual(isCredentialCircuitOpen({ healthDownUntil: new Date(NOW.getTime() - 1) }, NOW), false);
});

check("窗口到点那一刻即放行（> 而不是 >=，边界不能把它永远关着）", () => {
    assert.strictEqual(isCredentialCircuitOpen({ healthDownUntil: new Date(NOW.getTime()) }, NOW), false);
});

console.log("\n渠道健康：连击与开窗");

check("第一次失败只记一笔，不开窗", () => {
    const patch = nextHealthAfterFailure({ healthFailStreak: 0 }, 401, NOW);
    assert.strictEqual(patch.healthFailStreak, 1);
    assert.strictEqual(patch.healthDownUntil, null);
    assert.strictEqual(patch.tripped, false);
    assert.strictEqual(patch.healthLastStatus, 401);
    assert.deepStrictEqual(patch.healthLastFailureAt, NOW);
});

check("差一次到阈值仍然不开窗", () => {
    const patch = nextHealthAfterFailure({ healthFailStreak: CREDENTIAL_FAILURE_THRESHOLD - 1 }, 403, NOW);
    assert.strictEqual(patch.healthFailStreak, CREDENTIAL_FAILURE_THRESHOLD);
    assert.strictEqual(patch.tripped, true, "第 3 次失败就该开窗");
    assert.strictEqual(patch.healthDownUntil.getTime(), NOW.getTime() + CREDENTIAL_CIRCUIT_WINDOW_MS);
});

check("未到阈值的那次失败：连击累加但窗口保持为空", () => {
    const patch = nextHealthAfterFailure({ healthFailStreak: 1, healthDownUntil: null }, 401, NOW);
    assert.strictEqual(patch.healthFailStreak, 2);
    assert.strictEqual(patch.tripped, false);
    assert.strictEqual(patch.healthDownUntil, null);
});

check("已经在窗口内的凭证再失败：不重复触发告警，也不延长窗口（熔断中的凭证本就不参与解析）", () => {
    const openUntil = new Date(NOW.getTime() + minutes(10));
    const patch = nextHealthAfterFailure({ healthFailStreak: 5, healthDownUntil: openUntil, healthNote: "上一次的说明" }, 401, NOW);
    assert.strictEqual(patch.tripped, false);
    assert.strictEqual(patch.healthDownUntil.getTime(), openUntil.getTime(), "窗口不得被这次失败顺延");
    assert.strictEqual(patch.healthNote, "上一次的说明", "不该覆盖上一次的熔断说明");
});

check("熔断说明里带上状态码与恢复时间（后台列表直接显示这一行）", () => {
    const patch = nextHealthAfterFailure({ healthFailStreak: 2 }, 401, NOW);
    assert.ok(patch.healthNote.includes("HTTP 401"), `说明里要有状态码：${patch.healthNote}`);
    assert.ok(patch.healthNote.includes("连续 3 次"), `说明里要有连击次数：${patch.healthNote}`);
});

check("阈值与窗口是明确写死的常量（改动必须是有意识的）", () => {
    assert.strictEqual(CREDENTIAL_FAILURE_THRESHOLD, 3);
    assert.strictEqual(CREDENTIAL_CIRCUIT_WINDOW_MS, 30 * 60 * 1000);
});

console.log("\n渠道健康：恢复");

check("成功一次就全部清零（连击、状态码、熔断窗口）", () => {
    const patch = nextHealthAfterSuccess({ healthFailStreak: 2, healthDownUntil: new Date(NOW.getTime() + minutes(20)), healthNote: "x" }, NOW);
    assert.strictEqual(patch.healthFailStreak, 0);
    assert.strictEqual(patch.healthDownUntil, null);
    assert.strictEqual(patch.healthLastStatus, null);
    assert.strictEqual(patch.healthLastFailureAt, null);
    assert.strictEqual(patch.healthNote, null);
    assert.deepStrictEqual(patch.healthLastSuccessAt, NOW);
});

check("admin「立即重试」不算一次成功：不能把「最近一次成功」写成现在（钥匙可能还是坏的）", () => {
    const patch = manualHealthResetPatch();
    assert.strictEqual(patch.healthDownUntil, null);
    assert.strictEqual(patch.healthFailStreak, 0);
    assert.strictEqual(patch.healthLastSuccessAt, null);
    assert.ok(patch.healthNote && patch.healthNote.length > 0, "要留一句说明，否则后台只显示「尚无调用记录」");
});

console.log("\n渠道健康：后台展示");

check("熔断中：红色档 + 说明", () => {
    const view = describeCredentialHealth({ healthDownUntil: new Date(NOW.getTime() + minutes(5)), healthNote: "连续 3 次凭证类失败（HTTP 401）" }, NOW);
    assert.strictEqual(view.state, "down");
    assert.strictEqual(view.label, "已熔断");
    assert.ok(view.detail.includes("HTTP 401"));
});

check("有连击但没熔断：告警档，说明离阈值还差几次", () => {
    const view = describeCredentialHealth({ healthFailStreak: 2, healthLastStatus: 401, healthLastFailureAt: NOW }, NOW);
    assert.strictEqual(view.state, "failing");
    assert.strictEqual(view.label, "失败 2 次");
    assert.ok(view.detail.includes("HTTP 401"));
});

check("窗口已过期但连击还在：属于「半开」—— 状态仍要标出来，下一次失败会立刻再拉闸", () => {
    const view = describeCredentialHealth({ healthFailStreak: 3, healthDownUntil: new Date(NOW.getTime() - 1) }, NOW);
    assert.strictEqual(view.state, "failing");
    assert.ok(view.detail.includes("窗口已到期"), `窗口过期后不能再说「连续 3 次将暂停」——那件事已经发生了：${view.detail}`);
});

check("没到阈值的连击：提示离阈值还差几次（后台能预期下一步）", () => {
    const view = describeCredentialHealth({ healthFailStreak: 1, healthLastStatus: 403 }, NOW);
    assert.strictEqual(view.state, "failing");
    assert.ok(view.detail.includes("连续 3 次将暂停"), view.detail);
});

check("完全干净：正常 + 最近一次成功时间", () => {
    const view = describeCredentialHealth({ healthFailStreak: 0, healthLastSuccessAt: NOW }, NOW);
    assert.strictEqual(view.state, "ok");
    assert.strictEqual(view.label, "正常");
    assert.ok(view.detail.includes("最近一次成功"), view.detail);
});

check("正常但对不上最近成功时间时，显示手动解除的说明而不是编一个成功时间", () => {
    const view = describeCredentialHealth({ healthNote: "管理员已手动解除熔断，等待下一次调用验证" }, NOW);
    assert.strictEqual(view.state, "ok");
    assert.ok(view.detail.includes("手动解除"));
});

console.log("\n渠道健康：模型目录可用性（熔断掐的是凭证，不是模型）");

const OPEN_UNTIL = new Date(NOW.getTime() + minutes(20));
const DOWN_ROW = { name: "坏渠道", models: ["m-down", "m-both"], healthDownUntil: OPEN_UNTIL };
const GOOD_ROW = { name: "好渠道", models: ["m-good", "m-both"], healthDownUntil: null };

check("只有熔断渠道认领的模型 → 不可用", () => {
    const map = computeModelAvailability([DOWN_ROW, GOOD_ROW], NOW);
    assert.deepStrictEqual(map.get("m-down"), { available: false, downNames: ["坏渠道"] });
});

check("另有一张健康凭证认领同一模型 → 仍然可用（有备份渠道就不该把用户拦住）", () => {
    assert.strictEqual(computeModelAvailability([DOWN_ROW, GOOD_ROW], NOW).get("m-both").available, true);
});

check("没出事的渠道：可用，且不该被标上不可用原因", () => {
    assert.deepStrictEqual(computeModelAvailability([DOWN_ROW, GOOD_ROW], NOW).get("m-good"), { available: true, downNames: [] });
});

check("查不到的模型返回 undefined —— 调用方按「可用」处理（自带 Key / 未标定的模型不能被误置灰）", () => {
    assert.strictEqual(computeModelAvailability([DOWN_ROW], NOW).get("m-unknown"), undefined);
});

check("同一个模型被两张熔断渠道认领：两个渠道名都要报出来（排障要知道该去修哪几张）", () => {
    const map = computeModelAvailability([DOWN_ROW, { name: "坏渠道二", models: ["m-down"], healthDownUntil: OPEN_UNTIL }], NOW);
    assert.deepStrictEqual(map.get("m-down").downNames, ["坏渠道", "坏渠道二"]);
});

check("没写名字的凭证也要能读（后台列表里不许出现 undefined）", () => {
    const map = computeModelAvailability([{ models: ["m-orphan"], healthDownUntil: OPEN_UNTIL }], NOW);
    assert.deepStrictEqual(map.get("m-orphan").downNames, ["未命名渠道"]);
});

check("空模型列表 / 空白模型名不产生条目", () => {
    const map = computeModelAvailability([{ name: "x", models: [], healthDownUntil: OPEN_UNTIL }, { name: "y", models: ["  "], healthDownUntil: OPEN_UNTIL }], NOW);
    assert.strictEqual(map.size, 0);
});

console.log("\n渠道健康：面向用户的文案");

check("文案是给用户的：点明渠道维护中、已通知管理员、这次不扣分", () => {
    const text = channelMaintenanceMessage("prunaai/p-video");
    assert.ok(text.includes("上游凭证失效"), text);
    assert.ok(text.includes("已通知管理员"), text);
    assert.ok(text.includes("prunaai/p-video"), "带上模型名，用户才知道该换哪个");
});

check("不许叫终端用户去查 Base URL / API Key（他看不到也改不了，照着查只会白费劲）", () => {
    const text = channelMaintenanceMessage("gpt-image-2.5-flare");
    for (const forbidden of ["Base URL", "baseUrl", "API Key", "apiKey", "密钥"]) {
        assert.ok(!text.includes(forbidden), `用户文案里不该出现「${forbidden}」：${text}`);
    }
});

check("没给模型名时也要读得通", () => {
    const text = channelMaintenanceMessage();
    assert.ok(text.startsWith("该模型所在渠道"), text);
});

check("选择器角标是唯一来源（界面不许就地写死一份）", () => {
    assert.strictEqual(CHANNEL_DOWN_TAG, "渠道维护中");
});

console.log(`\n渠道健康单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
