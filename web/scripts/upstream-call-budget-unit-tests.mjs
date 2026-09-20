/**
 * 单任务上游调用预算的单测（纯逻辑，无数据库、无网络）。
 *
 * 钉住的是 H1 修复的最后一块：任务号能反复使用，
 * 不给预算就是「付一张图的钱、拿同一条任务号打 N 次上游」——
 * 门闸认得「这一单付过钱」，但不会自动知道「这一单只该打几次」。
 *
 * 运行：npm run test:budget
 */
import assert from "node:assert";

import { consumeUpstreamCallBudget, readUpstreamCallBudget, releaseUpstreamCallBudget, resetUpstreamCallBudget } from "../src/lib/generation/upstream-call-budget.ts";

let passed = 0;
const failures = [];

function check(name, fn) {
    resetUpstreamCallBudget();
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

check("预算内放行，用满即拒绝", () => {
    assert.strictEqual(consumeUpstreamCallBudget("job-1", 3), true);
    assert.strictEqual(consumeUpstreamCallBudget("job-1", 3), true);
    assert.strictEqual(consumeUpstreamCallBudget("job-1", 3), true);
    assert.strictEqual(consumeUpstreamCallBudget("job-1", 3), false, "第 4 次必须拒绝");
    assert.deepStrictEqual(readUpstreamCallBudget("job-1"), { used: 3, limit: 3 });
});

check("拒绝之后仍是拒绝（不会因为失败调用而被重置）", () => {
    for (let i = 0; i < 5; i += 1) consumeUpstreamCallBudget("job-1", 2);
    assert.strictEqual(consumeUpstreamCallBudget("job-1", 2), false);
    assert.strictEqual(readUpstreamCallBudget("job-1").used, 2, "被拒的调用不计入用量");
});

check("同一任务的预算以第一次的值为准（不让人用更大的预算重置）", () => {
    consumeUpstreamCallBudget("job-1", 2);
    assert.strictEqual(consumeUpstreamCallBudget("job-1", 100), true);
    assert.strictEqual(consumeUpstreamCallBudget("job-1", 100), false, "第二次想用 100 的预算重开一局——不准");
    assert.strictEqual(readUpstreamCallBudget("job-1").limit, 2);
});

check("没有任务号一律拒绝（门闸要求生成类必须挂任务）", () => {
    assert.strictEqual(consumeUpstreamCallBudget("", 5), false);
});

check("不同任务各自计数，互不干扰", () => {
    assert.strictEqual(consumeUpstreamCallBudget("job-a", 1), true);
    assert.strictEqual(consumeUpstreamCallBudget("job-a", 1), false);
    assert.strictEqual(consumeUpstreamCallBudget("job-b", 1), true, "job-b 不受 job-a 影响");
});

check("释放后计数清零（任务关账后该任务号不再使用）", () => {
    consumeUpstreamCallBudget("job-1", 1);
    assert.strictEqual(consumeUpstreamCallBudget("job-1", 1), false);
    releaseUpstreamCallBudget("job-1");
    assert.strictEqual(readUpstreamCallBudget("job-1"), null);
    assert.strictEqual(consumeUpstreamCallBudget("job-1", 1), true);
});

check("预算非法值兜底为 1，不会因为 0/NaN 变成无限放行", () => {
    assert.strictEqual(consumeUpstreamCallBudget("job-1", 0), true);
    assert.strictEqual(consumeUpstreamCallBudget("job-1", 0), false);
    resetUpstreamCallBudget();
    assert.strictEqual(consumeUpstreamCallBudget("job-2", Number.NaN), true);
    assert.strictEqual(consumeUpstreamCallBudget("job-2", Number.NaN), false);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
