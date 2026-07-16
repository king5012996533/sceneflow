"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import copyToClipboard from "copy-to-clipboard";
import { App, Button, Tag } from "antd";
import { Copy, LoaderCircle, Plus, Send, Trash2 } from "lucide-react";

import { apiPath } from "@/lib/app-paths";
import { scopedStorageKey } from "@/lib/user-data-scope";
import type { AgentLabArtifact, AgentLabMessage, AgentLabResponse } from "@/lib/agent-lab/types";
import { modelOptionName, resolveModelChannel, type AiConfig } from "@/stores/use-config-store";
import { CanvasNodeType } from "../types";
import type { CanvasAgentOp, CanvasAgentSnapshot } from "../utils/canvas-agent-ops";

const QUICK_PROMPTS = ["一部漫剧应该怎么做？", "我要一个 15 秒打斗片段", "帮我写一个古风女主三视图提示词", "我直接做三视图可以吗？"];
const STORAGE_KEY = "sceneflow:canvas-creative-agent:messages";
type AgentToolAction = NonNullable<AgentLabArtifact["toolActions"]>[number];

type CanvasCreativeAgentPanelProps = {
    snapshot: CanvasAgentSnapshot;
    config: AiConfig;
    onApplyOps: (ops: CanvasAgentOp[]) => CanvasAgentSnapshot;
};

const DEFAULT_AGENT_MESSAGE: AgentLabMessage = {
    role: "assistant",
    content: "我是 SceneFlow 创作 Agent。你可以直接告诉我你要做什么，我先帮你判断流程、拆步骤、写提示词和分镜建议。现在我不会直接操作画布，确认方案后再进入创建卡片。",
};

export function CanvasCreativeAgentPanel({ snapshot, config, onApplyOps }: CanvasCreativeAgentPanelProps) {
    const { message } = App.useApp();
    const [messages, setMessages] = useState<AgentLabMessage[]>([DEFAULT_AGENT_MESSAGE]);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [artifact, setArtifact] = useState<AgentLabArtifact | null>(null);
    const [appliedActionIds, setAppliedActionIds] = useState<Set<string>>(new Set());
    const [actionNodeIds, setActionNodeIds] = useState<Record<string, string>>({});
    const [generatedActionIds, setGeneratedActionIds] = useState<Set<string>>(new Set());
    const scrollRef = useRef<HTMLDivElement>(null);

    const activeModel = config.textModel || config.model;
    const channel = useMemo(() => resolveModelChannel(config, activeModel), [config, activeModel]);
    const modelLabel = activeModel ? modelOptionName(activeModel) : "未配置模型";

    useEffect(() => {
        const saved = window.localStorage.getItem(scopedStorageKey(STORAGE_KEY));
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved) as AgentLabMessage[];
            const valid = Array.isArray(parsed) ? parsed.filter((item) => (item.role === "user" || item.role === "assistant") && typeof item.content === "string") : [];
            if (valid.length) setMessages(valid);
        } catch {
            // Ignore invalid local history.
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(scopedStorageKey(STORAGE_KEY), JSON.stringify(messages.slice(-40)));
    }, [messages]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, sending]);

    async function sendMessage(text = draft) {
        const content = text.trim();
        if (!content || sending) return;
        if (handleLocalExecutionCommand(content)) {
            setDraft("");
            return;
        }
        const nextMessages: AgentLabMessage[] = [...messages, { role: "user", content }];
        setMessages(nextMessages);
        setDraft("");
        setSending(true);
        try {
            const response = await fetch(apiPath("/api/agent-lab/chat"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: nextMessages.filter((item) => item.role === "user" || item.role === "assistant").slice(-16),
                    provider: {
                        baseUrl: channel.baseUrl,
                        apiKey: channel.apiKey,
                        model: modelOptionName(activeModel),
                    },
                    persona: {
                        id: "canvas-creative-director",
                        name: "SceneFlow 创作导演",
                        description: "负责在画布中理解用户意图，先规划，再建议动作。",
                        prompt: [
                            "你是 SceneFlow 画布里的创作 Agent，不是客服，也不是硬编码流程机器人。",
                            "你应该像一个专业但好沟通的创作导演：先理解用户要做什么，再判断流程是否合理。",
                            "默认只聊天、规划、写提示词、给分镜建议，不要声称已经创建节点、生成图片或生成视频。",
                            "如果用户跳过关键步骤，可以纠正，但要给可选路径，不要强迫用户。",
                            "回答要适合窄侧栏阅读：短段落、少表格、重点内容可复制。",
                            "当你建议创建卡片时，只说“我可以帮你创建人物立绘卡/三视图卡/分镜卡”，等待用户确认。",
                        ].join("\n"),
                    },
                    memory: buildCanvasMemory(snapshot),
                }),
            });
            const data = (await response.json()) as AgentLabResponse & { error?: string };
            if (!response.ok) throw new Error(data.error || "Agent 请求失败");
            setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
            setArtifact(data.artifact || null);
            setAppliedActionIds(new Set());
            setActionNodeIds({});
            setGeneratedActionIds(new Set());
        } catch (error) {
            const text = error instanceof Error ? error.message : "Agent 请求失败";
            setMessages((current) => [...current, { role: "assistant", content: `这次没有连上主模型：${text}\n\n你可以先检查文本模型、Base URL 和 API Key。` }]);
        } finally {
            setSending(false);
        }
    }

    function copyText(text: string, successText = "已复制") {
        copyToClipboard(text);
        message.success(successText);
    }

    function handleLocalExecutionCommand(content: string) {
        const actions = artifact?.toolActions || [];
        if (!actions.length) return false;
        const wantsCreate = /(创建|新建|放到画布|落到画布|生成卡片|建卡|卡片创建|创建到画布)/.test(content);
        const wantsGenerate = /(执行|运行|开始生成|立即生成|直接生成|全部生成|生成全部|一键生成|一键执行)/.test(content);
        if (!wantsCreate && !wantsGenerate) return false;

        setMessages((current) => [...current, { role: "user", content }]);
        if (wantsGenerate) {
            executeAllToolActions(actions);
        } else {
            applyAllToolActions(actions);
        }
        return true;
    }

    function resetConversation() {
        setMessages([DEFAULT_AGENT_MESSAGE]);
        setDraft("");
        setArtifact(null);
        setAppliedActionIds(new Set());
        setActionNodeIds({});
        setGeneratedActionIds(new Set());
        message.success("已新建会话");
    }

    function clearConversation() {
        setMessages([DEFAULT_AGENT_MESSAGE]);
        setArtifact(null);
        setAppliedActionIds(new Set());
        setActionNodeIds({});
        setGeneratedActionIds(new Set());
        message.success("已清空当前会话");
    }

    function applyToolAction(action: AgentToolAction) {
        if (action.type === "ask_user") {
            setMessages((current) => [...current, { role: "assistant", content: `我会先等待你补充：${action.requires.join("、") || action.description || action.title}` }]);
            return;
        }
        if (action.type === "save_asset") {
            setMessages((current) => [...current, { role: "assistant", content: "资产入库需要接素材库接口，这一步我先记录建议，不会直接写入正式资产库。" }]);
            return;
        }
        const nodeId = createActionNodeId(action, Object.keys(actionNodeIds).length);
        const ops = toolActionToOps(action, artifact, snapshot, nodeId);
        if (!ops.length) {
            message.warning("这个动作暂时还不能转换成画布卡片");
            return;
        }
        onApplyOps(ops);
        setAppliedActionIds((current) => new Set([...current, action.id]));
        setActionNodeIds((current) => ({ ...current, [action.id]: nodeId }));
        setMessages((current) => [
            ...current,
            {
                role: "assistant",
                content: `已创建草稿卡片：${action.title}\n\n我只是把方案落成画布卡片，没有触发生成。你可以检查提示词、模型、尺寸和引用关系后，再手动生成。`,
            },
        ]);
        message.success("已创建到画布");
    }

    function applyAllToolActions(actions: AgentToolAction[]) {
        const pending = actions.filter((action) => !appliedActionIds.has(action.id) && isCreatableAction(action));
        if (!pending.length) {
            message.info("没有可创建的新卡片");
            return;
        }
        const built = toolActionsToConnectedOps(pending, artifact, snapshot);
        const ops = built.ops;
        if (!ops.length) {
            message.warning("暂无可创建的卡片");
            return;
        }
        onApplyOps(ops);
        setAppliedActionIds((current) => new Set([...current, ...pending.map((action) => action.id)]));
        setActionNodeIds((current) => ({ ...current, ...built.actionNodeIds }));
        setMessages((current) => [
            ...current,
            {
                role: "assistant",
                content: `已创建 ${pending.length} 张草稿卡片，并按建议流程连线。\n\n我没有触发生成。你可以先检查每张卡片的提示词、模型、尺寸和上游引用，再手动执行。`,
            },
        ]);
        message.success(`已创建 ${pending.length} 张草稿卡片`);
    }

    function executeAllToolActions(actions: AgentToolAction[]) {
        const creatableActions = actions.filter(isCreatableAction);
        const pending = creatableActions.filter((action) => !appliedActionIds.has(action.id));
        const built = pending.length ? toolActionsToConnectedOps(pending, artifact, snapshot) : { ops: [], actionNodeIds: {} as Record<string, string> };
        const nextActionNodeIds = { ...actionNodeIds, ...built.actionNodeIds };
        const generationOps = creatableActions
            .filter((action) => actionToGenerationMode(action.type) && nextActionNodeIds[action.id] && !generatedActionIds.has(action.id))
            .map((action) => ({ type: "run_generation" as const, nodeId: nextActionNodeIds[action.id], mode: actionToGenerationMode(action.type) || "image" }));

        if (!built.ops.length && !generationOps.length) {
            message.info("没有可执行的新任务");
            return;
        }

        onApplyOps([...built.ops, ...generationOps]);

        if (pending.length) {
            setAppliedActionIds((current) => new Set([...current, ...pending.map((action) => action.id)]));
        }
        if (Object.keys(built.actionNodeIds).length) {
            setActionNodeIds(nextActionNodeIds);
        }
        if (generationOps.length) {
            const generatedIds = new Set(generatedActionIds);
            creatableActions.forEach((action) => {
                if (nextActionNodeIds[action.id] && actionToGenerationMode(action.type)) {
                    generatedIds.add(action.id);
                }
            });
            setGeneratedActionIds(generatedIds);
        }

        const createdLine = pending.length ? `已创建 ${pending.length} 张草稿卡片，并按建议流程连线。` : "已使用上一次创建的卡片。";
        const generationLine = generationOps.length ? `已触发 ${generationOps.length} 个生成任务。` : "没有可生成的卡片，或这些卡片已经触发过生成。";
        setMessages((current) => [
            ...current,
            {
                role: "assistant",
                content: `${createdLine}\n\n${generationLine}\n\n这些任务会走 SceneFlow 现有生成入口，并按后端额度、并发和扣费规则执行。`,
            },
        ]);
        message.success(`已执行 ${pending.length + generationOps.length} 个动作`);
    }

    function runActionGeneration(action: AgentToolAction) {
        const nodeId = actionNodeIds[action.id];
        if (!nodeId) {
            message.warning("请先创建这张草稿卡");
            return;
        }
        const mode = actionToGenerationMode(action.type);
        if (!mode) {
            message.warning("这张卡不是生成卡，不能直接生成");
            return;
        }
        onApplyOps([{ type: "run_generation", nodeId, mode }]);
        setGeneratedActionIds((current) => new Set([...current, action.id]));
        setMessages((current) => [
            ...current,
            {
                role: "assistant",
                content: `已触发生成：${action.title}\n\n这次生成走 SceneFlow 现有生成入口，会按后端额度、并发和扣费规则执行。`,
            },
        ]);
        message.success("已触发生成");
    }

    function runAllActionGenerations(actions: AgentToolAction[]) {
        executeAllToolActions(actions);
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col bg-[#fffdfa] text-[#171717]">
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
                <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">创作 Agent</div>
                    <div className="truncate text-xs text-black/45">先规划，不直接执行画布操作</div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <Tag bordered={false} color={channel.apiKey ? "green" : "default"}>
                        {modelLabel}
                    </Tag>
                    <Button size="small" type="text" icon={<Plus className="size-3.5" />} onClick={resetConversation}>
                        新建
                    </Button>
                    <Button size="small" type="text" icon={<Trash2 className="size-3.5" />} onClick={clearConversation}>
                        清空
                    </Button>
                </div>
            </div>

            <div ref={scrollRef} className="thin-scrollbar min-h-0 flex-1 space-y-5 overflow-auto px-4 py-5">
                {messages.map((item, index) => (
                    <div key={index} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`group/message relative max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.role === "user" ? "bg-black text-white" : "bg-[#f4eee6] text-black/80"}`}>
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
                            {item.role === "user" ? <div className="whitespace-pre-wrap break-words">{item.content}</div> : <CreativeMarkdown text={item.content} onCopy={copyText} />}
                        </div>
                    </div>
                ))}
                {sending ? (
                    <div className="flex justify-start">
                        <div className="inline-flex items-center gap-2 rounded-2xl bg-[#f4eee6] px-4 py-3 text-sm text-black/55">
                            <LoaderCircle className="size-4 animate-spin" />
                            正在思考...
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="border-t border-black/10 p-3">
                {artifact ? <CompactCanvasPlan artifact={artifact} appliedActionIds={appliedActionIds} generatedActionIds={generatedActionIds} onCopy={copyText} onApply={applyToolAction} onApplyAll={applyAllToolActions} onGenerate={runActionGeneration} onGenerateAll={runAllActionGenerations} /> : null}
                <div className="mb-2 flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((item) => (
                        <Button key={item} size="small" onClick={() => sendMessage(item)} disabled={sending}>
                            {item}
                        </Button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                                event.preventDefault();
                                void sendMessage();
                            }
                        }}
                        className="min-h-[52px] flex-1 resize-none rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-black/30 focus:border-[#4f46e5]"
                        placeholder="直接描述你的需求，例如：我要一个 15 秒雨夜竹林打斗片段。"
                    />
                    <Button type="primary" className="!h-auto !px-4" icon={sending ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />} onClick={() => sendMessage()} disabled={sending || !draft.trim()} />
                </div>
            </div>
        </div>
    );
}

function buildCanvasMemory(snapshot: CanvasAgentSnapshot) {
    const selected = snapshot.nodes.filter((node) => snapshot.selectedNodeIds.includes(node.id));
    const selectedText = selected
        .slice(0, 6)
        .map((node) => `${node.title || node.type}(${node.type})：${String(node.metadata?.prompt || node.metadata?.content || "").slice(0, 180)}`)
        .join("\n");
    return {
        projectBrief: `当前画布：${snapshot.title || snapshot.projectId}。节点 ${snapshot.nodes.length} 个，连线 ${snapshot.connections.length} 条。`,
        characterMemory: selectedText ? `当前选中节点：\n${selectedText}` : "",
        constraints: "不要声称已经实际创建、生成或修改画布。需要操作时先提出可确认动作。",
    };
}

function CompactCanvasPlan({
    artifact,
    appliedActionIds,
    generatedActionIds,
    onCopy,
    onApply,
    onApplyAll,
    onGenerate,
    onGenerateAll,
}: {
    artifact: AgentLabArtifact;
    appliedActionIds: Set<string>;
    generatedActionIds: Set<string>;
    onCopy: (text: string, successText?: string) => void;
    onApply: (action: AgentToolAction) => void;
    onApplyAll: (actions: AgentToolAction[]) => void;
    onGenerate: (action: AgentToolAction) => void;
    onGenerateAll: (actions: AgentToolAction[]) => void;
}) {
    if (!artifact.plan && !artifact.selfCheck && !artifact.toolActions?.length) return null;
    return (
        <details className="mb-2 rounded-2xl border border-black/10 bg-[#f7f1e8]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 truncate font-medium">执行建议：{artifact.title}</span>
                {artifact.selfCheck ? <Tag color={artifact.selfCheck.score >= 80 ? "green" : artifact.selfCheck.score >= 60 ? "orange" : "red"}>{artifact.selfCheck.score}</Tag> : null}
            </summary>
            <div className="space-y-3 border-t border-black/10 p-3 text-sm">
                {artifact.plan?.cards.length ? <MiniList title="建议卡片" items={artifact.plan.cards} /> : null}
                {artifact.plan?.missingAssets.length ? <MiniList title="缺失素材" items={artifact.plan.missingAssets} /> : null}
                {artifact.toolActions?.length ? (
                    <div>
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-xs font-semibold text-black/45">可确认动作</div>
                            <div className="flex gap-1.5">
                                <Button size="small" onClick={() => onApplyAll(artifact.toolActions || [])}>
                                    创建全部
                                </Button>
                                <Button size="small" onClick={() => onGenerateAll(artifact.toolActions || [])}>
                                    生成全部
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {artifact.toolActions.map((action) => {
                                const applied = appliedActionIds.has(action.id);
                                const canGenerate = Boolean(actionToGenerationMode(action.type));
                                const generated = generatedActionIds.has(action.id);
                                return (
                                    <div key={action.id} className="rounded-xl border border-black/10 bg-white/65 px-3 py-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-medium">{action.title}</div>
                                                <div className="mt-0.5 text-xs leading-5 text-black/50">{formatToolType(action.type)} · {action.description || "确认后创建草稿卡片"}</div>
                                            </div>
                                            <div className="flex shrink-0 gap-1.5">
                                                <Button size="small" type={applied ? "default" : "primary"} disabled={applied} onClick={() => onApply(action)}>
                                                    {applied ? "已创建" : action.type === "ask_user" ? "知道了" : "创建"}
                                                </Button>
                                                {canGenerate ? (
                                                    <Button size="small" disabled={!applied || generated} onClick={() => onGenerate(action)}>
                                                        {generated ? "已生成" : "生成"}
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : null}
                {artifact.selfCheck?.risks.length ? <MiniList title="风险" items={artifact.selfCheck.risks} /> : null}
                <Button size="small" onClick={() => onCopy(JSON.stringify(artifact, null, 2), "已复制执行建议")}>
                    复制完整建议
                </Button>
            </div>
        </details>
    );
}

function toolActionToOps(action: AgentToolAction, artifact: AgentLabArtifact | null, snapshot: CanvasAgentSnapshot, nodeId: string): CanvasAgentOp[] {
    return [buildActionNodeOp(action, artifact, nextCardPosition(snapshot), nodeId)];
}

function toolActionsToConnectedOps(actions: AgentToolAction[], artifact: AgentLabArtifact | null, snapshot: CanvasAgentSnapshot): { ops: CanvasAgentOp[]; actionNodeIds: Record<string, string> } {
    const start = nextCardPosition(snapshot);
    const actionNodeIds: Record<string, string> = {};
    const nodes = actions.map((action, index) =>
        {
            const nodeId = createActionNodeId(action, index);
            actionNodeIds[action.id] = nodeId;
            return buildActionNodeOp(
                action,
                artifact,
                {
                    x: start.x + index * 420,
                    y: start.y + (index % 2) * 36,
                },
                nodeId,
            );
        },
    );
    const connections: CanvasAgentOp[] = [];
    const firstNodeId = nodes[0]?.id;
    if (firstNodeId) {
        snapshot.selectedNodeIds.slice(0, 6).forEach((sourceId) => {
            connections.push({ type: "connect_nodes", fromNodeId: sourceId, toNodeId: firstNodeId });
        });
    }
    for (let index = 0; index < nodes.length - 1; index += 1) {
        const fromNodeId = nodes[index]?.id;
        const toNodeId = nodes[index + 1]?.id;
        if (fromNodeId && toNodeId) connections.push({ type: "connect_nodes", fromNodeId, toNodeId });
    }
    return { ops: [...nodes, ...connections], actionNodeIds };
}

function buildActionNodeOp(action: AgentToolAction, artifact: AgentLabArtifact | null, position: { x: number; y: number }, id?: string): Extract<CanvasAgentOp, { type: "add_node" }> {
    const mode = actionToGenerationMode(action.type);
    const nodeType = mode ? CanvasNodeType.Config : CanvasNodeType.Text;
    const prompt = extractActionPrompt(action, artifact);
    const content = [
        action.title,
        action.description ? `说明：${action.description}` : "",
        action.requires.length ? `依赖：${action.requires.join("、")}` : "",
        prompt ? `\n${prompt}` : "",
    ]
        .filter(Boolean)
        .join("\n");
    const metadata = mode
        ? {
              content,
              composerContent: prompt || content,
              prompt: prompt || content,
              generationMode: mode,
              status: "idle" as const,
              pipelineKind: action.type,
              pipelineLabel: formatToolType(action.type),
              pipelineDescription: action.description || action.title,
              assetCategory: actionToAssetCategory(action.type),
              assetSource: "manual" as const,
              assetReusable: true,
          }
        : {
              content,
              status: "idle" as const,
              fontSize: 14,
              pipelineKind: action.type,
              pipelineLabel: formatToolType(action.type),
              pipelineDescription: action.description || action.title,
          };
    return {
        type: "add_node",
        id,
        nodeType,
        title: action.title || formatToolType(action.type),
        position,
        width: nodeType === CanvasNodeType.Text ? 380 : 360,
        height: nodeType === CanvasNodeType.Text ? 260 : 280,
        metadata,
    };
}

function isCreatableAction(action: AgentToolAction) {
    return action.type !== "ask_user" && action.type !== "save_asset";
}

function safeId(value: string) {
    return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 40) || "action";
}

function createActionNodeId(action: AgentToolAction, index: number) {
    return `agent-${Date.now()}-${index}-${safeId(action.id)}`;
}

function nextCardPosition(snapshot: CanvasAgentSnapshot) {
    const k = Number.isFinite(snapshot.viewport.k) && snapshot.viewport.k > 0 ? snapshot.viewport.k : 1;
    const baseX = Math.round((-snapshot.viewport.x + 140) / k);
    const baseY = Math.round((-snapshot.viewport.y + 140) / k);
    const offset = Math.min(snapshot.nodes.length % 8, 7) * 36;
    return { x: baseX + offset, y: baseY + offset };
}

function extractActionPrompt(action: AgentToolAction, artifact: AgentLabArtifact | null) {
    const payload = action.payload || {};
    const payloadPrompt = firstString(payload.prompt, payload.positivePrompt, payload.content, payload.text, payload.description);
    if (payloadPrompt) return payloadPrompt;
    const deliverables = artifact?.deliverables || [];
    const matched = deliverables.find((item) => {
        const haystack = `${item.type} ${item.title}`.toLowerCase();
        if (action.type === "create_portrait_card") return /portrait|立绘|人物/.test(haystack);
        if (action.type === "create_turnaround_card") return /turnaround|三视图/.test(haystack);
        if (action.type === "create_storyboard_card") return /storyboard|分镜/.test(haystack);
        if (action.type === "create_scene_card") return /scene|场景/.test(haystack);
        if (action.type === "create_keyframe_card") return /keyframe|关键帧/.test(haystack);
        if (action.type === "create_video_card") return /video|视频/.test(haystack);
        return false;
    });
    return matched?.content || firstString(artifact?.summary, action.description, action.title);
}

function firstString(...values: unknown[]) {
    for (const value of values) {
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    return "";
}

function actionToGenerationMode(type: AgentToolAction["type"]) {
    if (type === "create_storyboard_card") return undefined;
    if (type === "create_video_card") return "video" as const;
    if (type === "create_portrait_card" || type === "create_turnaround_card" || type === "create_scene_card" || type === "create_keyframe_card") return "image" as const;
    return undefined;
}

function actionToAssetCategory(type: AgentToolAction["type"]) {
    if (type === "create_portrait_card") return "character" as const;
    if (type === "create_turnaround_card") return "character-turnaround" as const;
    if (type === "create_scene_card") return "scene" as const;
    if (type === "create_storyboard_card") return "storyboard" as const;
    if (type === "create_keyframe_card") return "keyframe" as const;
    if (type === "create_video_card") return "video-shot" as const;
    return "general" as const;
}

function formatToolType(type: AgentToolAction["type"]) {
    const labels: Record<AgentToolAction["type"], string> = {
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

function MiniList({ title, items }: { title: string; items: string[] }) {
    return (
        <div>
            <div className="mb-1 text-xs font-semibold text-black/45">{title}</div>
            <div className="flex flex-wrap gap-1.5">
                {items.map((item, index) => (
                    <span key={`${title}-${index}`} className="rounded-full bg-white/70 px-2 py-1 text-xs text-black/60">
                        {item}
                    </span>
                ))}
            </div>
        </div>
    );
}

function CreativeMarkdown({ text, onCopy }: { text: string; onCopy: (text: string, successText?: string) => void }) {
    const parts = text.split(/```(?:\w+)?\n?([\s\S]*?)```/g);
    return (
        <div className="space-y-3 text-left">
            {parts.map((part, index) => {
                if (index % 2 === 1) {
                    return (
                        <div key={index} className="relative">
                            <button type="button" className="absolute right-2 top-2 z-10 rounded-md bg-white/15 px-2 py-1 text-[11px] text-white/80 hover:bg-white/25" onClick={() => onCopy(part.trim(), "已复制提示词")}>
                                复制
                            </button>
                            <pre className="whitespace-pre-wrap break-words rounded-xl bg-black/90 p-3 pr-16 text-xs leading-5 text-white">
                                <code>{part.trim()}</code>
                            </pre>
                        </div>
                    );
                }
                return <MarkdownText key={index} text={part} onCopy={onCopy} />;
            })}
        </div>
    );
}

function MarkdownText({ text, onCopy }: { text: string; onCopy: (text: string, successText?: string) => void }) {
    return (
        <div className="space-y-1.5">
            {text.split("\n").map((line, index) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={index} className="h-1" />;
                const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
                if (heading) return <div key={index} className="pt-1 text-sm font-semibold text-black">{heading[2]}</div>;
                const important = trimmed.match(/^(正向提示词|负向提示词|提示词|Prompt|Negative Prompt)\s*[:：]\s*(.+)$/i);
                if (important?.[2]) {
                    return (
                        <div key={index} className="relative rounded-xl border border-black/10 bg-white/45 px-3 py-2 pr-16">
                            <button type="button" className="absolute right-2 top-2 rounded-md border border-black/10 bg-white/80 px-2 py-1 text-[11px] text-black/55 hover:bg-white hover:text-black" onClick={() => onCopy(important[2].trim(), `已复制${important[1]}`)}>
                                复制
                            </button>
                            <p className="whitespace-pre-wrap break-words">{renderInline(trimmed)}</p>
                        </div>
                    );
                }
                return (
                    <p key={index} className="whitespace-pre-wrap break-words">
                        {renderInline(trimmed)}
                    </p>
                );
            })}
        </div>
    );
}

function renderInline(text: string) {
    return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-black/10 px-1 py-0.5 text-[0.92em]">{part.slice(1, -1)}</code>;
        return <span key={index}>{part}</span>;
    });
}
