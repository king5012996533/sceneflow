/**
 * 生成任务退款政策的单测（纯逻辑）。
 *
 * 起因：2026-09-19 老板定过一版「失败/取消一律不退」，2026-09-20 改了回来 ——
 * 用户没拿到成品就不该扣钱：线上真有整类任务上游**压根没受理**（建单被参数校验 400、
 * 本地预检就拦下），上游一分钱没收到，我们却照收积分，用户只看得到一句失败提示。
 * 唯一不退的例外是「成品已经归档在我们手上」——那一次钱换到了东西。
 *
 * 这条政策直接决定用户看到的账（记录页、积分流水、定价页文案）与日报口径，
 * 所以钉在测试里：谁把开关悄翻回去、或者把「成品已归档」这个例外丢掉，这里必须红。
 *
 * 运行：npm run test:refund
 */
import assert from "node:assert";

import { GENERATION_REFUNDS_ENABLED, shouldRefundGeneration } from "../src/lib/generation/generation-refund-policy.ts";

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

check("核心：失败要退（用户什么都没拿到）", () => {
    assert.strictEqual(shouldRefundGeneration("failed"), true);
});

check("核心：用户取消也要退（同上口径，不能出现「取消退、失败不退」的半套规则）", () => {
    assert.strictEqual(shouldRefundGeneration("cancelled"), true);
});

check("成功从来不退：预扣即实收", () => {
    assert.strictEqual(shouldRefundGeneration("succeeded"), false);
    assert.strictEqual(shouldRefundGeneration("succeeded", true), false);
});

check("唯一的例外：成品已经归档到我们手上（用户能取到），失败也不退 —— 钱换到了东西", () => {
    assert.strictEqual(shouldRefundGeneration("failed", true), false);
    assert.strictEqual(shouldRefundGeneration("cancelled", true), false);
});

check("例外只关「成品有没有归档」这一件事：没归档的失败/取消一律退", () => {
    assert.strictEqual(shouldRefundGeneration("failed", false), true);
    assert.strictEqual(shouldRefundGeneration("cancelled", false), true);
});

check("政策开关本身是开的：这版代码会退每一次没拿到成品的生成", () => {
    assert.strictEqual(GENERATION_REFUNDS_ENABLED, true);
});

check("非成功态口径一致：失败与取消同进同出", () => {
    const outcomes = ["failed", "cancelled"].map((status) => [shouldRefundGeneration(status), shouldRefundGeneration(status, true)]);
    assert.deepStrictEqual(outcomes[0], outcomes[1]);
    assert.deepStrictEqual(outcomes[0], [true, false]);
});

console.log(`\n生成退款政策单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
