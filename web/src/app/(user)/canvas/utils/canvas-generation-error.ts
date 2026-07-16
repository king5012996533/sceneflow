export type CanvasGenerationErrorView = {
    title: string;
    hint: string;
    requestId?: string;
};

export function summarizeCanvasGenerationError(message?: string | null): CanvasGenerationErrorView {
    const text = String(message || "").trim();
    const requestId = text.match(/request id:\s*([a-z0-9]+)/i)?.[1];
    const lower = text.toLowerCase();

    if (!text) return { title: "生成失败", hint: "请调整提示词或参考素材后重试。" };
    if (lower.includes("请求内容过大") || lower.includes("content too large") || lower.includes("413")) {
        return { title: "请求内容过大", hint: "参考素材过多或图片体积过大，请减少参考图，或先合成一张容器图再生成。", requestId };
    }
    if (lower.includes("real person") || text.includes("真实人物") || text.includes("安全策略拦截") || lower.includes("content policy") || lower.includes("moderation") || lower.includes("safety")) {
        return { title: "参考素材未通过审核", hint: "上游模型可能判定参考图含真实人物或敏感内容，请换成虚拟角色、三视图设定稿，或降低照片真实感后重试。", requestId };
    }
    if (text.includes("API Key") || lower.includes("api key") || lower.includes("401") || lower.includes("403") || text.includes("鉴权失败")) {
        return { title: "模型鉴权失败", hint: "请检查 Base URL、API Key、模型名是否正确，并确认该模型已开通权限。", requestId };
    }
    if (text.includes("额度") || text.includes("套餐") || text.includes("免费生成次数") || lower.includes("quota") || lower.includes("insufficient") || lower.includes("payment") || lower.includes("429")) {
        return { title: "额度或并发不足", hint: "请稍后重试，或联系管理员确认套餐、余额、并发任务限制。", requestId };
    }
    if (text.includes("超时") || lower.includes("timeout") || lower.includes("timed out")) {
        return { title: "生成超时", hint: "上游任务响应较慢，请稍后重试；视频任务可适当降低时长或分辨率。", requestId };
    }
    if (text.includes("模型") || lower.includes("model")) {
        return { title: "模型配置异常", hint: "请检查后台模型标识、供应商配置和当前节点选择的模型。", requestId };
    }

    return { title: "生成失败", hint: text.length > 42 ? `${text.slice(0, 42)}...` : text, requestId };
}

export function canvasGenerationErrorToast(message?: string | null) {
    const view = summarizeCanvasGenerationError(message);
    return view.requestId ? `${view.title}（${view.requestId}）` : view.title;
}
