"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import copyToClipboard from "copy-to-clipboard";
import { Bot, Copy, Cpu, History, PanelRightClose, Plus, Settings2, Trash2, X } from "lucide-react";
import { Button, Modal, Segmented, Switch, Tooltip } from "antd";
import { motion } from "motion/react";

import { modelOptionName, normalizeModelOptionValue, resolveModelChannel, selectableModelsByCapability, useConfigStore, useEffectiveConfig, type AiConfig } from "@/stores/use-config-store";
import { canvasThemes } from "@/lib/canvas-theme";
import { nanoid } from "nanoid";
import { requestGeneratedToolResponse, type ResponseFunctionTool, type ResponseInputMessage, type ResponseToolCall } from "@/lib/generation/generation-request";
import { imageToDataUrl } from "@/services/image-storage";
import { useAssetStore } from "@/stores/use-asset-store";
import { useThemeStore } from "@/stores/use-theme-store";
import { useUserStore } from "@/stores/use-user-store";
import { imageReferenceLabel } from "@/lib/image-reference-prompt";
import { DiaTextReveal } from "@/components/ui/dia-text-reveal";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { CanvasPromptLibrary } from "./canvas-prompt-library";
import { AgentChatComposer, AgentChatMessage, AgentModeSwitch, AgentPanelTabs, AgentWorkingMessage, type CanvasAgentChatMessage, type CanvasAgentMode } from "./canvas-agent-chat-ui";
import { CanvasLocalAgentPanel } from "./canvas-local-agent-panel";
import { NODE_DEFAULT_SIZE } from "../constants";
import { CanvasNodeType, type CanvasAssistantMessage, type CanvasAssistantReference, type CanvasAssistantSession, type CanvasNodeData } from "../types";
import { useCanvasAgentStore } from "../stores/use-canvas-agent-store";
import { summarizeCanvasAgentOps, type CanvasAgentOp, type CanvasAgentSnapshot } from "../utils/canvas-agent-ops";

export const CANVAS_AGENT_PANEL_MOTION_MS = 500;
const PANEL_MOTION_SECONDS = CANVAS_AGENT_PANEL_MOTION_MS / 1000;
const ONLINE_AGENT_MAX_STEPS = 4;
const MANGA_PRODUCTION_SKILL = [
    "SceneFlow 漫剧生产 Skill：",
    "1. 标准链路固定为：剧本/片段解析 -> 人物创建提示词 -> 人物三视图提示词 -> 场景设定 -> 风格校准 -> 分镜表 -> 关键帧 -> 视频生成 -> 资产入库。",
    "2. 人物创建必须先锁定角色锚点：脸部、发型、服装、配饰、道具、气质、禁忌变化；不能直接跳到视频。",
    "3. 人物三视图必须基于人物定稿图生成，要求正面、侧面、背面同屏，同脸、同衣服、同发型。",
    "4. 分镜表必须能执行，固定包含：镜头编号、景别、画面描述、角色动作、台词/旁白、镜头运动、预计秒数、所需参考资产、连续性备注。",
    "5. 关键帧必须同时引用分镜表、人物三视图、场景设定和风格校准。",
    "6. 视频生成必须同时引用多个上游资产：关键帧、人物三视图、场景/风格、分镜表。提示词必须写清起始状态、动作推进、镜头运动、结束状态和禁止改变项。",
    "7. 除非用户明确要求立即生成，否则只创建可确认流程卡，先让用户检查提示词、模型、比例、画质和时长。",
    "8. 用户上传外部剧本或片段不限制来源，先解析和拆分；角色来源必须判断是新生成、用户资产复用，还是平台租赁。",
    "9. 生成完成的人设、三视图、场景、风格、分镜、关键帧、视频都要建议回流素材库。",
].join("\n");
const BASE_ONLINE_AGENT_PROMPT = [
    "你是 SceneFlow 的 AI 创作助手。先像一个正常、聪明、有耐心的人一样理解用户，再决定怎么回答。",
    "不要预设用户一定要提示词、片段、分镜或画布操作。用户问什么就回答什么；用户情绪不佳时，先接住情绪，再给一个具体可执行的小建议。",
    "默认用自然语言对话，不调用工具。只有用户明确要求你操作画布，例如创建卡片、放到画布、读取当前画布、修改节点、连线、生成、重跑、删除、续写视频时，才调用画布工具。",
    "用户只是问产品怎么用、API 怎么接、为什么报错、图片怎么样、想听建议、让你陪聊或让你判断方向时，直接回答，不要套固定创作模板。",
    "用户发图片并说“帮我看一下/我需要提示词/怎么优化”时，先说明你看到了什么，再根据用户问题回答；只有用户明确要提示词时才输出提示词。",
    "用户要求创作内容时，先判断类型：剧情灵感、提示词、分镜、角色设定、视频镜头、产品答疑、故障排查。只输出当前类型需要的内容，不要把所有模块都塞给用户。",
    "聊天面板较窄，优先短句、短段落、编号列表。除非用户明确要表格，否则不要输出宽 Markdown 表格。",
    "不要提到 [object Object]、页面对象、数据传输错误、误传输格式或内部实现。遇到不清晰输入时，用正常人的方式说：我先按你现在给的信息理解为……",
    "如果用户意图不明确，先给一个你当前的理解和一个最小下一步，不要连续追问很多问题。",
    "工具参数涉及已有节点时必须使用工具读取到的真实 id；缺少必要 id 或用户意图不明确时直接说明需要用户选择或补充，不要猜测。不要输出 JSON ops，不要编造执行结果。工具返回结果后，再根据真实结果回答用户。",
].join("\n");
const ONLINE_AGENT_PROMPT = `${BASE_ONLINE_AGENT_PROMPT}\n\n以下漫剧生产规范只在用户明确要求制作漫剧、分镜、角色三视图、关键帧或视频流水线时参考；普通聊天、看图问答、产品咨询、API 排错时不要套用：\n${MANGA_PRODUCTION_SKILL}`;
const CANVAS_TOOL_INTENT_PATTERN =
    /(创建|新建|放到画布|落到画布|生成节点|创建卡片|连线|连接|读取画布|当前画布|看一下画布|选中|删除|移动|调整节点|修改节点|执行|运行|重跑|重新生成|续写|尾帧|帮我操作|改画布|更新节点|开始生成|立即生成|生成图片|生成视频|生成音频|图生视频)/;
const CHAT_ONLY_INTENT_PATTERN = /(提示词|想法|建议|规划|剧本|剧情|片段|分镜|怎么看|帮我看|分析|优化|怎么做|怎么开始|聊|在吗|你好|谢谢|难用|不会|卡住)/;
const JSON_RECORD_SCHEMA = { type: "object", additionalProperties: true };
const POSITION_SCHEMA = { type: "object", properties: { x: { type: "number" }, y: { type: "number" } }, required: ["x", "y"], additionalProperties: false };
const VIEWPORT_SCHEMA = { type: "object", properties: { x: { type: "number" }, y: { type: "number" }, k: { type: "number" } }, required: ["x", "y", "k"], additionalProperties: false };
const NODE_TYPE_SCHEMA = { type: "string", enum: ["image", "text", "config", "video", "audio"] };
const GENERATION_MODE_SCHEMA = { type: "string", enum: ["text", "image", "video", "audio"] };
const WORKFLOW_INTENT_SCHEMA = { type: "string", enum: ["fragment-video", "full-script", "character", "scene", "storyboard", "image-to-video", "asset-analysis", "general-visual"] };
const GENERATION_OPTION_PROPERTIES = {
    model: { type: "string" },
    size: { type: "string" },
    quality: { type: "string" },
    count: { type: "number" },
    seconds: { type: "string" },
    vquality: { type: "string" },
    generateAudio: { type: "string" },
    watermark: { type: "string" },
    audioVoice: { type: "string" },
    audioFormat: { type: "string" },
    audioSpeed: { type: "string" },
    audioInstructions: { type: "string" },
};
const CANVAS_OP_SCHEMA = {
    type: "object",
    properties: {
        type: { type: "string", enum: ["add_node", "update_node", "delete_node", "delete_connections", "connect_nodes", "set_viewport", "select_nodes", "run_generation", "run_pipeline", "continue_video"] },
        id: { type: "string" },
        ids: { type: "array", items: { type: "string" } },
        nodeType: NODE_TYPE_SCHEMA,
        title: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        width: { type: "number" },
        height: { type: "number" },
        position: POSITION_SCHEMA,
        metadata: JSON_RECORD_SCHEMA,
        patch: JSON_RECORD_SCHEMA,
        all: { type: "boolean" },
        fromNodeId: { type: "string" },
        toNodeId: { type: "string" },
        viewport: VIEWPORT_SCHEMA,
        nodeId: { type: "string" },
        mode: GENERATION_MODE_SCHEMA,
        prompt: { type: "string" },
        nodeIds: { type: "array", items: { type: "string" } },
        resume: { type: "boolean" },
    },
    required: ["type"],
    additionalProperties: false,
};
const ONLINE_READ_TOOLS = new Set(["canvas_get_state", "canvas_get_selection", "canvas_export_snapshot"]);

function toolDefinition(name: string, description: string, properties: Record<string, unknown>, required: string[] = [], strict = false): ResponseFunctionTool {
    return { type: "function", function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false }, strict } };
}

function generationToolDefinition(name: string, description: string, mode?: "text" | "image" | "video" | "audio") {
    return toolDefinition(
        name,
        description,
        { prompt: { type: "string" }, title: { type: "string" }, x: { type: "number" }, y: { type: "number" }, referenceNodeIds: { type: "array", items: { type: "string" } }, ...(mode ? {} : { mode: GENERATION_MODE_SCHEMA }), autoRun: { type: "boolean" }, ...GENERATION_OPTION_PROPERTIES },
        ["prompt"],
    );
}

const ONLINE_AGENT_TOOLS: ResponseFunctionTool[] = [
    toolDefinition("canvas_get_state", "读取当前网页画布的节点、连线、选区和视口。", {}),
    toolDefinition("canvas_get_selection", "读取当前网页画布选中的节点。", {}),
    toolDefinition("canvas_export_snapshot", "导出当前画布快照，用于理解布局。", {}),
    toolDefinition(
        "canvas_plan_workflow",
        "识别用户的视觉生产意图，并返回推荐流程、缺失阶段和下一步建议。该工具只做规划，不改动画布。",
        {
            brief: { type: "string" },
            intent: WORKFLOW_INTENT_SCHEMA,
            outputGoal: { type: "string" },
        },
        ["brief"],
    ),
    toolDefinition(
        "canvas_create_workflow_cards",
        "按视觉生产意图创建一组可确认的流程卡片，不自动生成内容。适合片段视频、完整剧本、角色、场景、分镜、图生视频和素材分析。",
        {
            brief: { type: "string" },
            intent: WORKFLOW_INTENT_SCHEMA,
            sourceNodeId: { type: "string" },
            referenceNodeIds: { type: "array", items: { type: "string" } },
            x: { type: "number" },
            y: { type: "number" },
        },
        ["brief"],
    ),
    toolDefinition(
        "canvas_analyze_reference_image",
        "为选中或指定的参考图创建结构化分析卡片，输出角色外貌、服装、风格、场景、可复用提示词和风险点。该工具不直接识别图片像素，只把参考图挂到分析流程，后续由多模态模型或用户确认。",
        {
            nodeId: { type: "string" },
            brief: { type: "string" },
            analysisType: { type: "string", enum: ["character", "scene", "style", "shot", "auto"] },
            x: { type: "number" },
            y: { type: "number" },
        },
        ["nodeId"],
    ),
    toolDefinition("canvas_apply_ops", "批量操作当前网页画布。ops 支持 add_node、update_node、delete_node、delete_connections、connect_nodes、set_viewport、select_nodes、run_generation。", { ops: { type: "array", items: CANVAS_OP_SCHEMA } }, ["ops"], false),
    toolDefinition("canvas_create_node", "创建任意类型节点：text、image、config、video、audio。适合创建占位图、媒体占位、配置节点或自定义 metadata 节点。", { nodeType: NODE_TYPE_SCHEMA, title: { type: "string" }, x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" }, metadata: JSON_RECORD_SCHEMA }, ["nodeType"]),
    toolDefinition("canvas_create_text_node", "在当前画布创建单个文本节点。", { text: { type: "string" }, x: { type: "number" }, y: { type: "number" }, title: { type: "string" }, width: { type: "number" }, height: { type: "number" } }),
    toolDefinition("canvas_create_text_nodes", "批量创建文本节点，适合生成标题、段落、脚本、说明等内容块。", { items: { type: "array", minItems: 1, items: { type: "object", properties: { text: { type: "string" }, title: { type: "string" }, x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" } }, required: ["text"], additionalProperties: false } }, x: { type: "number" }, y: { type: "number" }, gap: { type: "number" }, direction: { type: "string", enum: ["row", "column"] } }, ["items"]),
    toolDefinition("canvas_create_config_node", "创建生成配置节点，可指定 text/image/video/audio 模式和生成参数，可选择立即触发生成。", { prompt: { type: "string" }, mode: GENERATION_MODE_SCHEMA, title: { type: "string" }, x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" }, autoRun: { type: "boolean" }, ...GENERATION_OPTION_PROPERTIES }),
    toolDefinition("canvas_create_image_prompt_flow", "创建提示词文本节点和图片生成配置节点，并自动连线，可选择立即触发生图。", { prompt: { type: "string" }, x: { type: "number" }, y: { type: "number" }, autoRun: { type: "boolean" }, ...GENERATION_OPTION_PROPERTIES }, ["prompt"]),
    generationToolDefinition("canvas_create_generation_flow", "创建通用生成流程：提示词文本节点、生成配置节点、参考节点连线，可用于文案、生图、视频或音频。"),
    generationToolDefinition("canvas_generate_text", "创建通用文本生成流程并立即触发生成。", "text"),
    generationToolDefinition("canvas_generate_image", "创建通用图片生成流程并立即触发生成。", "image"),
    generationToolDefinition("canvas_generate_video", "创建通用视频生成流程并立即触发生成。", "video"),
    generationToolDefinition("canvas_generate_audio", "创建通用音频生成流程并立即触发生成。", "audio"),
    toolDefinition("canvas_update_node", "更新节点基础字段或 metadata。", { id: { type: "string" }, patch: JSON_RECORD_SCHEMA, metadata: JSON_RECORD_SCHEMA }, ["id"]),
    toolDefinition("canvas_update_node_text", "更新文本节点内容和标题。", { id: { type: "string" }, text: { type: "string" }, title: { type: "string" } }, ["id", "text"]),
    toolDefinition("canvas_move_nodes", "移动一个或多个节点，支持绝对坐标或 dx/dy 偏移。", { items: { type: "array", minItems: 1, items: { type: "object", properties: { id: { type: "string" }, x: { type: "number" }, y: { type: "number" }, dx: { type: "number" }, dy: { type: "number" } }, required: ["id"], additionalProperties: false } } }, ["items"]),
    toolDefinition("canvas_resize_node", "调整节点尺寸。", { id: { type: "string" }, width: { type: "number" }, height: { type: "number" }, freeResize: { type: "boolean" } }, ["id", "width", "height"]),
    toolDefinition("canvas_delete_nodes", "删除指定节点及相关连线。", { ids: { type: "array", items: { type: "string" }, minItems: 1 } }, ["ids"]),
    toolDefinition("canvas_connect_nodes", "批量连接节点。", { connections: { type: "array", minItems: 1, items: { type: "object", properties: { fromNodeId: { type: "string" }, toNodeId: { type: "string" } }, required: ["fromNodeId", "toNodeId"], additionalProperties: false } } }, ["connections"]),
    toolDefinition("canvas_select_nodes", "设置当前选中节点。", { ids: { type: "array", items: { type: "string" } } }, ["ids"]),
    toolDefinition("canvas_set_viewport", "调整画布视口。", { viewport: VIEWPORT_SCHEMA }, ["viewport"]),
    toolDefinition("canvas_run_generation", "触发指定节点生成，通常用于配置节点或文本/图片/视频/音频节点。", { nodeId: { type: "string" }, mode: GENERATION_MODE_SCHEMA, prompt: { type: "string" } }, ["nodeId"]),
    toolDefinition(
        "canvas_run_pipeline",
        "按顺序执行一组已确认的流程节点。已成功节点会跳过，失败时停止，再次调用可从断点继续。该工具会消耗生成额度，只有用户明确要求执行时才能调用。",
        { nodeIds: { type: "array", items: { type: "string" }, minItems: 1 }, resume: { type: "boolean" } },
        ["nodeIds"],
    ),
    toolDefinition("canvas_continue_video", "提取指定视频节点的尾帧，并创建已连接的下一镜头视频节点。需要用户确认后执行。", { nodeId: { type: "string" } }, ["nodeId"]),
];
type OnlineAgentTab = "setup" | "chat" | "history" | "log";
type OnlineAgentLog = { id: string; time: string; title: string; data?: unknown };
type OnlineAgentLogContext = { model: string; running: boolean; confirmTools: boolean; messages: number; nodes: number; connections: number };
type OnlineLoopContext = { step: number };
type OnlineToolResult = { ok: true; message: string; data?: unknown } | { ok: false; message: string };
type OnlineExecutedToolCall = { toolCallId: string; name: string; result: OnlineToolResult };
type PendingOnlineToolContext = { messages: ResponseInputMessage[]; toolCalls: ResponseToolCall[]; assistantId: string; step: number };

type CanvasAssistantPanelProps = {
    nodes: CanvasNodeData[];
    selectedNodeIds: Set<string>;
    snapshot: CanvasAgentSnapshot;
    sessions: CanvasAssistantSession[];
    activeSessionId: string | null;
    onSelectNodeIds: (ids: Set<string>) => void;
    onSessionsChange: (sessions: CanvasAssistantSession[], activeSessionId: string | null) => void;
    onApplyOps: (ops?: CanvasAgentOp[]) => CanvasAgentSnapshot;
    canUndoOps: boolean;
    onUndoOps: () => CanvasAgentSnapshot | null;
    onPasteImage: (file: File) => void;
    agentMode: CanvasAgentMode;
    onAgentModeChange: (mode: CanvasAgentMode) => void;
    autoConnectLocal?: boolean;
    closing: boolean;
    onCollapse: () => void;
};

export function CanvasAssistantPanel({ nodes, selectedNodeIds, snapshot, sessions, activeSessionId, onSelectNodeIds, onSessionsChange, onApplyOps, canUndoOps, onUndoOps, onPasteImage, agentMode, onAgentModeChange, autoConnectLocal, closing, onCollapse }: CanvasAssistantPanelProps) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const user = useUserStore((state) => state.user);
    const effectiveConfig = useEffectiveConfig();
    const cleanupImages = useAssetStore((state) => state.cleanupImages);
    const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const confirmTools = useCanvasAgentStore((state) => state.confirmTools);
    const setAgentState = useCanvasAgentStore((state) => state.setAgentState);
    const [width, setWidth] = useState(520);
    const [view, setView] = useState<OnlineAgentTab>("chat");
    const [prompt, setPrompt] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [deleteChatIds, setDeleteChatIds] = useState<string[]>([]);
    const [onlineLogs, setOnlineLogs] = useState<OnlineAgentLog[]>([]);
    const [resizing, setResizing] = useState(false);
    const [removedReferenceIds, setRemovedReferenceIds] = useState<Set<string>>(new Set());
    const [localSessions, setLocalSessions] = useState<CanvasAssistantSession[]>(() => (sessions.length ? sessions : [createSession()]));
    const [localActiveSessionId, setLocalActiveSessionId] = useState<string | null>(activeSessionId);
    const snapshotRef = useRef(snapshot);
    const pendingToolContextRef = useRef(new Map<string, PendingOnlineToolContext>());
    const chatScrollRef = useRef<HTMLDivElement | null>(null);
    const chatEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!sessions.length) return;
        setLocalSessions(sessions);
        setLocalActiveSessionId(activeSessionId);
    }, [activeSessionId, sessions]);

    useEffect(() => {
        snapshotRef.current = snapshot;
    }, [snapshot]);

    const safeSessions = localSessions.length ? localSessions : [createSession()];
    const activeSession = useMemo(() => safeSessions.find((session) => session.id === localActiveSessionId) || safeSessions[0] || null, [localActiveSessionId, safeSessions]);
    const historySessions = safeSessions.filter((session) => session.messages.length > 0);
    const messages = activeSession?.messages || [];
    const hasMessages = messages.length > 0;
    const activeModel = effectiveConfig.textModel || effectiveConfig.model;
    const selectedNodeKey = useMemo(() => Array.from(selectedNodeIds).sort().join(","), [selectedNodeIds]);
    const allSelectedReferences = useMemo(() => buildAssistantReferences(nodes, selectedNodeIds), [nodes, selectedNodeIds]);
    const lastMessage = messages.at(-1);
    useEffect(() => {
        if (view !== "chat") return;
        const container = chatScrollRef.current;
        const anchor = chatEndRef.current;
        if (!container || !anchor) return;
        requestAnimationFrame(() => {
            anchor.scrollIntoView({ block: "end", behavior: container.scrollTop > 0 ? "smooth" : "auto" });
        });
    }, [view, localActiveSessionId, messages.length, lastMessage?.id, lastMessage?.text, isRunning]);

    useEffect(() => {
        onSessionsChange(localSessions, localActiveSessionId);
    }, [localActiveSessionId, localSessions, onSessionsChange]);

    const selectedReferences = useMemo(() => allSelectedReferences.filter((item) => !removedReferenceIds.has(item.id)), [allSelectedReferences, removedReferenceIds]);
    const iconButtonStyle = { color: theme.node.muted };

    useEffect(() => {
        setRemovedReferenceIds(new Set());
    }, [selectedNodeKey]);

    const updateSession = (sessionId: string, updater: (session: CanvasAssistantSession) => CanvasAssistantSession) => {
        setLocalSessions((prev) => prev.map((session) => (session.id === sessionId ? updater(session) : session)));
    };

    const appendMessage = (sessionId: string, message: CanvasAssistantMessage) => {
        updateSession(sessionId, (session) => ({
            ...session,
            title: session.messages.length ? session.title : message.text.slice(0, 18) || "新对话",
            messages: [...session.messages, message],
            updatedAt: new Date().toISOString(),
        }));
    };
    const addOnlineLog = (title: string, data?: unknown) => setOnlineLogs((prev) => [{ id: nanoid(), time: new Date().toLocaleTimeString(), title, data }, ...prev].slice(0, 80));

    const upsertMessage = (sessionId: string, message: CanvasAssistantMessage) => {
        updateSession(sessionId, (session) => {
            const exists = session.messages.some((item) => item.id === message.id);
            return {
                ...session,
                title: session.messages.length ? session.title : message.text.slice(0, 18) || "新对话",
                messages: exists ? session.messages.map((item) => (item.id === message.id ? { ...item, ...message } : item)) : [...session.messages, message],
                updatedAt: new Date().toISOString(),
            };
        });
    };

    const startChatSession = () => {
        if (activeSession && activeSession.messages.length === 0) {
            setLocalActiveSessionId(activeSession.id);
            return;
        }
        const session = createSession();
        setLocalSessions((prev) => [session, ...prev]);
        setLocalActiveSessionId(session.id);
    };

    const removeSessions = (ids: string[]) => {
        const next = safeSessions.filter((session) => !ids.includes(session.id));
        if (!next.length) {
            const session = createSession();
            setLocalSessions([session]);
            setLocalActiveSessionId(session.id);
        } else {
            setLocalSessions(next);
            setLocalActiveSessionId(localActiveSessionId && ids.includes(localActiveSessionId) ? next[0].id : localActiveSessionId);
        }
        cleanupImages({ sessions: next });
    };

    const clearSessions = () => {
        const session = createSession();
        setLocalSessions([session]);
        setLocalActiveSessionId(session.id);
        cleanupImages({ sessions: [session] });
    };

    const sendMessage = async (text: string, history: CanvasAssistantMessage[], savedReferences?: CanvasAssistantReference[]) => {
        const requestConfig = { ...effectiveConfig, model: effectiveConfig.textModel || effectiveConfig.model };
        if (!isAiConfigReady(requestConfig, requestConfig.model)) {
            openConfigDialog(true);
            return;
        }

        const session = activeSession || createSession();
        if (!activeSession) {
            setLocalSessions([session]);
            setLocalActiveSessionId(session.id);
        }

        const refs = savedReferences || selectedReferences;
        const userMessage: CanvasAssistantMessage = { id: nanoid(), role: "user", text, references: refs };
        const assistantId = nanoid();
        appendMessage(session.id, userMessage);
        addOnlineLog("发送请求", { text, selectedNodeIds: snapshotRef.current.selectedNodeIds, nodeCount: snapshotRef.current.nodes.length, connectionCount: snapshotRef.current.connections.length });
        setPrompt("");
        setIsRunning(true);
        void runOnlineAgentStep(session.id, assistantId, history, userMessage, { step: 1 });
    };

    const runOnlineAgentStep = async (sessionId: string, assistantId: string, history: CanvasAssistantMessage[], userMessage: CanvasAssistantMessage, loop: OnlineLoopContext) => {
        const requestConfig = { ...effectiveConfig, model: effectiveConfig.textModel || effectiveConfig.model };
        try {
            setIsRunning(true);
            const messages = await buildToolAgentMessages(snapshotRef.current, history, userMessage);
            const toolsForTurn = shouldExposeCanvasTools(userMessage.text) ? ONLINE_AGENT_TOOLS : [];
            addOnlineLog(`Agent Loop ${loop.step} 开始`, { toolChoice: toolsForTurn.length ? "auto" : "none", toolCount: toolsForTurn.length });
            let streamed = "";
            const result = await requestGeneratedToolResponse({ config: { ...requestConfig, systemPrompt: "" }, messages, tools: toolsForTurn, toolChoice: "auto", onDelta: (text) => {
                streamed = text;
                if (text.trim()) upsertMessage(sessionId, { id: assistantId, role: "assistant", text });
            } });
            addOnlineLog("模型工具回复", result);
            if (result.toolCalls.length) {
                const writableCalls = result.toolCalls.filter(isWritableToolCall);
                if (confirmTools && writableCalls.length) {
                    upsertMessage(sessionId, { id: assistantId, role: "assistant", text: result.content || streamed || "准备执行工具，等待确认。" });
                    const toolMessageId = nanoid();
                    pendingToolContextRef.current.set(toolMessageId, { messages, toolCalls: result.toolCalls, assistantId, step: loop.step });
                    const toolMessage: CanvasAssistantMessage = { id: toolMessageId, role: "tool", title: "确认工具调用", text: summarizeToolCalls(result.toolCalls), detail: { status: "pending", step: loop.step, toolCalls: result.toolCalls } };
                    appendMessage(sessionId, toolMessage);
                    addOnlineLog("等待用户确认", result.toolCalls);
                    return;
                }
                await continueOnlineToolLoop(sessionId, assistantId, messages, result, loop.step);
            } else {
                if (!result.content.trim()) throw new Error("模型没有返回内容，请换一种说法再试。");
                upsertMessage(sessionId, { id: assistantId, role: "assistant", text: result.content || streamed || "没有返回内容。" });
                addOnlineLog(`Agent Loop ${loop.step} 结束`, { reply: result.content });
            }
        } catch (error) {
            addOnlineLog("请求失败", error instanceof Error ? error.message : error);
            appendMessage(sessionId, { id: nanoid(), role: "error", title: "操作失败", text: error instanceof Error ? error.message : "操作失败" });
        } finally {
            setIsRunning(false);
        }
    };

    const continueOnlineToolLoop = async (sessionId: string, assistantId: string, messages: ResponseInputMessage[], result: { content: string; toolCalls: ResponseToolCall[] }, step: number) => {
        const toolResults = executeOnlineToolCalls(result.toolCalls);
        addOnlineLog("工具执行结果", toolResults);
        appendMessage(sessionId, {
            id: nanoid(),
            role: "tool",
            title: "工具自动执行完成",
            text: toolResults.map((item) => toolResultText(item.result)).join("\n"),
            detail: { status: "completed", step, toolCalls: result.toolCalls, results: toolResults },
        });
        await continueOnlineToolLoopAfterResults(sessionId, assistantId, messages, result.toolCalls, toolResults, step);
    };

    const continueOnlineToolLoopAfterResults = async (sessionId: string, assistantId: string, messages: ResponseInputMessage[], toolCalls: ResponseToolCall[], toolResults: OnlineExecutedToolCall[], step: number) => {
        const nextMessages: ResponseInputMessage[] = [
            ...messages,
            ...toolCalls.map(toolCallToResponseInput),
            ...toolResults.map((item) => ({ role: "tool" as const, tool_call_id: item.toolCallId, content: JSON.stringify(item.result) })),
        ];
        if (step >= ONLINE_AGENT_MAX_STEPS) {
            upsertMessage(sessionId, { id: assistantId, role: "assistant", text: toolResults.map((item) => toolResultText(item.result)).join("\n") || "工具已执行。" });
            addOnlineLog("Agent Tool Loop 达到步数上限", { maxSteps: ONLINE_AGENT_MAX_STEPS });
            return;
        }
        const requestConfig = { ...effectiveConfig, model: effectiveConfig.textModel || effectiveConfig.model };
        let streamed = "";
        const next = await requestGeneratedToolResponse({ config: { ...requestConfig, systemPrompt: "" }, messages: nextMessages, tools: ONLINE_AGENT_TOOLS, toolChoice: "auto", onDelta: (text) => {
            streamed = text;
            if (text.trim()) upsertMessage(sessionId, { id: assistantId, role: "assistant", text });
        } });
        addOnlineLog(`Agent Tool Loop ${step + 1} 回复`, next);
        if (next.toolCalls.length) {
            const writableCalls = next.toolCalls.filter(isWritableToolCall);
            if (confirmTools && writableCalls.length) {
                upsertMessage(sessionId, { id: assistantId, role: "assistant", text: next.content || streamed || "准备执行工具，等待确认。" });
                const toolMessageId = nanoid();
                pendingToolContextRef.current.set(toolMessageId, { messages: nextMessages, toolCalls: next.toolCalls, assistantId, step: step + 1 });
                appendMessage(sessionId, { id: toolMessageId, role: "tool", title: "确认工具调用", text: summarizeToolCalls(next.toolCalls), detail: { status: "pending", step: step + 1, toolCalls: next.toolCalls } });
                addOnlineLog("等待用户确认", next.toolCalls);
                return;
            }
            await continueOnlineToolLoop(sessionId, assistantId, nextMessages, next, step + 1);
            return;
        }
        upsertMessage(sessionId, { id: assistantId, role: "assistant", text: next.content || streamed || toolResults.map((item) => toolResultText(item.result)).join("\n") || "工具已执行。" });
    };

    const executeOps = (ops: CanvasAgentOp[]) => {
        const beforeSnapshot = snapshotRef.current;
        const before = snapshotSignature(beforeSnapshot);
        const next = onApplyOps(ops);
        snapshotRef.current = next;
        const ranGeneration = ops.some((op) => op.type === "run_generation" && Boolean(op.nodeId));
        const changed = before !== snapshotSignature(next) || ranGeneration;
        const noopReason = changed ? "" : explainNoop(ops, beforeSnapshot);
        return { changed, ops, ranGeneration, noopReason, before: JSON.parse(before), after: JSON.parse(snapshotSignature(next)) };
    };

    const executeOnlineTool = (name: string, args: Record<string, unknown>): OnlineToolResult => {
        const current = snapshotRef.current;
        try {
            if (name === "canvas_get_state") return { ok: true, message: describeCanvasSnapshot(current), data: compactSnapshot(current) };
            if (name === "canvas_export_snapshot") return { ok: true, message: describeCanvasSnapshot(current), data: compactSnapshot(current) };
            if (name === "canvas_get_selection") {
                const ids = new Set(current.selectedNodeIds || []);
                return { ok: true, message: `当前选中 ${ids.size} 个节点。`, data: { nodes: compactSnapshot({ ...current, nodes: current.nodes.filter((node) => ids.has(node.id)) }).nodes } };
            }
            if (name === "canvas_plan_workflow") {
                const plan = buildWorkflowPlan(args, current);
                return { ok: true, message: workflowPlanMessage(plan), data: plan };
            }
            const ops = onlineToolToOps(name, args, current, effectiveConfig);
            const result = executeOps(ops);
            return { ok: result.changed, message: result.changed ? summarizeCanvasAgentOps(ops) || "画布操作已执行。" : result.noopReason, data: result };
        } catch (error) {
            return { ok: false, message: error instanceof Error ? error.message : "工具执行失败" };
        }
    };

    const executeOnlineToolCall = (toolCall: ResponseToolCall): OnlineExecutedToolCall => {
        try {
            const result = executeOnlineTool(toolCall.function.name, parseToolArguments(toolCall.function.arguments));
            return { toolCallId: toolCall.id, name: toolCall.function.name, result };
        } catch (error) {
            return { toolCallId: toolCall.id, name: toolCall.function.name, result: { ok: false, message: error instanceof Error ? error.message : "工具参数错误" } };
        }
    };

    const executeOnlineToolCalls = (toolCalls: ResponseToolCall[]) => {
        const results: OnlineExecutedToolCall[] = [];
        let stopped = false;
        toolCalls.forEach((toolCall) => {
            if (stopped) {
                results.push({ toolCallId: toolCall.id, name: toolCall.function.name, result: { ok: false, message: "前一个工具调用失败，未继续执行。" } });
                return;
            }
            const result = executeOnlineToolCall(toolCall);
            results.push(result);
            if (!result.result.ok) stopped = true;
        });
        return results;
    };

    const approveOnlineTool = async (messageId: string) => {
        const message = safeSessions.flatMap((session) => session.messages).find((item) => item.id === messageId);
        const detail = objectDetail(message?.detail);
        const pendingContext = pendingToolContextRef.current.get(messageId);
        const toolCalls = pendingContext?.toolCalls || toolCallsFromDetail(detail);
        const previousMessages = pendingContext?.messages || [];
        const session = safeSessions.find((session) => session.messages.some((item) => item.id === messageId));
        addOnlineLog("批准工具", { messageId, toolCalls });
        const assistantId = pendingContext?.assistantId || "";
        if (!session) return;
        if (!toolCalls.length || !previousMessages.length || !assistantId) {
            upsertMessage(session.id, { id: messageId, role: "tool", title: "工具执行失败", text: "工具上下文不完整，无法执行。", detail: { ...detail, status: "failed" } });
            return;
        }
        try {
            setIsRunning(true);
            const results = executeOnlineToolCalls(toolCalls);
            addOnlineLog("工具执行结果", results);
            upsertMessage(session.id, { id: messageId, role: "tool", title: "工具执行完成", text: results.map((item) => toolResultText(item.result)).join("\n"), detail: { ...detail, results, status: "completed" } });
            pendingToolContextRef.current.delete(messageId);
            await continueOnlineToolLoopAfterResults(session.id, assistantId, previousMessages, toolCalls, results, pendingContext?.step || Number(detail.step) || 1);
        } catch (error) {
            addOnlineLog("工具续跑失败", error instanceof Error ? error.message : error);
            appendMessage(session.id, { id: nanoid(), role: "error", title: "操作失败", text: error instanceof Error ? error.message : "操作失败" });
        } finally {
            setIsRunning(false);
        }
    };

    const rejectOnlineTool = (messageId: string) => {
        const session = safeSessions.find((session) => session.messages.some((item) => item.id === messageId));
        addOnlineLog("拒绝工具", { messageId });
        pendingToolContextRef.current.delete(messageId);
        if (session) upsertMessage(session.id, { id: messageId, role: "tool", title: "已拒绝执行", text: "工具调用已取消", detail: { ...objectDetail(session.messages.find((item) => item.id === messageId)?.detail), status: "rejected" } });
    };

    const submit = async () => {
        const text = prompt.trim();
        if (!text || isRunning) return;
        await sendMessage(text, messages);
    };

    const addImagesToCanvas = (files: FileList | File[] | null) => {
        const file = Array.from(files || []).find((item) => item.type.startsWith("image/"));
        if (file) onPasteImage(file);
    };

    const startResize = () => {
        const move = (event: MouseEvent) => setWidth(Math.min(760, Math.max(320, window.innerWidth - event.clientX)));
        const stop = () => {
            setResizing(false);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", stop);
        };
        setResizing(true);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", stop);
    };

    const collapse = () => {
        onCollapse();
    };

    const onlineContent = (
        <>
            <AgentPanelTabs
                value={view}
                theme={theme}
                items={[
                    { value: "setup", label: "连接配置", icon: <Settings2 className="size-3.5" /> },
                    { value: "chat", label: "对话" },
                    { value: "history", label: "历史", icon: <History className="size-3.5" />, count: historySessions.length },
                    { value: "log", label: "日志", count: onlineLogs.length },
                ]}
                onChange={setView}
                right={
                    <>
                        {view === "history" ? (
                            <Tooltip title="删除全部">
                                <Button type="text" shape="circle" className="!h-8 !w-8 !min-w-8" style={iconButtonStyle} icon={<X className="size-4" />} disabled={!historySessions.length} onClick={() => setDeleteChatIds(historySessions.map((session) => session.id))} />
                            </Tooltip>
                        ) : null}
                        <Tooltip title="新对话">
                            <Button
                                type="text"
                                shape="circle"
                                className="!h-8 !w-8 !min-w-8"
                                style={iconButtonStyle}
                                icon={<Plus className="size-4" />}
                                disabled={!hasMessages}
                                onClick={() => {
                                    startChatSession();
                                    setView("chat");
                                }}
                            />
                        </Tooltip>
                        <Tooltip title="配置">
                            <Button type="text" shape="circle" className="!h-8 !w-8 !min-w-8" style={iconButtonStyle} icon={<Settings2 className="size-4" />} onClick={() => openConfigDialog(false)} />
                        </Tooltip>
                    </>
                }
            />

            {view === "setup" ? (
                <OnlineAgentSetupView theme={theme} activeModel={activeModel} onOpenConfig={() => openConfigDialog(true)} />
            ) : (
                <div ref={view === "chat" ? chatScrollRef : undefined} className="thin-scrollbar min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
                    {view === "history" ? (
                        <AssistantHistory
                            sessions={historySessions}
                            activeSession={activeSession}
                            onOpen={(id) => {
                                setLocalActiveSessionId(id);
                                setView("chat");
                            }}
                            onDelete={(id) => setDeleteChatIds([id])}
                        />
                    ) : view === "log" ? (
                        <OnlineAgentLogView logs={onlineLogs} theme={theme} context={{ model: activeModel, running: isRunning, confirmTools, messages: messages.length, nodes: snapshot.nodes.length, connections: snapshot.connections.length }} onClear={() => setOnlineLogs([])} />
                    ) : messages.length ? (
                        <>
                            {messages.map((message) => (
                                <div key={message.id} className="space-y-2">
                                    <AgentChatMessage item={assistantMessageToChatMessage(message)} theme={theme} user={user} onRejectTool={rejectOnlineTool} onApproveTool={approveOnlineTool} />
                                    {message.references?.length ? <MessageReferences message={message} /> : null}
                                </div>
                            ))}
                            {isRunning ? <AgentWorkingMessage theme={theme} /> : null}
                            <div ref={chatEndRef} className="h-px" />
                        </>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center px-1 text-center">
                            <div className="relative font-serif text-4xl font-bold italic tracking-normal" style={{ color: theme.node.text }}>
                                <span>Infinite Canvas</span>
                                <DiaTextReveal className="absolute inset-0" colors={["#A97CF8", "#F38CB8", "#FDCC92"]} textColor="transparent" duration={1.8} startOnView={false} text="Infinite Canvas" />
                            </div>
                            <div className="mt-3 font-serif text-base italic tracking-wide opacity-60">One canvas, infinite ideas</div>
                        </div>
                    )}
                </div>
            )}

            {view === "chat" ? (
                <>
                    {selectedReferences.length ? (
                        <div className="thin-scrollbar flex max-w-full gap-1.5 overflow-x-auto px-3 pb-1">
                            {selectedReferences.map((item, index) => (
                                <AssistantReferenceChip
                                    key={item.id}
                                    item={item}
                                    label={assistantImageReferenceLabel(selectedReferences, index)}
                                    onRemove={() => {
                                        setRemovedReferenceIds((prev) => new Set(prev).add(item.id));
                                        if (selectedNodeIds.has(item.id)) onSelectNodeIds(new Set(Array.from(selectedNodeIds).filter((nodeId) => nodeId !== item.id)));
                                    }}
                                />
                            ))}
                        </div>
                    ) : null}
                    <AgentChatComposer
                        prompt={prompt}
                        sending={isRunning}
                        placeholder="直接问我：看图、写提示词、拆分镜、规划 15 秒片段"
                        theme={theme}
                        onPromptChange={setPrompt}
                        onSubmit={submit}
                        onAddFiles={addImagesToCanvas}
                        left={
                            <>
                                <CanvasPromptLibrary onSelect={setPrompt} />
                                <AgentTextModelPicker config={effectiveConfig} value={effectiveConfig.textModel} onChange={(model) => updateConfig("textModel", model)} />
                            </>
                        }
                    />
                </>
            ) : null}

            <Modal
                title="删除对话记录？"
                open={deleteChatIds.length > 0}
                centered
                onCancel={() => setDeleteChatIds([])}
                footer={
                    <>
                        <Button onClick={() => setDeleteChatIds([])}>取消</Button>
                        <Button
                            danger
                            type="primary"
                            onClick={() => {
                                deleteChatIds.length === historySessions.length ? clearSessions() : removeSessions(deleteChatIds);
                                setDeleteChatIds([]);
                            }}
                        >
                            删除
                        </Button>
                    </>
                }
            >
                <p className="text-sm opacity-60">将删除 {deleteChatIds.length} 条对话记录，此操作不可撤销。</p>
            </Modal>
        </>
    );

    return (
        <motion.div
            className="flex shrink-0"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: closing ? 0 : width + 1, opacity: closing ? 0 : 1 }}
            transition={{ duration: resizing ? 0 : PANEL_MOTION_SECONDS, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "clip", pointerEvents: closing ? "none" : undefined }}
        >
            <motion.aside
                className="relative flex shrink-0 flex-col border-l"
                initial={{ x: 48 }}
                animate={{ x: closing ? 28 : 0 }}
                transition={{ duration: resizing ? 0 : PANEL_MOTION_SECONDS, ease: [0.22, 1, 0.36, 1] }}
                style={{ width, background: theme.node.panel, borderColor: theme.node.stroke, color: theme.node.text }}
            >
                <button type="button" className="absolute inset-y-0 left-0 z-40 w-4 -translate-x-1/2 cursor-col-resize" onMouseDown={startResize} aria-label="调整右侧面板宽度" />
                <header className="flex h-14 items-center justify-between border-b px-4" style={{ borderColor: theme.node.stroke }}>
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="grid size-8 place-items-center rounded-lg">
                            <Bot className="size-4" />
                        </span>
                        <div className="min-w-0">
                            <div className="text-base font-semibold leading-5">Agent</div>
                            <div className="truncate text-xs" style={{ color: theme.node.muted }}>
                                画布助手
                            </div>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <AgentModeSwitch value={agentMode} theme={theme} onChange={onAgentModeChange} />
                        <label className="flex items-center gap-1.5 text-xs" style={{ color: theme.node.muted }}>
                            <Switch size="small" checked={confirmTools} onChange={(confirmTools) => setAgentState({ confirmTools })} />
                            工具确认
                        </label>
                        <Tooltip title="收起对话">
                            <Button type="text" shape="circle" className="!h-8 !w-8 !min-w-8" style={iconButtonStyle} icon={<PanelRightClose className="size-4" />} onClick={collapse} />
                        </Tooltip>
                    </div>
                </header>
                {agentMode === "local" ? (
                    <CanvasLocalAgentPanel
                        embedded
                        snapshot={snapshot}
                        canUndoOps={canUndoOps}
                        onApplyOps={onApplyOps}
                        onUndoOps={onUndoOps}
                        autoConnect={autoConnectLocal}
                    />
                ) : (
                    onlineContent
                )}
            </motion.aside>
        </motion.div>
    );
}

function AgentTextModelPicker({ config, value, onChange }: { config: AiConfig; value: string; onChange: (model: string) => void }) {
    const options = useMemo(() => Array.from(new Set([value, ...selectableModelsByCapability(config, "text")].filter(Boolean))), [config, value]);
    const current = value || "";
    return (
        <Select value={current} onValueChange={onChange}>
            <SelectTrigger
                hideChevron
                className="h-7 min-w-0 max-w-[220px] gap-1.5 border-0 bg-transparent px-1 py-0 text-xs font-normal shadow-none hover:bg-transparent hover:opacity-75 focus-visible:border-transparent focus-visible:ring-0 data-[state=open]:ring-0 dark:bg-transparent dark:hover:bg-transparent"
                title={current ? `${modelOptionName(current)} · ${resolveModelChannel(config, current).name}` : "选择文本模型"}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
            >
                <AgentModelIcon model={current} />
                <span className="min-w-0 truncate">{current ? modelOptionName(current) : "选择文本模型"}</span>
                {current ? <span className="shrink-0 opacity-55">{resolveModelChannel(config, current).name}</span> : null}
            </SelectTrigger>
            <SelectContent data-canvas-no-zoom className="z-[1200] w-72 max-w-[calc(100vw-24px)]" position="popper" align="start" side="bottom" sideOffset={6} onPointerDown={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()}>
                {options.length ? (
                    options.map((model) => (
                        <SelectItem key={model} value={model} textValue={`${modelOptionName(model)} ${resolveModelChannel(config, model).name}`}>
                            <span className="flex min-w-0 items-center gap-2">
                                <AgentModelIcon model={model} />
                                <span className="min-w-0 flex-1 truncate">{modelOptionName(model)}</span>
                                <span className="shrink-0 text-xs opacity-55">{resolveModelChannel(config, model).name}</span>
                            </span>
                        </SelectItem>
                    ))
                ) : (
                    <SelectItem value="__empty_text_model__" disabled>
                        暂无文本模型
                    </SelectItem>
                )}
            </SelectContent>
        </Select>
    );
}

function AgentModelIcon({ model }: { model: string }) {
    const icon = resolveModelIcon(modelOptionName(model));
    return icon ? <img src={icon} alt="" className="size-4 shrink-0 dark:invert" /> : <Cpu className="size-4 shrink-0 opacity-70" />;
}

function resolveModelIcon(model: string) {
    const name = model.toLowerCase();
    if (name.includes("claude") || name.includes("anthropic")) return "/canvas/icons/claude.svg";
    if (name.includes("gemini") || name.includes("google")) return "/canvas/icons/gemini.svg";
    if (name.includes("gpt") || name.includes("openai")) return "/canvas/icons/openai.svg";
    if (name.includes("grok")) return "/canvas/icons/grok.svg";
    if (name.includes("deepseek")) return "/canvas/icons/deepseek.svg";
    if (name.includes("glm")) return "/canvas/icons/glm.svg";
    return "";
}

function AssistantHistory({
    sessions,
    activeSession,
    onOpen,
    onDelete,
}: {
    sessions: CanvasAssistantSession[];
    activeSession: CanvasAssistantSession | null;
    onOpen: (id: string) => void;
    onDelete: (id: string) => void;
}) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];

    return (
        <div className="space-y-3">
            <div className="text-sm" style={{ color: theme.node.muted }}>
                {sessions.length ? `${sessions.length} 条历史` : "暂无历史"}
            </div>
            {sessions.map((session) => (
                <div key={session.id} className="rounded-lg border px-2.5 py-1.5 transition" style={{ borderColor: session.id === activeSession?.id ? theme.node.text : theme.node.stroke, background: "transparent", color: theme.node.text }}>
                    <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-1.5">
                                {session.id === activeSession?.id ? <span className="shrink-0 text-[10px] font-medium" style={{ color: theme.node.text }}>当前</span> : null}
                                <div className="truncate text-sm font-medium leading-5">{session.title}</div>
                            </div>
                            <div className="truncate text-[11px] leading-4 opacity-65">{sessionPreview(session)}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            <span className="text-[10px] opacity-55">{formatSessionTime(session.updatedAt || session.createdAt)}</span>
                            <Button size="small" className="!h-6 !px-2" onClick={() => onOpen(session.id)}>
                                进入
                            </Button>
                            <Tooltip title="删除记录">
                                <Button size="small" danger type="text" className="!h-6 !w-6 !min-w-6" icon={<Trash2 className="size-3.5" />} onClick={() => onDelete(session.id)} />
                            </Tooltip>
                        </div>
                    </div>
                </div>
            ))}
            {!sessions.length ? (
                <div className="px-3 py-8 text-center text-sm" style={{ color: theme.node.muted }}>
                    网站 Agent 的对话记录会显示在这里
                </div>
            ) : null}
        </div>
    );
}

function OnlineAgentSetupView({ theme, activeModel, onOpenConfig }: { theme: (typeof canvasThemes)[keyof typeof canvasThemes]; activeModel: string; onOpenConfig: () => void }) {
    return (
        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
                <div>
                    <div className="text-base font-semibold leading-6">连接配置</div>
                    <div className="mt-1 text-xs leading-5" style={{ color: theme.node.muted }}>
                        网站 Agent 直接使用当前网页配置的文本模型和 API。
                    </div>
                </div>
                <div className="rounded-lg border p-3" style={{ borderColor: theme.node.stroke }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium leading-5">文本模型</div>
                            <div className="mt-1 truncate text-xs leading-5" style={{ color: theme.node.muted }}>
                                {activeModel || "未配置模型"}
                            </div>
                        </div>
                        <Button className="!h-8 !px-3" type="primary" icon={<Settings2 className="size-4" />} onClick={onOpenConfig}>
                            配置
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function OnlineAgentLogView({ logs, theme, context, onClear }: { logs: OnlineAgentLog[]; theme: (typeof canvasThemes)[keyof typeof canvasThemes]; context: OnlineAgentLogContext; onClear: () => void }) {
    const [mode, setMode] = useState<"text" | "json">("text");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const content = mode === "text" ? formatOnlineLogText(logs, context) : formatOnlineLogJson(logs, context);
    const lastError = [...logs].reverse().find((item) => /错误|失败|error/i.test(`${item.title}\n${stringifyLog(item.data)}`));
    const copy = async (value = content) => {
        if (await copyToClipboard(value)) return;
        textareaRef.current?.focus();
        textareaRef.current?.select();
    };
    return (
        <div className="flex min-h-full flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <Segmented size="small" value={mode} onChange={(value) => setMode(value as "text" | "json")} options={[{ label: "排查日志", value: "text" }, { label: "原始 JSON", value: "json" }]} />
                <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: theme.node.muted }}>{logs.length} 条</span>
                    <Button size="small" icon={<Copy className="size-3.5" />} disabled={!logs.length} onClick={() => void copy()}>复制</Button>
                    <Button size="small" disabled={!lastError} onClick={() => lastError && void copy(formatOnlineLogText([lastError], context))}>最近错误</Button>
                    <Button size="small" danger type="text" icon={<Trash2 className="size-3.5" />} disabled={!logs.length} onClick={onClear}>清空</Button>
                </div>
            </div>
            <textarea
                ref={textareaRef}
                readOnly
                value={content}
                className="thin-scrollbar min-h-[360px] flex-1 resize-none rounded-lg border bg-transparent p-3 font-mono text-xs leading-5 outline-none"
                style={{ borderColor: theme.node.stroke, color: theme.node.text }}
                onFocus={(event) => event.currentTarget.select()}
            />
        </div>
    );
}

function MessageReferences({ message }: { message: CanvasAssistantMessage }) {
    return (
        <div className={`flex max-w-[88%] flex-wrap gap-2 ${message.role === "user" ? "ml-auto justify-end" : "ml-11 justify-start"}`}>
            {message.references?.map((item, index, references) => (
                <AssistantReferenceChip key={item.id} item={item} label={assistantImageReferenceLabel(references, index)} />
            ))}
        </div>
    );
}

function AssistantReferenceChip({ item, label, onRemove }: { item: CanvasAssistantReference; label?: string; onRemove?: () => void }) {
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const text = (item.text || item.title).replace(/\s+/g, " ").trim().slice(0, 1) || "文";
    return (
        <div className="group/chip relative inline-flex h-8 max-w-[150px] shrink-0 items-center gap-1.5 rounded-lg text-sm" style={{ color: theme.node.text }}>
            {item.dataUrl ? (
                <span className="relative block size-8 shrink-0">
                    <img src={item.dataUrl} alt="" className="size-8 rounded-lg object-cover" />
                    {label ? <span className="absolute left-0.5 top-0.5 rounded bg-black/60 px-1 py-0.5 text-[8px] font-medium leading-none text-white">{label}</span> : null}
                </span>
            ) : (
                <span className="grid size-8 place-items-center rounded-lg border text-sm font-medium" style={{ background: theme.node.panel, borderColor: theme.node.activeStroke }}>
                    {text}
                </span>
            )}
            {onRemove ? (
                <button
                    type="button"
                    className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full border opacity-0 shadow-sm transition group-hover/chip:opacity-100"
                    style={{ background: theme.toolbar.panel, borderColor: theme.node.stroke }}
                    onClick={onRemove}
                    aria-label="移除引用"
                >
                    <X className="size-3" />
                </button>
            ) : null}
        </div>
    );
}

function assistantImageReferenceLabel(references: CanvasAssistantReference[], index: number) {
    if (!references[index]?.dataUrl) return undefined;
    const imageIndex = references.slice(0, index + 1).filter((item) => item.dataUrl).length - 1;
    return imageIndex >= 0 ? imageReferenceLabel(imageIndex) : undefined;
}

function assistantMessageToChatMessage(message: CanvasAssistantMessage): CanvasAgentChatMessage {
    return { id: message.id, role: message.role, title: message.title, text: message.text, meta: message.meta, detail: message.detail };
}

function formatSessionTime(value?: string) {
    return value ? new Date(value).toLocaleString() : "";
}

function sessionPreview(session: CanvasAssistantSession) {
    return session.messages.at(-1)?.text || `${session.messages.length} 条消息`;
}

function objectDetail(value: unknown) {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringifyLog(value: unknown) {
    return typeof value === "string" ? value : JSON.stringify(value, null, 2);
}

function formatOnlineLogText(logs: OnlineAgentLog[], context: OnlineAgentLogContext) {
    const head = [
        "Infinite Canvas 网站 Agent 诊断日志",
        `model: ${context.model || "none"}`,
        `running: ${context.running}`,
        `confirmTools: ${context.confirmTools}`,
        `messages: ${context.messages}`,
        `nodes: ${context.nodes}`,
        `connections: ${context.connections}`,
        `logs: ${logs.length}`,
    ].join("\n");
    const body = logs.map((log, index) => [`#${index + 1} ${log.time} ${log.title}`, log.data === undefined ? "" : stringifyLog(log.data)].filter(Boolean).join("\n")).join("\n\n---\n\n");
    return [head, body || "暂无事件日志"].join("\n\n");
}

function formatOnlineLogJson(logs: OnlineAgentLog[], context: OnlineAgentLogContext) {
    return JSON.stringify({ context, logs: logs.map(({ time, title, data }) => ({ time, title, data })) }, null, 2);
}

function describeCanvasSnapshot(snapshot: CanvasAgentSnapshot) {
    const counts = snapshot.nodes.reduce<Record<string, number>>((acc, node) => {
        acc[node.type] = (acc[node.type] || 0) + 1;
        return acc;
    }, {});
    return `当前画布有 ${snapshot.nodes.length} 个节点、${snapshot.connections.length} 条连线。文本 ${counts[CanvasNodeType.Text] || 0} 个，图片 ${counts[CanvasNodeType.Image] || 0} 个，生成配置 ${counts[CanvasNodeType.Config] || 0} 个，视频 ${counts[CanvasNodeType.Video] || 0} 个，音频 ${counts[CanvasNodeType.Audio] || 0} 个。`;
}

function parseToolArguments(value: string) {
    try {
        const parsed = JSON.parse(value || "{}");
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("工具参数必须是 JSON 对象");
        return parsed as Record<string, unknown>;
    } catch {
        throw new Error("工具参数不是合法 JSON 对象");
    }
}

function onlineToolToOps(name: string, input: Record<string, unknown>, snapshot: CanvasAgentSnapshot, config: AiConfig): CanvasAgentOp[] {
    if (name === "canvas_create_workflow_cards") return workflowCardOps(input, snapshot, config);
    if (name === "canvas_analyze_reference_image") return referenceAnalysisOps(input, snapshot);
    if (name === "canvas_apply_ops") return requireOps(input.ops);
    if (name === "canvas_create_node") {
        const nodeType = requireNodeType(input.nodeType);
        const x = numberOr(input.x, nextCanvasX(snapshot));
        const y = numberOr(input.y, 0);
        if (nodeType === CanvasNodeType.Config) return [configNodeOp(stringOptional(input.id) || `config-${nanoid()}`, { ...recordOptional(input.metadata), ...input }, x, y, config)];
        return [{ type: "add_node", nodeType, title: stringOptional(input.title), position: { x, y }, width: numberOptional(input.width), height: numberOptional(input.height), metadata: recordOptional(input.metadata) as CanvasNodeData["metadata"] }];
    }
    if (name === "canvas_create_text_node") return [textNodeOp(input, numberOr(input.x, nextCanvasX(snapshot)), numberOr(input.y, 0))];
    if (name === "canvas_create_text_nodes") {
        const items = requireRecordArray(input.items, "items");
        const x = numberOr(input.x, nextCanvasX(snapshot));
        const y = numberOr(input.y, 0);
        const gap = numberOr(input.gap, 40);
        const direction = input.direction === "row" ? "row" : "column";
        return items.map((item, index) => textNodeOp({ ...item, text: requireString(item.text, "text") }, numberOr(item.x, direction === "row" ? x + index * (NODE_DEFAULT_SIZE[CanvasNodeType.Text].width + gap) : x), numberOr(item.y, direction === "row" ? y : y + index * (NODE_DEFAULT_SIZE[CanvasNodeType.Text].height + gap))));
    }
    if (name === "canvas_create_image_prompt_flow") return generationFlowOps({ ...input, mode: "image" }, snapshot, config);
    if (name === "canvas_create_config_node") {
        const configId = `config-${nanoid()}`;
        const mode = generationMode(input.mode);
        return [configNodeOp(configId, input, numberOr(input.x, nextCanvasX(snapshot)), numberOr(input.y, 0), config), ...(input.autoRun ? [runGenerationOp(configId, mode, stringOptional(input.prompt))] : [])];
    }
    if (name === "canvas_create_generation_flow") return generationFlowOps(input, snapshot, config);
    if (name === "canvas_generate_text") return generationFlowOps({ ...input, mode: "text", autoRun: true }, snapshot, config);
    if (name === "canvas_generate_image") return generationFlowOps({ ...input, mode: "image", autoRun: true }, snapshot, config);
    if (name === "canvas_generate_video") return generationFlowOps({ ...input, mode: "video", autoRun: true }, snapshot, config);
    if (name === "canvas_generate_audio") return generationFlowOps({ ...input, mode: "audio", autoRun: true }, snapshot, config);
    if (name === "canvas_update_node") return [{ type: "update_node", id: requireString(input.id, "id"), patch: recordOptional(input.patch) as Partial<CanvasNodeData> | undefined, metadata: recordOptional(input.metadata) as CanvasNodeData["metadata"] }];
    if (name === "canvas_update_node_text") return [{ type: "update_node", id: requireString(input.id, "id"), patch: stringOptional(input.title) ? { title: stringOptional(input.title) } : undefined, metadata: { content: requireString(input.text, "text"), status: "success" } }];
    if (name === "canvas_move_nodes") {
        return requireRecordArray(input.items, "items").map((item) => {
            const id = requireString(item.id, "id");
            const current = snapshot.nodes.find((node) => node.id === id);
            return { type: "update_node", id, patch: { position: { x: numberOr(item.x, (current?.position.x || 0) + numberOr(item.dx, 0)), y: numberOr(item.y, (current?.position.y || 0) + numberOr(item.dy, 0)) } } };
        });
    }
    if (name === "canvas_resize_node") return [{ type: "update_node", id: requireString(input.id, "id"), patch: { width: requireNumber(input.width, "width"), height: requireNumber(input.height, "height") }, metadata: typeof input.freeResize === "boolean" ? { freeResize: input.freeResize } : undefined }];
    if (name === "canvas_delete_nodes") return [{ type: "delete_node", ids: requireStringArray(input.ids, "ids") }];
    if (name === "canvas_connect_nodes") return requireRecordArray(input.connections, "connections").map((connection) => ({ type: "connect_nodes", fromNodeId: requireString(connection.fromNodeId, "fromNodeId"), toNodeId: requireString(connection.toNodeId, "toNodeId") }));
    if (name === "canvas_select_nodes") return [{ type: "select_nodes", ids: requireStringArray(input.ids, "ids") }];
    if (name === "canvas_set_viewport") return [{ type: "set_viewport", viewport: requireViewport(input.viewport) }];
    if (name === "canvas_run_generation") return [runGenerationOp(requireString(input.nodeId, "nodeId"), generationMode(input.mode), stringOptional(input.prompt))];
    if (name === "canvas_run_pipeline") return [{ type: "run_pipeline", nodeIds: requireStringArray(input.nodeIds, "nodeIds"), resume: input.resume !== false }];
    if (name === "canvas_continue_video") return [{ type: "continue_video", nodeId: requireString(input.nodeId, "nodeId") }];
    throw new Error(`不支持的工具：${name}`);
}

function generationFlowOps(input: Record<string, unknown>, snapshot: CanvasAgentSnapshot, config: AiConfig): CanvasAgentOp[] {
    const mode = generationMode(input.mode);
    const prompt = requireString(input.prompt, "prompt");
    const x = numberOr(input.x, nextCanvasX(snapshot));
    const y = numberOr(input.y, 0);
    const textId = `text-${nanoid()}`;
    const configId = `config-${nanoid()}`;
    const referenceNodeIds = Array.isArray(input.referenceNodeIds) ? input.referenceNodeIds.filter((id): id is string => typeof id === "string") : [];
    const tokens = [`@[node:${textId}]`, ...referenceNodeIds.map((id) => `@[node:${id}]`)];
    return [
        textNodeOp({ id: textId, text: prompt, title: stringOptional(input.title) || "提示词" }, x, y),
        configNodeOp(configId, { ...input, prompt: tokens.join("\n") }, x + NODE_DEFAULT_SIZE[CanvasNodeType.Text].width + 80, y, config),
        { type: "connect_nodes", fromNodeId: textId, toNodeId: configId },
        ...referenceNodeIds.map((fromNodeId) => ({ type: "connect_nodes" as const, fromNodeId, toNodeId: configId })),
        { type: "select_nodes", ids: [configId] },
        ...(input.autoRun ? [runGenerationOp(configId, mode, tokens.join("\n"))] : []),
    ];
}

type VisualWorkflowIntent = "fragment-video" | "full-script" | "character" | "scene" | "storyboard" | "image-to-video" | "asset-analysis" | "general-visual";
type WorkflowStage = {
    key: string;
    title: string;
    type: CanvasNodeType;
    mode?: "text" | "image" | "video" | "audio";
    label: string;
    description: string;
    prompt: (brief: string) => string;
    assetCategory?: "character" | "character-turnaround" | "scene" | "style" | "storyboard" | "keyframe" | "video-shot" | "prompt" | "template" | "reference" | "general";
    assetSource?: "generate" | "user-asset" | "platform-rental" | "platform-preset" | "manual";
    assetReusable?: boolean;
    width?: number;
    height?: number;
    size?: string;
    quality?: string;
    count?: number;
    seconds?: string;
    vquality?: string;
};

const workflowPresets: Record<VisualWorkflowIntent, WorkflowStage[]> = {
    "fragment-video": [
        stage("brief", "片段策划", CanvasNodeType.Text, "text", "结构拆解", "把一句话或一段戏拆成可执行制作清单。", (brief) => `请把这个视频片段拆成视觉生产策划：${brief}\n\n输出：一句话概述、出场角色、场景地点、情绪节奏、关键动作、镜头数量建议、需要生成的资产清单。只输出可执行清单。`),
        stage("character-source", "角色来源决策", CanvasNodeType.Text, "text", "资产来源", "判断角色是新生成、调用用户资产，还是租赁平台角色。", (brief) => `请基于片段策划判断每个角色的来源策略：${brief}\n\n必须输出三种选择之一：1. 新生成角色；2. 使用用户已有资产；3. 租赁平台角色。每个角色给出选择理由、需要的参考图/三视图、授权风险、是否适合沉淀为长期角色资产。`, { assetCategory: "prompt", assetSource: "manual", assetReusable: true }),
        stage("character", "人物创建", CanvasNodeType.Image, "image", "角色设定", "先定脸、服装、发型、气质。", (brief) => `根据片段策划生成主要角色设定图。片段：${brief}\n\n要求：脸部特征清晰，服装结构明确，发型和配饰稳定，可作为后续三视图一致性参考。`, { size: "1024x1360", quality: "high", count: 2 }),
        stage("turnaround", "人物三视图", CanvasNodeType.Image, "image", "一致性锚点", "正面、侧面、背面同屏，降低角色漂移。", (brief) => `基于上游人物定稿图，生成同一角色三视图设定表。片段：${brief}\n\n要求：正面、侧面、背面全身站姿；同一服装、同一脸型、同一发型、同一配饰；白底或浅灰底；不要换人。`, { size: "1536x1024", quality: "high", count: 1 }),
        stage("scene", "场景设定", CanvasNodeType.Image, "image", "环境资产", "确定地点、天气、空间层次。", (brief) => `根据片段策划生成场景资产图。片段：${brief}\n\n要求：明确地点、时间、天气、空间层次，可复用于多个镜头；画面不要出现主要人物。`, { size: "1824x1024", quality: "high", count: 2 }),
        stage("style", "风格校准", CanvasNodeType.Text, "text", "风格资产", "统一画风、色调、构图和负面约束。", (brief) => `请基于片段策划、角色和场景资产输出风格校准规范：${brief}\n\n字段：整体画风、时代/类型、色调、光影、构图规则、镜头语言、角色一致性禁忌、场景一致性禁忌、通用正向提示词、通用负面提示词。`, { assetCategory: "style", assetSource: "manual", assetReusable: true }),
        stage("storyboard", "分镜表", CanvasNodeType.Text, "text", "镜头规划", "拆成镜头编号、景别、动作、台词、运动、秒数。", (brief) => `请根据片段策划、人物设定和场景资产，输出分镜表。片段：${brief}\n\n每个镜头包含：镜头编号、景别、画面描述、角色动作、台词/旁白、镜头运动、预计秒数、所需参考资产。控制在 6-10 个镜头。`),
        stage("keyframe", "镜头关键帧", CanvasNodeType.Image, "image", "关键帧", "生成适合转视频的单镜头画面。", (brief) => `基于上游分镜表、人物三视图和场景资产，生成一个镜头关键帧。片段：${brief}\n\n要求：角色一致、构图明确、动作准确、适合转视频；不要多余肢体、不要换服装、不要换脸。`, { size: "1824x1024", quality: "high", count: 1 }),
        stage("video", "镜头视频", CanvasNodeType.Video, "video", "图生视频", "把关键帧转成短视频。", (brief) => `基于上游镜头关键帧生成短视频。片段：${brief}\n\n要求：保持角色脸、服装、场景一致；动作自然，有镜头运动；不要大幅改变构图。`, { size: "16:9", seconds: "6", vquality: "720p" }),
        stage("asset-archive", "资产入库", CanvasNodeType.Text, "text", "资产回流", "把本次产物整理成可复用素材库清单。", (brief) => `请整理本次片段生产完成后需要入库的资产：${brief}\n\n按角色资产、三视图资产、场景资产、风格预设、分镜模板、关键帧、镜头视频分类输出。每项包含：资产名称、来源节点、建议标签、复用场景、授权状态、下次项目如何调用。`, { assetCategory: "template", assetSource: "manual", assetReusable: true }),
    ],
    "full-script": [
        stage("script", "剧本解析", CanvasNodeType.Text, "text", "结构拆解", "从外部剧本提取场次、角色、冲突和资产需求。", (brief) => `请解析这个外部剧本，不限制来源：${brief}\n\n输出：故事梗概、场次列表、主要角色、核心场景、视觉风格、资产清单、优先制作的片段。`),
        stage("characters", "角色表", CanvasNodeType.Text, "text", "角色资产规划", "列出角色和需要的设定图/三视图。", (brief) => `基于剧本解析输出角色资产表。剧本：${brief}\n\n字段：角色名、年龄气质、外貌、服装、道具、关系、需要的参考资产。`),
        stage("scenes", "场景表", CanvasNodeType.Text, "text", "场景资产规划", "列出可复用场景。", (brief) => `基于剧本解析输出场景资产表。剧本：${brief}\n\n字段：地点、时间、天气、空间层次、出现频次、所需画面资产。`),
        stage("storyboard", "重点片段分镜", CanvasNodeType.Text, "text", "镜头规划", "先拆最值得制作的一段。", (brief) => `从剧本中选择最适合先制作的 15-30 秒片段并输出分镜表。剧本：${brief}`),
        stage("keyframe", "重点片段关键帧", CanvasNodeType.Image, "image", "关键帧", "根据分镜和角色场景信息生成视频首帧。", (brief) => `根据剧本解析、角色表、场景表和重点片段分镜生成关键帧：${brief}\n\n要求：角色身份、服装、场景和构图稳定，画面适合继续生成视频。`, { size: "1824x1024", quality: "high", count: 1 }),
        stage("video", "重点片段视频", CanvasNodeType.Video, "video", "镜头成片", "将关键帧生成首段视频。", (brief) => `根据上游关键帧和分镜生成视频：${brief}\n\n保持角色、服装、场景和镜头方向一致，动作自然，不要突然切换身份。`, { size: "16:9", seconds: "6", vquality: "720p" }),
        stage("asset-archive", "资产入库", CanvasNodeType.Text, "text", "资产回流", "整理并沉淀本次剧本生产资产。", (brief) => `整理本次剧本生产可复用资产：${brief}\n\n按角色、场景、分镜模板、关键帧和镜头视频分类，补充标签、授权状态和复用建议。`, { assetCategory: "template", assetSource: "manual", assetReusable: true }),
    ],
    character: [
        stage("character-brief", "角色设定说明", CanvasNodeType.Text, "text", "角色说明", "整理角色文字设定。", (brief) => `整理角色设定：${brief}\n\n输出：外貌、发型、服装、配饰、气质、禁忌变化、提示词。`),
        stage("character-image", "角色定稿图", CanvasNodeType.Image, "image", "首张定稿", "生成角色定稿图。", (brief) => `生成角色定稿图：${brief}\n\n要求：脸部清晰、服装稳定、可作为后续一致性参考。`, { size: "1024x1360", quality: "high", count: 2 }),
        stage("turnaround", "角色三视图", CanvasNodeType.Image, "image", "一致性锚点", "正侧背三视图。", (brief) => `基于角色定稿图生成三视图：${brief}\n\n正面、侧面、背面全身站姿，同一服装、同一脸型、同一发型。`, { size: "1536x1024", quality: "high", count: 1 }),
    ],
    scene: [
        stage("scene-brief", "场景设定说明", CanvasNodeType.Text, "text", "环境说明", "整理地点、时间、天气、空间。", (brief) => `整理场景设定：${brief}\n\n输出：地点、时间、天气、空间层次、色调、镜头可用角度、提示词。`),
        stage("scene-image", "场景资产图", CanvasNodeType.Image, "image", "环境资产", "生成可复用场景图。", (brief) => `生成场景资产图：${brief}\n\n要求：不出现主要人物，空间清晰，可复用于多个镜头。`, { size: "1824x1024", quality: "high", count: 2 }),
    ],
    storyboard: [
        stage("storyboard", "分镜表", CanvasNodeType.Text, "text", "镜头规划", "把内容拆成镜头表。", (brief) => `请把内容拆成分镜表：${brief}\n\n字段：镜头编号、景别、画面描述、角色动作、台词/旁白、镜头运动、预计秒数、所需参考资产。`),
        stage("keyframe", "关键帧生成", CanvasNodeType.Image, "image", "关键帧", "为分镜生成关键画面。", (brief) => `基于上游分镜生成关键帧。内容：${brief}\n\n要求：构图明确、动作准确、适合转视频。`, { size: "1824x1024", quality: "high", count: 1 }),
        stage("video", "镜头视频", CanvasNodeType.Video, "video", "镜头成片", "根据关键帧生成视频。", (brief) => `基于上游分镜和关键帧生成视频：${brief}\n\n保持主体、场景、服装和镜头方向一致。`, { size: "16:9", seconds: "6", vquality: "720p" }),
        stage("asset-archive", "资产入库", CanvasNodeType.Text, "text", "资产回流", "沉淀分镜、关键帧和视频。", (brief) => `整理本次分镜生产中的可复用资产：${brief}`, { assetCategory: "template", assetSource: "manual", assetReusable: true }),
    ],
    "image-to-video": [
        stage("image-analysis", "参考图分析", CanvasNodeType.Text, "text", "图像理解", "先分析首帧/参考图。", (brief) => `分析选中参考图并整理图生视频要求。补充说明：${brief}\n\n输出：主体、场景、风格、可动区域、禁止改变项、推荐镜头运动。`),
        stage("motion", "运镜设计", CanvasNodeType.Text, "text", "运动规划", "设计镜头运动和动作。", (brief) => `基于参考图分析设计图生视频方案：${brief}\n\n输出：动作、镜头运动、时长、节奏、负面约束。`),
        stage("video", "视频生成", CanvasNodeType.Video, "video", "图生视频", "生成短视频节点。", (brief) => `基于上游参考图和运镜设计生成短视频：${brief}\n\n保持主体、服装、场景一致，不要改变身份和构图。`, { size: "16:9", seconds: "6", vquality: "720p" }),
    ],
    "asset-analysis": [
        stage("asset-analysis", "素材结构化分析", CanvasNodeType.Text, "text", "素材分析", "把素材转成可复用描述。", (brief) => `结构化分析素材：${brief}\n\n输出：主体、外貌/场景、风格、可复用提示词、可作为角色/场景/关键帧的建议、风险点。`),
    ],
    "general-visual": [
        stage("brief", "视觉需求拆解", CanvasNodeType.Text, "text", "需求分析", "先把需求拆成可生产任务。", (brief) => `把这个视觉生产需求拆成可执行计划：${brief}\n\n输出：目标、素材需求、推荐流程、下一步卡片。`),
        stage("image", "图片生成", CanvasNodeType.Image, "image", "视觉产出", "生成首张视觉稿。", (brief) => `基于视觉需求生成首张视觉稿：${brief}`, { size: "1024x1024", quality: "high", count: 1 }),
    ],
};

function stage(key: string, title: string, type: CanvasNodeType, mode: "text" | "image" | "video" | "audio", label: string, description: string, prompt: (brief: string) => string, options: Partial<WorkflowStage> = {}): WorkflowStage {
    return { key, title, type, mode, label, description, prompt: (brief) => enhanceWorkflowPrompt({ key, title, type, mode, label }, prompt(brief)), ...options };
}

function enhanceWorkflowPrompt(stage: Pick<WorkflowStage, "key" | "title" | "type" | "mode" | "label">, basePrompt: string) {
    const base = basePrompt.trim();
    if (stage.mode === "text") return enhanceTextWorkflowPrompt(stage.key, base);
    if (stage.mode === "image") return enhanceImageWorkflowPrompt(stage.key, base);
    if (stage.mode === "video") return enhanceVideoWorkflowPrompt(stage.key, base);
    return base;
}

function enhanceTextWorkflowPrompt(key: string, basePrompt: string) {
    const common = [
        "你是 SceneFlow 的专业视觉制片 Agent，请把用户需求拆成可执行生产资料，不要写空泛建议。",
        "必须优先保证：剧本解析准确、角色一致、场景可复用、分镜可拍、提示词可直接用于生成。",
    ];
    const formats: Record<string, string[]> = {
        brief: ["输出格式：一句话概述、核心冲突、情绪节奏、出场角色、场景地点、关键动作、镜头数量建议、资产清单、下一步建议。"],
        script: ["输出格式：故事梗概、人物关系、场次拆解、核心冲突、视觉风格、可复用资产清单、优先制作片段、风险点。"],
        characters: ["输出角色资产表：角色名、身份定位、外貌锚点、发型、服装、道具、性格气质、关系、三视图需求、一致性禁忌。"],
        "character-brief": ["输出角色设定卡：身份、年龄感、脸部锚点、发型、服装结构、配饰、气质、正向提示词、负面提示词、一致性禁忌。"],
        "character-source": ["每个角色必须在三类来源中选择：新生成、用户已有资产、平台租赁角色。补充选择理由、授权风险、是否值得沉淀为长期资产。"],
        scenes: ["输出场景资产表：地点、时间、天气、空间层次、主要视觉元素、出现频次、可复用镜头角度、所需素材。"],
        "scene-brief": ["输出场景设定卡：地点、时代/类型、天气、空间层次、色调、光影、可用镜头角度、正向提示词、负面提示词。"],
        style: ["输出风格圣经：整体画风、时代类型、色调、光影、构图规则、镜头语言、角色一致性禁忌、场景一致性禁忌、通用正向/负面提示词。"],
        storyboard: ["输出 Markdown 分镜表，列名固定为：镜头编号、景别、画面描述、角色动作、台词/旁白、镜头运动、预计秒数、所需参考资产、连续性备注。", "总时长优先控制在 15-30 秒；每个镜头必须能直接拆成关键帧和视频生成任务。"],
        "asset-archive": ["输出资产入库清单：资产名称、资产类型、来源节点、建议标签、授权状态、复用场景、下次项目调用方式。"],
        "asset-analysis": ["输出素材结构化分析：主体、外貌/场景、风格、可复用提示词、可作为角色/场景/关键帧的建议、风险点、禁止改变项。"],
        "image-analysis": ["输出首帧分析：主体、场景、风格、可动区域、不能改变的视觉锚点、推荐镜头运动、视频负面约束。"],
        motion: ["输出运镜方案：起始状态、结束状态、主体动作、镜头运动、节奏、时长、需要保持不变的元素、负面约束。"],
    };
    const specific = formats[key] || ["输出结构化结果，并明确下一步应该生成的卡片、素材或镜头。"];
    return [...common, "", basePrompt, "", ...specific].join("\n");
}

function enhanceImageWorkflowPrompt(key: string, basePrompt: string) {
    const common = [
        basePrompt,
        "",
        "画面生成要求：主体清晰，构图明确，材质和光影稳定，避免文字、水印、畸形肢体、脸部漂移、服装突变。",
        "如果上游提供角色、三视图、场景或风格参考，必须优先保持这些视觉锚点，不要自行换脸、换服装、换时代、换画风。",
    ];
    const specifics: Record<string, string[]> = {
        character: ["角色设定图重点：半身或全身清晰展示脸部、发型、服装结构、配饰和气质；背景保持简洁，方便后续三视图复用。"],
        "character-image": ["角色定稿图重点：脸部辨识度高，服装结构明确，造型不要过度复杂，方便后续保持一致。"],
        turnaround: ["三视图重点：同一角色正面、侧面、背面同屏，全身站姿，比例一致，白底或浅灰底，不要换人，不要换衣服。"],
        scene: ["场景资产重点：不要出现主要人物，空间层次清晰，能作为多个镜头的统一背景资产。"],
        "scene-image": ["场景资产重点：不要出现主要人物，保留可复用空间、天气、色调和镜头角度。"],
        keyframe: ["关键帧重点：只生成一个明确镜头画面，动作瞬间清楚，景别和机位稳定，适合图生视频。"],
        image: ["视觉稿重点：先产出一张可判断方向的高完成度主图。"],
    };
    return [...common, ...(specifics[key] || [])].join("\n");
}

function enhanceVideoWorkflowPrompt(key: string, basePrompt: string) {
    return [
        basePrompt,
        "",
        "视频生成要求：从参考图或上一镜头状态自然开始，保持角色脸、服装、场景、光线、构图方向一致。",
        "动作要有明确起承转合，镜头运动克制自然；不要突然切场、换脸、换衣服、改变时代风格、生成无意义慢动作。",
        key === "video" ? "如果这是连续镜头，必须把上一镜头尾帧当作第一帧状态，只推进动作和情绪，不重置画面。" : "",
    ]
        .filter(Boolean)
        .join("\n");
}

function buildWorkflowPlan(input: Record<string, unknown>, snapshot: CanvasAgentSnapshot) {
    const brief = requireString(input.brief, "brief");
    const intent = workflowIntent(input.intent, brief);
    const stages = workflowPresets[intent];
    const existingKinds = new Set(snapshot.nodes.map((node) => node.metadata?.pipelineKind).filter(Boolean));
    const missing = stages.filter((item) => !existingKinds.has(item.key)).map((item) => item.title);
    return {
        intent,
        outputGoal: stringOptional(input.outputGoal) || workflowGoal(intent),
        recommendedStages: stages.map((item) => ({ key: item.key, title: item.title, type: item.type, label: item.label })),
        missingStages: missing,
        nextStep: missing[0] ? `建议先创建「${missing[0]}」流程卡片。` : "当前流程卡片基本完整，可以选择具体节点确认提示词并生成。",
        shouldAutoRun: false,
        reason: "公测阶段默认先创建可确认流程卡片，避免误触发生成和浪费额度。",
        brief,
    };
}

function workflowPlanMessage(plan: ReturnType<typeof buildWorkflowPlan>) {
    return [`识别意图：${intentLabel(plan.intent)}`, `目标：${plan.outputGoal}`, `推荐流程：${plan.recommendedStages.map((item) => item.title).join(" -> ")}`, `缺失阶段：${plan.missingStages.length ? plan.missingStages.join("、") : "无"}`, plan.nextStep].join("\n");
}

function workflowCardOps(input: Record<string, unknown>, snapshot: CanvasAgentSnapshot, config: AiConfig): CanvasAgentOp[] {
    const brief = requireString(input.brief, "brief");
    const intent = workflowIntent(input.intent, brief);
    const stages = workflowPresets[intent];
    const x = numberOr(input.x, nextCanvasX(snapshot));
    const y = numberOr(input.y, 0);
    const sourceNodeId = stringOptional(input.sourceNodeId);
    const referenceNodeIds = Array.isArray(input.referenceNodeIds) ? input.referenceNodeIds.filter((id): id is string => typeof id === "string") : [];
    const nodeIds = stages.map((item) => `${item.key}-${nanoid(6)}`);
    const nodeIdByStageKey = new Map(stages.map((item, index) => [item.key, nodeIds[index]]));
    const ops: CanvasAgentOp[] = stages.map((item, index) => {
        const stageReferenceNodeIds = workflowStageReferenceKeys(intent, item.key)
            .map((key) => nodeIdByStageKey.get(key))
            .filter((id): id is string => Boolean(id));
        const externalReferenceNodeIds = workflowStageUsesExternalReferences(intent, item.key, index) ? [sourceNodeId, ...referenceNodeIds].filter((id): id is string => Boolean(id && snapshot.nodes.some((node) => node.id === id))) : [];
        const promptReferenceNodeIds = uniqueStrings([...externalReferenceNodeIds, ...stageReferenceNodeIds]);
        const prompt = withNodeReferenceTokens(item.prompt(brief), promptReferenceNodeIds);
        const metadata: CanvasNodeData["metadata"] = cleanRecord({
            content: "",
            prompt,
            composerContent: prompt,
            status: "idle",
            pipelineRunStatus: "waiting",
            generationMode: item.mode,
            pipelineKind: item.key,
            pipelineLabel: item.label,
            pipelineDescription: item.description,
            assetCategory: item.assetCategory || assetCategoryForPipeline(item.key, item.type),
            assetSource: item.assetSource || (item.type === CanvasNodeType.Image || item.type === CanvasNodeType.Video || item.type === CanvasNodeType.Audio ? "generate" : "manual"),
            assetReusable: item.assetReusable,
            assetLicense: item.assetSource === "platform-rental" ? "rented" : item.assetSource === "platform-preset" ? "platform" : "private",
            model: item.mode ? defaultGenerationModel(config, item.mode) : undefined,
            size: item.size || config.size,
            quality: item.quality || config.quality,
            count: item.count,
            seconds: item.seconds || config.videoSeconds,
            vquality: item.vquality || config.vquality,
            references: promptReferenceNodeIds.length ? promptReferenceNodeIds : undefined,
        }) as CanvasNodeData["metadata"];
        return {
            type: "add_node",
            id: nodeIds[index],
            nodeType: item.type,
            title: item.title,
            position: { x: x + index * 420, y: y + (index % 2) * 320 },
            width: item.width || NODE_DEFAULT_SIZE[item.type].width,
            height: item.height || NODE_DEFAULT_SIZE[item.type].height,
            metadata,
        };
    });
    const connectionOps: CanvasAgentOp[] = [];
    const pushConnection = (fromNodeId: string | undefined, toNodeId: string | undefined) => {
        if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return;
        if (connectionOps.some((op) => op.type === "connect_nodes" && op.fromNodeId === fromNodeId && op.toNodeId === toNodeId)) return;
        connectionOps.push({ type: "connect_nodes", fromNodeId, toNodeId });
    };
    if (sourceNodeId && snapshot.nodes.some((node) => node.id === sourceNodeId)) pushConnection(sourceNodeId, nodeIds[0]);
    referenceNodeIds.filter((id) => snapshot.nodes.some((node) => node.id === id)).forEach((id) => pushConnection(id, nodeIds[0]));
    nodeIds.slice(0, -1).forEach((fromNodeId, index) => pushConnection(fromNodeId, nodeIds[index + 1]));
    stages.forEach((item, index) => {
        workflowStageReferenceKeys(intent, item.key)
            .map((key) => nodeIdByStageKey.get(key))
            .forEach((fromNodeId) => pushConnection(fromNodeId, nodeIds[index]));
        if (workflowStageUsesExternalReferences(intent, item.key, index)) {
            if (sourceNodeId && snapshot.nodes.some((node) => node.id === sourceNodeId)) pushConnection(sourceNodeId, nodeIds[index]);
            referenceNodeIds.filter((id) => snapshot.nodes.some((node) => node.id === id)).forEach((id) => pushConnection(id, nodeIds[index]));
        }
    });
    return [...ops, ...connectionOps, { type: "select_nodes", ids: [nodeIds[0]] }];
}

function withNodeReferenceTokens(prompt: string, nodeIds: string[]) {
    if (!nodeIds.length) return prompt;
    return `${prompt.trim()}\n\n上游引用：\n${nodeIds.map((id) => `@[node:${id}]`).join("\n")}`;
}

function workflowStageReferenceKeys(intent: VisualWorkflowIntent, key: string) {
    const map: Partial<Record<VisualWorkflowIntent, Record<string, string[]>>> = {
        "fragment-video": {
            "character-source": ["brief"],
            character: ["brief", "character-source"],
            turnaround: ["character"],
            scene: ["brief"],
            style: ["brief", "character", "turnaround", "scene"],
            storyboard: ["brief", "character-source", "turnaround", "scene", "style"],
            keyframe: ["storyboard", "turnaround", "scene", "style"],
            video: ["keyframe", "turnaround", "scene", "style", "storyboard"],
            "asset-archive": ["brief", "character", "turnaround", "scene", "style", "storyboard", "keyframe", "video"],
        },
        "full-script": {
            characters: ["script"],
            scenes: ["script"],
            storyboard: ["script", "characters", "scenes"],
            keyframe: ["storyboard", "characters", "scenes"],
            video: ["keyframe", "storyboard", "characters", "scenes"],
            "asset-archive": ["script", "characters", "scenes", "storyboard", "keyframe", "video"],
        },
        character: {
            "character-image": ["character-brief"],
            turnaround: ["character-brief", "character-image"],
        },
        scene: {
            "scene-image": ["scene-brief"],
        },
        storyboard: {
            keyframe: ["storyboard"],
            video: ["storyboard", "keyframe"],
            "asset-archive": ["storyboard", "keyframe", "video"],
        },
        "image-to-video": {
            motion: ["image-analysis"],
            video: ["image-analysis", "motion"],
        },
        "general-visual": {
            image: ["brief"],
        },
    };
    return map[intent]?.[key] || [];
}

function workflowStageUsesExternalReferences(intent: VisualWorkflowIntent, key: string, index: number) {
    if (index === 0) return true;
    if (intent === "image-to-video" && key === "video") return true;
    return false;
}

function uniqueStrings(values: string[]) {
    return Array.from(new Set(values));
}

function referenceAnalysisOps(input: Record<string, unknown>, snapshot: CanvasAgentSnapshot): CanvasAgentOp[] {
    const nodeId = requireString(input.nodeId, "nodeId");
    const source = snapshot.nodes.find((node) => node.id === nodeId);
    if (!source) throw new Error("找不到要分析的参考图节点");
    const brief = stringOptional(input.brief);
    const analysisType = stringOptional(input.analysisType) || "auto";
    const x = numberOr(input.x, source.position.x + source.width + 96);
    const y = numberOr(input.y, source.position.y);
    const id = `analysis-${nanoid(6)}`;
    const text = [
        `参考图分析类型：${analysisType}`,
        brief ? `补充说明：${brief}` : "",
        "",
        "请基于连接的参考图输出结构化分析：",
        "1. 主体/角色/场景是什么",
        "2. 外貌、服装、发型、道具或环境元素",
        "3. 画风、色调、构图、镜头语言",
        "4. 可复用提示词",
        "5. 后续可创建的卡片：角色设定、三视图、场景设定、关键帧或图生视频",
        "6. 一致性风险和禁止改变项",
    ].filter(Boolean).join("\n");
    return [
        {
            type: "add_node",
            id,
            nodeType: CanvasNodeType.Text,
            title: "参考图分析",
            position: { x, y },
            width: 380,
            height: 260,
            metadata: { content: text, status: "success", fontSize: 14, pipelineKind: "asset-analysis", pipelineLabel: "素材分析", pipelineDescription: "把参考图转成可复用视觉设定。" },
        },
        { type: "connect_nodes", fromNodeId: nodeId, toNodeId: id },
        { type: "select_nodes", ids: [id] },
    ];
}

function assetCategoryForPipeline(key: string, type: CanvasNodeType): NonNullable<WorkflowStage["assetCategory"]> {
    if (key === "character" || key === "character-image") return "character";
    if (key === "turnaround") return "character-turnaround";
    if (key === "scene" || key === "scene-image") return "scene";
    if (key === "style") return "style";
    if (key === "storyboard") return "storyboard";
    if (key === "keyframe") return "keyframe";
    if (key === "video") return "video-shot";
    if (key === "asset-archive") return "template";
    if (type === CanvasNodeType.Text) return "prompt";
    if (type === CanvasNodeType.Image) return "reference";
    return "general";
}

function workflowIntent(value: unknown, brief: string): VisualWorkflowIntent {
    if (value === "fragment-video" || value === "full-script" || value === "character" || value === "scene" || value === "storyboard" || value === "image-to-video" || value === "asset-analysis" || value === "general-visual") return value;
    const text = brief.toLowerCase();
    if (/图生视频|首帧|尾帧|运镜|动起来|视频/.test(brief)) return "image-to-video";
    if (/完整剧本|剧本|长篇|全集|多场|分集/.test(brief) && brief.length > 80) return "full-script";
    if (/分镜|镜头|镜头表|storyboard/.test(text)) return "storyboard";
    if (/角色|人物|三视图|设定/.test(brief)) return "character";
    if (/场景|环境|地点|空间/.test(brief)) return "scene";
    if (/片段|一段|打斗|名场面|pk|PK|动作戏|短片/.test(brief)) return "fragment-video";
    if (/参考图|素材|图片|分析/.test(brief)) return "asset-analysis";
    return "general-visual";
}

function workflowGoal(intent: VisualWorkflowIntent) {
    if (intent === "fragment-video") return "制作一段可进入图生视频的短片流程";
    if (intent === "full-script") return "把外部剧本拆成可生产的角色、场景和分镜资产";
    if (intent === "character") return "建立稳定角色设定和三视图";
    if (intent === "scene") return "建立可复用场景资产";
    if (intent === "storyboard") return "输出可执行分镜表和关键帧流程";
    if (intent === "image-to-video") return "把参考图转成视频生成流程";
    if (intent === "asset-analysis") return "把素材转成结构化视觉设定";
    return "拆解视觉生产任务并创建下一步卡片";
}

function intentLabel(intent: VisualWorkflowIntent) {
    if (intent === "fragment-video") return "片段视频";
    if (intent === "full-script") return "完整剧本";
    if (intent === "character") return "角色创建";
    if (intent === "scene") return "场景创建";
    if (intent === "storyboard") return "分镜规划";
    if (intent === "image-to-video") return "图生视频";
    if (intent === "asset-analysis") return "素材分析";
    return "通用视觉生产";
}

function textNodeOp(input: Record<string, unknown>, x: number, y: number): CanvasAgentOp {
    return { type: "add_node", id: stringOptional(input.id), nodeType: CanvasNodeType.Text, title: stringOptional(input.title), position: { x, y }, width: numberOptional(input.width), height: numberOptional(input.height), metadata: { content: stringOptional(input.text), status: "success", fontSize: 14 } };
}

function configNodeOp(id: string, input: Record<string, unknown>, x: number, y: number, config: AiConfig): CanvasAgentOp {
    const mode = generationMode(input.mode);
    const prompt = stringOptional(input.prompt);
    return {
        type: "add_node",
        id,
        nodeType: CanvasNodeType.Config,
        title: stringOptional(input.title) || generationTitle(mode),
        position: { x, y },
        width: numberOptional(input.width),
        height: numberOptional(input.height),
        metadata: cleanRecord({
            generationMode: mode,
            composerContent: prompt,
            prompt,
            status: "idle",
            model: resolveGenerationModel(config, mode, stringOptional(input.model)),
            size: stringOptional(input.size) || config.size,
            quality: stringOptional(input.quality) || config.quality,
            count: numberOptional(input.count) ?? generationCount(mode === "image" ? config.canvasImageCount || config.count : config.count),
            seconds: stringOptional(input.seconds) || config.videoSeconds,
            vquality: stringOptional(input.vquality) || config.vquality,
            generateAudio: stringOptional(input.generateAudio) || config.videoGenerateAudio,
            watermark: stringOptional(input.watermark) || config.videoWatermark,
            audioVoice: stringOptional(input.audioVoice) || config.audioVoice,
            audioFormat: stringOptional(input.audioFormat) || config.audioFormat,
            audioSpeed: stringOptional(input.audioSpeed) || config.audioSpeed,
            audioInstructions: stringOptional(input.audioInstructions) || config.audioInstructions,
        }) as CanvasNodeData["metadata"],
    };
}

function runGenerationOp(nodeId: string, mode: "text" | "image" | "video" | "audio", prompt?: string): CanvasAgentOp {
    return { type: "run_generation", nodeId, mode, prompt };
}

function isWritableToolCall(call: ResponseToolCall) {
    return !ONLINE_READ_TOOLS.has(call.function.name);
}

function toolCallsFromDetail(detail: Record<string, unknown>): ResponseToolCall[] {
    return Array.isArray(detail.toolCalls) ? (detail.toolCalls.filter(isResponseToolCall) as ResponseToolCall[]) : [];
}

function isResponseToolCall(value: unknown): value is ResponseToolCall {
    const item = objectDetail(value);
    const fn = objectDetail(item.function);
    return typeof item.id === "string" && item.type === "function" && typeof fn.name === "string" && typeof fn.arguments === "string";
}

function toolCallToResponseInput(call: ResponseToolCall): ResponseInputMessage {
    return { type: "function_call", call_id: call.id, name: call.function.name, arguments: call.function.arguments, ...(call.thoughtSignature ? { thoughtSignature: call.thoughtSignature } : {}) };
}

function summarizeToolCalls(calls: ResponseToolCall[]) {
    return calls.map((call) => toolCallLabel(call.function.name)).join("，") || "工具调用";
}

function toolCallLabel(name: string) {
    if (name === "canvas_apply_ops") return "画布操作";
    if (name === "canvas_get_state") return "读取画布";
    if (name === "canvas_get_selection") return "读取选区";
    if (name === "canvas_export_snapshot") return "导出快照";
    if (name === "canvas_plan_workflow") return "规划流程";
    if (name === "canvas_create_workflow_cards") return "创建流程卡";
    if (name === "canvas_analyze_reference_image") return "分析参考图";
    if (name === "canvas_create_node") return "创建节点";
    if (name === "canvas_create_text_node") return "创建文本";
    if (name === "canvas_create_text_nodes") return "批量创建文本";
    if (name === "canvas_create_config_node") return "创建生成配置";
    if (name === "canvas_create_image_prompt_flow") return "创建生图流程";
    if (name === "canvas_create_generation_flow") return "创建生成流程";
    if (name === "canvas_generate_text") return "生成文本";
    if (name === "canvas_generate_image") return "生成图片";
    if (name === "canvas_generate_video") return "生成视频";
    if (name === "canvas_generate_audio") return "生成音频";
    if (name === "canvas_update_node") return "更新节点";
    if (name === "canvas_update_node_text") return "更新文本";
    if (name === "canvas_move_nodes") return "移动节点";
    if (name === "canvas_resize_node") return "调整节点尺寸";
    if (name === "canvas_delete_nodes") return "删除节点";
    if (name === "canvas_connect_nodes") return "连接节点";
    if (name === "canvas_select_nodes") return "选择节点";
    if (name === "canvas_set_viewport") return "调整视口";
    if (name === "canvas_run_generation") return "触发生成";
    if (name === "canvas_run_pipeline") return "执行创作流水线";
    if (name === "canvas_continue_video") return "创建连续镜头";
    return name;
}

function toolResultText(result: OnlineToolResult) {
    return result.message;
}

function requireStringArray(value: unknown, field: string): string[] {
    if (!Array.isArray(value)) throw new Error(`${field} 必须是字符串数组`);
    if (!value.every((item) => typeof item === "string" && Boolean(item))) throw new Error(`${field} 必须只包含非空字符串`);
    return value as string[];
}

function requireOps(value: unknown): CanvasAgentOp[] {
    if (!Array.isArray(value)) throw new Error("ops 必须是数组");
    return value.map(toCanvasAgentOp);
}

function toCanvasAgentOp(value: unknown): CanvasAgentOp {
    const item = objectDetail(value);
    const type = item.type;
    if (type === "add_node") {
        return {
            type,
            id: stringOptional(item.id),
            nodeType: item.nodeType ? requireNodeType(item.nodeType) : undefined,
            title: stringOptional(item.title),
            position: recordOptional(item.position) ? { x: requireNumber(objectDetail(item.position).x, "position.x"), y: requireNumber(objectDetail(item.position).y, "position.y") } : undefined,
            x: numberOptional(item.x),
            y: numberOptional(item.y),
            width: numberOptional(item.width),
            height: numberOptional(item.height),
            metadata: recordOptional(item.metadata) as CanvasNodeData["metadata"],
        };
    }
    if (type === "update_node") return { type, id: requireString(item.id, "id"), patch: recordOptional(item.patch) as Partial<CanvasNodeData> | undefined, metadata: recordOptional(item.metadata) as CanvasNodeData["metadata"] };
    if (type === "delete_node") return { type, id: stringOptional(item.id), ids: Array.isArray(item.ids) ? requireStringArray(item.ids, "ids") : undefined };
    if (type === "delete_connections") return { type, id: stringOptional(item.id), ids: Array.isArray(item.ids) ? requireStringArray(item.ids, "ids") : undefined, all: typeof item.all === "boolean" ? item.all : undefined };
    if (type === "connect_nodes") return { type, id: stringOptional(item.id), fromNodeId: requireString(item.fromNodeId, "fromNodeId"), toNodeId: requireString(item.toNodeId, "toNodeId") };
    if (type === "set_viewport") return { type, viewport: requireViewport(item.viewport) };
    if (type === "select_nodes") return { type, ids: requireStringArray(item.ids, "ids") };
    if (type === "run_generation") return { type, nodeId: requireString(item.nodeId, "nodeId"), mode: generationMode(item.mode), prompt: stringOptional(item.prompt) };
    throw new Error("不支持的画布操作类型");
}

function requireRecordArray(value: unknown, field: string): Record<string, unknown>[] {
    if (!Array.isArray(value)) throw new Error(`${field} 必须是数组`);
    return value.map((item) => {
        const record = objectDetail(item);
        if (!Object.keys(record).length) throw new Error(`${field} 必须只包含对象`);
        return record;
    });
}

function requireString(value: unknown, field: string) {
    if (typeof value !== "string" || !value) throw new Error(`${field} 必须是非空字符串`);
    return value;
}

function requireNumber(value: unknown, field: string) {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${field} 必须是数字`);
    return value;
}

function requireNodeType(value: unknown): CanvasNodeType {
    if (Object.values(CanvasNodeType).includes(value as CanvasNodeType)) return value as CanvasNodeType;
    throw new Error("节点类型必须是 text、image、config、video 或 audio");
}

function requireViewport(value: unknown) {
    const item = objectDetail(value);
    return { x: requireNumber(item.x, "viewport.x"), y: requireNumber(item.y, "viewport.y"), k: requireNumber(item.k, "viewport.k") };
}

function recordOptional(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function stringOptional(value: unknown) {
    return typeof value === "string" ? value : "";
}

function numberOptional(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function numberOr(value: unknown, fallback: number) {
    return numberOptional(value) ?? fallback;
}

function nextCanvasX(snapshot: CanvasAgentSnapshot) {
    return snapshot.nodes.length ? Math.max(...snapshot.nodes.map((node) => node.position.x + node.width)) + 80 : 0;
}

function generationMode(value: unknown): "text" | "image" | "video" | "audio" {
    return value === "text" || value === "video" || value === "audio" ? value : "image";
}

function generationTitle(mode: "text" | "image" | "video" | "audio") {
    if (mode === "text") return "文本生成";
    if (mode === "video") return "视频生成";
    if (mode === "audio") return "音频生成";
    return "图片生成";
}

function defaultGenerationModel(config: AiConfig, mode: "text" | "image" | "video" | "audio") {
    if (mode === "image") return config.imageModel || config.model;
    if (mode === "video") return config.videoModel || config.model;
    if (mode === "audio") return config.audioModel || config.model;
    return config.textModel || config.model;
}

function resolveGenerationModel(config: AiConfig, mode: "text" | "image" | "video" | "audio", model?: string) {
    const normalized = normalizeModelOptionValue(model, config.channels);
    return normalized && selectableModelsByCapability(config, mode).includes(normalized) ? normalized : defaultGenerationModel(config, mode);
}

function generationCount(value: string) {
    return Math.max(1, Math.min(15, Math.floor(Math.abs(Number(value)) || 1)));
}

function cleanRecord(value: Record<string, unknown>) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== ""));
}

function snapshotSignature(snapshot: CanvasAgentSnapshot) {
    return JSON.stringify({ nodes: snapshot.nodes, connections: snapshot.connections, selectedNodeIds: snapshot.selectedNodeIds, viewport: snapshot.viewport });
}

function explainNoop(ops: CanvasAgentOp[], snapshot: CanvasAgentSnapshot) {
    if (!ops.length) return "模型没有返回可执行的画布操作。";
    const nodeIds = new Set(snapshot.nodes.map((node) => node.id));
    const connectionIds = new Set(snapshot.connections.map((conn) => conn.id));
    const deleteConnectionOps = ops.filter((op): op is Extract<CanvasAgentOp, { type: "delete_connections" }> => op.type === "delete_connections");
    const connectOps = ops.filter((op): op is Extract<CanvasAgentOp, { type: "connect_nodes" }> => op.type === "connect_nodes");
    const deleteNodeOps = ops.filter((op): op is Extract<CanvasAgentOp, { type: "delete_node" }> => op.type === "delete_node");
    const updateOps = ops.filter((op): op is Extract<CanvasAgentOp, { type: "update_node" }> => op.type === "update_node");
    const selectOps = ops.filter((op): op is Extract<CanvasAgentOp, { type: "select_nodes" }> => op.type === "select_nodes");
    const generationOps = ops.filter((op): op is Extract<CanvasAgentOp, { type: "run_generation" }> => op.type === "run_generation");
    if (deleteConnectionOps.length && !snapshot.connections.length) return "画布当前没有连线可删除。";
    if (deleteConnectionOps.length && deleteConnectionOps.every((op) => !op.all && [...(op.ids || []), ...(op.id ? [op.id] : [])].every((id) => !connectionIds.has(id)))) return "没有找到要删除的连线。";
    if (connectOps.length && connectOps.every((op) => snapshot.connections.some((conn) => conn.fromNodeId === op.fromNodeId && conn.toNodeId === op.toNodeId))) return "这些节点已经存在对应连线，无需重复连接。";
    if (connectOps.length && connectOps.every((op) => !nodeIds.has(op.fromNodeId) || !nodeIds.has(op.toNodeId))) return "没有找到要连接的节点。";
    if (deleteNodeOps.length && deleteNodeOps.every((op) => op.nodeType === CanvasNodeType.Config) && !snapshot.nodes.some((node) => node.type === CanvasNodeType.Config)) return "画布当前没有生成配置节点可删除。";
    if (deleteNodeOps.length && deleteNodeOps.every((op) => [...(op.ids || []), ...(op.id ? [op.id] : [])].every((id) => !nodeIds.has(id)))) return "没有找到要删除的节点。";
    if (updateOps.length && updateOps.every((op) => !nodeIds.has(op.id))) return "没有找到要更新的节点。";
    if (selectOps.length && selectOps.every((op) => !(op.ids || []).some((id) => nodeIds.has(id)))) return "没有找到要选择的节点。";
    if (generationOps.length && generationOps.every((op) => !nodeIds.has(op.nodeId))) return "没有找到要触发生成的节点。";
    if (ops.every((op) => op.type === "set_viewport")) return "视图已经是目标状态。";
    if (selectOps.length && selectOps.every((op) => JSON.stringify(op.ids || []) === JSON.stringify(snapshot.selectedNodeIds))) return "选区已经是目标状态。";
    return "工具已执行，但画布状态没有变化；请在日志 tab 查看工具参数和执行前后状态。";
}

function nodeToReference(node: CanvasNodeData): CanvasAssistantReference | null {
    if (node.type === CanvasNodeType.Image && node.metadata?.content) {
        return { id: node.id, type: node.type, title: node.title, dataUrl: node.metadata.content, storageKey: node.metadata.storageKey };
    }
    if (node.type === CanvasNodeType.Text && node.metadata?.content) {
        return { id: node.id, type: node.type, title: node.title, text: node.metadata.content };
    }
    return null;
}

function buildAssistantReferences(nodes: CanvasNodeData[], selectedNodeIds: Set<string>) {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    return Array.from(selectedNodeIds)
        .map((id) => nodeById.get(id))
        .filter((node): node is CanvasNodeData => Boolean(node))
        .map(nodeToReference)
        .filter((item): item is CanvasAssistantReference => Boolean(item));
}

async function buildToolAgentMessages(snapshot: CanvasAgentSnapshot, history: CanvasAssistantMessage[], userMessage: CanvasAssistantMessage): Promise<ResponseInputMessage[]> {
    const refs = userMessage.references || [];
    const contextText = [
        `页面状态：当前在 SceneFlow 画布。节点 ${snapshot.nodes.length} 个，连线 ${snapshot.connections.length} 条，选中 ${snapshot.selectedNodeIds.length} 个节点。`,
        "如果只是聊天、咨询、写剧情或写提示词，请直接回答；只有需要操作画布时才调用工具读取完整画布。",
        `用户需求：${safeMessageText(userMessage.text)}`,
    ].join("\n");
    return [
        { role: "system", content: ONLINE_AGENT_PROMPT },
        ...history
            .filter((message): message is CanvasAssistantMessage & { role: "user" | "assistant" | "system" } => message.role === "user" || message.role === "assistant" || message.role === "system")
            .filter((message) => !isPollutedAgentMessage(message.text))
            .slice(-8)
            .map((message): ResponseInputMessage => ({ role: message.role, content: safeMessageText(message.text) })),
        {
            role: "user",
            content: [
                ...refs.flatMap((item) => (item.text ? [{ type: "text" as const, text: `选中节点 ${safeMessageText(item.title)}：${safeMessageText(item.text)}` }] : [])),
                { type: "text", text: contextText },
                ...(await Promise.all(refs.filter((item) => item.dataUrl).map(async (item) => ({ type: "image_url" as const, image_url: { url: await imageToDataUrl(item) } })))),
            ],
        },
    ];
}

function safeMessageText(value: unknown) {
    if (typeof value === "string") return value;
    if (value == null) return "";
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    try {
        return JSON.stringify(value);
    } catch {
        return "";
    }
}

function isPollutedAgentMessage(text: unknown) {
    if (typeof text !== "string") return false;
    return /\[object Object\]|页面交互传递过来的信息|数据传输的问题|误传输的格式/i.test(text);
}

function shouldExposeCanvasTools(text: unknown) {
    if (typeof text !== "string") return false;
    const value = text.trim();
    if (!value || !CANVAS_TOOL_INTENT_PATTERN.test(value)) return false;
    const actionHint = /(放到画布|落到画布|创建卡片|创建节点|读取画布|当前画布|操作画布|开始生成|立即生成|生成图片|生成视频|图生视频)/.test(value);
    const adviceOnlyHint = CHAT_ONLY_INTENT_PATTERN.test(value);
    return actionHint || !adviceOnlyHint;
}

function compactSnapshot(snapshot: CanvasAgentSnapshot) {
    return {
        title: snapshot.title,
        viewport: snapshot.viewport,
        selectedNodeIds: snapshot.selectedNodeIds,
        nodes: snapshot.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            title: node.title,
            position: node.position,
            width: node.width,
            height: node.height,
            metadata: compactMetadata(node.metadata || {}),
        })),
        connections: snapshot.connections,
    };
}

function compactMetadata(metadata: CanvasNodeData["metadata"]) {
    return {
        content: String(metadata?.content || "").slice(0, 500),
        prompt: String(metadata?.prompt || metadata?.composerContent || "").slice(0, 500),
        status: metadata?.status,
        generationMode: metadata?.generationMode,
        model: metadata?.model,
        size: metadata?.size,
    };
}

function createSession(): CanvasAssistantSession {
    const now = new Date().toISOString();
    return { id: nanoid(), title: "新对话", messages: [], createdAt: now, updatedAt: now };
}
