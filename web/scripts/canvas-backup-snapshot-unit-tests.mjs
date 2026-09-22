/**
 * 云端备份快照的保留策略与指纹（纯逻辑，无网络无数据库）。
 *
 * 要钉的两件事：
 *   1. 快照不能无限堆：份数与天数两条线都要生效（几 MB 的 jsonb，堆起来就是存储事故）；
 *   2. 指纹必须能识别「内容真的变了」——内容没变还留快照，等于每次无意义的重复上传都存一份。
 *
 * 运行：npm run test:snapshot
 */
import assert from "node:assert";

const { SNAPSHOT_MAX_KEEP, SNAPSHOT_MAX_AGE_DAYS, backupSignature, payloadBytes, snapshotPrunePlan } = await import("../src/lib/canvas-backup-snapshot.ts");

let passed = 0;
let failed = 0;
const check = (name, fn) => {
    try {
        fn();
        passed += 1;
        console.log(`  ok   ${name}`);
    } catch (error) {
        failed += 1;
        console.log(`  FAIL ${name} — ${error instanceof Error ? error.message : error}`);
    }
};

const now = new Date("2026-09-23T00:00:00Z");
const daysAgo = (n) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
const rows = (list) => list.map(([id, days]) => ({ id, createdAt: daysAgo(days) }));

console.log("== 保留策略 ==");
check("份数不超上限时一份都不删", () => {
    assert.deepEqual(snapshotPrunePlan(rows([["a", 0], ["b", 1]]), now), []);
});
check("超出份数上限的旧份要删", () => {
    assert.deepEqual(snapshotPrunePlan(rows([["new", 0], ["mid", 1], ["old", 2], ["older", 3]]), now, { maxKeep: 3, maxAgeDays: 30 }), ["older"]);
});
check("过期的那份即使份数没超也要删", () => {
    assert.deepEqual(snapshotPrunePlan(rows([["fresh", 1], ["stale", 40]]), now, { maxKeep: 5, maxAgeDays: 30 }), ["stale"]);
});
check("份数与天数同时命中时不重复删（去重）", () => {
    const plan = snapshotPrunePlan(rows([["a", 0], ["b", 1], ["c", 2], ["d", 40]]), now, { maxKeep: 2, maxAgeDays: 30 });
    assert.deepEqual(plan.sort(), ["c", "d"]);
});
check("时间戳解析不出来时按「不过期」处理（宁可多留）", () => {
    assert.deepEqual(snapshotPrunePlan([{ id: "bad", createdAt: "不是时间" }], now, { maxKeep: 5, maxAgeDays: 1 }), []);
});
check("默认策略：留 3 份、30 天", () => {
    assert.equal(SNAPSHOT_MAX_KEEP, 3);
    assert.equal(SNAPSHOT_MAX_AGE_DAYS, 30);
    assert.deepEqual(snapshotPrunePlan(rows([["a", 0], ["b", 1], ["c", 2], ["d", 3]]), now), ["d"]);
});
check("时间戳是字符串也认（数据库读回来可能是 ISO 串）", () => {
    assert.deepEqual(snapshotPrunePlan([{ id: "s", createdAt: daysAgo(45).toISOString() }], now, { maxAgeDays: 30 }), ["s"]);
});

console.log("== 内容指纹 ==");
check("同样内容指纹相同（无随机盐）", () => assert.equal(backupSignature('{"a":1}'), backupSignature('{"a":1}')));
check("内容变了指纹就变", () => assert.notEqual(backupSignature('{"a":1}'), backupSignature('{"a":2}')));
check("指纹够短（存库友好）且是十六进制", () => {
    const sig = backupSignature('{"a":1}');
    assert.equal(sig.length, 32);
    assert.ok(/^[0-9a-f]{32}$/.test(sig));
});
check("字节数按 UTF-8 算（中文一字三字节）", () => {
    assert.equal(payloadBytes("中"), 3);
    assert.equal(payloadBytes("ab"), 2);
});

console.log(failed ? `\n${failed} 项失败（通过 ${passed}）` : `\n全部通过（${passed} 项）`);
process.exit(failed ? 1 : 0);
