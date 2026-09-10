/**
 * 生产运行状态机（调度层）。
 *
 * 一次多阶段生产 = 一次 Run，Run 由若干 Stage 组成，Stage 有依赖、有重试、有产出。
 * 这里把「跑到哪了、谁在跑、谁失败、谁被跳过」做成纯数据 + 纯函数，原因有三：
 *
 *  1. 状态要能落盘：刷新页面、关掉标签页再回来，不该从第一个阶段重跑一遍
 *     （每个阶段都在花真钱）。所以状态必须是可序列化的纯数据，不能藏在组件 useState 里。
 *  2. 状态要能被测试：调度错误（跳过该跑的、重跑已完成的、依赖失败还继续）只有在
 *     纯函数上才容易覆盖。
 *  3. 状态要能被别的层读：UI 时间线、观测层、MCP 出口都读同一份 RunState。
 *
 * 本模块不依赖任何 UI、不发起任何请求。
 */

export type StageStatus = "pending" | "running" | "done" | "failed" | "skipped";

/** 运行阶段：比引擎契约里的运行终态多一个 paused（可暂停是调度层的能力） */
export type RunPhase = "running" | "paused" | "completed" | "failed" | "interrupted";

export type StageState = {
    stageKey: string;
    agentId: string;
    /** 依赖的上游 stageKey */
    dependencies: string[];
    /**
     * 该阶段的任务书。落在 RunState 里而不是另存一份计划，
     * 是为了「刷新页面后接着跑」——没有任务书就没法重建子 Agent 的上下文。
     */
    brief: string;
    layout?: { x: number; y: number };
    status: StageStatus;
    /** 已尝试次数（含首次），用于重试上限判断 */
    attempts: number;
    error?: string;
    summary?: string;
    /** 该阶段实际产出的画布节点：下游阶段引用上游产出的依据 */
    createdNodeIds: string[];
    /** 该阶段写下的派生上下文（会并入下游上下文） */
    derivedContext: Record<string, string>;
    tokensUsed: number;
    stepsUsed: number;
    startedAt?: number;
    finishedAt?: number;
};

export type RunState = {
    version: 1;
    id: string;
    brief: string;
    intent: string;
    phase: RunPhase;
    stages: StageState[];
    createdAt: number;
    updatedAt: number;
};

export type StageOutcome = {
    ok: boolean;
    summary?: string;
    error?: string;
    createdNodeIds?: string[];
    derivedContext?: Record<string, string>;
    tokensUsed?: number;
    stepsUsed?: number;
};

/** 默认重试上限：只对「可重试」的失败生效（生成类失败重试会重复花钱，由调用方判断） */
export const DEFAULT_STAGE_MAX_ATTEMPTS = 2;

export type RunStageInput = {
    stageKey: string;
    agentId: string;
    dependencies: string[];
    brief: string;
    layout?: { x: number; y: number };
};

/** 依赖成环的计划永远跑不完，创建时就要挡掉，不能等运行时死锁 */
export function hasDependencyCycle(stages: Array<Pick<RunStageInput, "stageKey" | "dependencies">>): boolean {
    const keys = new Set(stages.map((stage) => stage.stageKey));
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (key: string): boolean => {
        if (done.has(key)) return false;
        if (visiting.has(key)) return true;
        visiting.add(key);
        const stage = stages.find((item) => item.stageKey === key);
        for (const dep of stage?.dependencies || []) {
            // 指向不存在阶段的依赖同样是死锁，一并判为不合法
            if (!keys.has(dep)) return true;
            if (visit(dep)) return true;
        }
        visiting.delete(key);
        done.add(key);
        return false;
    };
    return stages.some((stage) => visit(stage.stageKey));
}

export function createRunState(input: { id: string; brief: string; intent: string; stages: RunStageInput[] }): RunState {
    const now = Date.now();
    return {
        version: 1,
        id: input.id,
        brief: input.brief,
        intent: input.intent,
        phase: "running",
        stages: input.stages.map((stage) => ({
            stageKey: stage.stageKey,
            agentId: stage.agentId,
            dependencies: [...stage.dependencies],
            brief: stage.brief,
            layout: stage.layout ? { ...stage.layout } : undefined,
            status: "pending",
            attempts: 0,
            createdNodeIds: [],
            derivedContext: {},
            tokensUsed: 0,
            stepsUsed: 0,
        })),
        createdAt: now,
        updatedAt: now,
    };
}

function text(value: unknown, limit = 2000): string {
    if (typeof value === "string") return value.slice(0, limit);
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return "";
}

function position(value: unknown): { x: number; y: number } | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    const raw = value as Record<string, unknown>;
    if (!Number.isFinite(raw.x) || !Number.isFinite(raw.y)) return undefined;
    return { x: Number(raw.x), y: Number(raw.y) };
}

function stringList(value: unknown, limit: number): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => text(item, 300))
        .filter(Boolean)
        .slice(-limit);
}

function stringRecord(value: unknown): Record<string, string> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const out: Record<string, string> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        const body = text(item, 2000);
        if (body) out[key] = body;
    }
    return out;
}

const STAGE_STATUSES: StageStatus[] = ["pending", "running", "done", "failed", "skipped"];
const RUN_PHASES: RunPhase[] = ["running", "paused", "completed", "failed", "interrupted"];

/**
 * 从存储里读回来的状态一律过这一层：
 * 运行中被打断的（浏览器关掉、崩溃）统一落回 pending，让调度器重新捡起来，
 * 已完成/已跳过的保留结果——这正是断点续跑的价值。
 */
export function normalizeRunState(value: unknown): RunState | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const raw = value as Record<string, unknown>;
    const rawStages = Array.isArray(raw.stages) ? raw.stages : [];
    const stages: StageState[] = rawStages
        .map((item): StageState | null => {
            if (!item || typeof item !== "object" || Array.isArray(item)) return null;
            const record = item as Record<string, unknown>;
            const stageKey = text(record.stageKey, 200);
            if (!stageKey) return null;
            const storedStatus = text(record.status, 20) as StageStatus;
            const status: StageStatus = STAGE_STATUSES.includes(storedStatus) ? storedStatus : "pending";
            return {
                stageKey,
                agentId: text(record.agentId, 200),
                dependencies: stringList(record.dependencies, 50),
                brief: text(record.brief),
                layout: position(record.layout),
                // 运行中/待跑的一律回到 pending：进程已经没了，running 是历史残留
                status: status === "running" ? "pending" : status,
                attempts: Number.isFinite(record.attempts) ? Math.max(0, Math.floor(Number(record.attempts))) : 0,
                error: text(record.error, 500) || undefined,
                summary: text(record.summary, 2000) || undefined,
                createdNodeIds: stringList(record.createdNodeIds, 200),
                derivedContext: stringRecord(record.derivedContext),
                tokensUsed: Number.isFinite(record.tokensUsed) ? Math.max(0, Number(record.tokensUsed)) : 0,
                stepsUsed: Number.isFinite(record.stepsUsed) ? Math.max(0, Number(record.stepsUsed)) : 0,
                startedAt: Number.isFinite(record.startedAt) ? Number(record.startedAt) : undefined,
                finishedAt: Number.isFinite(record.finishedAt) ? Number(record.finishedAt) : undefined,
            };
        })
        .filter((item): item is StageState => Boolean(item));

    if (!stages.length) return null;
    const storedPhase = text(raw.phase, 20) as RunPhase;
    const settled = stages.every((stage) => isTerminal(stage.status));
    // 已经全部终结的运行按结果收敛，不能因为存的是 running 就报「被中断」；
    // 未终结的一律恢复成 interrupted：需要用户确认后再继续，避免打开页面就自动烧钱
    const phase: RunPhase = settled ? (stages.some((stage) => stage.status === "done") ? "completed" : "failed") : storedPhase === "running" ? "interrupted" : RUN_PHASES.includes(storedPhase) ? storedPhase : "interrupted";

    return {
        version: 1,
        id: text(raw.id, 200) || `run-${Date.now()}`,
        brief: text(raw.brief),
        intent: text(raw.intent, 200),
        phase,
        stages,
        createdAt: Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : Date.now(),
        updatedAt: Number.isFinite(raw.updatedAt) ? Number(raw.updatedAt) : Date.now(),
    };
}

function patchStage(state: RunState, stageKey: string, patch: Partial<StageState>): RunState {
    const stages = state.stages.map((stage) => (stage.stageKey === stageKey ? { ...stage, ...patch } : stage));
    return { ...state, stages, updatedAt: Date.now() };
}

export function markStageRunning(state: RunState, stageKey: string): RunState {
    const stage = state.stages.find((item) => item.stageKey === stageKey);
    return patchStage(state, stageKey, { status: "running", attempts: (stage?.attempts ?? 0) + 1, startedAt: Date.now(), error: undefined });
}

export function markStageFinished(state: RunState, stageKey: string, outcome: StageOutcome): RunState {
    const next = patchStage(state, stageKey, {
        status: outcome.ok ? "done" : "failed",
        summary: outcome.summary,
        error: outcome.ok ? undefined : outcome.error || "阶段执行失败",
        createdNodeIds: outcome.createdNodeIds ?? [],
        derivedContext: outcome.derivedContext ?? {},
        tokensUsed: outcome.tokensUsed ?? 0,
        stepsUsed: outcome.stepsUsed ?? 0,
        finishedAt: Date.now(),
    });
    return { ...next, phase: derivePhase(next) };
}

export function markStageSkipped(state: RunState, stageKey: string, reason: string): RunState {
    const next = patchStage(state, stageKey, { status: "skipped", error: reason, finishedAt: Date.now() });
    return { ...next, phase: derivePhase(next) };
}

/**
 * 中断：这个阶段没跑完，但也不算失败——失败会让下游被跳过，
 * 用户点「继续」反而什么都补不回来。放回 pending，续跑就从它开始。
 * 本次尝试次数一并退回：中断不是失败，不该吃掉重试预算。
 */
export function markStageAborted(state: RunState, stageKey: string): RunState {
    const attempts = state.stages.find((stage) => stage.stageKey === stageKey)?.attempts ?? 0;
    const next = patchStage(state, stageKey, { status: "pending", attempts: Math.max(0, attempts - 1), error: undefined, finishedAt: undefined });
    return { ...next, phase: derivePhase(next) };
}

export function setRunPhase(state: RunState, phase: RunPhase): RunState {
    return { ...state, phase, updatedAt: Date.now() };
}

/** 上游是否都已终结（done / skipped / failed），未终结则不能开跑 */
function dependenciesSettled(state: RunState, stage: StageState): boolean {
    return stage.dependencies.every((key) => {
        const dep = state.stages.find((item) => item.stageKey === key);
        return Boolean(dep) && dep!.status !== "pending" && dep!.status !== "running";
    });
}

function isTerminal(status: StageStatus): boolean {
    return status === "done" || status === "failed" || status === "skipped";
}

/** 本轮可以开跑的阶段：依赖都已终结、自身还没跑过 */
export function readyStages(state: RunState): StageState[] {
    return state.stages.filter((stage) => stage.status === "pending" && dependenciesSettled(state, stage));
}

/**
 * 依赖已终结但自己还 pending、且上游有失败/跳过 → 该阶段不可能再跑，直接判为跳过。
 * 必须显式落状态，否则整个 Run 永远等不到终结。
 */
export function blockableStages(state: RunState): Array<{ stage: StageState; reason: string }> {
    const out: Array<{ stage: StageState; reason: string }> = [];
    for (const stage of state.stages) {
        if (stage.status !== "pending") continue;
        if (!dependenciesSettled(state, stage)) continue;
        const badDeps = stage.dependencies.filter((key) => {
            const dep = state.stages.find((item) => item.stageKey === key);
            return !dep || dep.status === "failed" || dep.status === "skipped";
        });
        if (badDeps.length) out.push({ stage, reason: `上游阶段未成功：${badDeps.join(", ")}` });
    }
    return out;
}

export function isRunSettled(state: RunState): boolean {
    return state.stages.every((stage) => isTerminal(stage.status));
}

function derivePhase(state: RunState): RunPhase {
    if (state.phase === "paused" || state.phase === "interrupted") return state.phase;
    if (!isRunSettled(state)) return "running";
    const anyOk = state.stages.some((stage) => stage.status === "done");
    return anyOk ? "completed" : "failed";
}

/** 该阶段是否可以重试：工具/模型类失败可重；已成功、已跳过、超过重试上限的不可 */
export function canRetryStage(stage: StageState, maxAttempts = DEFAULT_STAGE_MAX_ATTEMPTS): boolean {
    return stage.status === "failed" && stage.attempts < maxAttempts;
}

/**
 * 把可重试的失败阶段放回 pending。用于「重试失败阶段」与自动重试。
 * 返回新的状态与被重置的阶段名，便于日志与 UI 提示。
 */
export function resetRetryableStages(state: RunState, maxAttempts = DEFAULT_STAGE_MAX_ATTEMPTS): { state: RunState; retried: string[] } {
    const retried = state.stages.filter((stage) => canRetryStage(stage, maxAttempts)).map((stage) => stage.stageKey);
    if (!retried.length) return { state, retried };
    const isRetried = (stage: StageState) => retried.includes(stage.stageKey);
    // 全程不可变：调用方（UI）也在读同一份 state，就地改会把它的上一帧悄悄改掉
    let stages = state.stages.map((stage) => (isRetried(stage) ? { ...stage, status: "pending" as StageStatus, error: undefined, finishedAt: undefined } : stage));
    // 被重试阶段的下游如果之前因为上游失败被跳过，也要放回 pending 才能跟着重跑
    const reopened = new Set(retried);
    for (;;) {
        const next = stages.map((stage) => {
            if (stage.status !== "skipped" || reopened.has(stage.stageKey)) return stage;
            if (!stage.dependencies.some((key) => reopened.has(key))) return stage;
            reopened.add(stage.stageKey);
            return { ...stage, status: "pending" as StageStatus, error: undefined, finishedAt: undefined };
        });
        if (next.every((stage, index) => stage === stages[index])) break;
        stages = next;
    }
    return { state: { ...state, stages, phase: "running", updatedAt: Date.now() }, retried };
}

/** 上游产出注入：节点 id 与派生上下文按依赖顺序汇总 */
export function collectUpstream(state: RunState, stageKey: string): { upstreamNodeIds: string[]; derivedContext: Record<string, string> } {
    const stage = state.stages.find((item) => item.stageKey === stageKey);
    const upstreamNodeIds: string[] = [];
    const derivedContext: Record<string, string> = {};
    if (!stage) return { upstreamNodeIds, derivedContext };
    for (const key of stage.dependencies) {
        const dep = state.stages.find((item) => item.stageKey === key);
        if (!dep || dep.status !== "done") continue;
        upstreamNodeIds.push(...dep.createdNodeIds);
        Object.assign(derivedContext, dep.derivedContext);
        // 阶段自己写下的派生上下文是真正的产出内容，优先于一句话摘要；
        // 只有它没给出内容时才退回摘要，保证下游至少知道上游做了什么。
        if (!derivedContext[key]) derivedContext[key] = dep.summary || `已完成，产出节点 ${dep.createdNodeIds.length} 个`;
    }
    return { upstreamNodeIds: Array.from(new Set(upstreamNodeIds)), derivedContext };
}

export function runProgress(state: RunState): { total: number; done: number; failed: number; skipped: number; pending: number; tokensUsed: number } {
    const count = (status: StageStatus) => state.stages.filter((stage) => stage.status === status).length;
    return {
        total: state.stages.length,
        done: count("done"),
        failed: count("failed"),
        skipped: count("skipped"),
        pending: count("pending") + count("running"),
        tokensUsed: state.stages.reduce((sum, stage) => sum + (stage.tokensUsed || 0), 0),
    };
}

/** 给模型/用户看的一句话进度 */
export function describeRun(state: RunState): string {
    const progress = runProgress(state);
    const lines = [
        `运行 ${state.id}：${progress.done}/${progress.total} 阶段完成${progress.failed ? `，${progress.failed} 失败` : ""}${progress.skipped ? `，${progress.skipped} 跳过` : ""}${progress.pending ? `，${progress.pending} 待跑` : ""}（累计 tokens 约 ${progress.tokensUsed.toLocaleString()}）`,
        ...state.stages.map((stage) => {
            const mark = stage.status === "done" ? "✓" : stage.status === "failed" ? "✗" : stage.status === "skipped" ? "–" : "…";
            const detail = stage.status === "done" ? stage.summary || `产出节点 ${stage.createdNodeIds.length} 个` : stage.error || "";
            return `- ${mark} ${stage.stageKey}（${stage.agentId}）${stage.attempts > 1 ? ` 第 ${stage.attempts} 次尝试` : ""}${detail ? `：${text(detail, 160)}` : ""}`;
        }),
    ];
    return lines.join("\n");
}

/** 断点续跑时挑出可继续的起点，供 UI 提示「从哪个阶段继续」 */
export function resumePoint(state: RunState): string | null {
    const pending = state.stages.find((stage) => stage.status === "pending");
    return pending?.stageKey ?? null;
}

/**
 * 下一步该做什么。
 *
 * 调度循环的每一步决策都收在这一个纯函数里，执行器只负责"照着做 + 落盘"。
 * 这样「暂停/中断/跳过/并发/预算」这些规则的优先级才有唯一答案，也才测得准。
 * 优先级：跳过不可达 → 中断 → 暂停 → 预算 → 开跑；没有可跑的也没得可跳 = 计划无解。
 */
export type RunStepDecision = { kind: "done" } | { kind: "skip"; targets: Array<{ stageKey: string; reason: string }> } | { kind: "run"; stages: StageState[] } | { kind: "halt"; phase: RunPhase; reason: string };

export function planRunStep(state: RunState, options: { aborted?: boolean; paused?: boolean; maxConcurrent?: number; totalSteps?: number; maxTotalSteps?: number }): RunStepDecision {
    if (isRunSettled(state)) return { kind: "done" };

    const blockable = blockableStages(state);
    if (blockable.length) return { kind: "skip", targets: blockable.map((item) => ({ stageKey: item.stage.stageKey, reason: item.reason })) };

    if (options.aborted) return { kind: "halt", phase: "interrupted", reason: "运行被用户中断" };
    if (options.paused) return { kind: "halt", phase: "paused", reason: "运行已暂停（当前阶段已收尾）" };
    if (options.maxTotalSteps !== undefined && (options.totalSteps ?? 0) >= options.maxTotalSteps) {
        return { kind: "halt", phase: "paused", reason: `达到全局步数预算上限（${options.maxTotalSteps}），暂停后续阶段` };
    }

    const ready = readyStages(state);
    if (!ready.length) return { kind: "halt", phase: "failed", reason: "没有可执行阶段，运行无法继续" };
    return { kind: "run", stages: ready.slice(0, Math.max(1, options.maxConcurrent ?? ready.length)) };
}
