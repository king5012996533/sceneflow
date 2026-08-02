export type CanvasGenerationErrorView = {
    title: string;
    hint: string;
    requestId?: string;
};

export function summarizeCanvasGenerationError(message?: string | null): CanvasGenerationErrorView {
    const text = String(message || "").trim();
    const requestId = text.match(/request id:\s*([a-z0-9-]+)/i)?.[1];
    const lower = text.toLowerCase();

    if (!text) return { title: "生成失败", hint: "请调整提示词或参考素材后重试。" };

    if (isCorsError(lower)) {
        return {
            title: "模型接口被浏览器拦截",
            hint: "当前接口不允许前端直接调用。请走后端代理，或确认 Base URL 配置为平台代理地址。",
            requestId,
        };
    }

    if (isNetworkError(lower)) {
        return {
            title: "模型接口不可达",
            hint: "请求没有成功到达模型服务。请检查网络、服务商 Base URL、服务器代理和防火墙；如果只在生产环境出现，优先检查后端代理。",
            requestId,
        };
    }

    if (lower.includes("502") || lower.includes("bad gateway")) {
        return {
            title: "后端代理请求失败",
            hint: "服务器已收到请求，但上游模型接口返回异常。常见原因是 Base URL、模型调用格式、异步任务接口或服务商网络不匹配。",
            requestId,
        };
    }

    if (lower.includes("404") || lower.includes("not found")) {
        return {
            title: "接口路径不存在",
            hint: "请检查 Base URL 和调用格式。部分服务商不是 OpenAI 兼容接口，不能直接填 /v1 后按 OpenAI 格式调用。",
            requestId,
        };
    }

    if (lower.includes("content too large") || lower.includes("payload too large") || lower.includes("413") || text.includes("请求内容过大")) {
        return {
            title: "请求内容过大",
            hint: "参考素材过多或图片体积过大。请减少参考图，压缩素材，或先合成一张参考图再生成。",
            requestId,
        };
    }

    if (isSafetyError(text, lower)) {
        return {
            title: "参考素材未通过审核",
            hint: "上游模型可能判定参考图含真实人物或敏感内容。请换成虚拟角色、三视图设定稿，或降低照片真实感后重试。",
            requestId,
        };
    }

    if (isAuthError(text, lower)) {
        return {
            title: "模型鉴权失败",
            hint: "请检查 Base URL、API Key、模型名是否正确，并确认该模型已开通权限。",
            requestId,
        };
    }

    if (isQuotaError(text, lower)) {
        return {
            title: "额度或并发不足",
            hint: "请稍后重试，或联系管理员确认套餐、余额和并发任务限制。",
            requestId,
        };
    }

    if (lower.includes("timeout") || lower.includes("timed out") || text.includes("超时")) {
        return {
            title: "生成超时",
            hint: "上游任务响应较慢。视频任务可适当降低时长、分辨率或稍后重试。",
            requestId,
        };
    }

    if (lower.includes("model") || text.includes("模型")) {
        return {
            title: "模型配置异常",
            hint: "请检查后台模型标识、服务商配置和当前节点选择的模型。",
            requestId,
        };
    }

    return { title: "生成失败", hint: text.length > 56 ? `${text.slice(0, 56)}...` : text, requestId };
}

export function canvasGenerationErrorToast(message?: string | null) {
    const view = summarizeCanvasGenerationError(message);
    return view.requestId ? `${view.title}（${view.requestId}）` : view.title;
}

export function formatCanvasGenerationErrorDetails(error: unknown, fallback = "生成失败") {
    const raw = error instanceof Error ? error.message : typeof error === "string" ? error : fallback;
    const view = summarizeCanvasGenerationError(raw);
    const details = [`${view.title}：${view.hint}`];
    if (raw && raw !== view.title && raw !== view.hint) details.push(`原始错误：${raw}`);
    if (view.requestId) details.push(`Request ID：${view.requestId}`);
    return details.join("\n");
}

function isCorsError(lower: string) {
    return lower.includes("cors") || lower.includes("access-control-allow-origin") || lower.includes("preflight");
}

function isNetworkError(lower: string) {
    return lower.includes("failed to fetch") || lower.includes("fetch failed") || lower.includes("networkerror") || lower.includes("err_network") || lower.includes("err_failed") || lower.includes("network changed");
}

function isSafetyError(text: string, lower: string) {
    return lower.includes("real person") || lower.includes("content policy") || lower.includes("moderation") || lower.includes("safety") || text.includes("真实人物") || text.includes("安全策略拦截");
}

function isAuthError(text: string, lower: string) {
    return lower.includes("api key") || lower.includes("unauthorized") || lower.includes("forbidden") || lower.includes("401") || lower.includes("403") || text.includes("鉴权失败");
}

function isQuotaError(text: string, lower: string) {
    return lower.includes("quota") || lower.includes("insufficient") || lower.includes("payment") || lower.includes("rate limit") || lower.includes("429") || text.includes("额度") || text.includes("套餐") || text.includes("免费生成次数");
}
