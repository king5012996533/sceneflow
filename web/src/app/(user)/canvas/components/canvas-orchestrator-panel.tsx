"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "antd";
import { ArrowUp, Bot, History, LoaderCircle, Plus, X } from "lucide-react";
import { nanoid } from "nanoid";

import type { AiConfig } from "@/stores/use-config-store";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { useUserStore } from "@/stores/use-user-store";
import type { LocalUser } from "@/stores/use-user-store";
import { requestGeneratedToolResponse, type ResponseInputMessage, type ResponseToolCall } from "@/lib/generation/generation-request";
import { AgentChatComposer, AgentChatMessage, AgentPanelTabs, AgentWorkingMessage } from "./canvas-agent-chat-ui";
import type { CanvasAgentChatMessage } from "./canvas-agent-chat-ui";
import type { CanvasAgentSnapshot } from "../utils/canvas-agent-ops";
import type { CanvasAgentOp } from "../utils/canvas-agent-ops";
import type { ProductionPlan } from "../utils/canvas-agent-orchestrator-types";
import { ORCHESTRATOR_TOOL_DEFINITIONS, SUB_AGENTS } from "../utils/canvas-agent-registry";
import { executeProductionPlan, type ExecutorContext, type ExecutorProgress } from "../utils/canvas-agent-executor";

type OrchestratorMessage = {
    id: string;
    role: "user" | "assistant" | "system" | "progress" | "error";
    text: string;
    detail?: unknown;
};

type OrchestratorLog = { id: string; time: string; title: string; data?: unknown };

type CanvasOrchestratorPanelProps = {
    snapshot: CanvasAgentSnapshot;
    config: AiConfig;
    onApplyOps: (ops: CanvasAgentOp[]) => CanvasAgentSnapshot;
    onToolCall: (name: string, args: Record<string, unknown>) => { ok: boolean; message: string; ops?: CanvasAgentOp[] };
};

export function CanvasOrchestratorPanel({ snapshot, config, onApplyOps, onToolCall }: CanvasOrchestratorPanelProps) {
    const themeName = useThemeStore((state) => state.theme);
    const themeObj = themeName === "dark" ? canvasThemes.dark : canvasThemes.light;
    const user = useUserStore((state) => state.user);

    const [messages, setMessages] = useState<OrchestratorMessage[]>([]);
    const [prompt, setPrompt] = useState("");
    const [running, setRunning] = useState(false);
    const [plan, setPlan] = useState<ProductionPlan | null>(null);
    const [activeTab, setActiveTab] = useState<"chat" | "log" | "history">("chat");
    const [logs, setLogs] = useState<OrchestratorLog[]>([]);
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const appendMessage = (msg: OrchestratorMessage) => setMessages((prev) => [...prev, msg]);
    const updateLastMessage = (text: string) => setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role === "user") return [...prev, { id: nanoid(), role: "assistant", text }];
        return prev.map((m, i) => i === prev.length - 1 ? { ...m, text } : m);
    });
    const addLog = (title: string, data?: unknown) => setLogs((prev) => [{ id: nanoid(), time: new Date().toLocaleTimeString(), title, data }, ...prev].slice(0, 80));

    useEffect(() => {
        const container = scrollRef.current;
        const anchor = chatEndRef.current;
        if (container && anchor) anchor.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const abort = () => {
        abortController?.abort();
        setAbortController(null);
        setRunning(false);
    };

    const submit = async () => {
        const text = prompt.trim();
        if (!text || running) return;
        setPrompt("");
        setRunning(true);
        setPlan(null);
        appendMessage({ id: nanoid(), role: "user", text });

        const ac = new AbortController();
        setAbortController(ac);

        try {
            appendMessage({ id: nanoid(), role: "assistant", text: "正在分析需求并制定生产计划..." });
            addLog("开始分析", { brief: text.slice(0, 100) });

            const planResult = await createProductionPlan(text, config, ac.signal, (t) => updateLastMessage(t));
            if (!planResult.ok) {
                updateLastMessage(`规划失败：${planResult.error}`);
                addLog("规划失败", planResult.error);
                setRunning(false);
                return;
            }

            const productionPlan = planResult.plan!;
            setPlan(productionPlan);
            const stageLabels = productionPlan.stages.map((s) => s.stageKey).join(" → ");
            updateLastMessage(`已制定生产计划：${productionPlan.intent}\n\n阶段：${stageLabels}\n\n开始执行...`);
            addLog("计划已制定", { intent: productionPlan.intent, stages: productionPlan.stages.map((s) => ({ agentId: s.agentId, deps: s.dependencies })) });

            const executorContext: ExecutorContext = {
                abortSignal: ac.signal,
                onLog: (title, data) => addLog(title, data),
                onToolCall: (name, args) => onToolCall(name, args),
                onApplyOps: (ops) => onApplyOps(ops),
            };

            appendMessage({ id: nanoid(), role: "progress", text: `开始执行 ${productionPlan.stages.length} 个阶段...` });

            const finalPlan = await executeProductionPlan(productionPlan, executorContext, config, (progress: ExecutorProgress) => {
                updateLastMessage(`[${progress.agentId}] 步骤 ${progress.step}: ${progress.text.slice(0, 80)}...`);
            });

            setPlan(finalPlan);

            if (finalPlan.status === "interrupted") {
                appendMessage({ id: nanoid(), role: "assistant", text: "生产已被中断。" });
                addLog("执行中断");
            } else if (finalPlan.status === "failed") {
                const errors = Object.entries(finalPlan.results).filter(([, r]) => !r.ok).map(([k, r]) => `${k}: ${r.error}`).join("\n");
                appendMessage({ id: nanoid(), role: "error", text: `生产执行失败：\n${errors}` });
                addLog("执行失败", errors);
            } else {
                const summary = buildResultSummary(finalPlan);
                appendMessage({ id: nanoid(), role: "assistant", text: `生产完成！\n\n${summary}` });
                addLog("执行完成", { nodeCount: finalPlan.results });
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : "未知错误";
            appendMessage({ id: nanoid(), role: "error", text: `执行异常：${msg}` });
            addLog("执行异常", msg);
        } finally {
            setRunning(false);
            setAbortController(null);
        }
    };

    const chatMessages: CanvasAgentChatMessage[] = useMemo(() => messages.map((m) => ({
        id: m.id,
        role: m.role === "progress" ? "system" : m.role as "user" | "assistant" | "system" | "tool" | "error",
        text: m.text,
        detail: m.detail,
    })), [messages]);

    return (
        <div className="flex h-full flex-col">
            <AgentPanelTabs
                value={activeTab}
                theme={themeObj}
                items={[
                    { value: "chat", label: "对话" },
                    { value: "history", label: "记录", count: logs.length },
                ]}
                onChange={setActiveTab}
                right={
                    running ? (
                        <Button size="small" danger onClick={abort}>中断</Button>
                    ) : null
                }
            />

            <div ref={scrollRef} className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {activeTab === "log" ? (
                    <div className="space-y-1">
                        {logs.map((log) => (
                            <div key={log.id} className="text-xs" style={{ color: "#746b7a" }}>
                                <span className="opacity-50">{log.time}</span> {log.title}
                            </div>
                        ))}
                        {!logs.length && <div className="text-xs opacity-50">暂无日志</div>}
                    </div>
                ) : !messages.length ? (
                    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                        <Bot className="mb-3 size-10 opacity-30" />
                        <div className="text-sm font-medium">全自动生产模式</div>
                        <div className="mt-1 text-xs opacity-50">
                            输入一个片段或需求，AI 会自动拆解任务、依次执行各生产阶段。
                        </div>
                        <div className="mt-4 space-y-1 text-left text-xs opacity-40">
                            <div>• "一个雨夜剑客觉醒的故事，15 秒"</div>
                            <div>• "帮我做一个古风女主的角色设定和三视图"</div>
                            <div>• "把这个剧本拆成角色、场景和分镜"</div>
                        </div>
                    </div>
                ) : (
                    <>
                        {chatMessages.map((msg) => (
                            <div key={msg.id} className="mb-3">
                                <AgentChatMessage item={msg} theme={themeObj} user={user} />
                            </div>
                        ))}
                        {running && <AgentWorkingMessage theme={themeObj} />}
                        <div ref={chatEndRef} className="h-px" />
                    </>
                )}
            </div>

            <AgentChatComposer
                prompt={prompt}
                sending={running}
                placeholder="输入片段或生产需求..."
                theme={themeObj}
                onPromptChange={setPrompt}
                onSubmit={submit}
            />
        </div>
    );
}

async function createProductionPlan(
    brief: string,
    config: AiConfig,
    signal: AbortSignal,
    onDelta: (text: string) => void,
): Promise<{ ok: boolean; plan?: ProductionPlan; error?: string }> {
    try {
        const messages: ResponseInputMessage[] = [
            {
                role: "system",
                content: [
                    "你是 SceneFlow 的生产规划师。你的工作只有一个：分析用户输入，输出一个可执行的 Agent 生产计划。",
                    "",
                    "工作规范：",
                    "- 不要对话，不要问问题，不要给建议。只输出工具调用。",
                    "- 如果信息不足，在 stage description 中标注'待确认'。",
                    "- stageKey 使用英文短标识，如 character-design、scene-setup。",
                    "- dependencies 填写依赖的上游 stageKey。无依赖的填空数组。",
                    "- 优先使用片段视频链（fragment-video），包含剧本分析→角色设计→场景设定→风格校准→分镜规划→关键帧→视频。",
                    "- 如果用户只要求角色或场景等局部任务，只包含相关阶段。",
                    "- 可选 agentId：script-analyst, character-designer, scene-designer, style-calibrator, storyboard-planner, keyframe-generator, video-generator, asset-archiver",
                ].join("\n"),
            },
            {
                role: "user",
                content: brief,
            },
        ];

        const result = await requestGeneratedToolResponse({
            config: { ...config, model: config.textModel || config.model, systemPrompt: "" },
            messages,
            tools: ORCHESTRATOR_TOOL_DEFINITIONS,
            toolChoice: "auto",
            onDelta,
        });

        const planToolCall = result.toolCalls.find((tc) => tc.function.name === "plan_production");
        if (!planToolCall) {
            return { ok: false, error: "规划工具未返回，请换一种描述再试。" };
        }

        const args = JSON.parse(planToolCall.function.arguments);
        const stages = (args.stages || []).map((stage: Record<string, unknown>, index: number) => ({
            agentId: String(stage.agentId || ""),
            stageKey: String(stage.stageKey || `stage-${index}`),
            input: { brief: `${brief}\n\n任务描述：${stage.description || ""}` },
            dependencies: Array.isArray(stage.dependencies) ? stage.dependencies.map(String) : [],
            layout: { x: 40 + index * 420, y: 60 },
        }));

        if (!stages.length) {
            return { ok: false, error: "计划中没有任何阶段，请补充需求描述。" };
        }

        return {
            ok: true,
            plan: {
                id: `plan-${Date.now()}`,
                intent: String(args.intent || "general-visual"),
                brief,
                stages,
                status: "running",
                results: {},
                currentStageIndex: 0,
                startedAt: Date.now(),
            },
        };
    } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : "规划请求失败" };
    }
}

function buildResultSummary(plan: ProductionPlan): string {
    const results = Object.values(plan.results).filter(Boolean);
    const successCount = results.filter((r) => r.ok).length;
    const failCount = results.filter((r) => !r.ok).length;
    const totalNodes = results.reduce((sum, r) => sum + r.createdNodeIds.length, 0);
    const totalTokens = results.reduce((sum, r) => sum + (r.tokensUsed || 0), 0);

    const lines: string[] = [
        `已完成 ${successCount}/${plan.stages.length} 个阶段`,
        failCount > 0 ? `${failCount} 个阶段失败` : "",
        `创建了 ${totalNodes} 个画布节点`,
        `预估消耗 tokens：${totalTokens.toLocaleString()}`,
        "",
        "阶段详情：",
        ...plan.stages.map((s) => {
            const r = plan.results[s.stageKey];
            if (!r) return `- ${s.stageKey}: 未执行`;
            return `- ${s.stageKey}: ${r.ok ? "✓" : "✗"} ${r.ok ? r.summary.slice(0, 60) : r.error}`;
        }),
    ].filter(Boolean);

    return lines.join("\n");
}
