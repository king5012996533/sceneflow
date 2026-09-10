import { modelOptionName, selectableModelsByCapability, type AiConfig } from "@/stores/use-config-store";
import { requestGeneratedToolResponse, type AiTextMessage, type ResponseInputMessage, type ResponseToolCall } from "@/lib/generation/generation-request";

import type { ToolResult } from "../engine/types";
import { resolveToolDefinitions, toResponseFunctionTools } from "../engine/tools/registry";
import { describeMemoryForPrompt, type CanvasProjectMemory } from "../engine/memory/project-memory";
import { collectUpstream, hasDependencyCycle, isRunSettled, markStageAborted, markStageFinished, markStageRunning, markStageSkipped, planRunStep, setRunPhase, type RunState, type StageOutcome, type StageState } from "../engine/scheduler/run-state";
import { DEFAULT_GENERATION_TIMEOUT_MS, describeGenerationWait, dispatchedGenerationNodeIds, nodeStatusesOf, waitForGeneration } from "../engine/scheduler/generation-wait";
import type { CanvasAgentSnapshot } from "./canvas-agent-ops";
import { getSubAgent, ORCHESTRATOR_CONSTANTS, type SubAgentDef } from "./canvas-agent-registry";

export type ExecutorContext = {
    abortSignal: AbortSignal;
    onLog: (title: string, data?: unknown) => void;
    /**
     * 工具调用统一返回 ToolResult（含 ops 与 createdNodeIds）。
     * 注意：ops 由引擎在工具执行时**已经**提交到画布，这里拿到的是执行回执，
     * 执行器不得再次提交，否则会重复建节点。
     */
    onToolCall: (name: string, args: Record<string, unknown>) => ToolResult;
    /** 读取当前画布快照（工具执行后就地取最新状态，也用于等待生成落地） */
    getSnapshot: () => CanvasAgentSnapshot;
    /** 读取工程记忆：子 Agent 起步就知道本工程已确认的长期事实 */
    getMemory: () => CanvasProjectMemory;
};

export type ExecutorProgress = {
    agentId: string;
    stageKey: string;
    step: number;
    text: string;
    toolCalls: number;
};

/** 调度层每推进一步都会通过它把新状态交回宿主落盘 */
export type RunHooks = {
    onRunChange: (run: RunState) => void;
    /** 返回 true 时在阶段边界暂停（当前批次跑完即停，不做半途截断） */
    shouldPause?: () => boolean;
    onProgress?: (progress: ExecutorProgress) => void;
};

/** 阶段执行结果：除了要落进 RunState 的结论，还带回本阶段派发出去的生成节点 */
type StageExecution = {
    outcome: StageOutcome;
    generationNodeIds: string[];
};

/** 上游注入给子 Agent 的上下文（任务书 + 上游产出 + 派生上下文） */
type StageInput = {
    brief: string;
    upstreamNodeIds: string[];
    derivedContext: Record<string, string>;
};

type StepToolResult = { id: string; ok: boolean; message: string; createdNodeIds: string[] };

/** 单个工具回执提取：优先用引擎给出的 createdNodeIds，缺失时从 ops 兜底推导 */
function extractCreatedNodeIds(result: ToolResult): string[] {
    if (result.createdNodeIds?.length) return result.createdNodeIds;
    return (result.ops || [])
        .filter((op) => op.type === "add_node" || op.type === "run_generation")
        .map((op) => ("id" in op ? (op as { id?: string }).id : ""))
        .filter(Boolean) as string[];
}

/** 从工具回执里挑出真正派发了生成的节点：这些节点要等生成落地才能放行下游 */
function extractGenerationNodeIds(result: ToolResult): string[] {
    return dispatchedGenerationNodeIds([result]);
}

/**
 * 执行单个子 Agent 阶段。
 * 返回 StageOutcome（可直接交给 markStageFinished）与它派发的生成节点。
 */
async function executeSubAgent(def: SubAgentDef, stage: StageState, input: StageInput, context: ExecutorContext, config: AiConfig, onProgress?: (progress: ExecutorProgress) => void): Promise<StageExecution> {
    const createdNodeIds: string[] = [];
    const generationNodeIds: string[] = [];
    let tokensUsed = 0;
    let stepsUsed = 0;

    const log = (title: string, data?: unknown) => context.onLog(`[${def.name}] ${title}`, data);

    // 子 Agent 文本模型解析：preferredModel 仅在平台目录文本列表中存在时生效，
    // 否则回退到用户选择的 textModel，避免硬编码模型导致请求必败。
    const textModelNames = selectableModelsByCapability(config, "text").map(modelOptionName);
    const preferred = def.preferredModel ? modelOptionName(def.preferredModel) : "";
    const subAgentModel = (preferred && textModelNames.includes(preferred) ? preferred : "") || config.textModel || config.model;

    /** 收尾：把累计用量与产出节点一并带上，调用方只需要看 ok/summary */
    const finish = (patch: { ok: boolean; summary: string; error?: string; derivedContext?: Record<string, string> }): StageExecution => ({
        outcome: { ...patch, createdNodeIds: [...createdNodeIds], tokensUsed, stepsUsed },
        generationNodeIds: [...new Set(generationNodeIds)],
    });

    // 单阶段中断信号：用户的「中断」与阶段超时都要能打断正在飞的模型请求，
    // 否则点了中断要等这一轮请求自己返回才停得下来。
    const stageAbort = new AbortController();
    const abortStage = () => stageAbort.abort();
    if (context.abortSignal.aborted) stageAbort.abort();
    else context.abortSignal.addEventListener("abort", abortStage);

    const run = async (): Promise<StageExecution> => {
        try {
            // 开局就把工程记忆与画布现状交给子 Agent，避免它既不知道工程设定、也不知道画布内容就盲目建节点
            let currentMessages = injectMemory(buildSubAgentMessages(def, input), context.getMemory());
            currentMessages = injectCanvasState(currentMessages, context.getSnapshot());
            const tools = toResponseFunctionTools(resolveToolDefinitions(def.toolNames));

            let hasMore = true;
            while (hasMore && stepsUsed < def.maxSteps) {
                if (stageAbort.signal.aborted) {
                    log("被用户中断");
                    return finish({ ok: false, error: "执行被用户中断", summary: "" });
                }
                if (tokensUsed >= ORCHESTRATOR_CONSTANTS.MAX_TOKENS_PER_AGENT) {
                    log("达到单 Agent token 预算上限");
                    return finish({ ok: true, summary: `达到 token 预算上限（${tokensUsed}），提前结束。已建 ${createdNodeIds.length} 个节点。` });
                }

                stepsUsed++;
                log(`步骤 ${stepsUsed}/${def.maxSteps} 开始`, { toolCount: tools.length });

                const result = await requestGeneratedToolResponse({
                    config: { ...config, model: subAgentModel, systemPrompt: "" },
                    messages: currentMessages,
                    tools,
                    toolChoice: tools.length ? "auto" : undefined,
                    onDelta: (text) => {
                        if (text.trim()) onProgress?.({ agentId: def.id, stageKey: stage.stageKey, step: stepsUsed, text, toolCalls: 0 });
                    },
                    options: { signal: stageAbort.signal },
                });

                tokensUsed += estimateTokens(result.content) + estimateToolTokens(result.toolCalls);
                log(`步骤 ${stepsUsed} 完成`, { toolCalls: result.toolCalls.length });

                if (!result.toolCalls.length) {
                    hasMore = false;
                    return finish({ ok: true, summary: result.content || `已建 ${createdNodeIds.length} 个节点。` });
                }

                // 工具执行前再看一眼：被中断后不许再往画布上写
                if (stageAbort.signal.aborted) {
                    log("被用户中断，停止后续工具执行");
                    return finish({ ok: false, error: "执行被用户中断", summary: "" });
                }
                const toolResults = executeToolSequence(result.toolCalls, stageAbort.signal, context);
                for (const tr of toolResults) createdNodeIds.push(...tr.createdNodeIds);
                for (const tr of toolResults) generationNodeIds.push(...tr.generationNodeIds);

                const nextMessages: ResponseInputMessage[] = [...currentMessages] as ResponseInputMessage[];
                for (const tc of result.toolCalls) {
                    nextMessages.push({ role: "assistant", content: "", tool_calls: [{ id: tc.id, type: "function", function: { name: tc.function.name, arguments: tc.function.arguments } }] } as unknown as ResponseInputMessage);
                }
                for (const tr of toolResults) {
                    // 只把模型需要看到的字段回灌，避免 ops 原文撑爆上下文
                    nextMessages.push({ role: "tool", tool_call_id: tr.id, content: JSON.stringify({ ok: tr.ok, message: tr.message, createdNodeIds: tr.createdNodeIds }) } as unknown as ResponseInputMessage);
                }
                currentMessages = nextMessages;

                const allFailed = toolResults.length > 0 && toolResults.every((tr) => !tr.ok);
                if (allFailed && toolResults.length > 1) {
                    log("全部工具调用失败，终止");
                    return finish({ ok: false, error: "工具调用全部失败", summary: toolResults.map((tr) => tr.message).join("; ") });
                }

                // 工具执行时 ops 已由引擎提交到画布，这里只读取最新状态注入下一轮上下文
                currentMessages = injectCanvasState(currentMessages, context.getSnapshot());
            }

            if (stepsUsed >= def.maxSteps) log("达到最大步数限制");
            return finish({ ok: true, summary: `已创建 ${createdNodeIds.length} 个节点。` });
        } catch (error) {
            const msg = error instanceof Error ? error.message : "子 Agent 执行异常";
            log("执行异常", msg);
            return finish({ ok: false, error: msg, summary: "" });
        }
    };

    // 超时保护：到点必须掐断循环内的请求，否则超时只是「不再等」，它还会继续往画布上写
    const timeoutMs = def.timeoutMs || ORCHESTRATOR_CONSTANTS.DEFAULT_AGENT_TIMEOUT_MS;
    const timedOut = Symbol("timeout");
    const runPromise = run();
    const timeoutPromise = new Promise<typeof timedOut>((resolve) => {
        const timer = setTimeout(() => {
            abortStage();
            resolve(timedOut);
        }, timeoutMs);
        const clear = () => {
            clearTimeout(timer);
            context.abortSignal.removeEventListener("abort", abortStage);
        };
        // 执行结束时清理定时器与监听，避免泄漏（失败分支也要清理，且不产生未处理的 rejection）
        void runPromise.then(clear, clear);
    });

    const outcome = await Promise.race([runPromise, timeoutPromise]);
    if (outcome === timedOut) {
        log(`执行超时（${timeoutMs}ms）`);
        return finish({ ok: false, error: `子 Agent 执行超时（${timeoutMs}ms）`, summary: "" });
    }
    return outcome;
}

/**
 * 按 RunState 驱动一次多阶段生产。
 *
 * 调度规则（全部落在 run-state 的纯函数里，这里只负责编排与落盘）：
 *  - 每一轮挑选依赖已终结的 pending 阶段，最多 MAX_CONCURRENT_AGENTS 个并发；
 *  - 上游有失败/跳过的阶段显式判为跳过，否则整个 Run 永远等不到终结；
 *  - 派发过生成的阶段必须等生成落地（成功/失败）再放行下游；
 *  - 暂停在阶段边界生效，中断在阶段内生效（abortSignal）；
 *  - 每推进一步都通过 onRunChange 交回宿主落盘，刷新页面可断点续跑。
 */
export async function executeRun(run: RunState, context: ExecutorContext, config: AiConfig, hooks: RunHooks): Promise<RunState> {
    let state = run;
    // 步数预算按运行累计：续跑时要算上已经花掉的步数，否则「全局预算」形同虚设
    let totalSteps = state.stages.reduce((sum, stage) => sum + (stage.stepsUsed || 0), 0);
    const commit = (next: RunState) => {
        state = next;
        hooks.onRunChange(next);
    };

    const interrupted = (error: string): StageExecution => ({ outcome: { ok: false, error, summary: "", createdNodeIds: [], tokensUsed: 0, stepsUsed: 0 }, generationNodeIds: [] });

    const runStage = async (stage: StageState): Promise<StageExecution> => {
        const def = getSubAgent(stage.agentId);
        if (!def) return interrupted(`子 Agent ${stage.agentId} 未注册`);
        if (context.abortSignal.aborted) return interrupted("执行被中断");

        const upstream = collectUpstream(state, stage.stageKey);
        const executed = await executeSubAgent(def, stage, { brief: stage.brief, ...upstream }, context, config, hooks.onProgress);

        // 生成了图/视频的阶段，必须等它们落地：下游拿着没画出来的图去生成，产出必然是废的
        const generationIds = executed.generationNodeIds;
        if (!generationIds.length || !executed.outcome.ok) return executed;

        context.onLog(`阶段 ${stage.stageKey} 等待 ${generationIds.length} 个生成落地`, generationIds);
        // 轮询每 2.5 秒一次，日志只在有进展时记一条，否则日志页会被等待刷屏
        let lastDone = -1;
        const waited = await waitForGeneration(generationIds, {
            getStatuses: () => nodeStatuses(context.getSnapshot(), generationIds),
            signal: context.abortSignal,
            onTick: (snapshot) => {
                if (!snapshot.pending.length || snapshot.succeeded.length === lastDone) return;
                lastDone = snapshot.succeeded.length;
                context.onLog(`生成进行中：${snapshot.succeeded.length}/${generationIds.length} 完成`);
            },
        });
        const note = describeGenerationWait(waited);
        context.onLog(`阶段 ${stage.stageKey} 生成结果`, note);

        if (waited.aborted) return { ...executed, outcome: { ...executed.outcome, ok: false, error: "等待生成时被用户中断" } };
        // 生成没落地就不放行下游：明确失败的、以及超时仍在跑的，都算这个阶段没完成。
        // 宁可停下来让用户决定要不要重试，也不要让下游拿着半成品继续烧钱。
        if (waited.failed.length) return { ...executed, outcome: { ...executed.outcome, ok: false, error: `生成失败：${waited.failed.join(", ")}` } };
        // 节点一直停在空闲 = 生成压根没派出去（没有可用模型等），这不是「慢」，等下去只会白等
        if (!waited.started && waited.pending.length) return { ...executed, outcome: { ...executed.outcome, ok: false, error: `生成没有启动：${note}。请检查生成模型配置后重试。` } };
        if (waited.timedOut && waited.pending.length) return { ...executed, outcome: { ...executed.outcome, ok: false, error: `生成超时未完成：${waited.pending.join(", ")}（已等待 ${Math.round(DEFAULT_GENERATION_TIMEOUT_MS / 60000)} 分钟）` } };
        return { ...executed, outcome: { ...executed.outcome, summary: `${executed.outcome.summary}（${note}）` } };
    };

    if (hasDependencyCycle(state.stages)) {
        context.onLog("计划存在循环依赖或悬空依赖，已终止");
        commit(setRunPhase(state, "failed"));
        return state;
    }
    if (!isRunSettled(state)) commit(setRunPhase(state, "running"));

    for (;;) {
        // 每一步该做什么由状态机的纯函数决定，这里只负责照着做并把结果落盘
        const step = planRunStep(state, {
            aborted: context.abortSignal.aborted,
            paused: hooks.shouldPause?.() ?? false,
            maxConcurrent: ORCHESTRATOR_CONSTANTS.MAX_CONCURRENT_AGENTS,
            totalSteps,
            maxTotalSteps: ORCHESTRATOR_CONSTANTS.MAX_TOTAL_STEPS,
        });
        if (step.kind === "done") break;
        if (step.kind === "halt") {
            context.onLog(step.reason);
            commit(setRunPhase(state, step.phase));
            break;
        }
        if (step.kind === "skip") {
            for (const target of step.targets) {
                context.onLog(`阶段 ${target.stageKey} 已跳过`, target.reason);
                commit(markStageSkipped(state, target.stageKey, target.reason));
            }
            continue;
        }

        const batch = step.stages;
        for (const stage of batch) commit(markStageRunning(state, stage.stageKey));
        context.onLog(
            `本轮执行 ${batch.length} 个阶段`,
            batch.map((stage) => `${stage.stageKey}<${stage.agentId}>`),
        );

        // 并发执行本批阶段，结果按顺序落盘（保证同一份计划每次调度结果一致）
        const executions = await Promise.all(batch.map((stage) => runStage(stage)));
        for (let index = 0; index < batch.length; index++) {
            const stage = batch[index];
            const execution = executions[index];
            totalSteps += execution.outcome.stepsUsed ?? 0;
            // 被中断而没跑完的阶段放回待跑：记成失败会让下游全部被跳过，「继续」就补不回来了
            if (context.abortSignal.aborted && !execution.outcome.ok) {
                context.onLog(`阶段 ${stage.stageKey} 被中断，已放回待跑`);
                commit(markStageAborted(state, stage.stageKey));
                continue;
            }
            context.onLog(`阶段 ${stage.stageKey} ${execution.outcome.ok ? "完成" : "失败"}`, execution.outcome.summary || execution.outcome.error);
            commit(markStageFinished(state, stage.stageKey, execution.outcome));
        }
    }

    return state;
}

/** 画布节点状态表：只取本次关心的节点，避免整图搬运（与在线对话共用同一实现） */
function nodeStatuses(snapshot: CanvasAgentSnapshot, nodeIds: string[]): Record<string, string | undefined> {
    return nodeStatusesOf(snapshot.nodes, nodeIds);
}

function buildSubAgentMessages(def: SubAgentDef, input: StageInput): ResponseInputMessage[] {
    const messages: ResponseInputMessage[] = [{ role: "system", content: def.persona.prompt }];
    if (input.upstreamNodeIds.length) {
        messages.push({ role: "system", content: `上游参考节点 ID（可直接作为 referenceNodeIds 使用）：${input.upstreamNodeIds.join(", ")}` });
    }
    if (Object.keys(input.derivedContext).length) {
        const ctxLines = Object.entries(input.derivedContext)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n");
        messages.push({ role: "system", content: `上游派生上下文：\n${ctxLines}` });
    }
    messages.push({ role: "user", content: input.brief });
    return messages;
}

function executeToolSequence(toolCalls: ResponseToolCall[], signal: AbortSignal, context: ExecutorContext): Array<StepToolResult & { generationNodeIds: string[] }> {
    const results: Array<StepToolResult & { generationNodeIds: string[] }> = [];
    for (const tc of toolCalls) {
        if (signal.aborted) {
            results.push({ id: tc.id, ok: false, message: "执行被中断", createdNodeIds: [], generationNodeIds: [] });
            continue;
        }
        try {
            const args = parseToolArgs(tc.function.arguments);
            const result = context.onToolCall(tc.function.name, args);
            results.push({
                id: tc.id,
                ok: result.ok,
                // 给模型看 observation（含执行后画布规模），失败时看 message（失败原因）
                message: result.ok ? result.observation || result.message : result.message,
                createdNodeIds: extractCreatedNodeIds(result),
                generationNodeIds: extractGenerationNodeIds(result),
            });
        } catch (error) {
            results.push({ id: tc.id, ok: false, message: error instanceof Error ? error.message : "工具执行失败", createdNodeIds: [], generationNodeIds: [] });
        }
    }
    return results;
}

/** 把工程记忆注入子 Agent 上下文：跨阶段的角色锚点、风格锁、连续性都靠它传递 */
function injectMemory(messages: ResponseInputMessage[], memory: CanvasProjectMemory): ResponseInputMessage[] {
    const text = describeMemoryForPrompt(memory);
    if (!text) return messages;
    const systemMsg = messages.find((m): m is AiTextMessage => "role" in m && m.role === "system");
    if (systemMsg && typeof systemMsg.content === "string") {
        return messages.map((m) => (m === systemMsg ? { ...m, content: `${systemMsg.content}\n\n${text}` } : m));
    }
    return [{ role: "system" as const, content: text }, ...messages];
}

function injectCanvasState(messages: ResponseInputMessage[], snapshot: CanvasAgentSnapshot): ResponseInputMessage[] {
    const stateInfo = `当前画布状态：节点 ${snapshot.nodes.length} 个，连线 ${snapshot.connections.length} 条，选中 ${snapshot.selectedNodeIds.length} 个。`;
    const textMessages = messages.filter((m): m is AiTextMessage => "role" in m);
    const systemMsg = textMessages.find((m) => m.role === "system");
    if (systemMsg && typeof systemMsg.content === "string") {
        return messages.map((m) => ("role" in m && m === systemMsg ? { ...m, content: `${systemMsg.content}\n\n${stateInfo}` } : m));
    }
    return [...messages, { role: "system" as const, content: stateInfo }];
}

function parseToolArgs(args: string): Record<string, unknown> {
    try {
        return JSON.parse(args);
    } catch {
        return {};
    }
}

function estimateTokens(text: string): number {
    return Math.ceil((text?.length || 0) / 4);
}

function estimateToolTokens(toolCalls: ResponseToolCall[]): number {
    return toolCalls.reduce((sum, tc) => sum + (tc.function.name?.length || 0) + (tc.function.arguments?.length || 0), 0) / 4;
}
