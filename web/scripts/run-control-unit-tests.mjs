/**
 * 调度控制面单元测试：生成等待 + 画布单写者锁。
 *
 * 这两件事错了都很贵：等待判错会让下游拿半成品干活，锁判错会让两个运行
 * 交叉改写同一块画布。两者都是纯逻辑，直接在纯函数上断言。
 *
 * 运行：npm run test:scheduler
 */
import assert from "node:assert";

import { classifyGenerationNodes, describeGenerationWait, isGenerationSettled, waitForGeneration } from "../src/app/(user)/canvas/engine/scheduler/generation-wait.ts";
import { canvasRunOwner, forceReleaseCanvasRun, tryClaimCanvasRun } from "../src/app/(user)/canvas/engine/scheduler/run-lock.ts";

let passed = 0;

async function check(name, fn) {
    try {
        await fn();
        passed += 1;
        console.log(`  ok  ${name}`);
    } catch (error) {
        console.error(`FAIL  ${name}: ${error.message}`);
        process.exitCode = 1;
    }
}

await check("节点状态归类：成功 / 失败 / 未完成（含状态缺失）", () => {
    const snapshot = classifyGenerationNodes(["a", "b", "c", "d"], { a: "success", b: "error", c: "loading" });
    assert.deepStrictEqual(snapshot.succeeded, ["a"]);
    assert.deepStrictEqual(snapshot.failed, ["b"]);
    assert.deepStrictEqual(snapshot.pending, ["c", "d"], "缺状态的节点按未完成处理，不能当成已完成");
    assert.strictEqual(isGenerationSettled(snapshot), false);
    assert.strictEqual(isGenerationSettled({ pending: [], succeeded: ["a"], failed: ["b"] }), true);
});

await check("等待生成：状态变化后立即返回，不空转", async () => {
    let ticks = 0;
    const statuses = { n1: "loading", n2: "loading" };
    const result = await waitForGeneration(["n1", "n2"], {
        getStatuses: () => {
            ticks += 1;
            statuses.n1 = "success";
            if (ticks >= 2) statuses.n2 = "error";
            return { ...statuses };
        },
        pollMs: 1,
    });
    assert.deepStrictEqual(result.succeeded, ["n1"]);
    assert.deepStrictEqual(result.failed, ["n2"]);
    assert.strictEqual(result.timedOut, false);
    assert.strictEqual(ticks, 2);
});

await check("等待生成：超时如实上报，不把未完成的当成功", async () => {
    const result = await waitForGeneration(["n1"], { getStatuses: () => ({ n1: "loading" }), pollMs: 1, timeoutMs: 15 });
    assert.strictEqual(result.timedOut, true);
    assert.deepStrictEqual(result.pending, ["n1"]);
    assert.deepStrictEqual(result.succeeded, []);
    assert.strictEqual(describeGenerationWait(result).includes("仍在生成中"), true);
});

await check("等待生成：可被用户中断", async () => {
    const controller = new AbortController();
    const promise = waitForGeneration(["n1"], { getStatuses: () => ({ n1: "loading" }), pollMs: 5, timeoutMs: 5000, signal: controller.signal });
    setTimeout(() => controller.abort(), 12);
    const result = await promise;
    assert.strictEqual(result.aborted, true, "中断要能被区分出来，否则调用方会把阶段误判为完成");
    assert.strictEqual(result.timedOut, false);
});

await check("画布锁：第二个运行被拒绝，且能说清是谁占着", () => {
    forceReleaseCanvasRun();
    const first = tryClaimCanvasRun({ id: "run-a", kind: "orchestrator", label: "雨夜剑客" });
    assert.strictEqual(first.ok, true);
    const second = tryClaimCanvasRun({ id: "run-b", kind: "online", label: "改个颜色" });
    assert.strictEqual(second.ok, false);
    assert.strictEqual(second.owner.id, "run-a");
    assert.ok(second.reason.includes("全自动生产"), "拒绝理由要让用户知道是谁在跑");
});

await check("画布锁：同一个运行也不能重复启动（重复启动 = 并发写）", () => {
    forceReleaseCanvasRun();
    const first = tryClaimCanvasRun({ id: "run-a", kind: "orchestrator", label: "雨夜剑客" });
    const again = tryClaimCanvasRun({ id: "run-a", kind: "orchestrator", label: "续跑" });
    assert.strictEqual(again.ok, false, "锁不做重入：面板重挂载后点「继续」不能把同一个运行跑成两份");
    assert.ok(again.reason.includes("已经在跑"), "同 id 重复启动要说清是重复启动，而不是含糊地说被占用");
    first.release();
    assert.strictEqual(canvasRunOwner(), null);
    assert.strictEqual(tryClaimCanvasRun({ id: "run-a", kind: "orchestrator", label: "续跑" }).ok, true, "上一次结束释放后，续跑正常拿锁");
});

await check("画布锁：本地 Agent 也要走同一把锁", () => {
    forceReleaseCanvasRun();
    const run = tryClaimCanvasRun({ id: "run-a", kind: "orchestrator", label: "雨夜剑客" });
    const local = tryClaimCanvasRun({ id: "local-1", kind: "local", label: "本地 Codex" });
    assert.strictEqual(local.ok, false, "本地 Agent 是另一位写入者，不能趁着生产在跑改画布");
    assert.ok(local.reason.includes("全自动生产"));
    run.release();
});

await check("画布锁：释放是幂等的", () => {
    forceReleaseCanvasRun();
    const claim = tryClaimCanvasRun({ id: "run-a", kind: "local", label: "本地" });
    claim.release();
    claim.release();
    assert.strictEqual(canvasRunOwner(), null);
});

console.log(`\n${passed} 项通过${process.exitCode ? "，存在失败项" : "，全部通过"}`);
