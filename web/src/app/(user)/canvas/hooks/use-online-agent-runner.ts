"use client";

import { useRef, type MutableRefObject } from "react";
import { nanoid } from "nanoid";

import { type AiConfig } from "@/stores/use-config-store";
import { requestGeneratedToolResponse, type ResponseInputMessage, type ResponseToolCall } from "@/lib/generation/generation-request";
import { type CanvasAssistantMessage, type CanvasAssistantSession } from "../types";
import { type CanvasAgentSnapshot } from "../utils/canvas-agent-ops";
import { shouldExposeCanvasTools, shouldReadCanvasBeforeWrite, shouldRequireToolCall } from "../utils/agent-intent";
import { allResponseFunctionTools, readOnlyResponseFunctionTools, toolLabel, toolNeedsConfirmation } from "../engine/tools/registry";
import { tryClaimCanvasRun } from "../engine/scheduler/run-lock";
import { describeGenerationWait, dispatchedGenerationNodeIds, nodeStatusesOf, waitForGeneration, type GenerationWaitResult } from "../engine/scheduler/generation-wait";
import type { ToolResult } from "../engine/types";

const ONLINE_AGENT_MAX_STEPS = 4;
const ONLINE_AGENT_MAX_TOOL_CALLS_PER_STEP = 8;
const REQUIRED_TOOL_CHOICE = "required" as const;
/** 画布写入权标签：在线对话与全自动生产共用一把锁，同一 id 重复加锁视为续跑 */
const RUN_LOCK_ID = "online";

// 工具清单来自唯一注册表；此处缓存模块级常量，避免每步重建
const ALL_TOOLS = allResponseFunctionTools();
const READ_ONLY_TOOLS = readOnlyResponseFunctionTools();

/** 工具回执统一用引擎的 ToolResult（含 ops / createdNodeIds / observation） */
export type OnlineToolResult = ToolResult;
export type OnlineExecutedToolCall = { toolCallId: string; name: string; result: OnlineToolResult };
export type PendingOnlineToolContext = { messages: ResponseInputMessage[]; toolCalls: ResponseToolCall[]; assistantId: string; step: number };

type OnlineLoopContext = { step: number };

type UseOnlineAgentRunnerOptions = {
    effectiveConfig: AiConfig;
    confirmTools: boolean;
    safeSessions: CanvasAssistantSession[];
    snapshotRef: MutableRefObject<CanvasAgentSnapshot>;
    setIsRunning: (running: boolean) => void;
    appendMessage: (sessionId: string, message: CanvasAssistantMessage) => void;
    upsertMessage: (sessionId: string, message: CanvasAssistantMessage) => void;
    addOnlineLog: (title: string, data?: unknown) => void;
    buildMessages: (snapshot: CanvasAgentSnapshot, history: CanvasAssistantMessage[], userMessage: CanvasAssistantMessage) => Promise<ResponseInputMessage[]>;
    executeToolCall: (toolCall: ResponseToolCall) => OnlineExecutedToolCall;
};

export function useOnlineAgentRunner({ effectiveConfig, confirmTools, safeSessions, snapshotRef, setIsRunning, appendMessage, upsertMessage, addOnlineLog, buildMessages, executeToolCall }: UseOnlineAgentRunnerOptions) {
    const pendingToolContextRef = useRef(new Map<string, PendingOnlineToolContext>());

    const executeToolCalls = (toolCalls: ResponseToolCall[]) => {
        const results: OnlineExecutedToolCall[] = [];
        let stopped = false;
        toolCalls.forEach((toolCall, index) => {
            if (index >= ONLINE_AGENT_MAX_TOOL_CALLS_PER_STEP) {
                results.push({ toolCallId: toolCall.id, name: toolCall.function.name, result: { ok: false, message: `单轮工具调用过多，已跳过第 ${index + 1} 个及后续工具。` } });
                return;
            }
            if (stopped) {
                results.push({ toolCallId: toolCall.id, name: toolCall.function.name, result: { ok: false, message: "前一个工具调用失败，后续工具已停止执行。" } });
                return;
            }
            const result = executeToolCall(toolCall);
            results.push(result);
            if (!result.result.ok) stopped = true;
        });
        return results;
    };

    /**
     * 派发出去的生成必须等到落地，再把真实结果交回模型。
     *
     * 不做这一步的后果很具体：模型只收到「已触发生成」就以为事情办完了，
     * 于是停止调用工具、把「正在生成」当成「已经生成」回报给用户，用户还得
     * 自己手点一次生成、再手动接着往下做——闭环断在这里。
     *
     * 落地后除了报告成功/失败，还会带上「本次新产出的节点 id」：那是模型
     * 继续下一步（例如拿新图去生视频）唯一的合法引用依据，靠它自己猜 id 必错。
     */
    const waitForDispatchedGenerations = async (sessionId: string, results: OnlineExecutedToolCall[]): Promise<OnlineExecutedToolCall[]> => {
        const nodeIds = dispatchedGenerationNodeIds(results.map((item) => item.result));
        if (!nodeIds.length) return results;

        const beforeIds = new Set(snapshotRef.current.nodes.map((node) => node.id));
        const waitMessageId = nanoid();
        appendMessage(sessionId, {
            id: waitMessageId,
            role: "tool",
            title: "等待生成落地",
            text: `已派发 ${nodeIds.length} 个生成，等待结果中…`,
            detail: { status: "running", nodeIds },
        });
        addOnlineLog("等待生成落地", { nodeIds });

        const waited = await waitForGeneration(nodeIds, {
            // 必须按传入的 id 取状态：等待集合里还有「派发之后才出现的媒体节点」
            getStatuses: (watchedIds) => nodeStatusesOf(snapshotRef.current.nodes, watchedIds),
            // 视频/音频模式在派发当刻就把配置节点标成成功，真正在跑的是新建的媒体节点：
            // 这些「派发之后才出现的节点」必须一起等，否则会把还在渲染的视频当成做完了。
            getWatchedIds: () => snapshotRef.current.nodes.filter((node) => !beforeIds.has(node.id)).map((node) => node.id),
            onTick: (snapshot) => {
                if (!snapshot.pending.length) return;
                const done = snapshot.succeeded.length + snapshot.failed.length;
                upsertMessage(sessionId, {
                    id: waitMessageId,
                    role: "tool",
                    title: "等待生成落地",
                    text: `生成中：${done}/${done + snapshot.pending.length} 完成，${snapshot.pending.length} 个进行中…`,
                    detail: { status: "running", nodeIds },
                });
            },
        });

        const produced = snapshotRef.current.nodes.filter((node) => !beforeIds.has(node.id)).map((node) => ({ id: node.id, type: node.type as string, title: node.title }));
        const note = describeGenerationWait(waited);
        const outcome = describeGenerationOutcome(waited, produced);

        upsertMessage(sessionId, {
            id: waitMessageId,
            role: "tool",
            title: waited.failed.length || !waited.started ? "生成未完成" : waited.pending.length ? "生成超时未完成" : "生成已完成",
            text: outcome,
            detail: { status: waited.failed.length || !waited.started ? "failed" : waited.pending.length ? "running" : "completed", nodeIds, produced },
        });
        addOnlineLog("生成结果", { note, produced });

        return results.map((item) => {
            // 只有真正派发了生成的工具回执才追加落地结论，其余保持原样
            if (!dispatchedGenerationNodeIds([item.result]).length) return item;
            const merged = `${item.result.message}\n${outcome}`;
            return { ...item, result: { ...item.result, message: merged, observation: item.result.observation ? `${item.result.observation}\n${outcome}` : outcome } };
        });
    };

    const appendPendingToolMessage = (sessionId: string, assistantId: string, messages: ResponseInputMessage[], toolCalls: ResponseToolCall[], step: number) => {
        const toolMessageId = nanoid();
        const pendingContext = { messages, toolCalls, assistantId, step };
        pendingToolContextRef.current.set(toolMessageId, pendingContext);
        appendMessage(sessionId, {
            id: toolMessageId,
            role: "tool",
            title: "确认工具调用",
            text: summarizeToolCalls(toolCalls),
            detail: { status: "pending", step, toolCalls, pendingContext },
        });
    };

    const explainToolFailure = async (messages: ResponseInputMessage[], toolCalls: ResponseToolCall[], toolResults: OnlineExecutedToolCall[]) => {
        const requestConfig = { ...effectiveConfig, model: effectiveConfig.textModel || effectiveConfig.model };
        try {
            const response = await requestGeneratedToolResponse({
                config: { ...requestConfig, systemPrompt: "" },
                messages: [
                    ...messages,
                    ...toolCalls.map(toolCallToResponseInput),
                    ...toolResults.map((item) => ({ role: "tool" as const, tool_call_id: item.toolCallId, content: JSON.stringify(item.result) })),
                    { role: "user", content: "上一个工具调用失败了。请不要再调用工具，也不要重复失败信息。请用一句话说明失败原因，再给出一个最小可执行的修正建议。" },
                ],
                tools: [],
                toolChoice: "auto",
            });
            return response.content.trim();
        } catch {
            return "";
        }
    };

    const continueAfterResults = async (sessionId: string, assistantId: string, messages: ResponseInputMessage[], toolCalls: ResponseToolCall[], toolResults: OnlineExecutedToolCall[], step: number) => {
        const failed = toolResults.find((item) => !item.result.ok);
        if (failed) {
            const recovery = await explainToolFailure(messages, toolCalls, toolResults);
            upsertMessage(sessionId, { id: assistantId, role: "assistant", text: recovery || formatToolResultsForChat(toolResults) || failed.result.message || "工具执行失败，已停止继续执行。" });
            addOnlineLog("Agent Tool Loop 因工具失败停止", { failed });
            return;
        }

        const nextMessages: ResponseInputMessage[] = [...messages, ...toolCalls.map(toolCallToResponseInput), ...toolResults.map((item) => ({ role: "tool" as const, tool_call_id: item.toolCallId, content: JSON.stringify(item.result) }))];

        if (step >= ONLINE_AGENT_MAX_STEPS) {
            upsertMessage(sessionId, { id: assistantId, role: "assistant", text: formatToolResultsForChat(toolResults) || "工具已执行。" });
            addOnlineLog("Agent Tool Loop 达到步数上限", { maxSteps: ONLINE_AGENT_MAX_STEPS });
            return;
        }

        const requestConfig = { ...effectiveConfig, model: effectiveConfig.textModel || effectiveConfig.model };
        let streamed = "";
        const next = await requestGeneratedToolResponse({
            config: { ...requestConfig, systemPrompt: "" },
            messages: nextMessages,
            tools: ALL_TOOLS,
            toolChoice: "auto",
            onDelta: (text) => {
                streamed = text;
                if (text.trim()) upsertMessage(sessionId, { id: assistantId, role: "assistant", text });
            },
        });
        addOnlineLog(`Agent Tool Loop ${step + 1} 回复`, next);
        if (next.toolCalls.length) {
            const needsConfirm = callsNeedConfirmation(next.toolCalls, confirmTools);
            if (needsConfirm) {
                upsertMessage(sessionId, { id: assistantId, role: "assistant", text: next.content || streamed || "准备执行工具，等待确认。" });
                appendPendingToolMessage(sessionId, assistantId, nextMessages, next.toolCalls, step + 1);
                addOnlineLog("等待用户确认", next.toolCalls);
                return;
            }
            await continueToolLoop(sessionId, assistantId, nextMessages, next, step + 1);
            return;
        }
        upsertMessage(sessionId, { id: assistantId, role: "assistant", text: next.content || streamed || formatToolResultsForChat(toolResults) || "工具已执行。" });
    };

    const continueToolLoop = async (sessionId: string, assistantId: string, messages: ResponseInputMessage[], result: { content: string; toolCalls: ResponseToolCall[] }, step: number) => {
        const toolResults = executeToolCalls(result.toolCalls);
        addOnlineLog("工具执行结果", toolResults);
        appendMessage(sessionId, {
            id: nanoid(),
            role: "tool",
            title: "工具自动执行完成",
            text: formatToolResultsForChat(toolResults),
            detail: { status: "completed", step, toolCalls: result.toolCalls, results: toolResults },
        });
        // 有生成派发就先等它落地：模型必须拿到真实产出才能接着往下做
        const settledResults = await waitForDispatchedGenerations(sessionId, toolResults);
        await continueAfterResults(sessionId, assistantId, messages, result.toolCalls, settledResults, step);
    };

    const runOnlineAgentStep = async (sessionId: string, assistantId: string, history: CanvasAssistantMessage[], userMessage: CanvasAssistantMessage, loop: OnlineLoopContext) => {
        const requestConfig = { ...effectiveConfig, model: effectiveConfig.textModel || effectiveConfig.model };
        // 画布同一时刻只能被一个运行写：生产流程在跑时不允许在线对话插进去改同一块画布
        const claim = tryClaimCanvasRun({ id: RUN_LOCK_ID, kind: "online", label: userMessage.text.slice(0, 20) || "画布操作" });
        if (!claim.ok) {
            addOnlineLog("画布被占用", { owner: claim.owner.label });
            appendMessage(sessionId, { id: nanoid(), role: "error", title: "无法开始", text: claim.reason });
            return;
        }
        try {
            setIsRunning(true);
            const messages = await buildMessages(snapshotRef.current, history, userMessage);
            const toolsForTurn = shouldExposeCanvasTools(userMessage.text) ? ALL_TOOLS : [];
            const readOnlyTools = READ_ONLY_TOOLS;
            const shouldReadFirst = toolsForTurn.length > 0 && shouldRequireToolCall(userMessage.text) && shouldReadCanvasBeforeWrite(userMessage.text);
            const effectiveTools = shouldReadFirst ? readOnlyTools : toolsForTurn.length ? toolsForTurn : readOnlyTools.length ? readOnlyTools : [];
            const requireToolCall = effectiveTools.length > 0 && shouldRequireToolCall(userMessage.text);
            const toolChoice = shouldReadFirst ? REQUIRED_TOOL_CHOICE : "auto";
            addOnlineLog(`Agent Loop ${loop.step} 开始`, { toolChoice, requireToolCall, toolCount: effectiveTools.length, readOnly: toolsForTurn.length === 0 && effectiveTools.length > 0, readFirst: shouldReadFirst });

            let streamed = "";
            const result = await requestGeneratedToolResponse({
                config: { ...requestConfig, systemPrompt: "" },
                messages,
                tools: effectiveTools,
                toolChoice,
                onDelta: (text) => {
                    streamed = text;
                    if (text.trim()) upsertMessage(sessionId, { id: assistantId, role: "assistant", text });
                },
            });
            addOnlineLog("模型工具回复", result);

            if (result.toolCalls.length) {
                const needsConfirm = callsNeedConfirmation(result.toolCalls, confirmTools);
                if (needsConfirm) {
                    upsertMessage(sessionId, { id: assistantId, role: "assistant", text: result.content || streamed || "准备执行工具，等待确认。" });
                    appendPendingToolMessage(sessionId, assistantId, messages, result.toolCalls, loop.step);
                    addOnlineLog("等待用户确认", result.toolCalls);
                    return;
                }
                appendMessage(sessionId, { id: nanoid(), role: "tool", title: "正在执行工具...", text: summarizeToolCalls(result.toolCalls), detail: { status: "running", step: loop.step, toolCalls: result.toolCalls } });
                await continueToolLoop(sessionId, assistantId, messages, result, loop.step);
                return;
            }

            if (loop.step < ONLINE_AGENT_MAX_STEPS && requireToolCall) {
                addOnlineLog("模型未调用工具，重试", { step: loop.step });
                const retryMessages = [
                    ...messages,
                    { role: "assistant" as const, content: result.content || streamed || "" },
                    { role: "user" as const, content: "以上回复没有调用任何画布工具。用户明确要求操作画布，请调用对应的工具来执行操作，不要只回复文本。涉及已有节点、选中节点、参考图或连接关系时，先调用 canvas_get_state 或 canvas_get_selection。" },
                ];
                let retryStreamed = "";
                const retryResult = await requestGeneratedToolResponse({
                    config: { ...requestConfig, systemPrompt: "" },
                    messages: retryMessages,
                    tools: effectiveTools,
                    toolChoice: REQUIRED_TOOL_CHOICE,
                    onDelta: (text) => {
                        retryStreamed = text;
                        if (text.trim()) upsertMessage(sessionId, { id: assistantId, role: "assistant", text });
                    },
                });
                addOnlineLog("重试结果", retryResult);
                if (retryResult.toolCalls.length) {
                    const needsConfirm = callsNeedConfirmation(retryResult.toolCalls, confirmTools);
                    if (needsConfirm) {
                        upsertMessage(sessionId, { id: assistantId, role: "assistant", text: retryResult.content || retryStreamed || "准备执行工具，等待确认。" });
                        appendPendingToolMessage(sessionId, assistantId, retryMessages, retryResult.toolCalls, loop.step + 1);
                        return;
                    }
                    appendMessage(sessionId, { id: nanoid(), role: "tool", title: "正在执行工具...", text: summarizeToolCalls(retryResult.toolCalls), detail: { status: "running", step: loop.step + 1, toolCalls: retryResult.toolCalls } });
                    await continueToolLoop(sessionId, assistantId, retryMessages, retryResult, loop.step + 1);
                    return;
                }
            }

            // 到这一步说明上游回的是 200、却既没有文本也没有工具调用。
            // 这不是问法的问题，让用户「换个说法」只会把人带偏，所以直接说清真实情况。
            if (!result.content.trim()) throw new Error("模型这次没有返回任何内容（上游多半是过载或超时），稍后重试即可。");
            upsertMessage(sessionId, { id: assistantId, role: "assistant", text: result.content.trim() });
            addOnlineLog(`Agent Loop ${loop.step} 结束`, { reply: result.content });
        } catch (error) {
            addOnlineLog("请求失败", error instanceof Error ? error.message : error);
            appendMessage(sessionId, { id: nanoid(), role: "error", title: "操作失败", text: error instanceof Error ? error.message : "操作失败" });
        } finally {
            // 整条工具链（含多步续跑）都在这次调用里 await 到底，所以这里是真正的运行结束点
            claim.release();
            setIsRunning(false);
        }
    };

    const approveOnlineTool = async (messageId: string) => {
        const message = safeSessions.flatMap((session) => session.messages).find((item) => item.id === messageId);
        const detail = objectDetail(message?.detail);
        const pendingContext = pendingToolContextRef.current.get(messageId) || pendingToolContextFromDetail(detail);
        if (!pendingContext) {
            addOnlineLog("批准工具失败", { messageId, reason: "pending context not found" });
            const session = safeSessions.find((item) => item.messages.some((messageItem) => messageItem.id === messageId));
            if (session) upsertMessage(session.id, { id: messageId, role: "tool", title: "工具执行失败", text: "工具上下文不完整，无法执行。", detail: { ...detail, status: "failed" } });
            return;
        }

        const { toolCalls, messages, assistantId, step } = pendingContext;
        const session = safeSessions.find((item) => item.messages.some((messageItem) => messageItem.id === messageId));
        addOnlineLog("批准工具", { messageId, toolCalls });
        if (!session) return;
        if (!toolCalls.length || !messages.length || !assistantId) {
            upsertMessage(session.id, { id: messageId, role: "tool", title: "工具执行失败", text: "工具上下文不完整，无法执行。", detail: { ...detail, status: "failed" } });
            return;
        }

        try {
            setIsRunning(true);
            // 用户的确认是一次新链路的起点，同样要重新持有画布写入权
            const claim = tryClaimCanvasRun({ id: RUN_LOCK_ID, kind: "online", label: summarizeToolCalls(toolCalls) });
            if (!claim.ok) {
                addOnlineLog("画布被占用", { owner: claim.owner.label });
                upsertMessage(session.id, { id: messageId, role: "tool", title: "无法执行", text: claim.reason, detail: { ...detail, status: "failed" } });
                return;
            }
            try {
                const results = executeToolCalls(toolCalls);
                addOnlineLog("工具执行结果", results);
                upsertMessage(session.id, { id: messageId, role: "tool", title: "工具执行完成", text: formatToolResultsForChat(results), detail: { ...detail, status: "completed", results } });
                pendingToolContextRef.current.delete(messageId);
                // 用户确认过的生成同样要等落地：不然「确认」只是把活派出去，闭环还是断的
                const settledResults = await waitForDispatchedGenerations(session.id, results);
                await continueAfterResults(session.id, assistantId, messages, toolCalls, settledResults, step);
            } finally {
                claim.release();
            }
        } catch (error) {
            addOnlineLog("工具续跑失败", error instanceof Error ? error.message : error);
            appendMessage(session.id, { id: nanoid(), role: "error", title: "操作失败", text: error instanceof Error ? error.message : "操作失败" });
        } finally {
            setIsRunning(false);
        }
    };

    const rejectOnlineTool = (messageId: string) => {
        const session = safeSessions.find((item) => item.messages.some((messageItem) => messageItem.id === messageId));
        addOnlineLog("拒绝工具", { messageId });
        pendingToolContextRef.current.delete(messageId);
        if (session) upsertMessage(session.id, { id: messageId, role: "tool", title: "已拒绝执行", text: "工具调用已取消", detail: { ...objectDetail(session.messages.find((item) => item.id === messageId)?.detail), status: "rejected" } });
    };

    return { runOnlineAgentStep, approveOnlineTool, rejectOnlineTool };
}

function toolCallToResponseInput(call: ResponseToolCall): ResponseInputMessage {
    return { type: "function_call", call_id: call.id, name: call.function.name, arguments: call.function.arguments, ...(call.thoughtSignature ? { thoughtSignature: call.thoughtSignature } : {}) };
}

function pendingToolContextFromDetail(detail: Record<string, unknown>): PendingOnlineToolContext | null {
    const context = objectDetail(detail.pendingContext);
    const messages = Array.isArray(context.messages) ? (context.messages as ResponseInputMessage[]) : [];
    const toolCalls = Array.isArray(context.toolCalls) ? (context.toolCalls.filter(isResponseToolCall) as ResponseToolCall[]) : toolCallsFromDetail(detail);
    const assistantId = typeof context.assistantId === "string" ? context.assistantId : "";
    const step = typeof context.step === "number" && Number.isFinite(context.step) ? context.step : typeof detail.step === "number" && Number.isFinite(detail.step) ? detail.step : 1;
    return messages.length && toolCalls.length && assistantId ? { messages, toolCalls, assistantId, step } : null;
}

function toolCallsFromDetail(detail: Record<string, unknown>): ResponseToolCall[] {
    return Array.isArray(detail.toolCalls) ? (detail.toolCalls.filter(isResponseToolCall) as ResponseToolCall[]) : [];
}

function isResponseToolCall(value: unknown): value is ResponseToolCall {
    const item = objectDetail(value);
    const fn = objectDetail(item.function);
    return typeof item.id === "string" && item.type === "function" && typeof fn.name === "string" && typeof fn.arguments === "string";
}

function summarizeToolCalls(calls: ResponseToolCall[]) {
    return calls.map((call) => toolLabel(call.function.name)).join("; ") || "tool call";
}

/** 确认策略统一走注册表：读不确认、生成/删除类强制确认、autoRun 能力工具按参数判定、其余跟随全局开关 */
function callsNeedConfirmation(calls: ResponseToolCall[], confirmTools: boolean) {
    return calls.some((call) => toolNeedsConfirmation(call.function.name, parseToolArguments(call.function.arguments), confirmTools));
}

function formatToolResultsForChat(results: OnlineExecutedToolCall[]) {
    const lines: string[] = [];
    let previous = "";
    let repeat = 0;
    const flushRepeat = () => {
        if (repeat > 0) lines.push(`Repeated failures folded: ${repeat}`);
        repeat = 0;
    };

    results.forEach((item) => {
        const text = item.result.message;
        if (!text) return;
        if (text === previous) {
            repeat += 1;
            return;
        }
        flushRepeat();
        lines.push(text);
        previous = text;
    });
    flushRepeat();

    return lines.join("\n");
}

function objectDetail(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

const NODE_TYPE_LABELS: Record<string, string> = { text: "文本", image: "图片", video: "视频", audio: "音频", config: "生成配置" };

/**
 * 生成落地结论：说清「成了没有 / 产出了哪些节点」。
 * 产出节点 id 是模型继续下一步的唯一合法引用依据，必须逐字给出真实 id。
 */
function describeGenerationOutcome(waited: GenerationWaitResult, produced: Array<{ id: string; type: string; title?: string }>): string {
    const producedText = produced.length ? `本次新产出节点：${produced.map((node) => `${node.id}（${NODE_TYPE_LABELS[node.type] || node.type}${node.title ? ` ${node.title}` : ""}）`).join("、")}。继续下一步时直接用这些 id 作为参考节点。` : "";
    if (!waited.started && waited.pending.length) return `生成没有启动：派发的 ${waited.pending.length} 个生成一直停在空闲状态（常见原因：生成模型未配置、额度不足或派发失败），请检查后重试。`;
    if (waited.failed.length)
        return `生成失败：${waited.failed.length} 个失败${waited.succeeded.length ? `、${waited.succeeded.length} 个成功` : ""}（失败节点 id：${waited.failed.join("、")}）。可以用 canvas_run_generation 重试，或先调整提示词、模型再重试。${producedText}`;
    if (waited.pending.length) return `生成超时未完成：仍有 ${waited.pending.length} 个在进行中（已等待到上限），稍后可用 canvas_get_state 复查结果。${producedText}`;
    return `生成已完成：${produced.length || waited.succeeded.length} 个新产出，画布上已经能看到结果。${producedText}`;
}

function parseToolArguments(value: string) {
    try {
        const parsed = JSON.parse(value || "{}");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
        return {};
    }
}
