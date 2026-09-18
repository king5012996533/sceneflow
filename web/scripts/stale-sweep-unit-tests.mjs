/**
 * 超时任务清扫的纯逻辑单测：超时窗口与「该扫谁 / 该跳过谁」。
 *
 * 起因：2026-09-18 线上 7 条任务卡在 running，24 积分挂着没退（最久 24 天）。
 * 结算原本只由浏览器和「同一用户下次生成」的懒清扫负责，浏览器消失就没人关账。
 * 补上全局清扫后，这里钉住三件事：
 *   1) 窗口/批量的边界：窗口不得短于 1 分钟（否则会误杀正在跑的任务），批量要有硬上限；
 *   2) 跳过规则只放行「有轮询器认领」的任务（replicate + 取件地址），它们有自己的超时逻辑；
 *   3) 关键反向用例——图片通道的任务虽然也记了取件地址，但没有任何轮询器认领，
 *      必须照扫，否则这次事故的 7 条永远出不来。
 *
 * 运行：npm run test:sweep
 */
import assert from "node:assert";

import { DEFAULT_SWEEP_LIMIT, MAX_SWEEP_LIMIT, MIN_SWEEP_WINDOW_MS, STALE_JOB_MS, SWEEP_POLLED_PROVIDER, isSweepExcluded, resolveSweepWindow } from "../src/lib/generation/generation-stale.ts";

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

const NOW = Date.UTC(2026, 8, 18, 11, 30, 0); // 2026-09-18 19:30 CST

check("默认窗口：30 分钟，cutoff = now - 30 分钟", () => {
    const window = resolveSweepWindow({ now: NOW });
    assert.strictEqual(window.olderThanMs, STALE_JOB_MS);
    assert.strictEqual(STALE_JOB_MS, 30 * 60 * 1000);
    assert.strictEqual(window.cutoff.getTime(), NOW - 30 * 60 * 1000);
});

check("默认批量：50 条", () => {
    assert.strictEqual(resolveSweepWindow({ now: NOW }).limit, DEFAULT_SWEEP_LIMIT);
    assert.strictEqual(DEFAULT_SWEEP_LIMIT, 50);
});

check("窗口下限：传 1 秒被抬到 1 分钟，不允许把正在跑的任务扫掉", () => {
    const window = resolveSweepWindow({ olderThanMs: 1000, now: NOW });
    assert.strictEqual(window.olderThanMs, MIN_SWEEP_WINDOW_MS);
    assert.strictEqual(window.cutoff.getTime(), NOW - 60 * 1000);
});

check("窗口上限：传 8 小时照用（一次性结历史欠账要用）", () => {
    const window = resolveSweepWindow({ olderThanMs: 8 * 60 * 60 * 1000, now: NOW });
    assert.strictEqual(window.olderThanMs, 8 * 60 * 60 * 1000);
});

check("非法输入退回默认值，不得把窗口变成 0 或 NaN", () => {
    for (const bad of [undefined, null, NaN, 0, -5, "abc"]) {
        const window = resolveSweepWindow({ olderThanMs: bad, now: NOW });
        assert.strictEqual(window.olderThanMs, STALE_JOB_MS, `olderThanMs=${String(bad)}`);
    }
    for (const bad of [undefined, null, NaN, 0, -1, "abc"]) {
        assert.strictEqual(resolveSweepWindow({ limit: bad, now: NOW }).limit, DEFAULT_SWEEP_LIMIT, `limit=${String(bad)}`);
    }
});

check("批量上限：9999 被钳到 200", () => {
    assert.strictEqual(resolveSweepWindow({ limit: 9999, now: NOW }).limit, MAX_SWEEP_LIMIT);
    assert.strictEqual(MAX_SWEEP_LIMIT, 200);
    assert.strictEqual(resolveSweepWindow({ limit: 10, now: NOW }).limit, 10);
});

check("跳过：有轮询器认领的任务（replicate + 取件地址）不进清扫", () => {
    assert.strictEqual(isSweepExcluded({ provider: SWEEP_POLLED_PROVIDER, externalGetUrl: "https://api.replicate.com/v1/predictions/x" }), true);
    assert.strictEqual(SWEEP_POLLED_PROVIDER, "replicate");
});

check("跳过：replicate 但还没有取件地址 → 没人认领，必须照扫", () => {
    assert.strictEqual(isSweepExcluded({ provider: "replicate", externalGetUrl: null }), false);
    assert.strictEqual(isSweepExcluded({ provider: "replicate" }), false);
});

check("关键反向用例：图片通道记了取件地址也必须照扫（本次事故的 7 条就靠这个）", () => {
    assert.strictEqual(isSweepExcluded({ provider: "api.apimart.ai", externalGetUrl: "https://api.apimart.ai/v1/tasks/task_01M2T4GS3KWA87PYRBJFN0NX7M" }), false);
    assert.strictEqual(isSweepExcluded({ provider: null, externalGetUrl: "https://getapib.org/image/x.png" }), false);
    assert.strictEqual(isSweepExcluded({}), false);
});

console.log(`\n超时清扫单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
