/**
 * 调度控制面单元测试：生成等待 + 画布单写者锁。
 *
 * 这两件事错了都很贵：等待判错会让下游拿半成品干活，锁判错会让两个运行
 * 交叉改写同一块画布。两者都是纯逻辑，直接在纯函数上断言。
 *
 * 运行：npm run test:scheduler
 */
import assert from "node:assert";

import { classifyGenerationNodes, describeGenerationWait, dispatchedGenerationNodeIds, isGenerationSettled, nodeStatusesOf, waitForGeneration } from "../src/app/(user)/canvas/engine/scheduler/generation-wait.ts";
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

await check("派发识别：只认 run_generation，且节点 id 去重", () => {
    const ids = dispatchedGenerationNodeIds([
        { ops: [{ type: "add_node", id: "text-1", nodeType: "text" }, { type: "run_generation", nodeId: "config-1", mode: "image" }] },
        { ops: [{ type: "run_generation", nodeId: "config-1", mode: "image" }, { type: "run_generation", nodeId: "config-2", mode: "video" }] },
        { ops: [{ type: "connect_nodes", fromNodeId: "a", toNodeId: "b" }] },
        {},
    ]);
    assert.deepStrictEqual(ids, ["config-1", "config-2"], "只等真正派了生成的节点，且不重复等");
    assert.deepStrictEqual(dispatchedGenerationNodeIds([{ ops: [{ type: "add_node", id: "text-1", nodeType: "text" }] }]), [], "只建卡不生成时不得进入等待");
});

await check("状态表：只取关心的节点，不搬运整图", () => {
    const statuses = nodeStatusesOf([{ id: "n1", metadata: { status: "loading" } }, { id: "n2", metadata: {} }, { id: "other", metadata: { status: "success" } }], ["n1", "n2", "n3"]);
    assert.deepStrictEqual(statuses, { n1: "loading", n2: undefined }, "只回关心的节点，缺状态按 undefined 处理");
});

await check("等待生成：一直停在空闲 = 没启动，不空等满超时", async () => {
    let ticks = 0;
    const result = await waitForGeneration(["n1"], {
        getStatuses: () => {
            ticks += 1;
            return { n1: "idle" };
        },
        pollMs: 1,
        startGraceMs: 5,
        timeoutMs: 60_000,
    });
    assert.strictEqual(result.started, false, "节点从未进入生成状态，必须识别为「没启动」");
    assert.strictEqual(result.timedOut, false, "这不是「模型慢」，不该报超时");
    assert.deepStrictEqual(result.pending, ["n1"]);
    assert.strictEqual(ticks < 60_000 / 1, true, "必须在宽限期内返回，而不是等满 8 分钟超时");
    assert.ok(describeGenerationWait(result).includes("没有真正启动"), "描述要说清是没启动，别让用户以为还在生成");
});

await check("等待生成：派发后才出现的媒体节点也要等（配置节点秒成功 != 做完）", async () => {
    const statuses = { config: "idle" };
    let ticks = 0;
    const result = await waitForGeneration(["config"], {
        getStatuses: () => {
            ticks += 1;
            // 第一拍：派发发生，配置节点当刻就被标成成功，真正的视频节点还在渲染
            if (ticks === 1) Object.assign(statuses, { config: "success", video: "loading" });
            // 第三拍：视频渲染完成
            if (ticks >= 3) statuses.video = "success";
            return { ...statuses };
        },
        getWatchedIds: () => Object.keys(statuses),
        pollMs: 2,
        timeoutMs: 500,
    });
    assert.strictEqual(result.timedOut, false, "视频还在渲染时不得判定完成");
    assert.strictEqual(ticks >= 3, true, "必须等到视频节点真正落地才返回");
    assert.ok(result.succeeded.includes("video"), "派发后新建的媒体节点要纳入等待与结果上报");
    assert.deepStrictEqual(result.pending, []);
});

await check("等待生成：只要观察到过生成状态，就不再按「没启动」判死", async () => {
    let ticks = 0;
    const result = await waitForGeneration(["n1"], {
        getStatuses: () => {
            ticks += 1;
            // 第一拍已经在生成，之后被回写成 idle（例如取消后重置），仍然算启动过
            return { n1: ticks === 1 ? "loading" : "idle" };
        },
        pollMs: 2,
        startGraceMs: 5,
        timeoutMs: 20,
    });
    assert.strictEqual(result.started, true, "启动判定必须是粘性的，不能被中途的瞬时态翻回去");
    assert.strictEqual(result.timedOut, true, "启动过但没终结，才是真的超时");
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
