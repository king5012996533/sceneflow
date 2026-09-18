/**
 * 超时任务「补取件」判定的单测（纯逻辑）。
 *
 * 起因：2026-09-18 图片任务被判超时并退款，上游其实还在跑、过几分钟就出图了
 * —— 用户没拿到（退款了），上游的钱却已经花掉。现在清扫会先拿留痕的上游任务号问一句
 * 「到底出了没有」，这里钉住四种判定：
 *   已经产出        → 取回归档、改判成功、积分照收（用户之后从历史里能拿到）
 *   还在跑 / 说完成但没地址 → 这一轮先不动，十分钟后再问
 *   明确失败        → 退款（与没有补取件能力时行为一致）
 *   过了补取件窗口  → 一律退款（用户的钱不能被无限期挂着）
 *
 * 运行：npm run test:recovery
 */
import assert from "node:assert";

import { LATE_RESCUE_WINDOW_MS, RECOVERY_TASK_TIMEOUT_MS, RECOVERY_WINDOW_MS, decideRecovery, isLateRescueClaimable, isNetworkLayerFailure, isRecoveryEligible, isRecoveryExpired, shouldAwaitUpstreamSettlement } from "../src/lib/generation/generation-recovery.ts";

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

const NOW = Date.UTC(2026, 8, 18, 12, 0, 0);

check("常量：补取件窗口 6 小时，单次查询 30 秒", () => {
    assert.strictEqual(RECOVERY_WINDOW_MS, 6 * 60 * 60 * 1000);
    assert.strictEqual(RECOVERY_TASK_TIMEOUT_MS, 30_000);
});

check("能不能补：必须有上游任务号 + 取件地址", () => {
    assert.strictEqual(isRecoveryEligible({ externalId: "task_1", externalGetUrl: "https://api.apimart.ai/v1/tasks/task_1" }), true);
    assert.strictEqual(isRecoveryEligible({ externalId: "task_1", externalGetUrl: null }), false);
    assert.strictEqual(isRecoveryEligible({ externalId: null, externalGetUrl: "https://api.apimart.ai/v1/tasks/task_1" }), false);
    assert.strictEqual(isRecoveryEligible({}), false);
});

check("过期判定：窗口内不算过期，刚过窗口算过期", () => {
    assert.strictEqual(isRecoveryExpired(new Date(NOW - RECOVERY_WINDOW_MS + 60_000), NOW), false);
    assert.strictEqual(isRecoveryExpired(new Date(NOW - RECOVERY_WINDOW_MS - 60_000), NOW), true);
});

check("过期判定：时间读不出来一律当已过期（宁可退款，也不能把积分无限期挂着）", () => {
    for (const bad of [null, undefined, 0, "", "not-a-date"]) {
        assert.strictEqual(isRecoveryExpired(bad, NOW), true, `input=${String(bad)}`);
    }
});

check("核心：上游已产出 → 取回归档（积分照收，不退款）", () => {
    assert.strictEqual(decideRecovery({ status: "completed", urls: ["https://getapib.org/image/x.png"] }, { expired: false }), "archive");
});

check("核心：已经产出时即使过了窗口也照样取回（用户的成品不能因为我们等久了就丢）", () => {
    assert.strictEqual(decideRecovery({ status: "completed", urls: ["https://getapib.org/image/x.png"] }, { expired: true }), "archive");
});

check("上游还在跑 → 这一轮不动它", () => {
    assert.strictEqual(decideRecovery({ status: "pending", urls: [] }, { expired: false }), "wait");
});

check("说完成但没给出地址 → 也再等一轮（多半是报文结构没解析出来）", () => {
    assert.strictEqual(decideRecovery({ status: "completed", urls: [] }, { expired: false }), "wait");
});

check("窗口过了还等不到 → 按失败退款，不无限期挂着", () => {
    assert.strictEqual(decideRecovery({ status: "pending", urls: [] }, { expired: true }), "refund");
    assert.strictEqual(decideRecovery({ status: "completed", urls: [] }, { expired: true }), "refund");
});

check("上游明确失败 → 退款，与没有补取件能力时一致", () => {
    assert.strictEqual(decideRecovery({ status: "failed", urls: [] }, { expired: false }), "refund");
    assert.strictEqual(decideRecovery({ status: "failed", urls: [] }, { expired: true }), "refund");
});

// —— 补认领：客户端报失败跑赢了上游调用的登记，成品随后才到 ——

check("补认领窗口是 10 分钟", () => {
    assert.strictEqual(LATE_RESCUE_WINDOW_MS, 10 * 60 * 1000);
});

check("补认领：刚结为失败的任务，成品这时到达仍然认领", () => {
    assert.strictEqual(isLateRescueClaimable("failed", new Date(NOW - 30_000), NOW), true);
    assert.strictEqual(isLateRescueClaimable("failed", new Date(NOW - LATE_RESCUE_WINDOW_MS + 1_000), NOW), true);
    assert.strictEqual(isLateRescueClaimable("failed", new Date(NOW - LATE_RESCUE_WINDOW_MS - 1_000), NOW), false);
});

check("补认领：只认失败态，成功/取消/还在跑都不走这条路", () => {
    assert.strictEqual(isLateRescueClaimable("succeeded", new Date(NOW - 1_000), NOW), false);
    assert.strictEqual(isLateRescueClaimable("cancelled", new Date(NOW - 1_000), NOW), false);
    assert.strictEqual(isLateRescueClaimable("running", new Date(NOW - 1_000), NOW), false);
    assert.strictEqual(isLateRescueClaimable(null, new Date(NOW - 1_000), NOW), false);
});

check("补认领：结账时间读不出来就不认（宁可漏一次，也不能把陈年任务翻出来）", () => {
    for (const bad of [null, undefined, 0, "", "not-a-date"]) {
        assert.strictEqual(isLateRescueClaimable("failed", bad, NOW), false, `input=${String(bad)}`);
    }
});

check("补认领：时钟漂移写出来的「将来」时间不被当成新鲜失败", () => {
    assert.strictEqual(isLateRescueClaimable("failed", new Date(NOW + 20 * 60 * 1000), NOW), false);
    assert.strictEqual(isLateRescueClaimable("failed", new Date(NOW + 60_000), NOW), true);
});

check("网络层失败：fetch 抛错/断网文案算，上游明确报错不算", () => {
    assert.strictEqual(isNetworkLayerFailure(new TypeError("Failed to fetch")), true);
    assert.strictEqual(isNetworkLayerFailure(new Error("Failed to fetch")), true);
    assert.strictEqual(isNetworkLayerFailure(new Error("NetworkError when attempting to fetch resource.")), true);
    assert.strictEqual(isNetworkLayerFailure(new Error("Failed to fetch；网络层中断（没拿到 HTTP 响应）")), true);
    assert.strictEqual(isNetworkLayerFailure(new Error("Load failed")), true);
    assert.strictEqual(isNetworkLayerFailure("网络层中断（没拿到 HTTP 响应）"), true);
});

check("网络层失败：上游的真实报错不算网络层，用户该立刻看到原因", () => {
    assert.strictEqual(isNetworkLayerFailure(new Error("您提供的内容可能不符合平台规范，请调整后重试。")), false);
    assert.strictEqual(isNetworkLayerFailure(new Error("鉴权失败，请检查 API Key 或模型权限")), false);
    assert.strictEqual(isNetworkLayerFailure(new Error("HTTP 500：上游服务异常")), false);
    assert.strictEqual(isNetworkLayerFailure(undefined), false);
});

check("要不要等结论：结算没送到 → 等；被暂缓（running）→ 等；网络层失败 → 等", () => {
    assert.strictEqual(shouldAwaitUpstreamSettlement({ settledStatus: undefined, networkLayerFailure: false }), true);
    assert.strictEqual(shouldAwaitUpstreamSettlement({ settledStatus: null, networkLayerFailure: false }), true);
    assert.strictEqual(shouldAwaitUpstreamSettlement({ settledStatus: "running", networkLayerFailure: false }), true);
    assert.strictEqual(shouldAwaitUpstreamSettlement({ settledStatus: "failed", networkLayerFailure: true }), true);
});

check("要不要等结论：服务端已按上游真实报错结为失败 → 不等，立刻报错", () => {
    assert.strictEqual(shouldAwaitUpstreamSettlement({ settledStatus: "failed", networkLayerFailure: false }), false);
    assert.strictEqual(shouldAwaitUpstreamSettlement({ settledStatus: "cancelled", networkLayerFailure: false }), false);
    assert.strictEqual(shouldAwaitUpstreamSettlement({ settledStatus: "succeeded", networkLayerFailure: false }), false);
});

console.log(`\n补取件判定单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
