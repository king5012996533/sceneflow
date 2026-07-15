import { buildAgentLabMessages, fallbackAgentLabAnswer } from "@/lib/agent-lab/skills";
import { splitAgentLabArtifact } from "@/lib/agent-lab/parser";
import type { AgentLabRequest, AgentLabResponse } from "@/lib/agent-lab/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as AgentLabRequest;
        const messages = (body.messages || []).filter((message) => (message.role === "user" || message.role === "assistant") && message.content?.trim()).slice(-12);
        const lastUser = [...messages]
            .reverse()
            .find((message) => message.role === "user")
            ?.content.trim();
        if (!lastUser) return Response.json({ error: "请输入你的创作需求。" }, { status: 400 });

        const provider = resolveProvider(body);
        if (!provider.apiKey) {
            const fallback = fallbackAgentLabAnswer(lastUser);
            return Response.json({ ...fallback, model: "fallback-local" } satisfies AgentLabResponse);
        }

        const response = await fetch(`${provider.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${provider.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: provider.model,
                temperature: 0.55,
                messages: buildAgentLabMessages(messages, {
                    personaPrompt: body.persona?.prompt,
                    memoryPrompt: buildMemoryPrompt(body),
                }),
            }),
        });

        if (!response.ok) return Response.json({ error: await readProviderError(response) }, { status: response.status });
        const data = await response.json();
        const raw = data?.choices?.[0]?.message?.content;
        if (typeof raw !== "string" || !raw.trim()) return Response.json({ error: "模型没有返回有效内容。" }, { status: 502 });

        const parsed = splitAgentLabArtifact(raw);
        return Response.json({ ...parsed, model: provider.model } satisfies AgentLabResponse);
    } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Agent Lab 请求失败。" }, { status: 500 });
    }
}

function resolveProvider(body: AgentLabRequest) {
    const baseUrl = (body.provider?.baseUrl || process.env.AGENT_LAB_BASE_URL || process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").trim().replace(/\/+$/, "");
    return {
        baseUrl,
        apiKey: (body.provider?.apiKey || process.env.AGENT_LAB_API_KEY || process.env.DEEPSEEK_API_KEY || "").trim(),
        model: (body.provider?.model || process.env.AGENT_LAB_MODEL || process.env.DEEPSEEK_MODEL || "deepseek-chat").trim(),
    };
}

async function readProviderError(response: Response) {
    const text = await response.text().catch(() => "");
    if (!text) return `模型请求失败：${response.status}`;
    try {
        const data = JSON.parse(text);
        return data?.error?.message || data?.message || text;
    } catch {
        return text;
    }
}

function buildMemoryPrompt(body: AgentLabRequest) {
    const memory = body.memory;
    if (!memory) return "";
    return [
        memory.projectBrief?.trim() ? `项目背景：${memory.projectBrief.trim()}` : "",
        memory.stylePreference?.trim() ? `风格偏好：${memory.stylePreference.trim()}` : "",
        memory.characterMemory?.trim() ? `角色/世界观记忆：${memory.characterMemory.trim()}` : "",
        memory.constraints?.trim() ? `固定约束：${memory.constraints.trim()}` : "",
    ]
        .filter(Boolean)
        .join("\n");
}
