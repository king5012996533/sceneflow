/**
 * 「上游调用还在飞」登记簿的单测（纯逻辑，无数据库、无网络）。
 *
 * 钉住的是 2026-09-18 黑洞最后一环的行为：客户端那条长连接断了就报失败，
 * 可我们发往上游的请求还在飞、上游还在收我们的钱。这时候结算必须**先不结账**，
 * 把「客户端已放弃」记下来，等真正看见上游结果的人来定论。
 *
 * 运行：npm run test:inflight
 */
import assert from "node:assert";

import { beginUpstreamCall, inflightJobCount, isUpstreamCallInFlight, noteClientGaveUp, resetUpstreamInflight, takeClientGaveUp } from "../src/lib/generation/upstream-inflight.ts";

let passed = 0;
const failures = [];

function check(name, fn) {
    resetUpstreamInflight();
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

// —— 1) 基本登记 ——
check("没有在飞调用时：任务不算在飞，也没有放弃记录可取", () => {
    assert.strictEqual(isUpstreamCallInFlight("job-1"), false);
    assert.strictEqual(takeClientGaveUp("job-1"), undefined);
});

check("登记后为在飞，释放后不再是", () => {
    const release = beginUpstreamCall("job-1");
    assert.strictEqual(isUpstreamCallInFlight("job-1"), true);
    release();
    assert.strictEqual(isUpstreamCallInFlight("job-1"), false);
    assert.strictEqual(inflightJobCount(), 0, "释放干净后登记簿不应残留");
});

check("没有任务号（文本/工具通道）时是空操作，登记簿不受影响", () => {
    const release = beginUpstreamCall(undefined);
    assert.strictEqual(inflightJobCount(), 0);
    release();
    assert.strictEqual(inflightJobCount(), 0);
});

check("释放函数幂等：重复调用不会把计数减穿", () => {
    const release = beginUpstreamCall("job-1");
    release();
    release();
    release();
    assert.strictEqual(isUpstreamCallInFlight("job-1"), false);
});

// —— 2) 任务式通道会并发轮询，计数必须按引用计数走 ——
check("并发两次调用：释放其一仍在飞，全部释放才算结束", () => {
    const releaseA = beginUpstreamCall("job-2");
    const releaseB = beginUpstreamCall("job-2");
    releaseA();
    assert.strictEqual(isUpstreamCallInFlight("job-2"), true, "还有一次调用在飞");
    releaseB();
    assert.strictEqual(isUpstreamCallInFlight("job-2"), false);
});

check("不同任务互不影响", () => {
    const releaseA = beginUpstreamCall("job-a");
    const releaseB = beginUpstreamCall("job-b");
    releaseA();
    assert.strictEqual(isUpstreamCallInFlight("job-a"), false);
    assert.strictEqual(isUpstreamCallInFlight("job-b"), true);
    releaseB();
});

// —— 3) 客户端放弃记录的生死 ——
check("没有在飞调用时记放弃是空操作（不能凭一条孤立记录就拖着不结账）", () => {
    noteClientGaveUp("job-1", "Failed to fetch");
    assert.strictEqual(takeClientGaveUp("job-1"), undefined);
    assert.strictEqual(inflightJobCount(), 0);
});

check("在飞期间记下放弃原因，可取一次、取完即清", () => {
    const release = beginUpstreamCall("job-1");
    noteClientGaveUp("job-1", "请求失败: Failed to fetch");
    assert.strictEqual(takeClientGaveUp("job-1"), "请求失败: Failed to fetch");
    assert.strictEqual(takeClientGaveUp("job-1"), undefined, "同一条放弃记录只能被认领一次");
    release();
});

check("放弃记录不随调用结束而消失：调用结束后仍能被取到（交由代理侧定论）", () => {
    const release = beginUpstreamCall("job-1");
    noteClientGaveUp("job-1", "NetworkError when attempting to fetch resource.");
    release();
    assert.strictEqual(isUpstreamCallInFlight("job-1"), false);
    assert.strictEqual(takeClientGaveUp("job-1"), "NetworkError when attempting to fetch resource.");
    assert.strictEqual(inflightJobCount(), 0, "取走最后一条记录后登记簿应清空");
});

check("记放弃时没有给原因，也要有一条可写的说明（不能写空字符串进 error）", () => {
    const release = beginUpstreamCall("job-1");
    noteClientGaveUp("job-1");
    assert.ok((takeClientGaveUp("job-1") || "").length > 0);
    release();
});

check("放弃原因超长时截断（与 GenerationJob.error 同一上限）", () => {
    const release = beginUpstreamCall("job-1");
    noteClientGaveUp("job-1", "x".repeat(5000));
    assert.strictEqual(takeClientGaveUp("job-1").length, 1000);
    release();
});

// —— 4) 线上事故原样复现 ——
check("事故复现：浏览器断了并报失败 → 任务仍在飞 → 上游随后出成品，此时不应存在「已结账」的依据", () => {
    // 代理侧：上游调用开始（浏览器随后断开）
    const releaseUpstream = beginUpstreamCall("job-lost");
    // 结算侧：客户端报失败，但调用仍在飞 → 只记放弃，不结账
    assert.strictEqual(isUpstreamCallInFlight("job-lost"), true);
    noteClientGaveUp("job-lost", "请求失败");
    // 抢救侧：上游把成品吐回来，任务被认领为成功 → 放弃记录必须被丢弃，不能反过来把成功改判失败
    assert.ok(takeClientGaveUp("job-lost"), "认领成功时也要把放弃记录取走，避免残留到下一个任务上");
    releaseUpstream();
    assert.strictEqual(inflightJobCount(), 0);
});

console.log(`\n在飞登记簿单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
