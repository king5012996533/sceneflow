export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExperienceMessage = {
    role: "user" | "assistant";
    content: string;
};

const SYSTEM_PROMPT = `你是 SceneFlow 体验官，负责用中文帮助用户解决 SceneFlow 的使用和 API 接入问题。

产品定位：
- SceneFlow 是视觉生产工作台，不只是漫剧工具。
- 核心流程是：API 接入 -> 画布 -> Agent 拆流程 -> 素材来源选择 -> 生成图片/视频/音频/文本 -> 素材库复用。
- 画布生产链路包括：片段策划、角色来源决策、人物创建、三视图、场景设定、风格校准、分镜表、关键帧、镜头视频、资产入库。

API 接入重点：
- OpenAI 兼容接口通常需要 Base URL、API Key、模型名。
- 火山方舟 Seedance 2.0：调用格式选 OpenAI，Base URL 填 https://ark.cn-beijing.volces.com/api/v3，视频模型填用户已开通的 Seedance 模型名，例如 doubao-seedance-2-0-260128 或用户控制台显示的模型名。
- Seedance 的 API Key 必须是火山方舟 API Key，不是火山引擎 AK/SK，不要带 Bearer。SceneFlow 会自动拼 Authorization: Bearer。
- 报 The API key format is incorrect：通常是复制了错误 Key、短摘要、AK/SK、带了 Bearer，或 Key 不完整。
- 401/403：通常是 API Key、模型权限、账号服务开通或余额问题。
- 404：通常是 Base URL 路径错误或模型名错误。
- Gemini 调用格式用于 Gemini，不适合 Seedance。

回答规则：
- 直接解决问题，不讲空话。
- 如果用户贴了报错，先判断最可能原因，再给 1-4 步操作。
- 不要编造官方链接或不存在的按钮。
- 对不确定的模型名，提醒用户以供应商控制台显示为准。
- 不要承诺你能替用户申请 API 或查看用户账号。
- 回复尽量短，必要时使用项目符号。`;

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as { messages?: ExperienceMessage[] };
        const messages = (body.messages || []).filter((item) => (item.role === "user" || item.role === "assistant") && item.content?.trim()).slice(-8);
        const lastUser = [...messages].reverse().find((item) => item.role === "user")?.content.trim();
        if (!lastUser) return Response.json({ error: "请输入问题" }, { status: 400 });

        const apiKey = process.env.DEEPSEEK_API_KEY || process.env.EXPERIENCE_AGENT_API_KEY;
        if (!apiKey) return Response.json({ error: "体验官暂未配置模型，请稍后再试" }, { status: 503 });

        const baseUrl = (process.env.DEEPSEEK_BASE_URL || process.env.EXPERIENCE_AGENT_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
        const model = process.env.DEEPSEEK_MODEL || process.env.EXPERIENCE_AGENT_MODEL || "deepseek-chat";
        const response = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model,
                temperature: 0.2,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    ...messages,
                ],
            }),
        });

        if (!response.ok) return Response.json({ error: await readProviderError(response) }, { status: response.status });
        const data = await response.json();
        const answer = data?.choices?.[0]?.message?.content;
        return Response.json({ answer: typeof answer === "string" && answer.trim() ? answer.trim() : "我没有拿到有效回复，请换个问法再试。" });
    } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "体验官请求失败" }, { status: 500 });
    }
}

async function readProviderError(response: Response) {
    const data = await response.json().catch(() => null);
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
    return `体验官模型请求失败：${response.status}`;
}
