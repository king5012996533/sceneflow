import axios from "axios";

import { buildApiUrl, inferProviderHint, modelOptionName, resolveModelRequestConfig, type AiConfig, type ModelChannel } from "@/stores/use-config-store";
import { nanoid } from "nanoid";
import { dataUrlToFile } from "@/lib/image-utils";
import { buildImageReferencePromptText } from "@/lib/image-reference-prompt";
import { imageToDataUrl } from "@/services/image-storage";
import type { ReferenceImage } from "@/types/image";
import { proxyFetch, proxyFetchStream } from "./proxy-client";
import { envelopeMessage, isSuccessCode, parseImageTaskState, pickSubmittedTaskId } from "./image-task";
import { isAspectRejection, parseSupportedRatios, pickSupportedRatio } from "./image-ratio";
import { buildReferenceGenerationBody, isEditsEndpointUnsupported, normalizeReferenceDataUrl } from "./image-reference";
import { archivedMediaUrls, startServerReplicateJob } from "@/lib/generation/server-replicate-client";

export type AiTextMessage = {
    role: "system" | "user" | "assistant";
    content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
};

export type ResponseToolCall = {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
    thoughtSignature?: string;
};

export type ResponseInputMessage =
    | AiTextMessage
    | { type: "function_call"; call_id: string; name: string; arguments: string; thoughtSignature?: string }
    | { role: "tool"; tool_call_id: string; content: string };

export type ResponseFunctionTool = {
    type: "function";
    function: {
        name: string;
        description?: string;
        parameters: Record<string, unknown>;
        strict?: boolean;
    };
};

export type ToolResponseResult = {
    content: string;
    toolCalls: ResponseToolCall[];
};

type ToolChoice = "auto" | "required" | { type: "function"; name: string };
type ResponseMessageContent = AiTextMessage["content"] | string;
type ResponseInputContent = { type: "input_text"; text: string } | { type: "input_image"; image_url: string };
type ResponseInputItem =
    | { role: "system" | "user" | "assistant"; content: string | ResponseInputContent[] }
    | { type: "function_call"; call_id: string; name: string; arguments: string }
    | { type: "function_call_output"; call_id: string; output: string };
type ResponseApiToolDefinition = {
    type: "function";
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
    strict?: boolean;
};
type ResponseApiOutputItem =
    | { type?: "message"; content?: Array<{ type?: string; text?: string }> }
    | { type?: "function_call"; id?: string; call_id?: string; name?: string; arguments?: string };
type ResponseApiPayload = {
    id?: string;
    output?: ResponseApiOutputItem[];
    output_text?: string;
    error?: { message?: string };
    code?: number;
    msg?: string;
};
type ResponseStreamState = { buffer: string; text: string; payload?: ResponseApiPayload; error?: string };

type ImageApiResponse = {
    data?: Array<Record<string, unknown>>;
    error?: { message?: string };
    code?: number;
    msg?: string;
};
type ReplicatePrediction = {
    id?: string;
    status?: "starting" | "processing" | "succeeded" | "failed" | "canceled";
    output?: unknown;
    error?: unknown;
    urls?: { get?: string };
};
type GeminiPart = {
    text?: string;
    inlineData?: { mimeType?: string; data?: string };
    inline_data?: { mime_type?: string; mimeType?: string; data?: string };
    fileData?: { mimeType?: string; fileUri?: string };
    functionCall?: { id?: string; name?: string; args?: Record<string, unknown> };
    functionResponse?: { id?: string; name?: string; response?: Record<string, unknown> };
    thoughtSignature?: string;
    thought_signature?: string;
};
type GeminiContent = { role?: "user" | "model"; parts: GeminiPart[] };
type GeminiPayload = {
    candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: string }>;
    models?: Array<{ name?: string }>;
    error?: { message?: string };
    promptFeedback?: { blockReason?: string };
};
type GeminiStreamState = { buffer: string; text: string; toolCalls: ResponseToolCall[]; error?: string };
type RequestOptions = { signal?: AbortSignal };

const QUALITY_BASE: Record<string, number> = {
    low: 1024,
    medium: 2048,
    high: 2880,
    standard: 1024,
    hd: 2048,
};
const QUALITY_ALIASES: Record<string, string> = {
    "1k": "low",
    "2k": "medium",
    "4k": "high",
};
const DEFAULT_IMAGE_SHORT_SIDE = 1024;
const IMAGE_SIZE_STEP = 16;
const IMAGE_MIN_PIXELS = 655360;
const IMAGE_MAX_PIXELS = 8294400;
const IMAGE_MAX_EDGE = 3840;
const IMAGE_MAX_RATIO = 3;
const IMAGE_OUTPUT_FORMAT = "png";

function normalizeQuality(quality: string) {
    const value = quality.trim().toLowerCase();
    const normalized = QUALITY_ALIASES[value] || value;
    return QUALITY_BASE[normalized] ? normalized : undefined;
}

/** Map "quality + ratio" to an explicit pixel dimension like "3840x2160". */
function resolveSize(quality: string | undefined, ratio: string): string {
    const parsedRatio = parseImageRatio(ratio);
    const basePixels = quality ? QUALITY_BASE[quality] : undefined;
    const isLandscape = parsedRatio.width >= parsedRatio.height;
    const longRatio = isLandscape ? parsedRatio.width / parsedRatio.height : parsedRatio.height / parsedRatio.width;
    let longSide: number;
    let shortSide: number;

    if (basePixels) {
        const targetPixels = basePixels * basePixels;
        const longSideRaw = Math.sqrt(targetPixels * longRatio);
        longSide = Math.floor(longSideRaw / IMAGE_SIZE_STEP) * IMAGE_SIZE_STEP;
        shortSide = Math.round(longSide / longRatio / IMAGE_SIZE_STEP) * IMAGE_SIZE_STEP;
    } else {
        shortSide = DEFAULT_IMAGE_SHORT_SIDE;
        longSide = Math.round((shortSide * longRatio) / IMAGE_SIZE_STEP) * IMAGE_SIZE_STEP;
    }

    const width = isLandscape ? longSide : shortSide;
    const height = isLandscape ? shortSide : longSide;
    validateImageSize(width, height);
    return `${width}x${height}`;
}

function parseImageRatio(value: string) {
    const parts = value.split(":");
    if (parts.length !== 2) throw new Error("图像尺寸格式不支持，请使用 auto、9:16 或 1024x1024");
    const w = Number(parts[0]);
    const h = Number(parts[1]);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) throw new Error("图像比例必须是正数，例如 9:16");
    if (Math.max(w, h) / Math.min(w, h) > IMAGE_MAX_RATIO) throw new Error("图像宽高比不能超过 3:1，请调整尺寸");
    return { width: w, height: h };
}

function parseImageDimensions(value: string) {
    const match = value.match(/^(\d+)x(\d+)$/i);
    if (!match) return null;
    return { width: Number(match[1]), height: Number(match[2]) };
}

function validateImageSize(width: number, height: number) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) throw new Error("图像尺寸必须是正整数，例如 1024x1024");
    if (width % IMAGE_SIZE_STEP !== 0 || height % IMAGE_SIZE_STEP !== 0) throw new Error("图像尺寸的宽高必须是 16 的倍数，请调整尺寸");
    if (Math.max(width, height) > IMAGE_MAX_EDGE) throw new Error("图像尺寸最长边不能超过 3840px，请调整尺寸");
    if (Math.max(width, height) / Math.min(width, height) > IMAGE_MAX_RATIO) throw new Error("图像宽高比不能超过 3:1，请调整尺寸");
    const pixels = width * height;
    if (pixels < IMAGE_MIN_PIXELS || pixels > IMAGE_MAX_PIXELS) throw new Error("图像总像素需在 655360 到 8294400 之间，请调整尺寸");
}

function resolveRequestSize(quality: string | undefined, size: string) {
    const value = size.trim();
    if (!value || value.toLowerCase() === "auto") return undefined;
    const dimensions = parseImageDimensions(value);
    if (dimensions) {
        validateImageSize(dimensions.width, dimensions.height);
        return `${dimensions.width}x${dimensions.height}`;
    }
    if (value.includes(":")) return resolveSize(quality, value);
    throw new Error("图像尺寸格式不支持，请使用 auto、9:16 或 1024x1024");
}

function resolveRequestAspect(size: string, requestSize?: string) {
    const value = size.trim();
    if (!value || value.toLowerCase() === "auto") return undefined;
    if (value.includes(":")) return value;
    const dimensions = parseImageDimensions(requestSize || value);
    if (!dimensions) return undefined;
    const divisor = gcd(dimensions.width, dimensions.height);
    return `${Math.round(dimensions.width / divisor)}:${Math.round(dimensions.height / divisor)}`;
}

function withImageSizeInstruction(prompt: string, size: string, requestSize?: string) {
    const aspect = resolveRequestAspect(size, requestSize);
    if (!aspect && !requestSize) return prompt;
    const parts = ["画幅必须严格遵守用户选择"];
    if (aspect) parts.push(`宽高比 ${aspect}`);
    if (requestSize) parts.push(`输出尺寸 ${requestSize}px`);
    return `${parts.join("，")}。不要改成竖图、横图或其他比例。\n\n${prompt}`;
}

function gcd(a: number, b: number): number {
    let x = Math.abs(Math.round(a));
    let y = Math.abs(Math.round(b));
    while (y) {
        const next = x % y;
        x = y;
        y = next;
    }
    return x || 1;
}

function resolveImageDataUrl(item: Record<string, unknown>): string | null {
    // 标准 OpenAI 字段（base64 或 URL），以及中转站常见的非标准字段名
    const b64 = pickString(item, ["b64_json", "b64", "base64", "b64_data", "image_b64"]);
    if (b64) return /^data:image\//i.test(b64) ? b64 : `data:image/png;base64,${b64}`;
    const url = pickString(item, ["url", "image_url", "img_url", "cdn_url"]);
    if (url) return url;
    const image = pickString(item, ["image", "output"]);
    if (image && (/^https?:\/\//i.test(image) || /^data:image\//i.test(image))) return image;
    // 嵌套结构：{url: {url: "..."}} / {image: {url: "..."}} / {output: [...]} 等
    for (const key of ["url", "image_url", "image", "output"]) {
        const nested = item[key];
        if (Array.isArray(nested)) {
            const value = resolveImageList(nested);
            if (value) return value;
        } else if (nested && typeof nested === "object") {
            const value = resolveImageDataUrl(nested as Record<string, unknown>);
            if (value) return value;
        }
    }
    return null;
}

function resolveImageList(items: unknown[]): string | null {
    for (const entry of items) {
        if (typeof entry === "string") {
            if (/^https?:\/\//i.test(entry) || /^data:image\//i.test(entry)) return entry;
        } else if (entry && typeof entry === "object" && !Array.isArray(entry)) {
            const value = resolveImageDataUrl(entry as Record<string, unknown>);
            if (value) return value;
        }
    }
    return null;
}

function pickString(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value) return value;
    }
    return "";
}

function parseImagePayload(payload: ImageApiResponse) {
    // 成功码统一判定：apimart 用 code:200 表示成功（旧代码只认 code===0，会把成功判成「请求失败」）
    if (!isSuccessCode(payload.code)) {
        throw new Error(envelopeMessage(payload) || payload.msg || "请求失败");
    }
    const candidates: unknown[] = [];
    if (Array.isArray(payload.data)) {
        candidates.push(...payload.data);
    } else if (typeof payload.data === "string") {
        candidates.push(payload.data);
    } else if (payload.data && typeof payload.data === "object") {
        // data 为对象：{images: [...]} / {items: [...]} / {list: [...]} 等
        const record = payload.data as Record<string, unknown>;
        for (const key of ["images", "items", "list", "data"]) {
            const value = record[key];
            if (Array.isArray(value)) candidates.push(...value);
        }
    }
    // 顶层兜底：{images: [...]} / {output: [...]}
    for (const key of ["images", "output"]) {
        const value = (payload as unknown as Record<string, unknown>)[key];
        if (Array.isArray(value)) candidates.push(...value);
    }
    const images = candidates
        .map((item) =>
            item && typeof item === "object" && !Array.isArray(item)
                ? resolveImageDataUrl(item as Record<string, unknown>)
                : typeof item === "string" && (/^https?:\/\//i.test(item) || /^data:image\//i.test(item))
                  ? item
                  : null,
        )
        .filter((value): value is string => Boolean(value))
        .map((dataUrl) => ({ id: nanoid(), dataUrl }));

    if (images.length === 0) {
        // 附带上游响应结构摘要，便于定位中转站的非标准返回格式
        throw new Error(`接口没有返回图片（上游返回结构：${describePayloadShape(payload)}）。如中转站已扣费，请把该结构反馈给我们以适配。`);
    }

    return images;
}

function describePayloadShape(payload: unknown): string {
    if (!payload || typeof payload !== "object") return String(payload).slice(0, 60);
    const record = payload as Record<string, unknown>;
    const top = Object.keys(record).slice(0, 6).join(",");
    const data = record.data;
    if (Array.isArray(data)) {
        const first = data[0];
        if (first && typeof first === "object") {
            return `顶层{${top}}，data 数组${data.length}项，项字段{${Object.keys(first as Record<string, unknown>).slice(0, 6).join(",")}}`;
        }
        return `顶层{${top}}，data 数组${data.length}项`;
    }
    if (data && typeof data === "object") {
        return `顶层{${top}}，data 对象字段{${Object.keys(data as Record<string, unknown>).slice(0, 6).join(",")}}`;
    }
    return `顶层{${top}}`;
}

function readAxiosError(error: unknown, fallback: string) {
    if (axios.isCancel(error)) return "请求已取消";
    if (axios.isAxiosError<{ error?: { message?: string }; msg?: string; code?: number }>(error)) {
        const responseData = error.response?.data;
        return responseData?.msg || responseData?.error?.message || readStatusError(error.response?.status, fallback);
    }
    if (error instanceof DOMException && error.name === "AbortError") return "请求已取消";
    return error instanceof Error ? error.message : fallback;
}

/**
 * 上游「过载 / 限流 / 暂时不可用」这类错误对用户来说只意味着一件事：稍后重试。
 * 原文保留在提示里，方便排查渠道问题。
 */
function withUpstreamHint(message: string) {
    if (!message) return message;
    if (/overload|too many requests|rate limit|busy|temporarily unavailable|service unavailable|繁忙|过载|稍后重试/i.test(message)) {
        return `上游模型服务繁忙，请稍后重试（${message}）`;
    }
    return message;
}

// ---------- 异步任务制图片通道（apimart 等）----------
// 提交应答里只有 task_id，图中转站侧异步生成，必须轮询 /tasks/{id} 取件。
// 上游实测：单张出图约 10~20s 完成；这里是「客户端轮询」（与 GenVideo 视频通道同一模式）。
const IMAGE_TASK_POLL_INTERVAL_MS = 3_000;
const IMAGE_TASK_TIMEOUT_MS = 10 * 60 * 1_000;

function sleep(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(new Error("请求已取消"));
        };
        if (signal?.aborted) onAbort();
        else signal?.addEventListener("abort", onAbort, { once: true });
    });
}

/** 轮询任务直到出图 / 失败 / 超时。 */
async function pollImageTask(config: AiConfig, taskId: string, options?: RequestOptions) {
    const deadline = Date.now() + IMAGE_TASK_TIMEOUT_MS;
    for (;;) {
        if (options?.signal?.aborted) throw new Error("请求已取消");
        if (Date.now() > deadline) {
            // 中转站多为收单即扣费：超时不能只说「失败」，要告诉用户去哪儿找回结果
            throw new Error(`图片任务超时（超过 ${IMAGE_TASK_TIMEOUT_MS / 60000} 分钟）：上游任务 ${taskId} 仍未返回结果，可能仍在上游运行并已扣费，请稍后到中转站后台确认任务状态。`);
        }
        await sleep(IMAGE_TASK_POLL_INTERVAL_MS, options?.signal);

        const payload = await proxyFetch<unknown>({
            url: aiApiUrl(config, `/tasks/${encodeURIComponent(taskId)}`),
            method: "GET",
            headers: aiHeaders(config),
        });
        const state = parseImageTaskState(payload);
        if (state.status === "completed") {
            if (!state.urls.length) throw new Error(`上游任务已完成但没有返回图片地址（任务 ${taskId}）`);
            return state.urls.map((dataUrl) => ({ id: nanoid(), dataUrl }));
        }
        if (state.status === "failed") {
            throw new Error(withUpstreamHint(state.error || `上游图片任务失败（任务 ${taskId}）`));
        }
    }
}

/** 提交应答统一出口：任务制通道先轮询取件，同步通道直接解析。 */
async function resolveImageSubmission(config: AiConfig, payload: ImageApiResponse, options?: RequestOptions) {
    const taskId = pickSubmittedTaskId(payload);
    if (taskId) return await pollImageTask(config, taskId, options);
    return parseImagePayload(payload);
}

/**
 * 上游「只认比例串、不认像素尺寸」时的重投比例（如 apimart 上的 gemini 图像模型）。
 * 返回 null = 这不是画幅问题，不要重投（内容审核、参数错误等原样抛出）。
 * 注意：只有被上游拒收的**提交**才会走到这里——那种应答没有建任务、没有计费，重投不会重复扣费。
 */
function readAspectRetryRatio(message: string, size: string, requestSize?: string) {
    if (!isAspectRejection(message)) return null;
    return pickSupportedRatio(resolveRequestAspect(size, requestSize), parseSupportedRatios(message));
}

function errorText(error: unknown) {
    return error instanceof Error ? error.message : String(error ?? "");
}

/**
 * 思维链在流里以 [REASONING]…[/REASONING] 包裹；展示与回传前统一剥离。
 * 用 [\s\S] 而不是 .，否则带换行的思维链会漏掉标记，把 [REASONING] 原样显示给用户。
 */
function stripReasoning(text: string) {
    return text
        .replace(/\[REASONING\][\s\S]*?\[\/REASONING\]/g, "")
        .replace(/\[REASONING\][\s\S]*$/g, "")
        .trim();
}

function readStatusError(status: number | undefined, fallback: string) {
    if (status === 401 || status === 403) return "鉴权失败，请检查 API Key 或模型权限";
    if (status === 429) return "请求被限流或额度不足，请稍后重试";
    return status ? `${fallback}：${status}` : fallback;
}

function readImageApiError(payload: ImageApiResponse | null, fallback: string) {
    return payload?.msg || payload?.error?.message || (payload?.code ? `${fallback}: ${payload.code}` : fallback);
}

function withSystemPrompt(config: AiConfig, prompt: string) {
    const systemPrompt = config.systemPrompt.trim();
    return systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
}

function aiApiUrl(config: AiConfig, path: string) {
    return buildApiUrl(config.baseUrl, path);
}

function isOpenAiApi(config: Pick<AiConfig, "baseUrl">): boolean {
    return config.baseUrl.toLowerCase().includes("openai.com");
}

/** 平台路由提示：x-sf-provider / x-sf-model 让代理按凭证「模型绑定」精确取 Key（与后台能力标定配套） */
function proxyHintHeaders(config: { apiFormat: AiConfig["apiFormat"]; baseUrl: string; model?: string }) {
    const provider = inferProviderHint(config.apiFormat, config.baseUrl);
    return {
        ...(provider ? { "x-sf-provider": provider } : {}),
        ...(config.model ? { "x-sf-model": modelOptionName(config.model) } : {}),
    };
}

function aiHeaders(config: AiConfig, contentType?: string) {
    return {
        Authorization: `Bearer ${config.apiKey}`,
        ...proxyHintHeaders(config),
        ...(contentType ? { "Content-Type": contentType } : {}),
    };
}

function geminiBaseUrl(config: Pick<AiConfig, "baseUrl">) {
    const normalizedBaseUrl = config.baseUrl.trim().replace(/\/+$/, "");
    const lowerBaseUrl = normalizedBaseUrl.toLowerCase();
    return lowerBaseUrl.endsWith("/v1") || lowerBaseUrl.endsWith("/v1beta") ? normalizedBaseUrl : `${normalizedBaseUrl}/v1beta`;
}

function geminiModelName(model: string) {
    return model.trim().replace(/^models\//, "");
}

function geminiApiUrl(config: Pick<AiConfig, "baseUrl" | "model">, action?: "generateContent" | "streamGenerateContent") {
    const baseUrl = geminiBaseUrl(config);
    if (!action) return `${baseUrl}/models`;
    return `${baseUrl}/models/${encodeURIComponent(geminiModelName(config.model))}:${action}`;
}

function geminiHeaders(config: Pick<AiConfig, "apiKey" | "apiFormat" | "baseUrl" | "model">) {
    return {
        "x-goog-api-key": config.apiKey,
        ...proxyHintHeaders(config),
        "Content-Type": "application/json",
    };
}

function replicateApiUrl(config: Pick<AiConfig, "baseUrl" | "model">) {
    const baseUrl = config.baseUrl.trim().replace(/\/+$/, "");
    const model = config.model.trim().replace(/^replicate:/i, "");
    const [owner, name] = model.split("/", 2);
    if (!owner || !name) throw new Error("Replicate 模型名必须使用 owner/model 格式，例如 openai/gpt-image-2");
    return `${baseUrl}/models/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/predictions`;
}

function replicateHeaders(config: Pick<AiConfig, "apiKey" | "apiFormat" | "baseUrl" | "model">) {
    return {
        Authorization: `Bearer ${config.apiKey}`,
        ...proxyHintHeaders(config),
        "Content-Type": "application/json",
        Prefer: "wait=60",
    };
}

async function requestReplicateImages(config: AiConfig, input: Record<string, unknown>, options?: RequestOptions, serverJobId?: string) {
    if (serverJobId) {
        const job = await startServerReplicateJob(serverJobId, config.model, input, options?.signal);
        const urls = archivedMediaUrls(job);
        if (!urls.length) throw new Error("Replicate 任务已完成但没有归档图片");
        return urls.map((dataUrl) => ({ id: nanoid(), dataUrl }));
    }
    const prediction = await proxyFetch<ReplicatePrediction>({
        url: replicateApiUrl(config),
        method: "POST",
        headers: replicateHeaders(config),
        body: { input },
    });
    const completed = await waitForReplicatePrediction(prediction, config, options);
    return parseReplicateImagePayload(completed);
}

async function waitForReplicatePrediction(prediction: ReplicatePrediction, config: Pick<AiConfig, "apiKey" | "apiFormat" | "baseUrl" | "model">, options?: RequestOptions) {
    let current = prediction;
    for (let attempt = 0; attempt < 80; attempt += 1) {
        if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        if (current.status === "succeeded" || current.status === "failed" || current.status === "canceled") return current;
        if (!current.urls?.get) return current;
        await sleep(1500);
        current = await proxyFetch<ReplicatePrediction>({
            url: current.urls.get,
            method: "GET",
            headers: { Authorization: `Bearer ${config.apiKey}`, ...proxyHintHeaders(config) },
        });
    }
    throw new Error("Replicate 生成超时，请稍后在任务记录中查看结果");
}

function parseReplicateImagePayload(payload: ReplicatePrediction) {
    if (payload.status === "failed" || payload.status === "canceled") throw new Error(readReplicateError(payload.error));
    const images = findImageUrls(payload.output).map((dataUrl) => ({ id: nanoid(), dataUrl }));
    if (!images.length) throw new Error("Replicate 接口没有返回图片");
    return images;
}

function findImageUrls(value: unknown, results: string[] = [], seen = new Set<object>()) {
    if (typeof value === "string") {
        if (/^(https?:\/\/|data:image\/)/i.test(value) && !results.includes(value)) results.push(value);
        return results;
    }
    if (!value || typeof value !== "object") return results;
    if (seen.has(value)) return results;
    seen.add(value);
    if (Array.isArray(value)) {
        value.forEach((item) => findImageUrls(item, results, seen));
        return results;
    }
    const record = value as Record<string, unknown>;
    for (const key of ["url", "image", "image_url", "images", "output", "file"]) {
        findImageUrls(record[key], results, seen);
    }
    return results;
}

function readReplicateError(error: unknown) {
    if (typeof error === "string" && error) return error;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return "Replicate 生成失败";
}

function withSystemMessage<T extends ResponseInputMessage>(config: AiConfig, messages: T[]): ResponseInputMessage[] {
    const systemPrompt = config.systemPrompt.trim();
    return systemPrompt ? [{ role: "system" as const, content: systemPrompt }, ...messages] : messages;
}

function toResponseInput(messages: ResponseInputMessage[]): ResponseInputItem[] {
    return messages.flatMap((message): ResponseInputItem[] => {
        if ("type" in message) return [message];
        if (message.role === "tool") return [{ type: "function_call_output", call_id: message.tool_call_id, output: message.content }];
        return [{ role: message.role, content: toResponseContent(message.content || "") }];
    });
}

/**
 * 内容块 → Responses 风格（input_text / input_image）。
 * 两种形态都要接得住：本应用内部用 Chat 风格（text / image_url.url），
 * 而已经转过一次的内容是 Responses 风格（input_text / input_image，image_url 是字符串）。
 * 原来只认前一种，遇到后一种会直接读 undefined.url 抛错，或在没有图时把文本块当图片块。
 */
function toResponseContent(content: ResponseMessageContent): string | ResponseInputContent[] {
    if (!Array.isArray(content)) return String(content || "");
    const parts = content.flatMap((raw): ResponseInputContent[] => {
        if (typeof raw === "string") return raw ? [{ type: "input_text", text: raw }] : [];
        // 已经转过一次的内容是 Responses 风格，类型上不属于 Chat 风格的内容块 union，这里按记录读字段
        const item = raw as unknown as Record<string, unknown>;
        const imageUrl = typeof item.image_url === "string" ? item.image_url : isRecord(item.image_url) ? stringValue(item.image_url.url) : "";
        if (imageUrl && (item.type === "input_image" || item.type === "image_url")) return [{ type: "input_image", image_url: imageUrl }];
        const text = stringValue(item.text) || stringValue(item.input_text);
        return text ? [{ type: "input_text", text }] : [];
    });
    if (!parts.some((part) => part.type === "input_image")) return parts.map((part) => (part.type === "input_text" ? part.text : "")).join("\n");
    return parts;
}

function toResponseTool(tool: ResponseFunctionTool): ResponseApiToolDefinition {
    return {
        type: "function",
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
        strict: tool.function.strict,
    };
}

function parseToolResponse(payload: ResponseApiPayload): ToolResponseResult {
    const output = payload.output || [];
    const content =
        payload.output_text ||
        output
            .flatMap((item) => (item.type === "message" ? item.content || [] : []))
            .map((item) => item.text || "")
            .join("");
    const toolCalls = output
        .filter((item): item is Extract<ResponseApiOutputItem, { type?: "function_call" }> => item.type === "function_call")
        .map((item) => ({
            id: item.call_id || item.id || "",
            type: "function" as const,
            function: { name: item.name || "", arguments: item.arguments || "{}" },
        }))
        .filter((item) => item.id && item.function.name);
    return { content, toolCalls };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function responseErrorMessage(value: unknown) {
    if (!isRecord(value)) return "";
    const error = isRecord(value.error) ? value.error : undefined;
    const response = isRecord(value.response) ? value.response : undefined;
    const responseError = response && isRecord(response.error) ? response.error : undefined;
    return stringValue(value.msg) || stringValue(error?.message) || stringValue(responseError?.message);
}

function stringValue(value: unknown) {
    return typeof value === "string" ? value : "";
}

function validateResponsePayload(payload: ResponseApiPayload) {
    if (!isSuccessCode(payload.code)) throw new Error(envelopeMessage(payload) || payload.msg || "请求失败");
    if (payload.error?.message) throw new Error(payload.error.message);
}

function validateGeminiPayload(payload: GeminiPayload) {
    if (payload.error?.message) throw new Error(payload.error.message);
    if (payload.promptFeedback?.blockReason) throw new Error(`Gemini 拒绝了本次请求：${payload.promptFeedback.blockReason}`);
}

async function readFetchError(response: Response, fallback: string) {
    const text = await response.text();
    if (!text) return readStatusError(response.status, fallback);
    try {
        return responseErrorMessage(JSON.parse(text)) || readStatusError(response.status, fallback);
    } catch {
        return text.slice(0, 300) || readStatusError(response.status, fallback);
    }
}

function consumeResponseStreamBlock(block: string, state: ResponseStreamState, onDelta?: (text: string) => void) {
    const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).replace(/^ /, ""))
        .join("\n")
        .trim();
    if (!data || data === "[DONE]") return;
    const event = JSON.parse(data) as Record<string, unknown>;
    const type = stringValue(event.type);
    const errorMessage = responseErrorMessage(event);
    if (errorMessage) state.error = errorMessage;
    if (type === "response.output_text.delta" && typeof event.delta === "string") {
        state.text += event.delta;
        onDelta?.(state.text);
    }
    if (type === "response.output_text.done" && !state.text && typeof event.text === "string") {
        state.text = event.text;
        onDelta?.(state.text);
    }
    if (type === "response.completed" && isRecord(event.response)) {
        state.payload = event.response as ResponseApiPayload;
    } else if (Array.isArray(event.output)) {
        state.payload = event as ResponseApiPayload;
    }
}

function consumeResponseStreamText(state: ResponseStreamState, text: string, onDelta?: (text: string) => void, flush = false) {
    state.buffer += text;
    for (;;) {
        const match = state.buffer.match(/\r?\n\r?\n/);
        if (!match) break;
        const matchIndex = match.index ?? 0;
        consumeResponseStreamBlock(state.buffer.slice(0, matchIndex), state, onDelta);
        state.buffer = state.buffer.slice(matchIndex + match[0].length);
    }
    if (flush && state.buffer.trim()) {
        consumeResponseStreamBlock(state.buffer, state, onDelta);
        state.buffer = "";
    }
}

type ChatCompletionContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

/**
 * 内容块转换：Responses 风格（input_text / input_image）与 Chat 风格（text / image_url）都认，统一成 Chat Completions 形态。
 *
 * 原来这里直接 `String(msg.content)`：画布 Agent 每条用户消息都是内容块数组（正文 + 选中节点的参考图），
 * 于是模型收到的是 "[object Object],[object Object]"——用户被回一句「我没收到你的要求」，参考图也从来没真正传上去。
 * 纯文本内容仍返回字符串，保持兼容与最小请求体。
 */
function toChatCompletionContent(content: unknown): string | ChatCompletionContentPart[] {
    if (typeof content === "string") return content;
    if (!Array.isArray(content)) return content == null ? "" : String(content);
    const parts = content.flatMap((item): ChatCompletionContentPart[] => {
        if (typeof item === "string") return item ? [{ type: "text", text: item }] : [];
        if (!isRecord(item)) return [];
        const imageUrl = typeof item.image_url === "string" ? item.image_url : isRecord(item.image_url) ? stringValue(item.image_url.url) : "";
        if (imageUrl && (item.type === "input_image" || item.type === "image_url")) return [{ type: "image_url", image_url: { url: imageUrl } }];
        const text = stringValue(item.text) || stringValue(item.input_text);
        return text ? [{ type: "text", text }] : [];
    });
    if (!parts.some((part) => part.type === "image_url")) return parts.map((part) => (part.type === "text" ? part.text : "")).join("\n");
    return parts;
}

/**
 * Responses API 风格的请求体 → Chat Completions 请求体（不含 stream 开关）。
 * 流式与非流式两条路共用同一份转换，避免两边字段漂移。
 */
function toChatCompletionBody(config: AiConfig, body: Record<string, unknown>) {
    // 将 Responses API 的 input 格式转为 Chat Completions 的 messages 格式
    const input = body.input;
    const messages: any[] = [];
    if (config.systemPrompt?.trim()) {
        messages.push({ role: "system", content: config.systemPrompt.trim() });
    }
    if (Array.isArray(input)) {
        let pendingToolCalls: any[] = [];
        const flushToolCalls = () => {
            if (pendingToolCalls.length) {
                messages.push({ role: "assistant", content: null, tool_calls: pendingToolCalls });
                pendingToolCalls = [];
            }
        };
        for (const msg of input) {
            if (msg.type === "function_call") {
                // Responses API 的 function_call → assistant message 的 tool_calls
                pendingToolCalls.push({
                    id: msg.call_id || msg.id || `call_${Date.now()}`,
                    type: "function",
                    function: { name: msg.name || "", arguments: msg.arguments || "{}" },
                });
            } else if (msg.type === "function_call_output" || msg.role === "tool") {
                flushToolCalls();
                messages.push({ role: "tool", tool_call_id: msg.call_id || msg.tool_call_id || "", content: String(msg.output || msg.content || "") });
            } else if (msg.role === "assistant") {
                flushToolCalls();
                const rawContent = typeof msg.content === "string" ? msg.content : "";
                // 从存储的 [REASONING] 标记中提取 reasoning
                let cleanContent = rawContent;
                let reasoningContent = (msg as any).reasoning_content || (msg as any).reasoning || "";
                if (!reasoningContent && rawContent.includes("[REASONING]")) {
                    const parts = rawContent.split(/\[REASONING\]|\[\/REASONING\]/);
                    if (parts.length >= 3) { reasoningContent = parts[1]; cleanContent = parts.slice(2).join(""); }
                }
                const assistantMsg: any = { role: "assistant", content: cleanContent || null };
                // DeepSeek 严格要求往返携带 reasoning_content
                assistantMsg.reasoning_content = reasoningContent || null;
                messages.push(assistantMsg);
            } else if (msg.role === "system" || msg.role === "user") {
                flushToolCalls();
                messages.push({ role: msg.role, content: toChatCompletionContent(msg.content) });
            }
        }
        flushToolCalls();
    }

    const chatBody: Record<string, unknown> = {
        model: body.model,
        messages,
    };
    // 转换 tools 格式：Responses API → Chat Completions 格式
    if (Array.isArray(body.tools)) {
        chatBody.tools = body.tools.map((t: any) => ({
            type: "function",
            function: {
                name: t.name || t.function?.name,
                description: t.description || t.function?.description,
                parameters: t.parameters || t.function?.parameters,
                strict: t.strict ?? t.function?.strict,
            },
        }));
    }
    return chatBody;
}

async function requestStreamingResponse(config: AiConfig, body: Record<string, unknown>, onDelta?: (text: string) => void, options?: RequestOptions): Promise<ToolResponseResult> {
    const chatBody = { ...toChatCompletionBody(config, body), stream: true };
    // 平台 Key 化后所有上游 egress 走代理：流式对话由代理透传 + 服务端注入 Key
    const response = await proxyFetchStream({
        url: aiApiUrl(config, "/chat/completions"),
        method: "POST",
        headers: { ...aiHeaders(config, "application/json"), Accept: "text/event-stream" },
        body: chatBody,
    });
    if (!response.ok) throw new Error(await readFetchError(response, "请求失败"));
    if (!response.body) {
        const payload = (await response.json()) as any;
        if (payload.error?.message) throw new Error(payload.error.message);
        const text = payload.choices?.[0]?.message?.content || "";
        const toolCalls = (payload.choices?.[0]?.message?.tool_calls || []).map((tc: any) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.function.name, arguments: tc.function.arguments },
        }));
        return { content: text, toolCalls };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    let toolCalls: ToolResponseResult["toolCalls"] = [];
    // 中转站/上游常用「HTTP 200 + 流内 error 事件」报错（过载、限流、渠道不可用）。
    // 只解析 choices 的话这些错误会被静默丢掉，最终变成一句莫名其妙的「模型没有返回内容」，
    // 用户既看不到真实原因，也没法判断该重试还是该改配置。
    let streamError = "";
    let strayPayload = "";

stream: for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) {
                // 少数上游直接回 JSON 而不是 SSE：先攒着，确认没有正文后再解析错误
                if (trimmed.startsWith("{")) strayPayload = (strayPayload + trimmed).slice(0, 4000);
                continue;
            }
            const jsonStr = trimmed.slice(6);
            if (jsonStr === "[DONE]") continue;
            try {
                const chunk = JSON.parse(jsonStr);
                const failure = responseErrorMessage(chunk);
                if (failure) {
                    streamError = failure;
                    break stream;
                }
                const delta = chunk.choices?.[0]?.delta;
                if (delta?.reasoning_content) {
                    if (!fullText) onDelta?.("\n");
                    fullText += "[REASONING]" + delta.reasoning_content + "[/REASONING]";
                }
                if (delta?.content) {
                    fullText += delta.content;
                    // onDelta 显示的文本要去掉 [REASONING] 标记
                    onDelta?.(stripReasoning(fullText) || " ");
                }
                if (delta?.tool_calls) {
                    for (const tc of delta.tool_calls) {
                        let existing = toolCalls.find((t) => t.id === tc.id);
                        if (!existing) {
                            existing = { id: tc.id || "", type: "function", function: { name: "", arguments: "" } };
                            toolCalls.push(existing);
                        }
                        if (tc.function?.name) existing.function.name += tc.function.name;
                        if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
                    }
                }
            } catch { /* skip parse errors */ }
        }
    }

    if (streamError) {
        // 已经拿到错误，不必再读完整条流
        await reader.cancel().catch(() => undefined);
        throw new Error(withUpstreamHint(streamError));
    }
    // 有些上游不按 SSE 回，直接给一段 JSON；正文为空时再解析它，把错误认出来
    if (!fullText && !toolCalls.length) {
        const failure = responseErrorMessage(jsonValue((strayPayload + buffer.trim()).slice(0, 4000)));
        if (failure) throw new Error(withUpstreamHint(failure));
    }

    return { content: stripReasoning(fullText), toolCalls };
}

function toGeminiBody(config: AiConfig, messages: ResponseInputMessage[], extra?: Record<string, unknown>) {
    const systemText = [
        config.systemPrompt.trim(),
        ...messages.flatMap((message) => (!("type" in message) && message.role === "system" ? [geminiTextContent(message.content)] : [])),
    ]
        .filter(Boolean)
        .join("\n\n");
    const contents = toGeminiContents(messages.filter((message) => ("type" in message ? true : message.role !== "system")));
    return {
        contents,
        ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
        ...extra,
    };
}

function toGeminiContents(messages: ResponseInputMessage[]): GeminiContent[] {
    const callNameById = new Map<string, string>();
    return messages.flatMap((message): GeminiContent[] => {
        if ("type" in message) {
            callNameById.set(message.call_id, message.name);
            return [{ role: "model", parts: [{ functionCall: { id: message.call_id, name: message.name, args: jsonObject(message.arguments) }, ...(message.thoughtSignature ? { thoughtSignature: message.thoughtSignature } : {}) }] }];
        }
        if (message.role === "tool") {
            const name = callNameById.get(message.tool_call_id) || "tool_result";
            return [{ role: "user", parts: [{ functionResponse: { id: message.tool_call_id, name, response: { result: jsonValue(message.content) } } }] }];
        }
        return [{ role: message.role === "assistant" ? "model" : "user", parts: toGeminiParts(message.content) }];
    });
}

function toGeminiParts(content: ResponseMessageContent): GeminiPart[] {
    if (!Array.isArray(content)) return [{ text: String(content || "") }];
    return content.map((item) => (item.type === "text" ? { text: item.text } : toGeminiImagePart(item.image_url.url)));
}

function toGeminiImagePart(url: string): GeminiPart {
    const match = url.match(/^data:([^;,]+);base64,(.+)$/);
    if (match) return { inlineData: { mimeType: match[1], data: match[2] } };
    return { fileData: { fileUri: url, mimeType: "image/png" } };
}

function geminiTextContent(content: ResponseMessageContent) {
    if (!Array.isArray(content)) return String(content || "");
    return content.map((item) => (item.type === "text" ? item.text : item.image_url.url)).join("\n");
}

function jsonObject(value: string): Record<string, unknown> {
    const parsed = jsonValue(value);
    return isRecord(parsed) ? parsed : {};
}

function jsonValue(value: string): unknown {
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function toGeminiToolOptions(tools: ResponseFunctionTool[], toolChoice: ToolChoice) {
    if (!tools.length) return {};
    const functionDeclarations = tools.map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
        parameters: tool.function.parameters,
    }));
    const functionCallingConfig =
        typeof toolChoice === "object"
            ? { mode: "ANY", allowedFunctionNames: [toolChoice.name] }
            : { mode: toolChoice === "required" ? "ANY" : "AUTO" };
    return {
        tools: [{ functionDeclarations }],
        toolConfig: { functionCallingConfig },
    };
}

type ChatCompletionPayload = {
    choices?: Array<{
        message?: {
            content?: string | null;
            tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: string } }>;
        };
    }>;
};

/**
 * 非流式 chat/completions —— 带 tools 的轮次走这条路。
 *
 * 线上实测（ggwk 中转 + gpt-5.6-terra，同样的 messages/tools）：
 *   流式   48~122s 才回，且经常在中转网关超时后返回
 *          {"error":{"message":"Our servers are currently overloaded..."}}（约 78s，HTTP 仍是 200）；
 *   非流式 3.3s 正常返回 tool_calls。
 * 画布 Agent 的 system prompt + 全部工具 schema 比探针大得多，流式几乎必然撞上那个网关超时，
 * 于是在画布上表现为「模型没有返回内容，请换一种说法再试」。
 * 代价是工具轮的正文不再逐字流式显示，换来的是这轮能真的出结果。
 */
async function requestChatCompletionResponse(config: AiConfig, body: Record<string, unknown>): Promise<ToolResponseResult> {
    const payload = await proxyFetch<ChatCompletionPayload>({
        url: aiApiUrl(config, "/chat/completions"),
        method: "POST",
        headers: aiHeaders(config, "application/json"),
        body: toChatCompletionBody(config, body),
    });
    const failure = responseErrorMessage(payload);
    if (failure) throw new Error(withUpstreamHint(failure));
    const message = payload.choices?.[0]?.message;
    if (!message) throw new Error("上游没有返回任何候选结果，请稍后重试。");
    return {
        content: stripReasoning(typeof message.content === "string" ? message.content : ""),
        toolCalls: (message.tool_calls || [])
            .filter((call) => call.function?.name)
            .map((call, index) => ({ id: call.id || `call_${call.function?.name}_${index}`, type: "function" as const, function: { name: call.function?.name || "", arguments: call.function?.arguments || "{}" } })),
    };
}

async function requestGeminiStreamingResponse(config: AiConfig, body: Record<string, unknown>, onDelta?: (text: string) => void, options?: RequestOptions): Promise<ToolResponseResult> {
    const response = await proxyFetchStream({
        url: `${geminiApiUrl(config, "streamGenerateContent")}?alt=sse`,
        method: "POST",
        headers: geminiHeaders(config),
        body,
    });
    if (!response.ok) throw new Error(await readFetchError(response, "请求失败"));
    if (!response.body) {
        const payload = (await response.json()) as GeminiPayload;
        return parseGeminiToolResponse(payload);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const state: GeminiStreamState = { buffer: "", text: "", toolCalls: [] };
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        consumeGeminiStreamText(state, decoder.decode(value, { stream: true }), onDelta);
        if (state.error) throw new Error(state.error);
    }
    consumeGeminiStreamText(state, decoder.decode(), onDelta, true);
    if (state.error) throw new Error(state.error);
    return { content: state.text, toolCalls: state.toolCalls };
}

function consumeGeminiStreamText(state: GeminiStreamState, text: string, onDelta?: (text: string) => void, flush = false) {
    state.buffer += text;
    for (;;) {
        const match = state.buffer.match(/\r?\n\r?\n/);
        if (!match) break;
        const matchIndex = match.index ?? 0;
        consumeGeminiStreamBlock(state.buffer.slice(0, matchIndex), state, onDelta);
        state.buffer = state.buffer.slice(matchIndex + match[0].length);
    }
    if (flush && state.buffer.trim()) {
        consumeGeminiStreamBlock(state.buffer, state, onDelta);
        state.buffer = "";
    }
}

function consumeGeminiStreamBlock(block: string, state: GeminiStreamState, onDelta?: (text: string) => void) {
    const data = block
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).replace(/^ /, ""))
        .join("\n")
        .trim();
    if (!data || data === "[DONE]") return;
    const result = parseGeminiToolResponse(JSON.parse(data) as GeminiPayload);
    if (result.content) {
        state.text += result.content;
        onDelta?.(state.text);
    }
    state.toolCalls.push(...result.toolCalls);
}

function parseGeminiToolResponse(payload: GeminiPayload): ToolResponseResult {
    validateGeminiPayload(payload);
    const parts = payload.candidates?.flatMap((candidate) => candidate.content?.parts || []) || [];
    const content = parts.map((part) => part.text || "").join("");
    const toolCalls = parts
        .map((part) => part.functionCall)
        .filter((call): call is NonNullable<GeminiPart["functionCall"]> => Boolean(call?.name))
        .map((call) => {
            const part = parts.find((item) => item.functionCall === call);
            const thoughtSignature = part?.thoughtSignature || part?.thought_signature;
            return {
                id: call.id || nanoid(),
                type: "function" as const,
                function: { name: call.name || "", arguments: JSON.stringify(call.args || {}) },
                ...(thoughtSignature ? { thoughtSignature } : {}),
            };
        });
    return { content, toolCalls };
}

async function requestGeminiImages(config: AiConfig, prompt: string, references: ReferenceImage[], count: number, options?: RequestOptions) {
    const quality = normalizeQuality(config.quality);
    const requestSize = resolveRequestSize(quality, config.size);
    const requestPrompt = withImageSizeInstruction(prompt, config.size, requestSize);
    const requests = Array.from({ length: count }, () => requestGeminiImagesOnce(config, requestPrompt, references, options));
    return (await Promise.all(requests)).flat();
}

async function requestGeminiImagesOnce(config: AiConfig, prompt: string, references: ReferenceImage[], options?: RequestOptions) {
    const parts: GeminiPart[] = [{ text: prompt }];
    for (const image of references) {
        parts.push(toGeminiImagePart(await imageToDataUrl(image)));
    }
    const payload = await proxyFetch<GeminiPayload>({
        url: geminiApiUrl(config, "generateContent"),
        method: "POST",
        headers: geminiHeaders(config),
        body: {
            ...toGeminiBody(config, [{ role: "user", content: prompt }], { generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }),
            contents: [{ role: "user", parts }],
        },
    });
    return parseGeminiImagePayload(payload);
}

function parseGeminiImagePayload(payload: GeminiPayload) {
    validateGeminiPayload(payload);
    const images =
        payload.candidates
            ?.flatMap((candidate) => candidate.content?.parts || [])
            .map((part) => {
                const inlineData = part.inlineData || (part.inline_data ? { mimeType: part.inline_data.mimeType || part.inline_data.mime_type, data: part.inline_data.data } : undefined);
                if (inlineData?.data) return `data:${inlineData.mimeType || "image/png"};base64,${inlineData.data}`;
                return part.fileData?.fileUri || null;
            })
            .filter((value): value is string => Boolean(value))
            .map((dataUrl) => ({ id: nanoid(), dataUrl })) || [];
    if (!images.length) throw new Error("Gemini 接口没有返回图片");
    return images;
}

export async function requestGeneration(config: AiConfig, prompt: string, options?: RequestOptions, serverJobId?: string) {
    const requestConfig = resolveModelRequestConfig(config, config.model || config.imageModel);
    const n = Math.max(1, Math.min(15, Math.floor(Math.abs(Number(config.count)) || 1)));
    if (requestConfig.apiFormat === "gemini") {
        try {
            return await requestGeminiImages(requestConfig, prompt, [], n, options);
        } catch (error) {
            throw new Error(readAxiosError(error, "请求失败"));
        }
    }
    const quality = normalizeQuality(config.quality);
    const requestSize = resolveRequestSize(quality, config.size);
    const requestPrompt = withImageSizeInstruction(prompt, config.size, requestSize);
    if (requestConfig.apiFormat === "replicate") {
        try {
            return await requestReplicateImages(requestConfig, {
                prompt: withSystemPrompt(requestConfig, requestPrompt),
                quality: quality || "auto",
                background: "auto",
                moderation: "auto",
                aspect_ratio: resolveRequestAspect(config.size, requestSize) || "1:1",
                output_format: "webp",
                number_of_images: n,
                output_compression: 90,
            }, options, serverJobId);
        } catch (error) {
            throw new Error(readAxiosError(error, "request failed"));
        }
    }
    const url = aiApiUrl(requestConfig, "/images/generations");
    const headers = aiHeaders(requestConfig, "application/json");
    // 画幅默认发像素尺寸（多数通道要的就是它）；只有上游明确说「只认比例串」时才改发比例重投
    const body = (aspectRatio?: string) => ({
        model: requestConfig.model,
        prompt: withSystemPrompt(requestConfig, requestPrompt),
        n,
        ...(quality ? { quality } : {}),
        ...(aspectRatio ? { aspect_ratio: aspectRatio } : requestSize ? { size: requestSize } : {}),
        ...(isOpenAiApi(requestConfig) ? { response_format: "b64_json" } : {}),
        ...(isOpenAiApi(requestConfig) ? { output_format: IMAGE_OUTPUT_FORMAT } : {}),
    });
    try {
        let payload: ImageApiResponse;
        try {
            payload = await proxyFetch<ImageApiResponse>({ url, method: "POST", headers, body: body() });
        } catch (error) {
            const aspectRatio = readAspectRetryRatio(errorText(error), config.size, requestSize);
            if (!aspectRatio) throw error;
            payload = await proxyFetch<ImageApiResponse>({ url, method: "POST", headers, body: body(aspectRatio) });
        }
        return await resolveImageSubmission(requestConfig, payload, options);
    } catch (error) {
        throw new Error(readAxiosError(error, "请求失败"));
    }
}

export async function requestEdit(config: AiConfig, prompt: string, references: ReferenceImage[], mask?: ReferenceImage, options?: RequestOptions, serverJobId?: string) {
    const requestConfig = resolveModelRequestConfig(config, config.model || config.imageModel);
    const n = Math.max(1, Math.min(15, Math.floor(Math.abs(Number(config.count)) || 1)));
    const quality = normalizeQuality(config.quality);
    const requestSize = resolveRequestSize(quality, config.size);
    const requestPrompt = withImageSizeInstruction(buildImageReferencePromptText(prompt, references), config.size, requestSize);
    if (requestConfig.apiFormat === "gemini") {
        if (mask) throw new Error("Gemini 调用格式暂不支持蒙版编辑");
        try {
            return await requestGeminiImages(requestConfig, requestPrompt, references, n, options);
        } catch (error) {
            throw new Error(readAxiosError(error, "请求失败"));
        }
    }
    if (requestConfig.apiFormat === "replicate") {
        if (mask) throw new Error("Replicate gpt-image-2 does not support mask editing yet. Use reference-image editing without a mask.");
        try {
            return await requestReplicateImages(requestConfig, {
                prompt: withSystemPrompt(requestConfig, requestPrompt),
                quality: quality || "auto",
                background: "auto",
                moderation: "auto",
                aspect_ratio: resolveRequestAspect(config.size, requestSize) || "1:1",
                input_images: await Promise.all(references.map((image) => imageToDataUrl(image))),
                output_format: "webp",
                number_of_images: n,
                output_compression: 90,
            }, options, serverJobId);
        } catch (error) {
            throw new Error(readAxiosError(error, "request failed"));
        }
    }
    const files = await Promise.all(references.map(async (image) => dataUrlToFile({ ...image, dataUrl: await imageToDataUrl(image) })));
    // 画幅默认发像素尺寸；上游明确说只认比例串时改发比例重投一次（同 requestGeneration）
    const submit = (aspectRatio?: string) => {
        const formData = new FormData();
        formData.set("model", requestConfig.model);
        formData.set("prompt", withSystemPrompt(requestConfig, requestPrompt));
        formData.set("n", String(n));
        if (isOpenAiApi(requestConfig)) {
            formData.set("response_format", "b64_json");
            formData.set("output_format", IMAGE_OUTPUT_FORMAT);
        }
        if (quality) {
            formData.set("quality", quality);
        }
        if (aspectRatio) {
            formData.set("aspect_ratio", aspectRatio);
        } else if (requestSize) {
            formData.set("size", requestSize);
        }
        files.forEach((file) => formData.append("image", file));
        if (mask) formData.set("mask", dataUrlToFile(mask));
        formData.set("_proxy_url", aiApiUrl(requestConfig, "/images/edits"));
        formData.set("_proxy_method", "POST");
        formData.set("_proxy_headers", JSON.stringify(aiHeaders(requestConfig)));
        return fetch("/canvas/api/proxy/form-data", {
            method: "POST",
            body: formData,
            credentials: "include",
            signal: options?.signal,
        });
    };

    try {
        let response = await submit();
        let data = (await response.json().catch(() => null)) as ImageApiResponse | null;
        if (!response.ok) {
            const message = readImageApiError(data, readStatusError(response.status, "request failed"));
            // 上游编辑端点不吃这个模型（apimart 只让 Grok 图像模型走 /images/edits）→ 按文档改走
            // 生成端点 + image_urls 重投一次。该答复是直接拒收，没建任务、没计费，重投不花钱。
            // 带蒙版的编辑没法这么改道（生成端点的 image_urls 不接蒙版），原样把上游原话抛出去。
            if (!mask && isEditsEndpointUnsupported(message)) {
                const imageUrls = await Promise.all(references.map(async (image) => normalizeReferenceDataUrl(await imageToDataUrl(image))));
                const payload = await proxyFetch<ImageApiResponse>({
                    url: aiApiUrl(requestConfig, "/images/generations"),
                    method: "POST",
                    headers: aiHeaders(requestConfig, "application/json"),
                    body: buildReferenceGenerationBody({
                        model: requestConfig.model,
                        prompt: withSystemPrompt(requestConfig, requestPrompt),
                        n,
                        quality,
                        size: requestSize,
                        imageUrls,
                        openAiResponseFormat: isOpenAiApi(requestConfig),
                        outputFormat: IMAGE_OUTPUT_FORMAT,
                    }),
                });
                return await resolveImageSubmission(requestConfig, payload || {}, options);
            }
            const aspectRatio = readAspectRetryRatio(message, config.size, requestSize);
            if (!aspectRatio) throw new Error(message);
            response = await submit(aspectRatio);
            data = (await response.json().catch(() => null)) as ImageApiResponse | null;
            if (!response.ok) throw new Error(readImageApiError(data, readStatusError(response.status, "request failed")));
        }
        return await resolveImageSubmission(requestConfig, data || {}, options);
    } catch (error) {
        throw new Error(readAxiosError(error, "请求失败"));
    }
}

export async function requestImageQuestion(config: AiConfig, messages: AiTextMessage[], onDelta: (text: string) => void, options?: RequestOptions) {
    const requestConfig = resolveModelRequestConfig(config, config.model || config.textModel);
    try {
        if (requestConfig.apiFormat === "gemini") {
            const answer = (await requestGeminiStreamingResponse(requestConfig, toGeminiBody(requestConfig, messages), onDelta, options)).content || "没有返回内容";
            if (answer === "没有返回内容") onDelta(answer);
            return answer;
        }
        const answer = (await requestStreamingResponse(requestConfig, {
            model: requestConfig.model,
            input: toResponseInput(withSystemMessage(requestConfig, messages)),
        }, onDelta, options)).content || "没有返回内容";
        if (answer === "没有返回内容") onDelta(answer);
        return answer;
    } catch (error) {
        throw new Error(readAxiosError(error, "请求失败"));
    }
}

export async function requestToolResponse(config: AiConfig, messages: ResponseInputMessage[], tools: ResponseFunctionTool[], toolChoice: ToolChoice = "auto", onDelta?: (text: string) => void, options?: RequestOptions): Promise<ToolResponseResult> {
    const requestConfig = resolveModelRequestConfig(config, config.model || config.textModel);
    try {
        if (requestConfig.apiFormat === "gemini") {
            return await requestGeminiStreamingResponse(requestConfig, toGeminiBody(requestConfig, messages, tools.length ? toGeminiToolOptions(tools, toolChoice) : undefined), onDelta, options);
        }
        const requestBody = {
            model: requestConfig.model,
            input: toResponseInput(withSystemMessage(requestConfig, messages)),
            ...(tools.length
                ? {
                      tools: tools.map(toResponseTool),
                      tool_choice: toolChoice,
                      parallel_tool_calls: false,
                  }
                : {}),
        };
        // 带 tools 的轮次走非流式：见 requestChatCompletionResponse 的实测注释
        if (tools.length) return await requestChatCompletionResponse(requestConfig, requestBody);
        return await requestStreamingResponse(requestConfig, requestBody, onDelta, options);
    } catch (error) {
        throw new Error(readAxiosError(error, "请求失败"));
    }
}

export async function fetchImageModels(config: Pick<AiConfig, "baseUrl" | "apiKey" | "apiFormat">) {
    try {
        if (config.apiFormat === "gemini") {
            const payload = await proxyFetch<GeminiPayload>({
                url: geminiApiUrl({ ...defaultGeminiConfig, ...config }),
                method: "GET",
                headers: geminiHeaders({ ...defaultGeminiConfig, ...config }),
            });
            validateGeminiPayload(payload);
            return (payload.models || [])
                .map((model) => model.name?.replace(/^models\//, ""))
                .filter((id): id is string => Boolean(id))
                .sort((a, b) => a.localeCompare(b));
        }
        const response = await proxyFetch<{ data?: Array<{ id?: string }>; error?: { message?: string } }>({
            url: buildApiUrl(config.baseUrl, "/models"),
            method: "GET",
            headers: { Authorization: `Bearer ${config.apiKey}`, ...proxyHintHeaders({ apiFormat: config.apiFormat, baseUrl: config.baseUrl }) },
        });
        return (response.data || [])
            .map((model) => model.id)
            .filter((id): id is string => Boolean(id))
            .sort((a, b) => a.localeCompare(b));
    } catch (error) {
        throw new Error(readAxiosError(error, "读取模型失败"));
    }
}

export async function fetchChannelModels(channel: ModelChannel) {
    return fetchImageModels({ baseUrl: channel.baseUrl, apiKey: channel.apiKey, apiFormat: channel.apiFormat });
}

const defaultGeminiConfig: Pick<AiConfig, "baseUrl" | "apiKey" | "apiFormat" | "model" | "systemPrompt"> = {
    baseUrl: "https://generativelanguage.googleapis.com",
    apiKey: "",
    apiFormat: "gemini",
    model: "",
    systemPrompt: "",
};
