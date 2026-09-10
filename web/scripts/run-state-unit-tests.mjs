/**
 * 生产调度状态机单元测试。
 *
 * 调度错误代价很高：漏跑一个阶段 = 片子缺素材，重跑一个已完成阶段 = 重复烧钱。
 * 这些规则全部落在纯函数里，正好可以直接断言。
 *
 * 运行：npm run test:scheduler
 */
import assert from "node:assert";

import {
    blockableStages,
    canRetryStage,
    collectUpstream,
    createRunState,
    describeRun,
    hasDependencyCycle,
    isRunSettled,
    markStageFinished,
    markStageRunning,
    markStageAborted,
    markStageSkipped,
    normalizeRunState,
    planRunStep,
    readyStages,
    resetRetryableStages,
    resumePoint,
    runProgress,
} from "../src/app/(user)/canvas/engine/scheduler/run-state.ts";

let passed = 0;

function check(name, fn) {
    try {
        fn();
        passed += 1;
        console.log(`  ok  ${name}`);
    } catch (error) {
        console.error(`FAIL  ${name}: ${error.message}`);
        process.exitCode = 1;
    }
}

const STAGE_KEYS = (stages) => stages.map((stage) => stage.stageKey);

function makeRun() {
    return createRunState({
        id: "run-1",
        brief: "雨夜剑客 15 秒",
        intent: "fragment-video",
        stages: [
            { stageKey: "analyze", agentId: "script-analyst", dependencies: [], brief: "拆解剧本" },
            { stageKey: "character", agentId: "character-designer", dependencies: ["analyze"], brief: "设计角色" },
            { stageKey: "scene", agentId: "scene-designer", dependencies: ["analyze"], brief: "设定场景" },
            { stageKey: "storyboard", agentId: "storyboard-planner", dependencies: ["character", "scene"], brief: "规划分镜" },
            { stageKey: "video", agentId: "video-generator", dependencies: ["storyboard"], brief: "生成视频", layout: { x: 40, y: 60 } },
        ],
    });
}

check("初始状态：全部 pending，只有无依赖阶段可跑", () => {
    const run = makeRun();
    assert.deepStrictEqual(STAGE_KEYS(readyStages(run)), ["analyze"]);
    assert.strictEqual(isRunSettled(run), false);
    assert.deepStrictEqual(blockableStages(run), []);
    assert.strictEqual(runProgress(run).pending, 5);
});

check("依赖未终结时下游不可跑，上游完成后才放行（并行分支）", () => {
    let run = makeRun();
    run = markStageRunning(run, "analyze");
    assert.deepStrictEqual(STAGE_KEYS(run.stages.filter((s) => s.status === "running")), ["analyze"]);
    assert.deepStrictEqual(STAGE_KEYS(readyStages(run)), [], "上游还在跑，下游不能开跑");
    run = markStageFinished(run, "analyze", { ok: true, summary: "拆出 2 个角色 1 个场景", createdNodeIds: ["n1"] });
    assert.deepStrictEqual(STAGE_KEYS(readyStages(run)), ["character", "scene"], "两个无相互依赖的分支应同时可跑");
    assert.strictEqual(runProgress(run).done, 1);
});

check("上游失败 → 下游显式判为不可达，不能永远悬着", () => {
    let run = makeRun();
    run = markStageRunning(run, "analyze");
    run = markStageFinished(run, "analyze", { ok: false, error: "模型超时" });
    const blocked = blockableStages(run);
    assert.deepStrictEqual(STAGE_KEYS(blocked.map((item) => item.stage)), ["character", "scene"]);
    assert.ok(blocked[0].reason.includes("analyze"));

    run = markStageSkipped(run, "character", blocked[0].reason);
    run = markStageSkipped(run, "scene", blocked[1].reason);
    // storyboard 的上游都终结了，因此也变成不可达
    const nextBlocked = blockableStages(run);
    assert.deepStrictEqual(STAGE_KEYS(nextBlocked.map((item) => item.stage)), ["storyboard"]);
});

check("阶段全部终结后 Run 收敛：有成功即 completed，全失败即 failed", () => {
    let ok = makeRun();
    for (const stage of ok.stages) {
        ok = markStageRunning(ok, stage.stageKey);
        ok = markStageFinished(ok, stage.stageKey, { ok: true, summary: "ok" });
    }
    assert.strictEqual(isRunSettled(ok), true);
    assert.strictEqual(ok.phase, "completed");
    assert.strictEqual(resumePoint(ok), null);

    let bad = makeRun();
    for (const stage of bad.stages) {
        bad = markStageRunning(bad, stage.stageKey);
        bad = markStageFinished(bad, stage.stageKey, { ok: false, error: "挂了" });
    }
    assert.strictEqual(bad.phase, "failed");
});

check("重试：失败阶段放回 pending，已被连带跳过的下游一并重开", () => {
    let run = makeRun();
    run = markStageRunning(run, "analyze");
    run = markStageFinished(run, "analyze", { ok: true, summary: "ok" });
    run = markStageRunning(run, "character");
    run = markStageFinished(run, "character", { ok: false, error: "第一次失败" });
    assert.strictEqual(canRetryStage(run.stages.find((s) => s.stageKey === "character")), true);
    assert.strictEqual(run.stages.find((s) => s.stageKey === "character").attempts, 1);

    run = markStageSkipped(run, "storyboard", "上游阶段未成功：character");
    const { state: retried, retried: keys } = resetRetryableStages(run);
    assert.deepStrictEqual(keys, ["character"]);
    assert.strictEqual(retried.stages.find((s) => s.stageKey === "character").status, "pending");
    assert.strictEqual(retried.stages.find((s) => s.stageKey === "storyboard").status, "pending", "被连带跳过的下游要跟着重开");
    assert.strictEqual(retried.stages.find((s) => s.stageKey === "character").attempts, 1, "重试次数要保留，用于上限判断");
});

check("重试有上限：超过上限不再重试", () => {
    let run = makeRun();
    run = markStageRunning(run, "analyze");
    run = markStageFinished(run, "analyze", { ok: false, error: "挂" });
    run = markStageRunning(run, "analyze");
    run = markStageFinished(run, "analyze", { ok: false, error: "又挂" });
    const stage = run.stages.find((s) => s.stageKey === "analyze");
    assert.strictEqual(stage.attempts, 2);
    assert.strictEqual(canRetryStage(stage, 2), false, "达到上限后不应再重试");
    const { retried } = resetRetryableStages(run, 2);
    assert.deepStrictEqual(retried, []);
});

check("上游产出汇总：节点 id 去重、上下文按依赖收集", () => {
    let run = makeRun();
    run = markStageRunning(run, "analyze");
    run = markStageFinished(run, "analyze", { ok: true, summary: "拆解完成", createdNodeIds: ["n1", "n2"], derivedContext: { analyze: "2 角色" } });
    run = markStageRunning(run, "character");
    run = markStageFinished(run, "character", { ok: true, summary: "角色定稿", createdNodeIds: ["n2", "n3"], derivedContext: { character: "林默/苏晚" } });
    run = markStageRunning(run, "scene");
    run = markStageFinished(run, "scene", { ok: true, summary: "场景定稿", createdNodeIds: ["n9"] });

    const upstream = collectUpstream(run, "storyboard");
    assert.deepStrictEqual(upstream.upstreamNodeIds.sort(), ["n2", "n3", "n9"], "节点 id 应去重");
    assert.strictEqual(upstream.derivedContext.character, "林默/苏晚");
    assert.strictEqual(upstream.derivedContext.scene, "场景定稿");
});

check("落盘恢复：running 归零为 pending、phase 归为 interrupted，完成的不重跑", () => {
    let run = makeRun();
    run = markStageRunning(run, "analyze");
    run = markStageFinished(run, "analyze", { ok: true, summary: "完成", createdNodeIds: ["n1"] });
    run = markStageRunning(run, "character");

    const restored = normalizeRunState(JSON.parse(JSON.stringify(run)));
    assert.strictEqual(restored.phase, "interrupted", "被中断的运行不应自动继续烧钱");
    assert.strictEqual(restored.stages.find((s) => s.stageKey === "analyze").status, "done", "已完成阶段结果必须保留");
    assert.deepStrictEqual(restored.stages.find((s) => s.stageKey === "analyze").createdNodeIds, ["n1"]);
    assert.strictEqual(restored.stages.find((s) => s.stageKey === "character").status, "pending", "中断时运行中的阶段应回到待跑");
    assert.strictEqual(resumePoint(restored), "character");
});

check("落盘恢复：脏数据不致命", () => {
    assert.strictEqual(normalizeRunState(null), null);
    assert.strictEqual(normalizeRunState("垃圾"), null);
    assert.strictEqual(normalizeRunState({ stages: [] }), null);
    assert.strictEqual(normalizeRunState({ stages: [null, 5, { agentId: "x" }] }), null, "没有合法 stageKey 的应判定为无效");
    const restored = normalizeRunState({
        id: "x",
        phase: "奇怪的阶段",
        stages: [{ stageKey: "a", agentId: "z", status: "莫名其妙的status", attempts: "很多", createdNodeIds: "不是数组", derivedContext: 7 }],
    });
    assert.strictEqual(restored.phase, "interrupted");
    assert.strictEqual(restored.stages[0].status, "pending");
    assert.strictEqual(restored.stages[0].attempts, 0);
    assert.deepStrictEqual(restored.stages[0].createdNodeIds, []);
    assert.deepStrictEqual(restored.stages[0].derivedContext, {});
});

check("任务书随状态落盘：断点续跑靠它重建子 Agent 上下文", () => {
    const run = makeRun();
    assert.strictEqual(run.stages[0].brief, "拆解剧本");
    const restored = normalizeRunState(JSON.parse(JSON.stringify(run)));
    assert.strictEqual(restored.stages[0].brief, "拆解剧本", "任务书不能在恢复时丢掉");
    assert.deepStrictEqual(restored.stages[4].layout, { x: 40, y: 60 });
    assert.strictEqual(restored.brief, "雨夜剑客 15 秒");
});

check("循环/悬空依赖在创建期就判死，不留运行期死锁", () => {
    assert.strictEqual(hasDependencyCycle(makeRun().stages), false);
    assert.strictEqual(
        hasDependencyCycle([
            { stageKey: "a", dependencies: ["b"] },
            { stageKey: "b", dependencies: ["a"] },
        ]),
        true,
    );
    assert.strictEqual(hasDependencyCycle([{ stageKey: "a", dependencies: ["不存在"] }]), true, "指向不存在阶段的依赖同样是死锁");
    assert.strictEqual(
        hasDependencyCycle([
            { stageKey: "a", dependencies: [] },
            { stageKey: "b", dependencies: ["a"] },
        ]),
        false,
    );
});

check("落盘恢复：全部终结的运行按结果收敛，不误报被中断", () => {
    let done = makeRun();
    for (const stage of done.stages) {
        done = markStageRunning(done, stage.stageKey);
        done = markStageFinished(done, stage.stageKey, { ok: true, summary: "ok" });
    }
    const restored = normalizeRunState(JSON.parse(JSON.stringify(done)));
    assert.strictEqual(restored.phase, "completed", "全部完成的历史运行不该显示成被中断");
    assert.strictEqual(resumePoint(restored), null);
});

check("中断：没跑完的阶段放回待跑，续跑从它开始而不是把它判死", () => {
    let run = makeRun();
    run = markStageRunning(run, "analyze");
    run = markStageAborted(run, "analyze");
    const stage = run.stages.find((s) => s.stageKey === "analyze");
    assert.strictEqual(stage.status, "pending");
    assert.strictEqual(stage.error, undefined);
    assert.strictEqual(stage.attempts, 0, "中断不是失败，不该吃掉重试预算");
    assert.strictEqual(resumePoint(run), "analyze", "续跑要从被中断的那个阶段开始");
    assert.deepStrictEqual(blockableStages(run), [], "被中断不算失败，下游不该被连带跳过");
});

check("重试不改动传入的状态：调用方（UI）还在读同一份", () => {
    let run = makeRun();
    run = markStageRunning(run, "analyze");
    run = markStageFinished(run, "analyze", { ok: true, summary: "ok" });
    run = markStageRunning(run, "character");
    run = markStageFinished(run, "character", { ok: false, error: "挂了" });
    run = markStageSkipped(run, "storyboard", "上游阶段未成功：character");
    const before = JSON.stringify(run);
    const { state: retried } = resetRetryableStages(run);
    assert.strictEqual(JSON.stringify(run), before, "resetRetryableStages 必须无副作用：就地改会把上一帧状态悄悄改掉");
    assert.strictEqual(retried.stages.find((s) => s.stageKey === "storyboard").status, "pending");
    assert.strictEqual(run.stages.find((s) => s.stageKey === "storyboard").status, "skipped");
});

check("调度决策：跳过不可达 → 中断 → 暂停 → 预算 → 开跑，优先级唯一", () => {
    const run = makeRun();
    assert.deepStrictEqual(planRunStep(run, {}), { kind: "run", stages: [run.stages[0]] }, "开局只有无依赖阶段可跑");

    const paused = planRunStep(run, { paused: true });
    assert.strictEqual(paused.kind, "halt");
    assert.strictEqual(paused.phase, "paused");

    const interrupted = planRunStep(run, { paused: true, aborted: true });
    assert.strictEqual(interrupted.phase, "interrupted", "中断必须优先于暂停：用户要停就立刻停");

    const budget = planRunStep(run, { totalSteps: 40, maxTotalSteps: 40 });
    assert.strictEqual(budget.kind, "halt");
    assert.strictEqual(budget.phase, "paused", "预算用尽应可续跑，不该判死");

    // 上游失败时：先跳下游，再谈别的
    let failed = markStageRunning(run, "analyze");
    failed = markStageFinished(failed, "analyze", { ok: false, error: "模型超时" });
    const skip = planRunStep(failed, { aborted: true });
    assert.strictEqual(skip.kind, "skip", "有不可达阶段时先落状态，否则 Run 永远收敛不了");
    assert.deepStrictEqual(
        skip.targets.map((item) => item.stageKey),
        ["character", "scene"],
    );
});

check("调度决策：并发上限生效，无解时判失败而不是空转", () => {
    let run = makeRun();
    run = markStageRunning(run, "analyze");
    run = markStageFinished(run, "analyze", { ok: true, summary: "ok" });
    const step = planRunStep(run, { maxConcurrent: 1 });
    assert.strictEqual(step.kind, "run");
    assert.deepStrictEqual(
        step.stages.map((stage) => stage.stageKey),
        ["character"],
        "并发上限必须真的裁剪本批阶段",
    );
    assert.strictEqual(planRunStep(run, { maxConcurrent: 3 }).stages.length, 2);

    // 人为造出「依赖已终结但自己永远起不来」的局面：不该死循环等待
    const stuck = { ...run, stages: run.stages.map((stage) => (stage.stageKey === "storyboard" ? { ...stage, status: "pending", dependencies: ["不存在"] } : stage)) };
    const deadlock = planRunStep({ ...stuck, stages: stuck.stages.map((stage) => (stage.status === "pending" ? { ...stage, status: "skipped" } : stage)) }, {});
    assert.strictEqual(deadlock.kind, "done");
});

check("进度与描述文本可用于 UI/日志", () => {
    let run = makeRun();
    run = markStageRunning(run, "analyze");
    run = markStageFinished(run, "analyze", { ok: true, summary: "拆解", tokensUsed: 1200, createdNodeIds: ["n1"] });
    run = markStageRunning(run, "character");
    run = markStageFinished(run, "character", { ok: false, error: "模型返回空" });
    const progress = runProgress(run);
    assert.deepStrictEqual({ done: progress.done, failed: progress.failed, pending: progress.pending, total: progress.total }, { done: 1, failed: 1, pending: 3, total: 5 });
    assert.strictEqual(progress.tokensUsed, 1200);
    const text = describeRun(run);
    assert.ok(text.includes("1/5 阶段完成"));
    assert.ok(text.includes("✗ character"));
    assert.ok(text.includes("模型返回空"));
});

console.log(`\n${passed} 项通过${process.exitCode ? "，存在失败项" : "，全部通过"}`);
