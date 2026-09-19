/**
 * 生成任务退款政策的单测（纯逻辑）。
 *
 * 起因：2026-09-19 老板定了新规则——生成失败/取消**一律不退积分**，就算什么都没生成也不退。
 * 这条规则会直接改变用户看到的账（记录页、积分流水）与日报口径，所以把它钉在测试里：
 * 谁哪天把开关翻回去，这里必须红。
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

check("核心：失败不退（政策规定），成功本来就不退", () => {
    assert.strictEqual(shouldRefundGeneration("failed"), false);
    assert.strictEqual(shouldRefundGeneration("succeeded"), false);
});

check("核心：用户取消也不退（上游已经按这一次尝试收过我们的钱了）", () => {
    assert.strictEqual(shouldRefundGeneration("cancelled"), false);
});

check("政策开关本身就是关的：默认这版代码不退任何一次生成", () => {
    assert.strictEqual(GENERATION_REFUNDS_ENABLED, false);
});

check("取消/超时/失败三种非成功态口径一致，不出现「取消退、失败不退」这种半套规则", () => {
    const outcomes = ["failed", "cancelled"].map((status) => shouldRefundGeneration(status));
    assert.deepStrictEqual(new Set(outcomes), new Set([false]));
});

console.log(`\n生成退款政策单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
