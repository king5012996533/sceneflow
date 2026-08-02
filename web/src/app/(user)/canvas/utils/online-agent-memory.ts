import { type ResponseInputMessage } from "@/lib/generation/generation-request";
import { imageToDataUrl } from "@/services/image-storage";
import { CanvasNodeType, type CanvasAssistantMessage, type CanvasAssistantReference, type CanvasNodeData } from "../types";
import { type CanvasAgentSnapshot } from "./canvas-agent-ops";
import { ONLINE_AGENT_PROMPT } from "./online-agent-tools";

export function buildAssistantReferences(nodes: CanvasNodeData[], selectedNodeIds: Set<string>) {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    return Array.from(selectedNodeIds)
        .map((id) => nodeById.get(id))
        .filter((node): node is CanvasNodeData => Boolean(node))
        .map(nodeToReference)
        .filter((item): item is CanvasAssistantReference => Boolean(item));
}

export async function buildToolAgentMessages(snapshot: CanvasAgentSnapshot, history: CanvasAssistantMessage[], userMessage: CanvasAssistantMessage): Promise<ResponseInputMessage[]> {
    const refs = userMessage.references || [];
    const canvasMemory = buildCanvasAgentMemory(snapshot, refs, history);
    const contextText = [
        `页面状态：当前在 SceneFlow 画布。节点 ${snapshot.nodes.length} 个，连线 ${snapshot.connections.length} 条，选中 ${snapshot.selectedNodeIds.length} 个节点。`,
        canvasMemory,
        "你必须结合最近对话、当前选区、已有节点和工具执行结果理解用户需求；不要把当前消息当作孤立输入。",
        "如果只是聊天、咨询、写剧情或写提示词，请直接回答；只有需要操作画布时才调用工具读取完整画布。",
        `用户需求：${safeMessageText(userMessage.text)}`,
    ].filter(Boolean).join("\n\n");

    return [
        { role: "system", content: ONLINE_AGENT_PROMPT },
        ...history
            .filter((message): message is CanvasAssistantMessage & { role: "user" | "assistant" | "system" } => message.role === "user" || message.role === "assistant" || message.role === "system")
            .filter((message) => !isPollutedAgentMessage(message.text))
            .slice(-12)
            .map((message): ResponseInputMessage => ({ role: message.role, content: safeMessageText(message.text) })),
        {
            role: "user",
            content: [
                ...refs.flatMap((item) => {
                    const text = safeMessageText(item.text);
                    const label = `选中节点 ${safeMessageText(item.title)}(${item.type})`;
                    return text ? [{ type: "text" as const, text: `${label}：${truncateAgentText(text, 900)}` }] : [{ type: "text" as const, text: `${label}：已附加为图片引用。` }];
                }),
                { type: "text", text: contextText },
                ...(await Promise.all(refs.filter((item) => item.dataUrl).map(async (item) => ({ type: "image_url" as const, image_url: { url: await imageToDataUrl(item) } })))),
            ],
        },
    ];
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

function buildCanvasAgentMemory(snapshot: CanvasAgentSnapshot, refs: CanvasAssistantReference[], history: CanvasAssistantMessage[]) {
    const selectedIds = new Set(snapshot.selectedNodeIds);
    const selectedNodes = snapshot.nodes.filter((node) => selectedIds.has(node.id));
    const refIds = new Set(refs.map((item) => item.id));
    const recentNodes = snapshot.nodes
        .filter((node) => !selectedIds.has(node.id) && !refIds.has(node.id))
        .slice(-10);
    const connectionText = snapshot.connections
        .slice(-16)
        .map((connection) => `${connection.fromNodeId} -> ${connection.toNodeId}`)
        .join("\n");
    const toolText = history
        .filter((message) => message.role === "tool" || message.role === "error")
        .slice(-5)
        .map((message) => `${message.title || message.role}: ${truncateAgentText(message.text, 240)}`)
        .join("\n");
    const recentTalk = history
        .filter((message) => (message.role === "user" || message.role === "assistant") && !isPollutedAgentMessage(message.text))
        .slice(-6)
        .map((message) => `${message.role}: ${truncateAgentText(message.text, 220)}`)
        .join("\n");

    return [
        recentTalk ? `最近对话：\n${recentTalk}` : "",
        selectedNodes.length ? `当前选中节点：\n${selectedNodes.slice(0, 8).map(describeNodeForAgent).join("\n")}` : "",
        recentNodes.length ? `画布近期节点：\n${recentNodes.map(describeNodeForAgent).join("\n")}` : "",
        connectionText ? `现有连线：\n${connectionText}` : "",
        toolText ? `最近工具结果：\n${toolText}` : "",
    ].filter(Boolean).join("\n\n");
}

function describeNodeForAgent(node: CanvasNodeData) {
    const metadata = node.metadata || {};
    const prompt = truncateAgentText(metadata.prompt || metadata.composerContent || "", 180);
    const content = truncateAgentText(metadata.content || "", 220);
    const status = metadata.status ? ` status=${safeMessageText(metadata.status)}` : "";
    const mode = metadata.generationMode ? ` mode=${safeMessageText(metadata.generationMode)}` : "";
    const body = [prompt ? `prompt="${prompt}"` : "", content ? `content="${content}"` : ""].filter(Boolean).join(" ");
    return `- ${node.id} ${node.title || node.type} type=${node.type}${status}${mode}${body ? ` ${body}` : ""}`;
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

function truncateAgentText(value: unknown, limit: number) {
    const text = safeMessageText(value).replace(/\s+/g, " ").trim();
    if (text.length <= limit) return text;
    return `${text.slice(0, limit)}...`;
}

function isPollutedAgentMessage(text: unknown) {
    if (typeof text !== "string") return false;
    return /\[object Object\]|页面交互传递过来的信息|数据传输的问题|误传输的格式/i.test(text);
}
