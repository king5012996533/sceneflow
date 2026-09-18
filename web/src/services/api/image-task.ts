// image-task.ts —— 异步任务制图片通道的纯逻辑（apimart 等）
//
// 背景：apimart 的 /v1/images/generations 不是同步返回图片，而是「先收单、再取件」：
//   提交 → POST /v1/images/generations
//          {"code":200,"data":[{"status":"submitted","task_id":"task_01M2T0Y8VT2F42K6X83H0S05HB"}]}
//   取件 → GET /v1/tasks/{task_id}
//          {"code":200,"data":{"status":"completed","progress":100,"actual_time":11,
//           "result":{"images":[{"expires_at":1789813697,"url":["https://getapib.org/image/xxx.png"]}]}}}
//
// 两个坑都在这里收口：
//   1. 成功码不是 0 而是 200（HTTP 风格）。旧代码只认 code===0，会把成功应答判成失败，
//      表现是「秒报错、文案只有『请求失败』四个字、且日志里没有上游 4xx」。
//   2. 提交应答里根本没有图，只有 task_id，必须先轮询任务再取 URL。
//
// 本模块不依赖网络与业务库（可同时在浏览器与 Node 下跑），便于单测。

export type ImageTaskStatus = "pending" | "completed" | "failed";

export type ImageTaskState = {
    status: ImageTaskStatus;
    urls: string[];
    error: string;
};

/** 上游成功码：多数通道用 0（genvideo 系），有的直接用 HTTP 风格 2xx（apimart 返回 code:200）。 */
export function isSuccessCode(code: unknown): boolean {
    if (typeof code !== "number") return true; // 没有 code 字段 = 标准 OpenAI 响应
    return code === 0 || (code >= 200 && code < 300);
}

/** 从上游应答里取错误文案（各家中转站的字段名不统一）。 */
export function envelopeMessage(payload: unknown): string {
    if (!payload || typeof payload !== "object") return "";
    const record = payload as Record<string, unknown>;
    for (const value of [record.msg, record.message, record.error_message]) {
        if (typeof value === "string" && value.trim()) return value.trim();
    }
    const error = record.error;
    if (typeof error === "string" && error.trim()) return error.trim();
    if (error && typeof error === "object") {
        const nested = error as Record<string, unknown>;
        for (const value of [nested.message, nested.msg, nested.detail]) {
            if (typeof value === "string" && value.trim()) return value.trim();
        }
    }
    // 任务制通道还会把失败原因放在 data 里（见 parseImageTaskState）
    const data = Array.isArray(record.data) ? record.data[0] : record.data;
    if (data && typeof data === "object") {
        const inner = data as Record<string, unknown>;
        for (const value of [inner.error, inner.fail_reason, inner.failure_reason, inner.reason, inner.message, inner.msg]) {
            if (typeof value === "string" && value.trim()) return value.trim();
        }
    }
    return "";
}

/**
 * 任务制通道「提交」应答里的任务 ID：{"code":200,"data":[{"status":"submitted","task_id":"task_..."}]}。
 * 同步返回图片的通道（标准 OpenAI / 各家转写）没有 task_id，返回空串。
 */
export function pickSubmittedTaskId(payload: unknown): string {
    if (!payload || typeof payload !== "object") return "";
    const items = (payload as Record<string, unknown>).data;
    if (!Array.isArray(items)) return "";
    for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const record = item as Record<string, unknown>;
        for (const value of [record.task_id, record.taskId]) {
            if (typeof value === "string" && value.trim()) return value.trim();
        }
    }
    return "";
}

/** 收集任务结果里的图片地址（各家结构不一：result.images[].url 可能是字符串也可能是数组）。 */
function collectImageUrls(value: unknown, depth = 0): string[] {
    if (depth > 4) return [];
    if (typeof value === "string") {
        return /^https?:\/\//i.test(value) || /^data:image\//i.test(value) ? [value] : [];
    }
    if (Array.isArray(value)) return value.flatMap((item) => collectImageUrls(item, depth + 1));
    if (value && typeof value === "object") {
        return Object.values(value as Record<string, unknown>).flatMap((item) => collectImageUrls(item, depth + 1));
    }
    return [];
}

const COMPLETED_STATUSES = new Set(["completed", "complete", "succeeded", "success", "done", "finished"]);
const FAILED_STATUSES = new Set(["failed", "failure", "error", "cancelled", "canceled", "timeout", "timed_out", "rejected"]);

/** 任务查询应答 → 状态 + 图地址 + 失败原因。 */
export function parseImageTaskState(payload: unknown): ImageTaskState {
    const envelope = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
    const rawData = envelope.data;
    const data = (Array.isArray(rawData) ? rawData[0] : rawData) as Record<string, unknown> | undefined;
    if (!data || typeof data !== "object") {
        return { status: "failed", urls: [], error: envelopeMessage(payload) || "上游任务查询返回了无法识别的结构" };
    }

    const status = String(data.status ?? "")
        .trim()
        .toLowerCase();
    const urls = collectImageUrls(data.result ?? data.output ?? null);
    const error = envelopeMessage(payload);

    if (COMPLETED_STATUSES.has(status)) return { status: "completed", urls, error };
    if (FAILED_STATUSES.has(status)) return { status: "failed", urls, error };
    // 有的通道不回 status，只回结果：有图就算完成
    if (!status && urls.length) return { status: "completed", urls, error };
    return { status: "pending", urls, error };
}
