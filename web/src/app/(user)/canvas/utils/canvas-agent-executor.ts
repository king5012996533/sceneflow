import { modelOptionName, selectableModelsByCapability, type AiConfig } from "@/stores/use-config-store";
import { requestGeneratedToolResponse, type AiTextMessage, type ResponseInputMessage, type ResponseToolCall } from "@/lib/generation/generation-request";

import type { ToolResult } from "../engine/types";
import { resolveToolDefinitions, toResponseFunctionTools } from "../engine/tools/registry";
import { describeMemoryForPrompt, type CanvasProjectMemory } from "../engine/memory/project-memory";
import type { SubAgentDef, SubAgentTask, SubAgentResult, ProductionPlan } from "./canvas-agent-orchestrator-types";
import { hasCircularDependency, topSortStages, ORCHESTRATOR_CONSTANTS } from "./canvas-agent-orchestrator-types";
import type { CanvasAgentOp, CanvasAgentSnapshot } from "./canvas-agent-ops";
import { SUB_AGENTS } from "./canvas-agent-registry";

export type ExecutorContext = {
    abortSignal: AbortSignal;
    onLog: (title: string, data?: unknown) => void;
    /**
     * 工具调用统一返回 ToolResult（含 ops 与 createdNodeIds）。
     * 注意：ops 由引擎在工具执行时**已经**提交到画布，这里拿到的是执行回执，
     * 执行器不得再次提交，否则会重复建节点。
     */
    onToolCall: (name: string, args: Record<string, unknown>) => ToolResult;
    /** 读取当前画布快照（工具执行后就地取最新状态） */
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

type StepToolResult = { id: string; ok: boolean; message: string; ops: CanvasAgentOp[]; createdNodeIds: string[] };

/** 单个工具回执提取：优先用引擎给出的 createdNodeIds，缺失时从 ops 兜底推导 */
function extractCreatedNodeIds(result: ToolResult): string[] {
    if (result.createdNodeIds?.length) return result.createdNodeIds;
    return (result.ops || [])
        .filter((op) => op.type === "add_node" || op.type === "run_generation")
        .map((op) => ("id" in op ? (op as { id?: string }).id : ""))
        .filter(Boolean) as string[];
}

export async function executeSubAgent(def: SubAgentDef, task: SubAgentTask, context: ExecutorContext, config: AiConfig, onProgress?: (progress: ExecutorProgress) => void): Promise<SubAgentResult> {
    const createdNodeIds: string[] = [];
    const allOps: CanvasAgentOp[] = [];
    const derivedContext: Record<string, string> = {};
    let tokensUsed = 0;
    let stepsUsed = 0;

    const log = (title: string, data?: unknown) => context.onLog(`[${def.name}] ${title}`, data);

    // 子 Agent 文本模型解析：preferredModel 仅在平台目录文本列表中存在时生效，
    // 否则回退到用户选择的 textModel，避免硬编码模型导致请求必败。
    const textModelNames = selectableModelsByCapability(config, "text").map(modelOptionName);
    const preferred = def.preferredModel ? modelOptionName(def.preferredModel) : "";
    const subAgentModel = (preferred && textModelNames.includes(preferred) ? preferred : "") || config.textModel || config.model;

    const finish = (patch: Partial<SubAgentResult> & { ok: boolean; summary: string }): SubAgentResult => ({
        agentId: def.id,
        stageKey: task.stageKey,
        createdNodeIds,
        metadata: {},
        derivedContext,
        ops: allOps,
        tokensUsed,
        stepsUsed,
        ...patch,
    });

    const run = async (): Promise<SubAgentResult> => {
        try {
            // 开局就把工程记忆与画布现状交给子 Agent，避免它既不知道工程设定、也不知道画布内容就盲目建节点
            let currentMessages = injectMemory(buildSubAgentMessages(def, task), context.getMemory());
            currentMessages = injectCanvasState(currentMessages, context.getSnapshot());
            const tools = toResponseFunctionTools(resolveToolDefinitions(def.toolNames));

            let hasMore = true;
            while (hasMore && stepsUsed < def.maxSteps) {
                if (context.abortSignal.aborted) {
                    log("被用户中断");
                    return finish({ ok: false, error: "执行被用户中断", summary: "" });
                }
                if (tokensUsed >= ORCHESTRATOR_CONSTANTS.MAX_TOKENS_PER_AGENT) {
                    log("达到单 Agent token 预算上限");
                    return finish({ ok: true, summary: `达到 token 预算上限（${tokensUsed}），提前结束。` });
                }

                stepsUsed++;
                log(`步骤 ${stepsUsed}/${def.maxSteps} 开始`, { toolCount: tools.length });

                const result = await requestGeneratedToolResponse({
                    config: { ...config, model: subAgentModel, systemPrompt: "" },
                    messages: currentMessages,
                    tools,
                    toolChoice: tools.length ? "auto" : undefined,
                    onDelta: (text) => {
                        if (text.trim()) onProgress?.({ agentId: def.id, stageKey: task.stageKey, step: stepsUsed, text, toolCalls: 0 });
                    },
                });

                tokensUsed += estimateTokens(result.content) + estimateToolTokens(result.toolCalls);
                log(`步骤 ${stepsUsed} 完成`, { toolCalls: result.toolCalls.length });

                if (!result.toolCalls.length) {
                    hasMore = false;
                    const summary = result.content || "完成";
                    return finish({ ok: true, summary, metadata: parseMetadata(summary) });
                }

                const toolResults = executeToolSequence(result.toolCalls, context);
                for (const tr of toolResults) {
                    allOps.push(...tr.ops);
                    if (tr.createdNodeIds.length) createdNodeIds.push(...tr.createdNodeIds);
                }

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

    // 超时保护：def.timeoutMs 此前定义了却从未生效
    const timedOut = Symbol("timeout");
    const runPromise = run();
    const timeoutPromise = new Promise<typeof timedOut>((resolve) => {
        const timer = setTimeout(() => resolve(timedOut), def.timeoutMs || ORCHESTRATOR_CONSTANTS.DEFAULT_AGENT_TIMEOUT_MS);
        const clear = () => clearTimeout(timer);
        // 执行结束时清理定时器，避免泄漏（失败分支也要清理，且不产生未处理的 rejection）
        void runPromise.then(clear, clear);
    });

    const outcome = await Promise.race([runPromise, timeoutPromise]);
    if (outcome === timedOut) {
        log(`执行超时（${def.timeoutMs}ms）`);
        return finish({ ok: false, error: `子 Agent 执行超时（${def.timeoutMs}ms）`, summary: "" });
    }

    // 汇总派生上下文：让下游阶段能直接看到上游产出的节点
    const summary = outcome.ok ? `产出节点 ${createdNodeIds.length} 个：${createdNodeIds.join(", ") || "无"}` : `失败：${outcome.error || "未知错误"}`;
    derivedContext[task.stageKey] = summary;
    return { ...outcome, derivedContext: { ...outcome.derivedContext, ...derivedContext } };
}

export async function executeProductionPlan(plan: ProductionPlan, context: ExecutorContext, config: AiConfig, onProgress?: (progress: ExecutorProgress) => void): Promise<ProductionPlan> {
    if (hasCircularDependency(plan.stages)) {
        context.onLog("计划存在循环依赖，已终止");
        return { ...plan, status: "failed", completedAt: Date.now() };
    }

    const levels = topSortStages(plan.stages);
    const results: Record<string, SubAgentResult> = {};
    let totalTokens = 0;
    let totalSteps = 0;

    for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
        const level = levels[levelIndex];
        context.onLog(
            `执行层级 ${levelIndex + 1}/${levels.length}`,
            level.map((s) => s.stageKey),
        );

        if (context.abortSignal.aborted) {
            return { ...plan, status: "interrupted", results, completedAt: Date.now(), currentStageIndex: plan.stages.length };
        }
        // 全局步数预算：此前 MAX_TOTAL_STEPS 定义了却从未生效
        if (totalSteps >= ORCHESTRATOR_CONSTANTS.MAX_TOTAL_STEPS) {
            context.onLog("达到全局步数预算上限，停止后续阶段");
            break;
        }

        const runnable: SubAgentTask[] = [];
        for (const stage of level) {
            // 上游失败则下游跳过（此前失败只打日志，下游照跑）
            const failedDeps = stage.dependencies.filter((dep) => results[dep] && !results[dep].ok);
            const missingDeps = stage.dependencies.filter((dep) => !results[dep]);
            if (failedDeps.length || missingDeps.length) {
                const reason = failedDeps.length ? `上游阶段失败：${failedDeps.join(", ")}` : `上游阶段未执行：${missingDeps.join(", ")}`;
                context.onLog(`阶段 ${stage.stageKey} 已跳过`, reason);
                results[stage.stageKey] = {
                    agentId: stage.agentId,
                    stageKey: stage.stageKey,
                    ok: false,
                    error: reason,
                    summary: "",
                    createdNodeIds: [],
                    metadata: {},
                    derivedContext: {},
                    ops: [],
                    tokensUsed: 0,
                    stepsUsed: 0,
                };
                continue;
            }
            runnable.push(enrichWithUpstream(stage, results));
        }

        const concurrency = Math.min(ORCHESTRATOR_CONSTANTS.MAX_CONCURRENT_AGENTS, runnable.length || 1);
        for (let batch = 0; batch < runnable.length; batch += concurrency) {
            const batchStages = runnable.slice(batch, batch + concurrency);
            const batchResults = await Promise.allSettled(
                batchStages.map((stage) => {
                    const def = findAgent(stage.agentId);
                    if (!def) {
                        return Promise.resolve({
                            agentId: stage.agentId,
                            stageKey: stage.stageKey,
                            ok: false,
                            error: `子 Agent ${stage.agentId} 未注册`,
                            summary: "",
                            createdNodeIds: [],
                            metadata: {},
                            derivedContext: {},
                            ops: [],
                            tokensUsed: 0,
                            stepsUsed: 0,
                        } as SubAgentResult);
                    }
                    if (context.abortSignal.aborted) {
                        return Promise.resolve({
                            agentId: stage.agentId,
                            stageKey: stage.stageKey,
                            ok: false,
                            error: "执行被中断",
                            summary: "",
                            createdNodeIds: [],
                            metadata: {},
                            derivedContext: {},
                            ops: [],
                            tokensUsed: 0,
                            stepsUsed: 0,
                        } as SubAgentResult);
                    }
                    return executeSubAgent(def, stage, context, config, onProgress);
                }),
            );

            for (let i = 0; i < batchStages.length; i++) {
                const stage = batchStages[i];
                const settled = batchResults[i];
                if (settled.status === "fulfilled") {
                    results[stage.stageKey] = settled.value;
                    totalTokens += settled.value.tokensUsed;
                    totalSteps += settled.value.stepsUsed;
                } else {
                    results[stage.stageKey] = {
                        agentId: stage.agentId,
                        stageKey: stage.stageKey,
                        ok: false,
                        error: settled.reason?.message || "未知错误",
                        summary: "",
                        createdNodeIds: [],
                        metadata: {},
                        derivedContext: {},
                        ops: [],
                        tokensUsed: 0,
                        stepsUsed: 0,
                    };
                }
            }
        }
    }

    const allFailed = plan.stages.length > 0 && plan.stages.every((s) => !results[s.stageKey]?.ok);
    return {
        ...plan,
        status: allFailed ? "failed" : "completed",
        results,
        currentStageIndex: plan.stages.length,
        completedAt: Date.now(),
    };
}

/** 把上游阶段的产出节点与派生上下文注入当前阶段 —— 修复「上下游不串」的第三处断裂 */
function enrichWithUpstream(stage: SubAgentTask, results: Record<string, SubAgentResult>): SubAgentTask {
    const upstreamNodeIds: string[] = [];
    const derivedContext: Record<string, string> = { ...(stage.input.derivedContext || {}) };
    for (const dep of stage.dependencies) {
        const upstream = results[dep];
        if (!upstream) continue;
        upstreamNodeIds.push(...upstream.createdNodeIds);
        Object.assign(derivedContext, upstream.derivedContext);
    }
    return {
        ...stage,
        input: {
            ...stage.input,
            upstreamNodeIds: [...new Set([...(stage.input.upstreamNodeIds || []), ...upstreamNodeIds])],
            derivedContext,
        },
    };
}

function buildSubAgentMessages(def: SubAgentDef, task: SubAgentTask): ResponseInputMessage[] {
    const messages: ResponseInputMessage[] = [{ role: "system", content: def.persona.prompt }];
    if (task.input.upstreamNodeIds?.length) {
        messages.push({ role: "system", content: `上游参考节点 ID（可直接作为 referenceNodeIds 使用）：${task.input.upstreamNodeIds.join(", ")}` });
    }
    if (task.input.derivedContext && Object.keys(task.input.derivedContext).length) {
        const ctxLines = Object.entries(task.input.derivedContext)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n");
        messages.push({ role: "system", content: `上游派生上下文：\n${ctxLines}` });
    }
    messages.push({ role: "user", content: task.input.brief });
    return messages;
}

function executeToolSequence(toolCalls: ResponseToolCall[], context: ExecutorContext): StepToolResult[] {
    const results: StepToolResult[] = [];
    for (const tc of toolCalls) {
        if (context.abortSignal.aborted) {
            results.push({ id: tc.id, ok: false, message: "执行被中断", ops: [], createdNodeIds: [] });
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
                ops: result.ops || [],
                createdNodeIds: extractCreatedNodeIds(result),
            });
        } catch (error) {
            results.push({ id: tc.id, ok: false, message: error instanceof Error ? error.message : "工具执行失败", ops: [], createdNodeIds: [] });
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

function parseMetadata(content: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (!content) return result;
    const lines = content.split("\n").filter(Boolean);
    for (const line of lines) {
        const match = line.match(/^[-*]\s*(.+?)[：:]\s*(.+)$/);
        if (match) result[match[1].trim()] = match[2].trim();
    }
    return result;
}

function estimateTokens(text: string): number {
    return Math.ceil((text?.length || 0) / 4);
}

function estimateToolTokens(toolCalls: ResponseToolCall[]): number {
    return toolCalls.reduce((sum, tc) => sum + (tc.function.name?.length || 0) + (tc.function.arguments?.length || 0), 0) / 4;
}

function findAgent(id: string): SubAgentDef | undefined {
    return SUB_AGENTS.find((a) => a.id === id);
}
