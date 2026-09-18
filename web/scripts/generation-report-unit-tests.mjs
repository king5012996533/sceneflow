/**
 * 生成链路每日对账的排版与归账单测（纯逻辑）。
 *
 * 目标：让「上游给了成品、我们没收费」和「有成品却没留下」这两类变成日报里可数的数字，
 * 而不是每次靠人翻日志猜。这里钉住四本账的口径与告警触发。
 *
 * 运行：npm run test:report
 */
import assert from "node:assert";

import { buildDailyReport } from "../src/lib/generation/generation-report.ts";

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

const base = {
    date: "2026-09-18",
    windowHours: 24,
    total: 100,
    succeeded: 80,
    failed: 12,
    cancelled: 6,
    running: 2,
    upstreamOkCharged: 78,
    upstreamOkNotCharged: 6,
    upstreamOkNotChargedByOurFault: 2,
    upstreamFailedRefunded: 12,
    artifactDropped: 0,
    chargedWithoutLocalArtifact: 4,
    topFailures: [{ reason: "上游超时", count: 5 }],
};

check("四本账都在日报里，数字与入参一致", () => {
    const { markdown } = buildDailyReport(base);
    assert.match(markdown, /上游出图 · 已收费 \| 78/);
    assert.match(markdown, /上游出图 · 未收费 \| 6/);
    assert.match(markdown, /上游失败 · 已退款 \| 12/);
    assert.match(markdown, /有成品却没留下 \| 0/);
});

check("未收费这一类要拆开：用户取消保图 vs 我们故障补认领，两者相加等于总数", () => {
    const { markdown } = buildDailyReport(base);
    assert.match(markdown, /用户取消保图 4 ＋ 我们故障补认领 2/);
});

check("丢图为 0 时是目标值，不是告警", () => {
    const { markdown } = buildDailyReport(base);
    assert.match(markdown, /目标值 0/);
    assert.doesNotMatch(markdown, /告警/);
});

check("丢图 > 0 必须显眼告警（这是把钱烧掉的直接证据）", () => {
    const { markdown } = buildDailyReport({ ...base, artifactDropped: 3 });
    assert.match(markdown, /告警：又白烧了 3 次/);
});

check("标题把三个关键数带出来，扫一眼就知道今天有没有出事", () => {
    const { subject } = buildDailyReport({ ...base, artifactDropped: 1 });
    assert.match(subject, /出图 84 次/);
    assert.match(subject, /未收费 6 次/);
    assert.match(subject, /丢图 1 次/);
});

check("失败原因前五要进日报，且只说前五条", () => {
    const topFailures = Array.from({ length: 7 }, (_, index) => ({ reason: `原因${index + 1}`, count: 7 - index }));
    const { markdown } = buildDailyReport({ ...base, topFailures });
    assert.match(markdown, /7 × 原因1/);
    assert.doesNotMatch(markdown, /原因6/);
});

check("收费但本地无成品属预期项，只在有数字时出现且措辞不吓人", () => {
    const withNote = buildDailyReport({ ...base, chargedWithoutLocalArtifact: 4 }).markdown;
    assert.match(withNote, /另有 4 条已收费任务本地没有成品副本/);
    assert.match(withNote, /属预期/);
    const without = buildDailyReport({ ...base, chargedWithoutLocalArtifact: 0 }).markdown;
    assert.doesNotMatch(without, /本地没有成品副本/);
});

check("口径说明必须写明「有成品」和「没留下」是怎么判定的，免得以后对不上账", () => {
    const { markdown } = buildDailyReport(base);
    assert.match(markdown, /resultData\.items 里带归档键/);
    assert.match(markdown, /externalStatus='dropped'/);
});

console.log(`\n生成对账日报单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
