/**
 * 生成成品「保留与清理」判定的单测（纯逻辑）。
 *
 * 起因：2026-09-18 服务端归档上线后，成品只进不出，总有一天会把磁盘占满；
 * 但清理必须留够交付窗口——用户隔天回来找「当时没拿到的那张图」，我们得还拿得出手
 * （上游的钱已经花了，拿不出东西就没法向用户收这笔额度）。
 * 这里钉住三件事：保留窗口怎么算、哪些文件才允许删、目录里出现意外文件时怎么办。
 *
 * 运行：npm run test:retention
 */
import assert from "node:assert";

import {
    DAY_MS,
    DEFAULT_RETENTION_DAYS,
    DEFAULT_TZ_OFFSET_MINUTES,
    MAX_RETENTION_DAYS,
    MIN_RETENTION_DAYS,
    mimeTypeExtension,
    parseArchiveKey,
    purgedMediaMessage,
    resolvePruneLimit,
    resolveRetentionDays,
    resolveRetentionWindow,
    shouldPurgeArchiveFile,
    startOfLocalDay,
} from "../src/lib/generation/generation-media-retention.ts";

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

// 2026-09-18 04:10（UTC+8）= 2026-09-17T20:10Z
const NOW = Date.UTC(2026, 8, 17, 20, 10);
// 2026-09-18 00:00（UTC+8）= 2026-09-17T16:00Z
const TODAY_START = Date.UTC(2026, 8, 17, 16, 0);
// 2026-09-17 00:00（UTC+8）= 2026-09-16T16:00Z
const YESTERDAY_START = Date.UTC(2026, 8, 16, 16, 0);

check("常量：默认保留 2 天，下限 1 天上限 30 天，服务器时区 UTC+8", () => {
    assert.strictEqual(DEFAULT_RETENTION_DAYS, 2);
    assert.strictEqual(MIN_RETENTION_DAYS, 1);
    assert.strictEqual(MAX_RETENTION_DAYS, 30);
    assert.strictEqual(DEFAULT_TZ_OFFSET_MINUTES, 480);
    assert.strictEqual(DAY_MS, 86_400_000);
});

check("保留天数：非法值退回默认，越界夹进上下限（环境变量给的是字符串）", () => {
    assert.strictEqual(resolveRetentionDays(undefined), 2);
    assert.strictEqual(resolveRetentionDays(""), 2);
    assert.strictEqual(resolveRetentionDays("abc"), 2);
    assert.strictEqual(resolveRetentionDays(0), 2);
    assert.strictEqual(resolveRetentionDays(-5), 2);
    assert.strictEqual(resolveRetentionDays(NaN), 2);
    assert.strictEqual(resolveRetentionDays("3"), 3);
    assert.strictEqual(resolveRetentionDays(0.4), 1, "不足 1 天按 1 天算，绝不出现「0 天保留」这种会把成品全删掉的配置");
    assert.strictEqual(resolveRetentionDays(999), 30);
});

check("单次清理上限：默认 5000，越界夹到 20000", () => {
    assert.strictEqual(resolvePruneLimit(undefined), 5000);
    assert.strictEqual(resolvePruneLimit("abc"), 5000);
    assert.strictEqual(resolvePruneLimit("10"), 10);
    assert.strictEqual(resolvePruneLimit(1e9), 20_000);
});

check("日界：按本地时区取当天零点，不按 UTC 也不按「满 24 小时」", () => {
    assert.strictEqual(startOfLocalDay(NOW), TODAY_START);
    // 同一天的任意时刻都落在同一个日界
    assert.strictEqual(startOfLocalDay(TODAY_START), TODAY_START);
    assert.strictEqual(startOfLocalDay(TODAY_START + DAY_MS - 1), TODAY_START);
});

check("窗口：保留 2 天 = 今天 + 昨天，删的是「前天 00:00 之前」写入的", () => {
    const window = resolveRetentionWindow({ now: NOW });
    assert.strictEqual(window.days, 2);
    assert.strictEqual(window.cutoffMs, YESTERDAY_START);
    assert.strictEqual(window.nowMs, NOW);
});

check("窗口：把保留期调成 1 天，就变成「删昨天 00:00 之前」", () => {
    assert.strictEqual(resolveRetentionWindow({ now: NOW, days: 1 }).cutoffMs, TODAY_START);
});

check("窗口：换时区（UTC）时切点跟着变，不写死 +8", () => {
    // UTC 下此刻是 2026-09-17 20:10，「今天」= 9/17，保留 2 天 → cutoff = 2026-09-16T00:00Z
    assert.strictEqual(resolveRetentionWindow({ now: NOW, tzOffsetMinutes: 0 }).cutoffMs, Date.UTC(2026, 8, 16, 0, 0));
    // 保留 1 天时正好切在本地零点
    assert.strictEqual(resolveRetentionWindow({ now: NOW, tzOffsetMinutes: 0, days: 1 }).cutoffMs, Date.UTC(2026, 8, 17, 0, 0));
});

check("核心：昨晚 23:00 出的图会被清掉，今早 04:00 出的图留着", () => {
    const { cutoffMs, nowMs } = resolveRetentionWindow({ now: NOW });
    // 2026-09-16 23:00（UTC+8）
    assert.strictEqual(shouldPurgeArchiveFile({ mtimeMs: Date.UTC(2026, 8, 16, 15, 0), cutoffMs, nowMs }), true);
    // 2026-09-17 04:00（UTC+8）——昨天的成品，用户今天还能来找
    assert.strictEqual(shouldPurgeArchiveFile({ mtimeMs: Date.UTC(2026, 8, 16, 20, 0), cutoffMs, nowMs }), false);
});

check("边界：正好等于切点不删（切点当天的 00:00 属于保留范围）", () => {
    const { cutoffMs, nowMs } = resolveRetentionWindow({ now: NOW });
    assert.strictEqual(shouldPurgeArchiveFile({ mtimeMs: cutoffMs, cutoffMs, nowMs }), false);
    assert.strictEqual(shouldPurgeArchiveFile({ mtimeMs: cutoffMs - 1, cutoffMs, nowMs }), true);
});

check("保守：时间读不出来、或修改时间在未来，一律不删", () => {
    const { cutoffMs, nowMs } = resolveRetentionWindow({ now: NOW });
    for (const bad of [NaN, 0, -1, Infinity * 0]) {
        assert.strictEqual(shouldPurgeArchiveFile({ mtimeMs: bad, cutoffMs, nowMs }), false, `mtimeMs=${String(bad)}`);
    }
    assert.strictEqual(shouldPurgeArchiveFile({ mtimeMs: nowMs + 60_000, cutoffMs, nowMs }), false, "时钟回拨/被 touch 过的文件不碰");
    assert.strictEqual(shouldPurgeArchiveFile({ mtimeMs: Number.POSITIVE_INFINITY, cutoffMs, nowMs }), false);
});

check("归档键：只认 <jobId>/<index> 这一种形态", () => {
    assert.deepStrictEqual(parseArchiveKey("cmabc123/0"), { jobId: "cmabc123", index: 0 });
    assert.deepStrictEqual(parseArchiveKey("cmabc123/12"), { jobId: "cmabc123", index: 12 });
    assert.deepStrictEqual(parseArchiveKey("cm_a-b/3"), { jobId: "cm_a-b", index: 3 });
    assert.strictEqual(parseArchiveKey("cmabc123"), null);
    assert.strictEqual(parseArchiveKey("cmabc123/0/1"), null);
    assert.strictEqual(parseArchiveKey("cmabc123/x"), null);
    assert.strictEqual(parseArchiveKey("cm.abc/0"), null);
    assert.strictEqual(parseArchiveKey("cmabc123/../0"), null);
    assert.strictEqual(parseArchiveKey("../secret/0"), null);
    assert.strictEqual(parseArchiveKey(".gitkeep"), null);
});

check("过期提示语：带上保留天数，非法天数退回默认 2 天", () => {
    assert.match(purgedMediaMessage(2), /2 天保留期/);
    assert.match(purgedMediaMessage(7), /7 天保留期/);
    assert.match(purgedMediaMessage(), /2 天保留期/);
    assert.match(purgedMediaMessage(0), /2 天保留期/);
});

check("下载扩展名：认得出主流 MIME，认不出的退回 bin", () => {
    assert.strictEqual(mimeTypeExtension("image/png"), "png");
    assert.strictEqual(mimeTypeExtension("image/jpeg"), "jpg");
    assert.strictEqual(mimeTypeExtension("image/png; charset=binary"), "png");
    assert.strictEqual(mimeTypeExtension("video/mp4"), "mp4");
    assert.strictEqual(mimeTypeExtension("application/octet-stream"), "bin");
    assert.strictEqual(mimeTypeExtension(""), "bin");
});

console.log(`\n成品保留清理判定单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
