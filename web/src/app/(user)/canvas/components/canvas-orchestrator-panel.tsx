"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { App, Button } from "antd";
import { Bot } from "lucide-react";
import { nanoid } from "nanoid";

import { useConfigStore, type AiConfig } from "@/stores/use-config-store";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { useUserStore } from "@/stores/use-user-store";
import { requestGeneratedToolResponse, type ResponseInputMessage } from "@/lib/generation/generation-request";
import { AgentChatComposer, AgentChatMessage, AgentPanelTabs, AgentWorkingMessage } from "./canvas-agent-chat-ui";
import { AgentTextModelPicker } from "./canvas-agent-model-picker";
import type { CanvasAgentChatMessage } from "./canvas-agent-chat-ui";
import { CanvasRunTimeline } from "./canvas-run-timeline";
import { ORCHESTRATOR_TOOL_DEFINITIONS } from "../utils/canvas-agent-registry";
import { executeRun, type ExecutorContext, type ExecutorProgress } from "../utils/canvas-agent-executor";
import { createRunState, describeRun, hasDependencyCycle, isRunSettled, resetRetryableStages, resumePoint, type RunState } from "../engine/scheduler/run-state";
import { describeCanvasRunOwner, tryClaimCanvasRun } from "../engine/scheduler/run-lock";
import type { CanvasEngine } from "../engine/engine";
import type { CanvasProjectMemory } from "../engine/memory/project-memory";

type OrchestratorMessage = {
    id: string;
    role: "user" | "assistant" | "system" | "progress" | "error";
    text: string;
    detail?: unknown;
};

type OrchestratorLog = { id: string; time: string; title: string; data?: unknown };

type CanvasOrchestratorPanelProps = {
    config: AiConfig;
    /** 画布引擎：子 Agent 的读写与生成派发全部经它统一执行 */
    engine: CanvasEngine;
    /** 工程记忆读取器：注入每个子 Agent 的上下文 */
    getMemory: () => CanvasProjectMemory;
    /** 本工程的生产运行（调度层状态），随工程落盘 */
    run: RunState | null;
    onRunChange: (run: RunState | null) => void;
};

/** 画布写入权标签：同一运行（同一 id）重复加锁即视为续跑，不同运行互相排斥 */
const RUN_LOCK_KIND = "orchestrator";

export function CanvasOrchestratorPanel({ config, engine, getMemory, run, onRunChange }: CanvasOrchestratorPanelProps) {
    const { message } = App.useApp();
    const themeName = useThemeStore((state) => state.theme);
    const themeObj = canvasThemes[themeName];
    const user = useUserStore((state) => state.user);
    const updateConfig = useConfigStore((state) => state.updateConfig);

    const [messages, setMessages] = useState<OrchestratorMessage[]>([]);
    const [prompt, setPrompt] = useState("");
    const [running, setRunning] = useState(false);
    const [activeTab, setActiveTab] = useState<"chat" | "log">("chat");
    const [logs, setLogs] = useState<OrchestratorLog[]>([]);
    const [abortController, setAbortController] = useState<AbortController | null>(null);
    const [liveRun, setLiveRun] = useState<RunState | null>(run);
    const pauseRef = useRef(false);
    const runningRef = useRef(false);
    const abortRef = useRef<AbortController | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    /**
     * 运行态以面板本地为准，同时写回工程落盘。
     * 落盘那份读回来会过一遍归一化（运行中的阶段归零为待跑，好让刷新后能续跑），
     * 那是给"重新加载"用的语义，不能反过来当运行中的显示状态用——否则时间线会把
     * 正在跑的阶段显示成"待跑"。
     */
    const commitRun = (next: RunState | null) => {
        setLiveRun(next);
        onRunChange(next);
    };
    useEffect(() => {
        if (runningRef.current) return;
        setLiveRun(run);
    }, [run]);
    /**
     * 面板被卸载（切换 Agent 模式、关掉面板）时必须中断在飞的运行：
     * 否则循环还在往画布上写，用户却看不到任何进度，也没法停。
     * 中断是可续的——阶段会放回待跑，回来点「继续」接着跑。
     */
    useEffect(() => () => abortRef.current?.abort(), []);

    const appendMessage = (msg: OrchestratorMessage) => setMessages((prev) => [...prev, msg]);
    const updateLastMessage = (text: string) =>
        setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (!last || last.role === "user") return [...prev, { id: nanoid(), role: "assistant", text }];
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, text } : m));
        });
    const addLog = (title: string, data?: unknown) => setLogs((prev) => [{ id: nanoid(), time: new Date().toLocaleTimeString(), title, data }, ...prev].slice(0, 80));

    useEffect(() => {
        const container = scrollRef.current;
        const anchor = chatEndRef.current;
        if (container && anchor) anchor.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const pendingStages = liveRun && !isRunSettled(liveRun) ? liveRun.stages.filter((stage) => stage.status === "pending") : [];
    const retryableStages = liveRun ? liveRun.stages.filter((stage) => stage.status === "failed") : [];
    const canContinue = Boolean(liveRun && !isRunSettled(liveRun) && pendingStages.length);

    /**
     * 生产运行入口。暂停/中断由 abortSignal 与 shouldPause 驱动，状态机本身在引擎侧，
     * 这里只负责加锁、落盘、把结果讲给用户听。
     */
    const startRun = async (plan: RunState, label: string) => {
        if (!plan.stages.length) {
            message.warning("计划中没有任何阶段");
            return;
        }
        if (hasDependencyCycle(plan.stages)) {
            message.error("生产计划的依赖关系成环，无法执行");
            return;
        }
        // 锁按运行 id 归属：续跑同一运行放行，另起一个生产（或在线对话）会被挡住
        const claim = tryClaimCanvasRun({ id: plan.id, kind: RUN_LOCK_KIND, label });
        if (!claim.ok) {
            message.warning(claim.reason);
            addLog("画布被占用", { owner: describeCanvasRunOwner(claim.owner) });
            return;
        }

        setRunning(true);
        runningRef.current = true;
        pauseRef.current = false;
        const ac = new AbortController();
        abortRef.current = ac;
        setAbortController(ac);
        commitRun(plan);
        addLog("开始执行", { intent: plan.intent, stages: plan.stages.map((stage) => `${stage.stageKey}<${stage.agentId}>`) });

        const executorContext: ExecutorContext = {
            abortSignal: ac.signal,
            onLog: (title, data) => addLog(title, data),
            onToolCall: (name, args) => engine.executeTool(name, args),
            getSnapshot: () => engine.getSnapshot(),
            getMemory,
        };

        try {
            const finalRun = await executeRun(plan, executorContext, config, {
                onRunChange: (next) => commitRun(next),
                shouldPause: () => pauseRef.current,
                onProgress: (progress: ExecutorProgress) => {
                    updateLastMessage(`[${progress.agentId}] 步骤 ${progress.step}: ${progress.text.slice(0, 80)}...`);
                },
            });

            if (finalRun.phase === "paused") {
                appendMessage({ id: nanoid(), role: "assistant", text: `生产已暂停。\n\n${describeRun(finalRun)}` });
            } else if (finalRun.phase === "interrupted") {
                appendMessage({ id: nanoid(), role: "assistant", text: "生产已被中断。" });
            } else if (finalRun.phase === "failed") {
                appendMessage({ id: nanoid(), role: "error", text: `生产执行失败：\n${describeRun(finalRun)}` });
            } else {
                appendMessage({ id: nanoid(), role: "assistant", text: `生产完成。\n\n${describeRun(finalRun)}` });
            }
            addLog("执行结束", { phase: finalRun.phase });
        } catch (error) {
            const msg = error instanceof Error ? error.message : "未知错误";
            appendMessage({ id: nanoid(), role: "error", text: `执行异常：${msg}` });
            addLog("执行异常", msg);
        } finally {
            claim.release();
            if (abortRef.current === ac) abortRef.current = null;
            runningRef.current = false;
            setRunning(false);
            setAbortController(null);
        }
    };

    const submit = async () => {
        const text = prompt.trim();
        if (!text || running) return;
        setPrompt("");
        appendMessage({ id: nanoid(), role: "user", text });
        appendMessage({ id: nanoid(), role: "assistant", text: "正在分析需求并制定生产计划..." });
        addLog("开始分析", { brief: text.slice(0, 100) });

        // 规划本身就是一次模型请求：也要能被「中断」，不能等它自己回来
        const ac = new AbortController();
        abortRef.current = ac;
        setAbortController(ac);
        runningRef.current = true;
        setRunning(true);
        try {
            const planned = await createRunPlan(text, config, ac.signal, (t) => updateLastMessage(t));
            if (ac.signal.aborted) {
                addLog("规划已中断");
                return;
            }
            if (!planned.ok) {
                updateLastMessage(`规划失败：${planned.error}`);
                addLog("规划失败", planned.error);
                return;
            }
            const plan = planned.run!;
            const stageLabels = plan.stages.map((stage) => stage.stageKey).join(" → ");
            updateLastMessage(`已制定生产计划：${plan.intent}\n\n阶段：${stageLabels}\n\n开始执行...`);
            await startRun(plan, plan.brief.slice(0, 24));
        } finally {
            // startRun 会自己接管控制器与运行标记；只有它还停在规划阶段时才需要收尾
            if (abortRef.current === ac) {
                abortRef.current = null;
                setAbortController(null);
                runningRef.current = false;
                setRunning(false);
            }
        }
    };

    const pause = () => {
        pauseRef.current = true;
        addLog("已请求暂停", "当前阶段收尾后停止");
    };

    const abort = () => {
        abortController?.abort();
        pauseRef.current = false;
        setAbortController(null);
        addLog("已请求中断");
    };

    const resume = async () => {
        if (!liveRun || running) return;
        appendMessage({ id: nanoid(), role: "progress", text: `从「${resumePoint(liveRun) || "最后一步"}」继续执行...` });
        await startRun(liveRun, `续跑 ${liveRun.id}`);
    };

    const retry = async () => {
        if (!liveRun || running) return;
        const { state: retried, retried: keys } = resetRetryableStages(liveRun);
        if (!keys.length) {
            message.info("没有可重试的阶段（已达重试上限）");
            return;
        }
        appendMessage({ id: nanoid(), role: "progress", text: `重试阶段：${keys.join(", ")}` });
        addLog("重试阶段", keys);
        await startRun(retried, `重试 ${keys.join(",")}`);
    };

    const discard = () => {
        commitRun(null);
        addLog("已放弃本次运行");
    };

    const chatMessages: CanvasAgentChatMessage[] = useMemo(
        () =>
            messages.map((m) => ({
                id: m.id,
                role: m.role === "progress" ? "system" : (m.role as "user" | "assistant" | "system" | "tool" | "error"),
                text: m.text,
                detail: m.detail,
            })),
        [messages],
    );

    return (
        <div className="flex h-full flex-col">
            <AgentPanelTabs
                value={activeTab}
                theme={themeObj}
                items={[
                    { value: "chat", label: "对话" },
                    { value: "log", label: "日志", count: logs.length },
                ]}
                onChange={setActiveTab}
                right={
                    <div className="flex items-center gap-1.5">
                        {running ? (
                            <>
                                <Button size="small" onClick={pause}>
                                    暂停
                                </Button>
                                <Button size="small" danger onClick={abort}>
                                    中断
                                </Button>
                            </>
                        ) : (
                            <>
                                {canContinue ? (
                                    <Button size="small" type="primary" onClick={resume}>
                                        继续
                                    </Button>
                                ) : null}
                                {retryableStages.length ? (
                                    <Button size="small" onClick={retry}>
                                        重试失败阶段
                                    </Button>
                                ) : null}
                                {liveRun && !isRunSettled(liveRun) ? (
                                    <Button size="small" type="text" onClick={discard}>
                                        放弃
                                    </Button>
                                ) : null}
                            </>
                        )}
                    </div>
                }
            />

            <div ref={scrollRef} className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {activeTab === "log" ? (
                    <div className="space-y-1">
                        {logs.map((log) => (
                            <div key={log.id} className="text-xs" style={{ color: "#726d67" }}>
                                <span className="opacity-50">{log.time}</span> {log.title}
                            </div>
                        ))}
                        {!logs.length && <div className="text-xs opacity-50">暂无日志</div>}
                    </div>
                ) : (
                    <>
                        {liveRun ? <CanvasRunTimeline run={liveRun} theme={themeObj} /> : null}
                        {!messages.length ? (
                            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                                <Bot className="mb-3 size-10 opacity-30" />
                                <div className="text-sm font-medium">全自动生产模式</div>
                                <div className="mt-1 text-xs opacity-50">输入一个片段或需求，AI 会自动拆解任务、依次执行各生产阶段。</div>
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
                left={<AgentTextModelPicker config={config} value={config.textModel} onChange={(model) => updateConfig("textModel", model)} />}
            />
        </div>
    );
}

/** 让 LLM 把一句话需求拆成可调度的阶段计划：只输出工具调用，不做对话 */
async function createRunPlan(brief: string, config: AiConfig, signal: AbortSignal, onDelta: (text: string) => void): Promise<{ ok: boolean; run?: RunState; error?: string }> {
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
            { role: "user", content: brief },
        ];

        const result = await requestGeneratedToolResponse({
            config: { ...config, model: config.textModel || config.model, systemPrompt: "" },
            messages,
            tools: ORCHESTRATOR_TOOL_DEFINITIONS,
            toolChoice: "auto",
            onDelta,
            options: { signal },
        });

        const planToolCall = result.toolCalls.find((tc) => tc.function.name === "plan_production");
        if (!planToolCall) return { ok: false, error: "规划工具未返回，请换一种描述再试。" };

        const args = JSON.parse(planToolCall.function.arguments);
        const stages = (args.stages || []).map((stage: Record<string, unknown>, index: number) => ({
            agentId: String(stage.agentId || ""),
            stageKey: String(stage.stageKey || `stage-${index}`),
            // 任务书在规划时定死：断点续跑时子 Agent 拿到的上下文与首次执行一致
            brief: `${brief}\n\n任务描述：${stage.description || ""}`,
            dependencies: Array.isArray(stage.dependencies) ? stage.dependencies.map(String) : [],
            layout: { x: 40 + index * 420, y: 60 },
        }));

        if (!stages.length) return { ok: false, error: "计划中没有任何阶段，请补充需求描述。" };

        return {
            ok: true,
            run: createRunState({
                id: `run-${nanoid(8)}`,
                brief,
                intent: String(args.intent || "general-visual"),
                stages,
            }),
        };
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return { ok: false, error: "规划已中断" };
        return { ok: false, error: error instanceof Error ? error.message : "规划请求失败" };
    }
}
