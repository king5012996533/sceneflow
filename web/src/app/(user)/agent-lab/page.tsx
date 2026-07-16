"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Copy, LoaderCircle, Pencil, Plus, Send, Settings2, Sparkles, Trash2 } from "lucide-react";
import { App, Button, Input, Tag } from "antd";
import copyToClipboard from "copy-to-clipboard";

import { apiPath } from "@/lib/app-paths";
import { scopedStorageKey } from "@/lib/user-data-scope";
import type { AgentLabArtifact, AgentLabMemory, AgentLabMessage, AgentLabResponse } from "@/lib/agent-lab/types";

const STORAGE_KEY = "sceneflow:agent-lab:provider";
const SESSIONS_STORAGE_KEY = "sceneflow:agent-lab:sessions";
const QUICK_PROMPTS = ["一部漫剧应该怎么做？", "我要一个 15 秒打斗片段", "帮我写一个古风女主三视图提示词", "我直接做三视图可以吗？"];

const AGENT_PERSONAS = [
    {
        id: "creative-director",
        name: "创作导演",
        description: "负责判断流程、纠错和拆生产路线",
        prompt: "你是 SceneFlow 创作导演。优先判断用户的创作目标、制作阶段、缺失资产和下一步动作。你要能纠正用户跳步，但不要强迫用户。输出要像导演给制片团队的清晰建议。",
    },
    {
        id: "character-designer",
        name: "角色设定师",
        description: "负责人物立绘、三视图和一致性",
        prompt: "你是角色设定师。重点锁定角色脸型、五官、发型、服装、配饰、道具、色彩和禁忌变化。遇到三视图需求时，优先建议先立绘再三视图，并给出稳定提示词。",
    },
    {
        id: "storyboard-director",
        name: "分镜导演",
        description: "负责镜头节奏、景别和动作拆解",
        prompt: "你是分镜导演。重点把剧情拆成可执行镜头，明确景别、画面、动作、镜头运动、时长、台词/旁白和所需参考资产。不要写空泛剧情，要写能生成的镜头。",
    },
    {
        id: "prompt-engineer",
        name: "提示词工程师",
        description: "负责图片、视频提示词和负向词",
        prompt: "你是视觉提示词工程师。重点输出可复制的正向提示词、负向提示词和模型注意事项。提示词必须包含主体、环境、构图、风格、镜头、光线、一致性约束和禁止项。",
    },
    {
        id: "troubleshooter",
        name: "排障顾问",
        description: "负责 API、模型、参数和报错排查",
        prompt: "你是 SceneFlow 排障顾问。优先定位 API、Base URL、模型名、Key、额度、参数、尺寸和视频生成失败原因。回答要短，给 1-4 个可执行排查步骤。",
    },
];

const DEFAULT_PERSONA = AGENT_PERSONAS[0];
const DEFAULT_ASSISTANT_MESSAGE: AgentLabMessage = {
    role: "assistant",
    content: "我是 SceneFlow Agent Lab。这里先不操作画布，只负责把创作意图聊清楚，判断流程是否合理，并输出片段策划、角色设定、分镜和提示词。你可以直接问：一部漫剧应该怎么做？或者说：我要一个 15 秒打斗片段。",
};

const DEFAULT_MEMORY: AgentLabMemory = {
    projectBrief: "",
    stylePreference: "",
    characterMemory: "",
    constraints: "",
};

type ProviderForm = {
    baseUrl: string;
    apiKey: string;
    model: string;
};

type AgentLabSession = {
    id: string;
    title: string;
    messages: AgentLabMessage[];
    artifact: AgentLabArtifact | null;
    personaId: string;
    customPersona: string;
    memory: AgentLabMemory;
    createdAt: number;
    updatedAt: number;
};

type AgentLabToolAction = NonNullable<AgentLabArtifact["toolActions"]>[number];

export default function AgentLabPage() {
    const { message } = App.useApp();
    const [sessions, setSessions] = useState<AgentLabSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState("");
    const [messages, setMessages] = useState<AgentLabMessage[]>([DEFAULT_ASSISTANT_MESSAGE]);
    const [provider, setProvider] = useState<ProviderForm>({ baseUrl: "https://api.deepseek.com", apiKey: "", model: "deepseek-chat" });
    const [draft, setDraft] = useState("");
    const [artifact, setArtifact] = useState<AgentLabArtifact | null>(null);
    const [personaId, setPersonaId] = useState(DEFAULT_PERSONA.id);
    const [customPersona, setCustomPersona] = useState("");
    const [memory, setMemory] = useState<AgentLabMemory>(DEFAULT_MEMORY);
    const [showConfig, setShowConfig] = useState(false);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const saved = window.localStorage.getItem(scopedStorageKey(STORAGE_KEY));
        if (!saved) return;
        try {
            const data = JSON.parse(saved) as Partial<ProviderForm>;
            setProvider((current) => ({
                baseUrl: typeof data.baseUrl === "string" ? data.baseUrl : current.baseUrl,
                apiKey: typeof data.apiKey === "string" ? data.apiKey : current.apiKey,
                model: typeof data.model === "string" ? data.model : current.model,
            }));
        } catch {
            // Ignore invalid local test config.
        }
    }, []);

    useEffect(() => {
        const saved = window.localStorage.getItem(scopedStorageKey(SESSIONS_STORAGE_KEY));
        const loaded = parseSavedSessions(saved);
        const nextSessions = loaded.length ? loaded : [createAgentLabSession()];
        const active = nextSessions[0];
        setSessions(nextSessions);
        setActiveSessionId(active.id);
        setMessages(active.messages);
        setArtifact(active.artifact);
        setPersonaId(active.personaId);
        setCustomPersona(active.customPersona);
        setMemory(active.memory || DEFAULT_MEMORY);
    }, []);

    useEffect(() => {
        window.localStorage.setItem(scopedStorageKey(STORAGE_KEY), JSON.stringify(provider));
    }, [provider]);

    useEffect(() => {
        if (sessions.length) window.localStorage.setItem(scopedStorageKey(SESSIONS_STORAGE_KEY), JSON.stringify(sessions));
    }, [sessions]);

    useEffect(() => {
        if (!activeSessionId) return;
        setSessions((current) =>
            current.map((session) =>
                session.id === activeSessionId
                    ? {
                          ...session,
                          messages,
                          artifact,
                          personaId,
                          customPersona,
                          memory,
                          updatedAt: Date.now(),
                      }
                    : session,
            ),
        );
    }, [activeSessionId, messages, artifact, personaId, customPersona, memory]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, sending]);

    const modelLabel = useMemo(() => (provider.apiKey.trim() ? provider.model || "未填写模型" : "本地 fallback"), [provider.apiKey, provider.model]);
    const selectedPersona = useMemo(() => AGENT_PERSONAS.find((item) => item.id === personaId) || DEFAULT_PERSONA, [personaId]);
    const activeSession = useMemo(() => sessions.find((session) => session.id === activeSessionId) || sessions[0], [activeSessionId, sessions]);

    async function sendMessage(text = draft) {
        const content = text.trim();
        if (!content || sending) return;
        const nextMessages: AgentLabMessage[] = [...messages, { role: "user", content }];
        setMessages(nextMessages);
        if (activeSession && /^新会话/.test(activeSession.title)) {
            setSessions((current) => current.map((session) => (session.id === activeSession.id ? { ...session, title: content.slice(0, 24), updatedAt: Date.now() } : session)));
        }
        setDraft("");
        setSending(true);
        try {
            const response = await fetch(apiPath("/api/agent-lab/chat"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: nextMessages.filter((item) => item.role === "user" || item.role === "assistant"),
                    provider,
                    persona: {
                        id: selectedPersona.id,
                        name: selectedPersona.name,
                        description: selectedPersona.description,
                        prompt: [selectedPersona.prompt, customPersona.trim() ? `用户自定义身份补充：${customPersona.trim()}` : ""].filter(Boolean).join("\n\n"),
                    },
                    memory,
                }),
            });
            const data = (await response.json()) as AgentLabResponse & { error?: string };
            if (!response.ok) throw new Error(data.error || "Agent 请求失败");
            setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
            setArtifact(data.artifact || null);
            if (data.artifact) {
                setMemory((current) => mergeArtifactIntoMemory(current, data.artifact));
            }
        } catch (error) {
            const text = error instanceof Error ? error.message : "Agent 请求失败";
            setMessages((current) => [...current, { role: "assistant", content: `这次请求没有成功：${text}\n\n你可以先清空 API Key，用本地 fallback 看交互，或者检查 Base URL、模型名和 Key。` }]);
        } finally {
            setSending(false);
        }
    }

    function createSession() {
        const session = createAgentLabSession();
        setSessions((current) => [session, ...current]);
        switchSession(session);
    }

    function switchSession(session: AgentLabSession) {
        if (sending) return;
        setActiveSessionId(session.id);
        setMessages(session.messages);
        setArtifact(session.artifact);
        setPersonaId(session.personaId || DEFAULT_PERSONA.id);
        setCustomPersona(session.customPersona || "");
        setMemory(session.memory || DEFAULT_MEMORY);
    }

    function deleteSession(id: string) {
        if (sessions.length <= 1) {
            message.warning("至少保留一个会话");
            return;
        }
        const nextSessions = sessions.filter((session) => session.id !== id);
        setSessions(nextSessions);
        if (id === activeSessionId) switchSession(nextSessions[0]);
    }

    function renameActiveSession() {
        if (!activeSession) return;
        const title = window.prompt("给当前会话命名", activeSession.title)?.trim();
        if (!title) return;
        setSessions((current) => current.map((session) => (session.id === activeSession.id ? { ...session, title, updatedAt: Date.now() } : session)));
    }

    function updateMemory(key: keyof AgentLabMemory, value: string) {
        setMemory((current) => ({ ...current, [key]: value }));
    }

    function copyArtifact() {
        if (!artifact) return;
        copyText(JSON.stringify(artifact, null, 2), "已复制结构化结果");
    }

    function copyText(text: string, successText = "已复制") {
        copyToClipboard(text);
        message.success(successText);
    }

    function executeToolAction(action: AgentLabToolAction) {
        const actionText = buildToolActionRecord(action);
        setMessages((current) => [
            ...current,
            {
                role: "assistant",
                content: `已确认工具动作：${action.title}\n\n${actionText}\n\n当前仍在 Agent Lab 实验层，不会写入正式画布。后续接回 SceneFlow 时，这一步会变成真实创建卡片。`,
            },
        ]);
        setMemory((current) => ({
            ...current,
            characterMemory: appendMemoryText(current.characterMemory, `已确认工具动作：${actionText}`),
        }));
        message.success("已记录到实验层");
    }

    function rejectToolAction(action: AgentLabToolAction) {
        setMessages((current) => [
            ...current,
            {
                role: "assistant",
                content: `已取消工具动作：${action.title}\n\n我不会创建这张卡。你可以继续补充要求，我会重新规划下一步。`,
            },
        ]);
        message.info("已取消");
    }

    return (
        <main className="h-full min-h-0 overflow-auto bg-[#f5f2ec] text-[#171717]">
            <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-4 px-4 py-5 md:px-6">
                <header className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-2xl bg-black text-white shadow-sm">
                            <Bot className="size-5" />
                        </span>
                        <div>
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                SceneFlow Agent Lab
                                <Tag bordered={false} color={provider.apiKey.trim() ? "green" : "default"}>
                                    {modelLabel}
                                </Tag>
                            </div>
                            <div className="text-xs text-black/45">先聊天，把创作想法变成可执行方案。</div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button icon={<Plus className="size-4" />} onClick={createSession}>
                            新会话
                        </Button>
                        <Button icon={<Pencil className="size-4" />} onClick={renameActiveSession} disabled={!activeSession}>
                            命名
                        </Button>
                        <Button icon={<Settings2 className="size-4" />} onClick={() => setShowConfig((value) => !value)}>
                            设置
                        </Button>
                    </div>
                </header>

                {showConfig ? (
                    <section className="rounded-3xl border border-black/10 bg-white/75 p-4 shadow-sm">
                        <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-semibold">会话</div>
                                        <div className="text-xs text-black/45">本地保存</div>
                                    </div>
                                    <Button size="small" danger icon={<Trash2 className="size-3.5" />} onClick={() => activeSession && deleteSession(activeSession.id)} disabled={!activeSession || sessions.length <= 1}>
                                        删除
                                    </Button>
                                </div>
                                <div className="thin-scrollbar max-h-[190px] space-y-2 overflow-auto pr-1">
                                    {sessions.map((session) => {
                                        const active = session.id === activeSessionId;
                                        return (
                                            <button key={session.id} type="button" className={`w-full rounded-2xl border px-3 py-2 text-left text-sm transition ${active ? "border-black bg-black text-white" : "border-black/10 bg-[#fffdfa] hover:border-black/20"}`} onClick={() => switchSession(session)}>
                                                <div className="truncate font-medium">{session.title || "新会话"}</div>
                                                <div className={`mt-1 text-xs ${active ? "text-white/55" : "text-black/40"}`}>{formatSessionTime(session.updatedAt)}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">主模型</div>
                                    <Input value={provider.baseUrl} onChange={(event) => setProvider((current) => ({ ...current, baseUrl: event.target.value }))} placeholder="Base URL，例如 https://api.deepseek.com" />
                                    <Input.Password value={provider.apiKey} onChange={(event) => setProvider((current) => ({ ...current, apiKey: event.target.value }))} placeholder="API Key，留空使用本地 fallback" />
                                    <Input value={provider.model} onChange={(event) => setProvider((current) => ({ ...current, model: event.target.value }))} placeholder="模型名，例如 deepseek-chat" />
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold">身份与记忆</div>
                                            <div className="text-xs text-black/45">{selectedPersona.description}</div>
                                        </div>
                                        <Button size="small" onClick={() => setMemory(DEFAULT_MEMORY)}>
                                            清空记忆
                                        </Button>
                                    </div>
                                    <select value={personaId} onChange={(event) => setPersonaId(event.target.value)} className="h-10 w-full rounded-xl border border-black/10 bg-[#fffdfa] px-3 text-sm outline-none transition focus:border-black/30">
                                        {AGENT_PERSONAS.map((persona) => (
                                            <option key={persona.id} value={persona.id}>
                                                {persona.name}
                                            </option>
                                        ))}
                                    </select>
                                    <Input.TextArea value={customPersona} onChange={(event) => setCustomPersona(event.target.value)} autoSize={{ minRows: 2, maxRows: 4 }} placeholder="可选：给这个窗口补充身份要求。" />
                                    <Input.TextArea
                                        value={[memory.projectBrief, memory.stylePreference, memory.characterMemory, memory.constraints].filter(Boolean).join("\n\n")}
                                        onChange={(event) => updateMemory("projectBrief", event.target.value)}
                                        autoSize={{ minRows: 3, maxRows: 6 }}
                                        placeholder="可选：把项目背景、风格、角色设定写在这里。"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                ) : null}

                <section className="flex min-h-[calc(100vh-150px)] flex-1 flex-col overflow-hidden rounded-[28px] border border-black/10 bg-[#fffdfa] shadow-[0_24px_80px_rgba(27,24,20,.08)]">
                    <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 md:px-5">
                        <div className="min-w-0">
                            <div className="truncate font-semibold">{activeSession?.title || "创作对话"}</div>
                            <div className="text-xs text-black/45">{selectedPersona.name} · 不直接操作画布</div>
                        </div>
                        {artifact ? (
                            <Button size="small" icon={<Copy className="size-3.5" />} onClick={copyArtifact}>
                                复制方案
                            </Button>
                        ) : null}
                    </div>

                    <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-auto px-4 py-5 md:px-6">
                        {messages.map((item, index) => (
                            <div key={index} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`group/message relative max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === "user" ? "bg-black text-white" : "bg-[#f4eee6] text-black/80"}`}>
                                    {item.role === "assistant" ? (
                                        <button
                                            type="button"
                                            className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-full border border-black/10 bg-white/80 text-black/50 opacity-0 shadow-sm transition hover:bg-white hover:text-black group-hover/message:opacity-100"
                                            aria-label="复制回复"
                                            title="复制回复"
                                            onClick={() => copyText(item.content)}
                                        >
                                            <Copy className="size-3.5" />
                                        </button>
                                    ) : null}
                                    {item.role === "user" ? <div className="whitespace-pre-wrap break-words">{item.content}</div> : <AgentLabMarkdown text={item.content} onCopy={copyText} />}
                                </div>
                            </div>
                        ))}
                        {sending ? (
                            <div className="flex justify-start">
                                <div className="inline-flex items-center gap-2 rounded-2xl bg-[#f4eee6] px-4 py-3 text-sm text-black/55">
                                    <LoaderCircle className="size-4 animate-spin" />
                                    正在思考创作方案...
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <div className="border-t border-black/10 p-4">
                        {artifact ? <CompactArtifact artifact={artifact} onCopy={copyText} onConfirm={executeToolAction} onReject={rejectToolAction} /> : null}
                        <div className="mb-3 flex flex-wrap gap-2">
                            {QUICK_PROMPTS.map((item) => (
                                <Button key={item} size="small" onClick={() => sendMessage(item)} disabled={sending}>
                                    {item}
                                </Button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input.TextArea
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                onPressEnter={(event) => {
                                    if (!event.shiftKey) {
                                        event.preventDefault();
                                        void sendMessage();
                                    }
                                }}
                                autoSize={{ minRows: 2, maxRows: 5 }}
                                placeholder="直接描述你的需求，例如：我要一个 15 秒雨夜竹林打斗片段。"
                            />
                            <Button type="primary" className="!h-auto !px-4" icon={<Send className="size-4" />} onClick={() => sendMessage()} loading={sending} />
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}

function createAgentLabSession(): AgentLabSession {
    const now = Date.now();
    return {
        id: `session-${now}-${Math.random().toString(16).slice(2)}`,
        title: "新会话",
        messages: [DEFAULT_ASSISTANT_MESSAGE],
        artifact: null,
        personaId: DEFAULT_PERSONA.id,
        customPersona: "",
        memory: { ...DEFAULT_MEMORY },
        createdAt: now,
        updatedAt: now,
    };
}

function PlanList({ title, items, empty, tone = "default" }: { title: string; items: string[]; empty: string; tone?: "default" | "warn" | "ok" }) {
    const toneClass = tone === "warn" ? "border-[#d58b29]/20 bg-[#fff4e5] text-[#7a4a0b]" : tone === "ok" ? "border-[#2f9c66]/20 bg-[#edf8f1] text-[#1d6b43]" : "border-black/10 bg-black/[0.035] text-black/70";
    return (
        <div className="mt-3">
            <div className="mb-2 text-xs font-semibold text-black/50">{title}</div>
            {items.length ? (
                <div className="flex flex-wrap gap-2">
                    {items.map((item, index) => (
                        <span key={`${title}-${index}`} className={`rounded-full border px-2.5 py-1 text-xs ${toneClass}`}>
                            {item}
                        </span>
                    ))}
                </div>
            ) : (
                <div className="rounded-xl bg-black/[0.035] px-3 py-2 text-xs text-black/40">{empty}</div>
            )}
        </div>
    );
}

function CompactArtifact({ artifact, onCopy, onConfirm, onReject }: { artifact: AgentLabArtifact; onCopy: (text: string, successText?: string) => void; onConfirm: (action: AgentLabToolAction) => void; onReject: (action: AgentLabToolAction) => void }) {
    const hasPlan = Boolean(artifact.plan);
    const hasTools = Boolean(artifact.toolActions?.length);
    const hasSelfCheck = Boolean(artifact.selfCheck);
    if (!hasPlan && !hasTools && !hasSelfCheck && !artifact.nextSteps.length) return null;

    return (
        <details className="mb-3 rounded-2xl border border-black/10 bg-[#f7f1e8]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                    <div className="truncate font-semibold">执行建议：{artifact.title}</div>
                    <div className="truncate text-xs text-black/45">{artifact.summary}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Tag bordered={false} color="purple">
                        {artifact.intent}
                    </Tag>
                    {hasSelfCheck ? <Tag color={(artifact.selfCheck?.score || 0) >= 80 ? "green" : (artifact.selfCheck?.score || 0) >= 60 ? "orange" : "red"}>{artifact.selfCheck?.score}</Tag> : null}
                </div>
            </summary>
            <div className="space-y-4 border-t border-black/10 p-4">
                {artifact.plan ? (
                    <div>
                        <PlanList title="建议创建的卡片" items={artifact.plan.cards} empty="暂未建议卡片" />
                        <PlanList title="缺失素材" items={artifact.plan.missingAssets} empty="暂无明显缺口" tone="warn" />
                        <PlanList title="现在可直接做" items={artifact.plan.executableNow} empty="等待用户补充信息" tone="ok" />
                        <div className="mt-3 rounded-xl bg-white/60 p-3">
                            <div className="text-xs font-semibold text-black/50">下一步关键问题</div>
                            <p className="mt-1 text-sm leading-6 text-black/70">{artifact.plan.nextQuestion || "无需追问，可以先执行第一版方案。"}</p>
                        </div>
                    </div>
                ) : null}

                {artifact.toolActions?.length ? (
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-black/50">待确认动作</div>
                        {artifact.toolActions.map((action) => (
                            <div key={action.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/55 px-3 py-2">
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold">{action.title}</div>
                                    <div className="mt-0.5 text-xs text-black/50">{formatToolActionType(action.type)} · {action.description || "等待确认后执行"}</div>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <Button size="small" onClick={() => onCopy(buildToolActionRecord(action), "已复制动作说明")}>
                                        复制
                                    </Button>
                                    <Button size="small" type="primary" onClick={() => onConfirm(action)}>
                                        确认
                                    </Button>
                                    <Button size="small" onClick={() => onReject(action)}>
                                        先不要
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}

                {artifact.selfCheck ? (
                    <div>
                        <PlanList title="风险" items={artifact.selfCheck.risks} empty="暂无明显风险" tone="warn" />
                        <PlanList title="修正建议" items={artifact.selfCheck.fixes} empty="暂无修正建议" />
                    </div>
                ) : null}

                {artifact.nextSteps.length ? (
                    <div>
                        <div className="mb-2 text-xs font-semibold text-black/50">下一步</div>
                        <ol className="space-y-1 text-sm leading-6 text-black/65">
                            {artifact.nextSteps.map((item, index) => (
                                <li key={index}>
                                    {index + 1}. {item}
                                </li>
                            ))}
                        </ol>
                    </div>
                ) : null}
            </div>
        </details>
    );
}

function formatToolActionType(type: AgentLabToolAction["type"]) {
    const labels: Record<AgentLabToolAction["type"], string> = {
        create_portrait_card: "人物立绘卡",
        create_turnaround_card: "三视图卡",
        create_storyboard_card: "分镜卡",
        create_scene_card: "场景卡",
        create_keyframe_card: "关键帧卡",
        create_video_card: "视频卡",
        save_asset: "资产入库",
        ask_user: "追问用户",
    };
    return labels[type] || type;
}

function buildToolActionRecord(action: AgentLabToolAction) {
    const payload = action.payload ? `\n载荷：${JSON.stringify(action.payload, null, 2)}` : "";
    const requires = action.requires.length ? `\n依赖：${action.requires.join("、")}` : "";
    return `类型：${formatToolActionType(action.type)}\n说明：${action.description || action.title}${requires}${payload}`;
}

function parseSavedSessions(saved: string | null): AgentLabSession[] {
    if (!saved) return [];
    try {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((item): AgentLabSession | null => {
                if (!item || typeof item !== "object") return null;
                const source = item as Partial<AgentLabSession>;
                const messages = Array.isArray(source.messages)
                    ? source.messages.filter((message): message is AgentLabMessage => {
                          if (!message || typeof message !== "object") return false;
                          return (message.role === "user" || message.role === "assistant") && typeof message.content === "string";
                      })
                    : [];
                if (!messages.length) messages.push(DEFAULT_ASSISTANT_MESSAGE);
                return {
                    id: typeof source.id === "string" && source.id ? source.id : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    title: typeof source.title === "string" && source.title ? source.title : "新会话",
                    messages,
                    artifact: source.artifact && typeof source.artifact === "object" ? source.artifact : null,
                    personaId: typeof source.personaId === "string" && AGENT_PERSONAS.some((persona) => persona.id === source.personaId) ? source.personaId : DEFAULT_PERSONA.id,
                    customPersona: typeof source.customPersona === "string" ? source.customPersona : "",
                    memory: normalizeMemory(source.memory),
                    createdAt: typeof source.createdAt === "number" ? source.createdAt : Date.now(),
                    updatedAt: typeof source.updatedAt === "number" ? source.updatedAt : Date.now(),
                };
            })
            .filter((item): item is AgentLabSession => Boolean(item))
            .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
        return [];
    }
}

function normalizeMemory(memory: unknown): AgentLabMemory {
    if (!memory || typeof memory !== "object") return { ...DEFAULT_MEMORY };
    const source = memory as Partial<AgentLabMemory>;
    return {
        projectBrief: typeof source.projectBrief === "string" ? source.projectBrief : "",
        stylePreference: typeof source.stylePreference === "string" ? source.stylePreference : "",
        characterMemory: typeof source.characterMemory === "string" ? source.characterMemory : "",
        constraints: typeof source.constraints === "string" ? source.constraints : "",
    };
}

function mergeArtifactIntoMemory(current: AgentLabMemory, artifact: AgentLabArtifact): AgentLabMemory {
    const deliverableText = artifact.deliverables
        .slice(0, 4)
        .map((item) => `${item.title}：${item.content}`)
        .join("\n");
    const planText = artifact.plan
        ? [
              artifact.plan.cards.length ? `建议卡片：${artifact.plan.cards.join("、")}` : "",
              artifact.plan.missingAssets.length ? `缺失素材：${artifact.plan.missingAssets.join("、")}` : "",
              artifact.plan.nextQuestion ? `下一问：${artifact.plan.nextQuestion}` : "",
              artifact.plan.executableNow.length ? `可直接执行：${artifact.plan.executableNow.join("、")}` : "",
          ]
              .filter(Boolean)
              .join("\n")
        : "";
    const toolText = artifact.toolActions?.length ? `工具提案：${artifact.toolActions.map((action) => `${formatToolActionType(action.type)}(${action.title})`).join("、")}` : "";
    const selfCheckText = artifact.selfCheck
        ? [
              `自检分数：${artifact.selfCheck.score}`,
              artifact.selfCheck.passed.length ? `通过：${artifact.selfCheck.passed.join("、")}` : "",
              artifact.selfCheck.risks.length ? `风险：${artifact.selfCheck.risks.join("、")}` : "",
              artifact.selfCheck.fixes.length ? `修正：${artifact.selfCheck.fixes.join("、")}` : "",
          ]
              .filter(Boolean)
              .join("\n")
        : "";

    return {
        ...current,
        projectBrief: appendMemoryText(current.projectBrief, `${artifact.title}：${artifact.summary}`),
        characterMemory: appendMemoryText(current.characterMemory, [planText, toolText, selfCheckText, deliverableText].filter(Boolean).join("\n\n")),
        constraints: appendMemoryText(current.constraints, artifact.nextSteps.length ? `下一步：${artifact.nextSteps.join("；")}` : ""),
    };
}

function appendMemoryText(current = "", next = "") {
    const cleanNext = next.trim();
    if (!cleanNext) return current || "";
    const cleanCurrent = current.trim();
    if (!cleanCurrent) return cleanNext;
    if (cleanCurrent.includes(cleanNext)) return cleanCurrent;
    return `${cleanCurrent}\n\n${cleanNext}`;
}

function formatSessionTime(timestamp: number) {
    if (!Number.isFinite(timestamp)) return "";
    return new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(timestamp);
}

type MarkdownBlock = { kind: "code"; text: string; language?: string } | { kind: "hr" } | { kind: "list"; ordered: boolean; items: string[] } | { kind: "paragraph"; text: string };

function AgentLabMarkdown({ text, onCopy }: { text: string; onCopy: (text: string, successText?: string) => void }) {
    const blocks = parseMarkdownBlocks(text);
    return (
        <div className="space-y-3 text-left">
            {blocks.map((block, index) => {
                if (block.kind === "hr") return <div key={index} className="my-4 border-t border-black/10" />;
                if (block.kind === "code") {
                    return (
                        <div key={index} className="relative">
                            <button
                                type="button"
                                className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/15 px-2 py-1 text-[11px] text-white/80 backdrop-blur transition hover:bg-white/25 hover:text-white"
                                onClick={() => onCopy(block.text, "已复制提示词")}
                            >
                                <Copy className="size-3" />
                                复制
                            </button>
                            <pre className="whitespace-pre-wrap break-words rounded-xl bg-black/90 p-3 pr-20 text-xs leading-5 text-white">
                                <code>{block.text}</code>
                            </pre>
                        </div>
                    );
                }
                if (block.kind === "list") {
                    const ListTag = block.ordered ? "ol" : "ul";
                    return (
                        <ListTag key={index} className={`space-y-1.5 pl-5 ${block.ordered ? "list-decimal" : "list-disc"}`}>
                            {block.items.map((item, itemIndex) => (
                                <li key={itemIndex} className="pl-1">
                                    {renderInlineMarkdown(item)}
                                </li>
                            ))}
                        </ListTag>
                    );
                }
                return <MarkdownParagraph key={index} text={block.text} onCopy={onCopy} />;
            })}
        </div>
    );
}

function MarkdownParagraph({ text, onCopy }: { text: string; onCopy: (text: string, successText?: string) => void }) {
    const lines = text.split("\n");
    return (
        <div className="space-y-1.5">
            {lines.map((line, index) => {
                const heading = line.match(/^(#{1,4})\s+(.+)$/);
                if (heading) {
                    const size = heading[1].length <= 2 ? "text-base" : "text-sm";
                    return (
                        <div key={index} className={`${size} pt-1 font-semibold text-black`}>
                            {renderInlineMarkdown(heading[2])}
                        </div>
                    );
                }
                const important = extractImportantCopy(line);
                if (important) {
                    return (
                        <div key={index} className="group/important relative rounded-xl border border-black/10 bg-white/45 px-3 py-2 pr-20">
                            <button
                                type="button"
                                className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-black/10 bg-white/80 px-2 py-1 text-[11px] text-black/55 shadow-sm transition hover:bg-white hover:text-black"
                                onClick={() => onCopy(important.copyText, `已复制${important.label}`)}
                            >
                                <Copy className="size-3" />
                                复制
                            </button>
                            <p className="whitespace-pre-wrap break-words leading-6">{renderInlineMarkdown(line)}</p>
                        </div>
                    );
                }
                return (
                    <p key={index} className="whitespace-pre-wrap break-words">
                        {renderInlineMarkdown(line)}
                    </p>
                );
            })}
        </div>
    );
}

function extractImportantCopy(line: string) {
    const match = line.match(/^\s*(正向提示词|负向提示词|提示词|填充示例|Prompt|Negative Prompt)\s*[:：]\s*(.+)$/i);
    if (!match?.[2]?.trim()) return null;
    return { label: match[1], copyText: match[2].trim() };
}

function parseMarkdownBlocks(text: string): MarkdownBlock[] {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const blocks: MarkdownBlock[] = [];
    let paragraph: string[] = [];
    let list: { ordered: boolean; items: string[] } | null = null;
    let code: { language?: string; lines: string[] } | null = null;

    const flushParagraph = () => {
        if (!paragraph.length) return;
        blocks.push({ kind: "paragraph", text: paragraph.join("\n").trim() });
        paragraph = [];
    };
    const flushList = () => {
        if (!list) return;
        blocks.push({ kind: "list", ordered: list.ordered, items: list.items });
        list = null;
    };

    for (const line of lines) {
        const codeFence = line.match(/^```(\w+)?\s*$/);
        if (codeFence) {
            if (code) {
                blocks.push({ kind: "code", language: code.language, text: code.lines.join("\n") });
                code = null;
            } else {
                flushParagraph();
                flushList();
                code = { language: codeFence[1], lines: [] };
            }
            continue;
        }
        if (code) {
            code.lines.push(line);
            continue;
        }
        if (/^\s*---+\s*$/.test(line)) {
            flushParagraph();
            flushList();
            blocks.push({ kind: "hr" });
            continue;
        }
        const unordered = line.match(/^\s*[-*]\s+(.+)$/);
        const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
        if (unordered || ordered) {
            flushParagraph();
            const isOrdered = Boolean(ordered);
            if (!list || list.ordered !== isOrdered) flushList();
            list = list || { ordered: isOrdered, items: [] };
            list.items.push((ordered?.[1] || unordered?.[1] || "").trim());
            continue;
        }
        if (!line.trim()) {
            flushParagraph();
            flushList();
            continue;
        }
        paragraph.push(line);
    }

    if (code) blocks.push({ kind: "code", language: code.language, text: code.lines.join("\n") });
    flushParagraph();
    flushList();
    return blocks;
}

function renderInlineMarkdown(text: string) {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
    return parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`")) {
            return (
                <code key={index} className="rounded bg-black/10 px-1 py-0.5 text-[0.92em]">
                    {part.slice(1, -1)}
                </code>
            );
        }
        return <span key={index}>{part}</span>;
    });
}
