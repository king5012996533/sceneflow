import { buildAgentLabMessages, fallbackAgentLabAnswer } from "@/lib/agent-lab/skills";
import { splitAgentLabArtifact } from "@/lib/agent-lab/parser";
import { requireCurrentUser } from "@/lib/current-user";
import { assertAllowedProxyUrl, fetchSafely } from "@/lib/url-safety";
import type { AgentLabRequest, AgentLabResponse } from "@/lib/agent-lab/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TRUSTED_PROVIDER_HOSTS = new Set(["api.deepseek.com", "api.openai.com", "api.anthropic.com"]);

export async function POST(request: Request) {
    try {
        // 防止未登录用户无限调用消耗服务器 API Key
        const user = await requireCurrentUser(request);
        if (!user) return Response.json({ error: "请先登录" }, { status: 401 });

        const body = (await request.json()) as AgentLabRequest;
        const messages = (body.messages || []).filter((message) => (message.role === "user" || message.role === "assistant") && message.content?.trim()).slice(-12);
        const lastUser = [...messages]
            .reverse()
            .find((message) => message.role === "user")
            ?.content.trim();
        if (!lastUser) return Response.json({ error: "请输入你的创作需求。" }, { status: 400 });

        const provider = await resolveProvider(body);
        if (!provider.apiKey) {
            const fallback = fallbackAgentLabAnswer(lastUser);
            return Response.json({ ...fallback, model: "fallback-local" } satisfies AgentLabResponse);
        }

        const response = await fetchSafely(`${provider.baseUrl}/chat/completions`, {
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
        if (error instanceof Error && (error.message.includes("不允许") || error.message.includes("非法") || error.message.includes("解析失败"))) {
            return Response.json({ error: error.message }, { status: 400 });
        }
        return Response.json({ error: error instanceof Error ? error.message : "Agent Lab 请求失败。" }, { status: 500 });
    }
}

async function resolveProvider(body: AgentLabRequest) {
    const rawBaseUrl = (body.provider?.baseUrl || process.env.AGENT_LAB_BASE_URL || process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").trim().replace(/\/+$/, "");

    // SSRF 防护：拒绝内网/本机/保留地址
    const target = await assertAllowedProxyUrl(rawBaseUrl);
    const baseUrl = target.origin;

    const isTrustedHost = TRUSTED_PROVIDER_HOSTS.has(target.hostname.toLowerCase());
    const userProvidedKey = (body.provider?.apiKey || "").trim();

    // 服务器 API Key 只在「可信提供商 + 用户未自带 key」时才使用，
    // 防止把服务器 key 发送到任意攻击者控制的地址。
    let apiKey = userProvidedKey;
    if (!apiKey) {
        if (isTrustedHost) apiKey = (process.env.AGENT_LAB_API_KEY || process.env.DEEPSEEK_API_KEY || "").trim();
        else if (!body.provider?.baseUrl) apiKey = (process.env.AGENT_LAB_API_KEY || process.env.DEEPSEEK_API_KEY || "").trim();
    }

    return {
        baseUrl,
        apiKey,
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
