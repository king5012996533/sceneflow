"use client";

import { useRef, type MutableRefObject } from "react";
import { nanoid } from "nanoid";

import { type AiConfig } from "@/stores/use-config-store";
import { requestGeneratedToolResponse, type ResponseInputMessage, type ResponseToolCall } from "@/lib/generation/generation-request";
import { type CanvasAssistantMessage, type CanvasAssistantSession } from "../types";
import { type CanvasAgentSnapshot } from "../utils/canvas-agent-ops";
import { CANVAS_TOOL_INTENT_PATTERN, CHAT_ONLY_INTENT_PATTERN, ONLINE_AGENT_TOOLS, ONLINE_READ_TOOLS } from "../utils/online-agent-tools";

const ONLINE_AGENT_MAX_STEPS = 4;
const ONLINE_AGENT_MAX_TOOL_CALLS_PER_STEP = 8;
const REQUIRED_TOOL_CHOICE = "required" as const;

export type OnlineToolResult = { ok: true; message: string; data?: unknown } | { ok: false; message: string };
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

        const nextMessages: ResponseInputMessage[] = [
            ...messages,
            ...toolCalls.map(toolCallToResponseInput),
            ...toolResults.map((item) => ({ role: "tool" as const, tool_call_id: item.toolCallId, content: JSON.stringify(item.result) })),
        ];

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
            tools: ONLINE_AGENT_TOOLS,
            toolChoice: "auto",
            onDelta: (text) => {
                streamed = text;
                if (text.trim()) upsertMessage(sessionId, { id: assistantId, role: "assistant", text });
            },
        });
        addOnlineLog(`Agent Tool Loop ${step + 1} 回复`, next);
        if (next.toolCalls.length) {
            const needsConfirm = next.toolCalls.some((call) => toolCallNeedsConfirmation(call, confirmTools));
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
        await continueAfterResults(sessionId, assistantId, messages, result.toolCalls, toolResults, step);
    };

    const runOnlineAgentStep = async (sessionId: string, assistantId: string, history: CanvasAssistantMessage[], userMessage: CanvasAssistantMessage, loop: OnlineLoopContext) => {
        const requestConfig = { ...effectiveConfig, model: effectiveConfig.textModel || effectiveConfig.model };
        try {
            setIsRunning(true);
            const messages = await buildMessages(snapshotRef.current, history, userMessage);
            const toolsForTurn = shouldExposeCanvasTools(userMessage.text) ? ONLINE_AGENT_TOOLS : [];
            const readOnlyTools = ONLINE_AGENT_TOOLS.filter((tool) => ONLINE_READ_TOOLS.has(tool.function.name));
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
                const needsConfirm = result.toolCalls.some((call) => toolCallNeedsConfirmation(call, confirmTools));
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
                const retryMessages = [...messages, { role: "assistant" as const, content: result.content || streamed || "" }, { role: "user" as const, content: "以上回复没有调用任何画布工具。用户明确要求操作画布，请调用对应的工具来执行操作，不要只回复文本。涉及已有节点、选中节点、参考图或连接关系时，先调用 canvas_get_state 或 canvas_get_selection。" }];
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
                    const needsConfirm = retryResult.toolCalls.some((call) => toolCallNeedsConfirmation(call, confirmTools));
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

            if (!result.content.trim()) throw new Error("模型没有返回内容，请换一种说法再试。");
            upsertMessage(sessionId, { id: assistantId, role: "assistant", text: result.content || streamed || "没有返回内容。" });
            addOnlineLog(`Agent Loop ${loop.step} 结束`, { reply: result.content });
        } catch (error) {
            addOnlineLog("请求失败", error instanceof Error ? error.message : error);
            appendMessage(sessionId, { id: nanoid(), role: "error", title: "操作失败", text: error instanceof Error ? error.message : "操作失败" });
        } finally {
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
            const results = executeToolCalls(toolCalls);
            addOnlineLog("工具执行结果", results);
            upsertMessage(session.id, { id: messageId, role: "tool", title: "工具执行完成", text: formatToolResultsForChat(results), detail: { ...detail, status: "completed", results } });
            pendingToolContextRef.current.delete(messageId);
            await continueAfterResults(session.id, assistantId, messages, toolCalls, results, step);
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
    return calls.map((call) => toolCallLabel(call.function.name)).join("; ") || "tool call";
}

function toolCallLabel(name: string) {
    if (name === "canvas_apply_ops") return "apply canvas ops";
    if (name === "canvas_get_state") return "read canvas";
    if (name === "canvas_get_selection") return "read selection";
    if (name === "canvas_export_snapshot") return "export snapshot";
    if (name === "canvas_plan_workflow") return "plan workflow";
    if (name === "canvas_create_workflow_cards") return "create workflow cards";
    if (name === "canvas_analyze_reference_image") return "analyze reference image";
    if (name === "canvas_create_reverse_prompt_flow") return "create reverse prompt flow";
    if (name === "canvas_create_node") return "create node";
    if (name === "canvas_create_text_node") return "create text node";
    if (name === "canvas_create_text_nodes") return "create text nodes";
    if (name === "canvas_create_config_node") return "create config node";
    if (name === "canvas_create_image_prompt_flow") return "create image prompt flow";
    if (name === "canvas_create_generation_flow") return "create generation flow";
    if (name === "canvas_generate_text") return "generate text";
    if (name === "canvas_generate_image") return "generate image";
    if (name === "canvas_generate_video") return "generate video";
    if (name === "canvas_generate_audio") return "generate audio";
    if (name === "canvas_update_node") return "update node";
    if (name === "canvas_update_node_text") return "update text";
    if (name === "canvas_move_nodes") return "move nodes";
    if (name === "canvas_resize_node") return "resize node";
    if (name === "canvas_delete_nodes") return "delete nodes";
    if (name === "canvas_connect_nodes") return "connect nodes";
    if (name === "canvas_select_nodes") return "select nodes";
    if (name === "canvas_set_viewport") return "set viewport";
    if (name === "canvas_run_generation") return "run generation";
    if (name === "canvas_run_pipeline") return "run pipeline";
    if (name === "canvas_continue_video") return "continue video";
    return name;
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

function parseToolArguments(value: string) {
    try {
        const parsed = JSON.parse(value || "{}");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
    } catch {
        return {};
    }
}

function shouldExposeCanvasTools(text: unknown) {
    if (typeof text !== "string") return false;
    const value = text.trim();
    if (!value) return false;
    if (CHAT_ONLY_INTENT_PATTERN.test(value) && !CANVAS_TOOL_INTENT_PATTERN.test(value)) return false;
    return true;
}

function shouldRequireToolCall(text: string) {
    return /(创建|新建|放到画布|落到画布|生成节点|执行|运行|重跑|重新生成|立即生成|删除|移动|修改|更新|连线|连接|开始|生成图片|生成视频|生成音频|图生视频|续写|尾帧|读取画布|当前画布|操作画布|整理成工作流|帮我生成|生成一张|生成一段|出一张|做一张|画一张|反推|倒推|提取提示词|生成提示词)/.test(text);
}

function shouldReadCanvasBeforeWrite(text: string) {
    return /(这个|这张|当前|选中|基于|参考|参考图|图片|连接|连线|删除|修改|更新|移动|重跑|重新生成|续写|尾帧|图生视频|工作流|流程|已有|上一个|下一个|反推|倒推|提取提示词)/.test(text);
}

const ALWAYS_CONFIRM_TOOLS = new Set([
    "canvas_delete_nodes",
    "canvas_generate_text",
    "canvas_generate_image",
    "canvas_generate_video",
    "canvas_generate_audio",
    "canvas_run_generation",
    "canvas_run_pipeline",
    "canvas_continue_video",
    "canvas_apply_ops",
]);

const AUTO_RUN_CAPABLE_TOOLS = new Set([
    "canvas_create_config_node",
    "canvas_create_image_prompt_flow",
    "canvas_create_generation_flow",
    "canvas_create_reverse_prompt_flow",
]);

function toolCallNeedsConfirmation(call: ResponseToolCall, confirmTools: boolean) {
    const name = call.function.name;
    if (ONLINE_READ_TOOLS.has(name)) return false;
    if (ALWAYS_CONFIRM_TOOLS.has(name)) return true;
    if (AUTO_RUN_CAPABLE_TOOLS.has(name) && parseToolArguments(call.function.arguments).autoRun === true) return true;
    return confirmTools;
}
