import { nanoid } from "nanoid";
import { modelOptionName, selectableModelsByCapability, type AiConfig } from "@/stores/use-config-store";
import { requestGeneratedToolResponse, type AiTextMessage, type ResponseInputMessage, type ResponseFunctionTool, type ResponseToolCall } from "@/lib/generation/generation-request";
import type { SubAgentDef, SubAgentTask, SubAgentResult, ProductionPlan } from "./canvas-agent-orchestrator-types";
import { hasCircularDependency, topSortStages, ORCHESTRATOR_CONSTANTS } from "./canvas-agent-orchestrator-types";
import type { CanvasAgentOp, CanvasAgentSnapshot } from "./canvas-agent-ops";
import { SUB_AGENTS } from "./canvas-agent-registry";

export type ExecutorContext = {
    abortSignal: AbortSignal;
    onLog: (title: string, data?: unknown) => void;
    onToolCall: (name: string, args: Record<string, unknown>) => { ok: boolean; message: string; ops?: CanvasAgentOp[] };
    onApplyOps: (ops: CanvasAgentOp[]) => CanvasAgentSnapshot;
};

export type ExecutorProgress = {
    agentId: string;
    stageKey: string;
    step: number;
    text: string;
    toolCalls: number;
};

type PendingToolCall = {
    id: string;
    name: string;
    args: Record<string, unknown>;
};

export async function executeSubAgent(
    def: SubAgentDef,
    task: SubAgentTask,
    context: ExecutorContext,
    config: AiConfig,
    onProgress?: (progress: ExecutorProgress) => void,
): Promise<SubAgentResult> {
    const createdNodeIds: string[] = [];
    const allOps: CanvasAgentOp[] = [];
    const derivedContext: Record<string, string> = {};
    let tokensUsed = 0;
    let stepsUsed = 0;

    const log = (title: string, data?: unknown) => context.onLog(`[${def.name}] ${title}`, data);

    // 子 Agent 文本模型解析：preferredModel 仅在平台目录文本列表中存在时生效，
    // 否则（如中转站未提供 gpt-4o-mini）回退到用户选择的 textModel，避免硬编码模型导致请求必败。
    const textModelNames = selectableModelsByCapability(config, "text").map(modelOptionName);
    const preferred = def.preferredModel ? modelOptionName(def.preferredModel) : "";
    const subAgentModel = (preferred && textModelNames.includes(preferred) ? preferred : "") || config.textModel || config.model;

    try {
        const messages = buildSubAgentMessages(def, task);
        const tools = resolveTools(def.toolNames);
 
        let currentMessages = messages;
        let hasMore = true;
 
        while (hasMore && stepsUsed < def.maxSteps) {
            if (context.abortSignal.aborted) {
                log("被用户中断");
                return { agentId: def.id, stageKey: task.stageKey, ok: false, error: "执行被用户中断", summary: "", createdNodeIds, metadata: {}, derivedContext, ops: allOps, tokensUsed, stepsUsed };
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
                return { agentId: def.id, stageKey: task.stageKey, ok: true, summary, createdNodeIds, metadata: parseMetadata(summary), derivedContext, ops: allOps, tokensUsed, stepsUsed };
            }
 
            const toolResults = executeToolSequence(result.toolCalls, context);
            for (const tr of toolResults) {
                allOps.push(...tr.ops);
                if (tr.nodeIds?.length) createdNodeIds.push(...tr.nodeIds);
            }
 
            const nextMessages: ResponseInputMessage[] = [...currentMessages] as ResponseInputMessage[];
            for (const tc of result.toolCalls) {
                nextMessages.push({ role: "assistant", content: "", tool_calls: [{ id: tc.id, type: "function", function: { name: tc.function.name, arguments: tc.function.arguments } }] } as unknown as ResponseInputMessage);
            }
            for (const tr of toolResults) {
                nextMessages.push({ role: "tool", tool_call_id: tr.id, content: JSON.stringify({ ok: tr.ok, message: tr.message }) } as unknown as ResponseInputMessage);
            }
            currentMessages = nextMessages;

            const allFailed = toolResults.length > 0 && toolResults.every((tr) => !tr.ok);
            if (allFailed && toolResults.length > 1) {
                log("全部工具调用失败，终止");
                return { agentId: def.id, stageKey: task.stageKey, ok: false, error: "工具调用全部失败", summary: toolResults.map((tr) => tr.message).join("; "), createdNodeIds, metadata: {}, derivedContext, ops: allOps, tokensUsed, stepsUsed };
            }

            const snapshotAfter = applyOpsToDerivedContext(allOps, context);
            currentMessages = injectCanvasState(currentMessages, snapshotAfter);
        }

        if (stepsUsed >= def.maxSteps) {
            log("达到最大步数限制");
        }
        return { agentId: def.id, stageKey: task.stageKey, ok: true, summary: "子 Agent 执行完成", createdNodeIds, metadata: {}, derivedContext, ops: allOps, tokensUsed, stepsUsed };
    } catch (error) {
        const msg = error instanceof Error ? error.message : "子 Agent 执行异常";
        log("执行异常", msg);
        return { agentId: def.id, stageKey: task.stageKey, ok: false, error: msg, summary: "", createdNodeIds, metadata: {}, derivedContext, ops: allOps, tokensUsed, stepsUsed };
    }
}

export async function executeProductionPlan(
    plan: ProductionPlan,
    context: ExecutorContext,
    config: AiConfig,
    onProgress?: (progress: ExecutorProgress) => void,
): Promise<ProductionPlan> {
    if (hasCircularDependency(plan.stages)) {
        return { ...plan, status: "failed", completedAt: Date.now() };
    }

    const levels = topSortStages(plan.stages);
    const results: Record<string, SubAgentResult> = {};
    let totalTokens = 0;

    for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
        const level = levels[levelIndex];
        context.onLog(`执行层级 ${levelIndex + 1}/${levels.length}`, level.map((s) => s.stageKey));

        if (context.abortSignal.aborted) {
            return { ...plan, status: "interrupted", results, completedAt: Date.now(), currentStageIndex: plan.stages.length };
        }

        const concurrency = Math.min(ORCHESTRATOR_CONSTANTS.MAX_CONCURRENT_AGENTS, level.length);
        for (let batch = 0; batch < level.length; batch += concurrency) {
            const batchStages = level.slice(batch, batch + concurrency);
            const batchResults = await Promise.allSettled(
                batchStages.map((stage) => {
                    const def = findAgent(stage.agentId);
                    if (!def) {
                        return Promise.resolve({ agentId: stage.agentId, stageKey: stage.stageKey, ok: false, error: `子 Agent ${stage.agentId} 未注册`, summary: "", createdNodeIds: [], metadata: {}, derivedContext: {}, ops: [], tokensUsed: 0, stepsUsed: 0 } as SubAgentResult);
                    }
                    if (context.abortSignal.aborted) {
                        return Promise.resolve({ agentId: stage.agentId, stageKey: stage.stageKey, ok: false, error: "执行被中断", summary: "", createdNodeIds: [], metadata: {}, derivedContext: {}, ops: [], tokensUsed: 0, stepsUsed: 0 } as SubAgentResult);
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
                } else {
                    results[stage.stageKey] = { agentId: stage.agentId, stageKey: stage.stageKey, ok: false, error: settled.reason?.message || "未知错误", summary: "", createdNodeIds: [], metadata: {}, derivedContext: {}, ops: [], tokensUsed: 0, stepsUsed: 0 };
                }
            }
        }

        const hasFailures = level.some((s) => results[s.stageKey]?.ok === false);
        if (hasFailures) {
            context.onLog(`层级 ${levelIndex + 1} 存在失败阶段`, level.map((s) => `${s.stageKey}: ${results[s.stageKey]?.ok ? "OK" : "FAIL"}`));
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

function buildSubAgentMessages(def: SubAgentDef, task: SubAgentTask): ResponseInputMessage[] {
    const messages: ResponseInputMessage[] = [
        { role: "system", content: def.persona.prompt },
    ];
    if (task.input.upstreamNodeIds?.length) {
        messages.push({ role: "system", content: `上游参考节点 ID：${task.input.upstreamNodeIds.join(", ")}` });
    }
    if (task.input.derivedContext && Object.keys(task.input.derivedContext).length) {
        const ctxLines = Object.entries(task.input.derivedContext).map(([k, v]) => `${k}: ${v}`).join("\n");
        messages.push({ role: "system", content: `上游派生上下文：\n${ctxLines}` });
    }
    messages.push({ role: "user", content: task.input.brief });
    return messages;
}

function resolveTools(toolNames: string[]): ResponseFunctionTool[] {
    return toolNames.map((name) => {
        const def = REGISTRY_TOOL_DEFS.find((t) => t.function.name === name);
        return def || { type: "function", function: { name, description: name, parameters: { type: "object", properties: {}, required: [], additionalProperties: true } } };
    });
}

function executeToolSequence(toolCalls: ResponseToolCall[], context: ExecutorContext) {
    const results: { id: string; ok: boolean; message: string; ops: CanvasAgentOp[]; nodeIds?: string[] }[] = [];
    for (const tc of toolCalls) {
        if (context.abortSignal.aborted) {
            results.push({ id: tc.id, ok: false, message: "执行被中断", ops: [] });
            continue;
        }
        try {
            const args = parseToolArgs(tc.function.arguments);
            const result = context.onToolCall(tc.function.name, args);
            const ops = result.ops || [];
            const nodeIds = ops.filter((op) => op.type === "add_node" || op.type === "run_generation").map((op) => "id" in op ? (op as { id?: string }).id : "").filter(Boolean) as string[];
            results.push({ id: tc.id, ok: result.ok, message: result.message, ops: result.ops || [], nodeIds });
        } catch (error) {
            results.push({ id: tc.id, ok: false, message: error instanceof Error ? error.message : "工具执行失败", ops: [] });
        }
    }
    return results;
}

function applyOpsToDerivedContext(ops: CanvasAgentOp[], context: ExecutorContext): CanvasAgentSnapshot {
    return context.onApplyOps([]);
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
    try { return JSON.parse(args); } catch { return {}; }
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

const REGISTRY_TOOL_DEFS: ResponseFunctionTool[] = [
    { type: "function", function: { name: "canvas_create_text_node", description: "创建文本节点", parameters: { type: "object", properties: { text: { type: "string" }, title: { type: "string" }, x: { type: "number" }, y: { type: "number" } }, required: ["text"], additionalProperties: false } } },
    { type: "function", function: { name: "canvas_create_text_nodes", description: "批量创建文本节点", parameters: { type: "object", properties: { items: { type: "array", items: { type: "object", properties: { text: { type: "string" }, title: { type: "string" } }, required: ["text"], additionalProperties: false } }, x: { type: "number" }, y: { type: "number" }, gap: { type: "number" }, direction: { type: "string", enum: ["row", "column"] } }, required: ["items"], additionalProperties: false } } },
    { type: "function", function: { name: "canvas_create_config_node", description: "创建生成配置节点", parameters: { type: "object", properties: { prompt: { type: "string" }, mode: { type: "string", enum: ["text", "image", "video", "audio"] }, title: { type: "string" }, x: { type: "number" }, y: { type: "number" }, autoRun: { type: "boolean" }, size: { type: "string" }, quality: { type: "string" }, model: { type: "string" }, seconds: { type: "string" }, vquality: { type: "string" } }, required: ["prompt", "mode"], additionalProperties: false } } },
    { type: "function", function: { name: "canvas_create_image_prompt_flow", description: "创建提示词节点并自动连线生图", parameters: { type: "object", properties: { prompt: { type: "string" }, x: { type: "number" }, y: { type: "number" }, autoRun: { type: "boolean" }, size: { type: "string" }, quality: { type: "string" }, model: { type: "string" } }, required: ["prompt"], additionalProperties: false } } },
    { type: "function", function: { name: "canvas_generate_image", description: "创建图片生成流程并立即触发生成", parameters: { type: "object", properties: { prompt: { type: "string" }, title: { type: "string" }, x: { type: "number" }, y: { type: "number" }, referenceNodeIds: { type: "array", items: { type: "string" } }, autoRun: { type: "boolean" }, size: { type: "string" }, quality: { type: "string" }, model: { type: "string" }, count: { type: "number" } }, required: ["prompt"], additionalProperties: false } } },
    { type: "function", function: { name: "canvas_generate_video", description: "创建视频生成流程并立即触发生成", parameters: { type: "object", properties: { prompt: { type: "string" }, title: { type: "string" }, x: { type: "number" }, y: { type: "number" }, referenceNodeIds: { type: "array", items: { type: "string" } }, autoRun: { type: "boolean" }, seconds: { type: "string" }, vquality: { type: "string" }, size: { type: "string" } }, required: ["prompt"], additionalProperties: false } } },
    { type: "function", function: { name: "canvas_connect_nodes", description: "连接节点", parameters: { type: "object", properties: { connections: { type: "array", items: { type: "object", properties: { fromNodeId: { type: "string" }, toNodeId: { type: "string" } }, required: ["fromNodeId", "toNodeId"], additionalProperties: false } } }, required: ["connections"], additionalProperties: false } } },
    { type: "function", function: { name: "canvas_update_node", description: "更新节点 metadata", parameters: { type: "object", properties: { id: { type: "string" }, metadata: { type: "object", additionalProperties: true } }, required: ["id"], additionalProperties: false } } },
    { type: "function", function: { name: "canvas_continue_video", description: "基于视频尾帧生成下一镜头", parameters: { type: "object", properties: { nodeId: { type: "string" } }, required: ["nodeId"], additionalProperties: false } } },
];
