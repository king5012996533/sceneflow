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
- 不要默认用户一定用火山官方直连。很多用户会用第三方中转、聚合网关或 OpenAI 兼容代理。
- 新手问“第一步怎么做”时，先告诉他有两种路线：
  1. 官方直连：去对应模型供应商控制台申请 API Key，例如火山方舟、OpenAI、Gemini 等。
  2. 第三方中转：去中转平台购买/开通额度，复制它提供的 Base URL、API Key、模型名。
- SceneFlow 配置本质只需要三件事：调用格式、Base URL、API Key、模型名。OpenAI 兼容中转一般调用格式选 OpenAI。
- 第三方中转用户必须以中转平台提供的 Base URL 和模型名为准，不要套用火山官方 Base URL。
- 官方火山方舟 Seedance 2.0 示例：调用格式选 OpenAI，Base URL 填 https://ark.cn-beijing.volces.com/api/v3，视频模型填用户已开通的 Seedance 模型名，例如 doubao-seedance-2-0-260128 或用户控制台显示的模型名。
- 火山官方 Seedance 的 API Key 必须是火山方舟 API Key，不是火山引擎 AK/SK，不要带 Bearer。SceneFlow 会自动拼 Authorization: Bearer。
- 报 The API key format is incorrect：通常是复制了错误 Key、短摘要、AK/SK、带了 Bearer，或 Key 不完整。
- 第三方中转报 Key 格式错误：通常要检查是否填了中转平台 Key，而不是官方 Key；不同平台 Key 格式不一样。
- 401/403：通常是 API Key、模型权限、账号服务开通、余额、套餐或中转平台额度问题。
- 404：通常是 Base URL 路径错误、模型名错误，或用户把官方模型名填到了不支持该模型的中转平台。
- Gemini 调用格式用于 Gemini，不适合 Seedance。

回答规则：
- 直接解决问题，不讲空话。
- 如果用户贴了报错，先判断最可能原因，再给 1-4 步操作。
- 如果用户没有说明供应商，先问“你是官方直连还是第三方中转？”同时给通用配置步骤。
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
        const preset = presetAnswer(lastUser);
        if (preset) return Response.json({ answer: preset });

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

function presetAnswer(question: string) {
    if (!/(新手|第一步|刚开始|怎么开始|如何开始|从哪开始)/.test(question)) return "";
    return `第一步先确认你准备用哪种 API 路线：

1. 官方直连
去模型供应商控制台申请 API Key，例如火山方舟、OpenAI、Gemini 等。

2. 第三方中转
去中转平台开通额度，复制它提供的 Base URL、API Key、模型名。

回到 SceneFlow 后，在“配置 API”里填写：
- 调用格式：大多数中转和火山方舟选 OpenAI
- Base URL：填供应商或中转平台给你的地址
- API Key：只填 Key 本体，不要加 Bearer
- 模型名：填平台提供的模型名

如果你要接 Seedance 2.0：
- 火山官方直连：Base URL 通常是 https://ark.cn-beijing.volces.com/api/v3
- 第三方中转：Base URL 和模型名必须用中转平台给你的，不要套火山官方地址。`;
}

async function readProviderError(response: Response) {
    const data = await response.json().catch(() => null);
    if (data?.error?.message) return data.error.message;
    if (data?.message) return data.message;
    return `体验官模型请求失败：${response.status}`;
}
