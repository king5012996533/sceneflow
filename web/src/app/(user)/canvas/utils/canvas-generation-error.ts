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

    // 生成途中连接被掐断（代理收到 socket hang up / ECONNRESET 等，或服务端显式标记）。
    // 必须放在 isNetworkError 之前：错误文案里含 fetch failed 等字样会被误归为「接口不可达」。
    if (text.includes("上游连接中断") || /socket hang up|econnreset|econnrefused|epipe/i.test(lower)) {
        return {
            title: "上游连接中断",
            hint: "生成过程中与模型服务的连接断开。任务可能仍在上游运行并已计费，请稍后到中转站后台确认任务状态；如已出图/出片，把上游任务 ID 反馈给我们以便找回结果。稍后可重试。",
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
            hint: "单张参考图或多张参考素材的总请求体过大。画布尺寸相同不代表文件体积相同，base64 编码还会放大体积；请压缩图片、减少参考素材，或改用公网素材 URL。",
            requestId,
        };
    }

    if (text.includes("接口没有返回图片")) {
        return {
            title: "接口未返回图片",
            hint: "上游已受理请求，但返回内容里没有可识别的图片数据（可能是中转站的非标准响应格式）。中转站可能已扣费，请把「原始错误」里的响应结构反馈给我们适配；也可先降低分辨率或更换模型重试。",
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
            hint: "请稍后重试，或检查积分余额是否充足（生成按次扣积分）。",
            requestId,
        };
    }

    if (lower.includes("timeout") || lower.includes("timed out") || text.includes("超时")) {
        return {
            title: "生成超时",
            hint: "上游任务响应较慢或仍在生成中。中转站可能已按任务计费，请到中转站后台确认任务状态；视频任务可降低时长、分辨率后重试。",
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
    return lower.includes("quota") || lower.includes("insufficient") || lower.includes("payment") || lower.includes("rate limit") || lower.includes("429") || text.includes("额度") || text.includes("积分余额不足") || text.includes("免费生成次数");
}
