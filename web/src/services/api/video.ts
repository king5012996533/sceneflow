import axios from "axios";

import { proxyFetch } from "./proxy-client";
import { dataUrlToFile, getDataUrlByteSize } from "@/lib/image-utils";
import { getMediaBlob, uploadMediaFile, type UploadedFile } from "@/services/file-storage";
import { imageToDataUrl } from "@/services/image-storage";
import { boolConfig, buildSeedancePromptText, isSeedanceVideoConfig, normalizeSeedanceDuration, normalizeSeedanceRatio, normalizeSeedanceResolution, seedanceVideoReferenceError, SEEDANCE_REFERENCE_LIMITS } from "@/lib/seedance-video";
import { buildApiUrl, inferProviderHint, modelOptionName, resolveModelRequestConfig, type AiConfig } from "@/stores/use-config-store";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";

type VideoResponse = { id: string; status?: string; error?: { message?: string } };
type ApiVideoResponse = VideoResponse | { code?: number; data?: VideoResponse | null; msg?: string };
type SeedanceTask = {
    id: string;
    status?: "queued" | "running" | "succeeded" | "failed" | "cancelled" | "expired";
    error?: { code?: string; message?: string } | null;
    content?: { video_url?: string; last_frame_url?: string } | null;
};
type ReplicatePrediction = {
    id?: string;
    status?: "starting" | "processing" | "succeeded" | "failed" | "canceled";
    output?: unknown;
    error?: unknown;
    urls?: { get?: string };
};
type ApiEnvelope<T> = T | { code?: number; data?: T | null; msg?: string };
type RequestOptions = { signal?: AbortSignal };

const SEEDANCE_PROXY_IMAGE_MAX_BYTES = 260 * 1024;
const SEEDANCE_PROXY_IMAGE_MAX_SIDE = 768;
const SEEDANCE_PROXY_IMAGE_URL_BUDGET_BYTES = 2_800_000;
const REPLICATE_VIDEO_IMAGE_MAX_BYTES = 900 * 1024;
const REPLICATE_VIDEO_IMAGE_MAX_SIDE = 1280;

export type VideoGenerationResult = { blob?: Blob; url?: string; mimeType?: string };
export type VideoGenerationTask = { id: string; provider: "openai" | "seedance" | "replicate" | "minimax" | "aigccc"; model: string; result?: VideoGenerationResult };
export type VideoGenerationTaskState = { status: "pending" } | { status: "completed"; result: VideoGenerationResult } | { status: "failed"; error: string };

function aiApiUrl(config: AiConfig, path: string) {
    return buildApiUrl(config.baseUrl, path);
}

function aiHeaders(config: AiConfig, contentType?: string) {
    return {
        Authorization: `Bearer ${config.apiKey}`,
        ...proxyHintHeaders(config),
        ...(contentType ? { "Content-Type": contentType } : {}),
    };
}

/** 平台路由提示：x-sf-provider / x-sf-model 让代理按凭证「模型绑定」精确取 Key（与后台能力标定配套） */
function proxyHintHeaders(config: Pick<AiConfig, "apiFormat" | "baseUrl" | "model">) {
    const provider = inferProviderHint(config.apiFormat, config.baseUrl);
    return {
        ...(provider ? { "x-sf-provider": provider } : {}),
        ...(config.model ? { "x-sf-model": modelOptionName(config.model) } : {}),
    };
}

export async function requestVideoGeneration(config: AiConfig, prompt: string, references: ReferenceImage[] = [], videoReferences: ReferenceVideo[] = [], audioReferences: ReferenceAudio[] = [], options?: RequestOptions): Promise<VideoGenerationResult> {
    const task = await createVideoGenerationTask(config, prompt, references, videoReferences, audioReferences, options);
    if (task.result) return task.result;
    const delayMs = task.provider === "aigccc" ? 5000 : task.provider === "seedance" ? 5000 : task.provider === "replicate" ? 1500 : task.provider === "minimax" ? 10000 : 2500;
    for (let attempt = 0; attempt < 120; attempt += 1) {
        if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        const state = await pollVideoGenerationTask(config, task, options);
        if (state.status === "completed") return state.result;
        if (state.status === "failed") throw new Error(state.error);
        if (attempt === 119) throw new Error(`${task.provider === "seedance" ? "Seedance " : ""}视频生成超时，请稍后重试`);
        await delay(delayMs, options?.signal);
    }
    throw new Error("视频生成超时，请稍后重试");
}

export async function createVideoGenerationTask(config: AiConfig, prompt: string, references: ReferenceImage[] = [], videoReferences: ReferenceVideo[] = [], audioReferences: ReferenceAudio[] = [], options?: RequestOptions): Promise<VideoGenerationTask> {
    const selectedModel = (config.videoModel || config.model).trim();
    const requestConfig = resolveModelRequestConfig(config, selectedModel);
    assertVideoConfig(requestConfig, requestConfig.model);
    if (requestConfig.apiFormat === "aigccc") {
        // Aigccc（Seedance 2.0 第三方网关）必须优先于 isSeedanceVideoConfig 判断（模型能力标定为 seedance-video 时会命中 seedance 分支）
        return createAigcccVideoTask(requestConfig, selectedModel, prompt, references, videoReferences, audioReferences, options);
    }
    if (requestConfig.apiFormat === "replicate") {
        // Replicate 先于 seedance 启发式：凭证格式是权威依据，模型名含 seedance 也必须走 /v1/predictions
        return createReplicateVideoTask(requestConfig, selectedModel, prompt, references, videoReferences, audioReferences, options);
    }
    if (requestConfig.apiFormat === "minimax") {
        return createMiniMaxVideoTask(requestConfig, selectedModel, prompt, references, videoReferences, audioReferences, options);
    }
    if (isSeedanceVideoConfig(requestConfig)) {
        return createSeedanceTask(requestConfig, selectedModel, prompt, references, videoReferences, audioReferences, options);
    }
    if (videoReferences.length || audioReferences.length) {
        throw new Error("当前视频接口不支持参考视频或参考音频，请切换到 Seedance 2.0 / 火山 Agent Plan 模型，或移除参考素材");
    }
    return createOpenAIVideoTask(requestConfig, selectedModel, prompt, references, options);
}

export async function pollVideoGenerationTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationTaskState> {
    const requestConfig = resolveModelRequestConfig(config, task.model);
    assertVideoConfig(requestConfig, requestConfig.model);
    if (task.provider === "aigccc") return pollAigcccVideoTask(requestConfig, task, options);
    if (task.provider === "seedance") return pollSeedanceTask(requestConfig, task, options);
    if (task.provider === "replicate") return pollReplicateVideoTask(requestConfig, task, options);
    if (task.provider === "minimax") return pollMiniMaxVideoTask(requestConfig, task, options);
    return pollOpenAIVideoTask(requestConfig, task, options);
}

export async function storeGeneratedVideo(result: VideoGenerationResult): Promise<UploadedFile> {
    if (result.blob) return uploadMediaFile(result.blob, "video");
    if (result.url) return { url: result.url, storageKey: "", bytes: 0, mimeType: result.mimeType || "video/mp4" };
    throw new Error("视频接口没有返回可播放的视频");
}

async function createOpenAIVideoTask(config: AiConfig, model: string, prompt: string, references: ReferenceImage[], options?: RequestOptions): Promise<VideoGenerationTask> {
    const formData = new FormData();
    formData.set("model", modelOptionName(model));
    formData.set("prompt", prompt);
    formData.set("seconds", normalizeVideoSeconds(config.videoSeconds));
    if (normalizeVideoSize(config.size)) formData.set("size", normalizeVideoSize(config.size)!);
    formData.set("resolution_name", normalizeVideoResolution(config.vquality));
    formData.set("preset", "normal");
    const files = await Promise.all(references.slice(0, 7).map(async (image) => dataUrlToFile({ ...image, dataUrl: await imageToDataUrl(image) })));
    files.forEach((file) => formData.append("input_reference[]", file));
    try {
        // OpenAI 视频接口是 multipart/form-data，走 form-data 代理（平台 Key 由服务端注入）
        formData.set("_proxy_url", aiApiUrl(config, "/videos"));
        formData.set("_proxy_method", "POST");
        formData.set("_proxy_headers", JSON.stringify(aiHeaders(config)));
        const response = await fetch("/canvas/api/proxy/form-data", {
            method: "POST",
            body: formData,
            credentials: "include",
            signal: options?.signal,
        });
        const data = (await response.json().catch(() => null)) as ApiVideoResponse | null;
        if (!response.ok) {
            const payload = (data ?? {}) as { error?: { message?: string }; msg?: string };
            throw new Error(normalizeUpstreamError(payload.msg || payload.error?.message || statusMessage(response.status, "视频任务创建失败")));
        }
        const created = unwrapVideoResponse(data ?? {});
        if (!created.id) throw new Error("视频接口没有返回任务 ID");
        return { id: created.id, provider: "openai", model };
    } catch (error) {
        throw new Error(readAxiosError(error, "视频任务创建失败"));
    }
}

async function pollOpenAIVideoTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationTaskState> {
    try {
        const video = unwrapVideoResponse(await proxyFetch<ApiVideoResponse>({ url: aiApiUrl(config, `/videos/${task.id}`), method: "GET", headers: aiHeaders(config) }));
        if (video.status === "completed") {
            const blob = await proxyFetch<Blob>({ url: aiApiUrl(config, `/videos/${task.id}/content`), method: "GET", headers: aiHeaders(config), responseType: "blob" });
            await assertVideoBlob(blob);
            return { status: "completed", result: { blob } };
        }
        if (video.status === "failed" || video.status === "cancelled") return { status: "failed", error: video.error?.message || "视频生成失败" };
        return { status: "pending" };
    } catch (error) {
        throw new Error(readAxiosError(error, "视频任务查询失败"));
    }
}

async function createSeedanceTask(config: AiConfig, model: string, prompt: string, references: ReferenceImage[], videoReferences: ReferenceVideo[], audioReferences: ReferenceAudio[], options?: RequestOptions): Promise<VideoGenerationTask> {
    if (audioReferences.length && !references.length && !videoReferences.length) {
        throw new Error("Seedance 参考音频不能单独使用，请同时添加参考图或参考视频");
    }
    assertSeedanceVideoReferences(videoReferences);
    assertSeedanceAudioReferences(audioReferences);
    const content = await buildSeedanceContent(config, prompt, references, videoReferences, audioReferences);
    if (!content.length) throw new Error("请输入视频提示词，或连接参考图片/视频/音频");
    const payload = {
        model: modelOptionName(model),
        content,
        ratio: normalizeSeedanceRatio(config.size),
        resolution: normalizeSeedanceResolution(config.vquality, modelOptionName(model)),
        duration: normalizeSeedanceDuration(config.videoSeconds),
        generate_audio: boolConfig(config.videoGenerateAudio, true),
        watermark: boolConfig(config.videoWatermark, false),
    };

    try {
        const data = await proxyFetch<ApiEnvelope<SeedanceTask>>({
            url: seedanceApiUrl(config),
            method: "POST",
            headers: aiHeaders(config, "application/json"),
            body: payload,
        });
        const created = unwrapSeedanceTask(data);
        if (!created.id) throw new Error("Seedance 接口没有返回任务 ID");
        return { id: created.id, provider: "seedance", model };
    } catch (error) {
        throw new Error(readAxiosError(error, "Seedance 任务创建失败"));
    }
}

async function pollSeedanceTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationTaskState> {
    try {
        const state = unwrapSeedanceTask(
            await proxyFetch<ApiEnvelope<SeedanceTask>>({
                url: seedanceApiUrl(config, task.id),
                method: "GET",
                headers: aiHeaders(config),
            }),
        );
        if (state.status === "succeeded") {
            const url = state.content?.video_url;
            if (!url) return { status: "failed", error: "Seedance 任务成功但没有返回视频 URL" };
            return { status: "completed", result: await videoResultFromUrl(url, options) };
        }
        if (state.status === "failed" || state.status === "cancelled" || state.status === "expired") return { status: "failed", error: state.error?.message || `Seedance 视频生成${state.status === "expired" ? "超时" : "失败"}` };
        return { status: "pending" };
    } catch (error) {
        throw new Error(readAxiosError(error, "Seedance 任务查询失败"));
    }
}

// ---------- MiniMax（Hailuo / H3，原生 REST 接口）----------

function minimaxApiUrl(config: AiConfig, path: string) {
    let base = config.baseUrl.trim().replace(/\/+$/, "");
    if (base.toLowerCase().endsWith("/v1")) base = base.slice(0, -3);
    return `${base}${path}`;
}

function minimaxModelName(model: string) {
    const value = modelOptionName(model).trim();
    if (value.toLowerCase().includes("h3")) return "MiniMax-H3";
    throw new Error("MiniMax 渠道目前仅支持 MiniMax-H3（V2 接口），请把模型名设置为 MiniMax-H3 或 H3");
}

function minimaxRatio(value: string): string | undefined {
    if (!value || value === "auto") return undefined;
    const match = value.match(/^(\d+):(\d+)$/);
    if (!match) return undefined;
    const ratio = `${Number(match[1])}:${Number(match[2])}`;
    return ["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"].includes(ratio) ? ratio : "16:9";
}

function minimaxDuration(value: string) {
    return Math.min(15, Math.max(4, Math.round(Number(value) || 6)));
}

function readMiniMaxBaseResp(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") return null;
    const base = (payload as { base_resp?: { status_code?: number; status_msg?: string } }).base_resp;
    if (base && typeof base.status_code === "number" && base.status_code !== 0) {
        return base.status_msg || `MiniMax 错误 ${base.status_code}`;
    }
    return null;
}

async function resolveMiniMaxImageUrl(image: ReferenceImage) {
    const directUrl = image.url || image.dataUrl;
    if (isPublicMediaUrl(directUrl)) return directUrl;
    const dataUrl = await imageToDataUrl(image);
    if (!dataUrl) throw new Error("参考图读取失败，请换一张图片或重新上传");
    return dataUrl;
}

async function resolveMiniMaxVideoUrl(video: ReferenceVideo) {
    if (isPublicMediaUrl(video.url) || video.url.startsWith("asset://")) return video.url;
    let blob: Blob | null = null;
    if (video.storageKey) blob = await getMediaBlob(video.storageKey!);
    if (!blob && video.url?.startsWith("blob:")) blob = await (await fetch(video.url!)).blob();
    if (!blob) throw new Error("参考视频必须是公网 URL、素材 ID，或本地已保存的视频");
    return blobToDataUrl(blob!);
}

async function resolveMiniMaxAudioUrl(audio: ReferenceAudio) {
    if (isPublicMediaUrl(audio.url) || audio.url.startsWith("asset://")) return audio.url;
    let blob: Blob | null = null;
    if (audio.storageKey) blob = await getMediaBlob(audio.storageKey!);
    if (!blob && audio.url?.startsWith("blob:")) blob = await (await fetch(audio.url!)).blob();
    if (!blob) throw new Error("参考音频必须是公网 URL、素材 ID，或本地已保存的音频");
    return blobToDataUrl(blob!);
}

async function createMiniMaxVideoTask(config: AiConfig, model: string, prompt: string, references: ReferenceImage[], videoReferences: ReferenceVideo[], audioReferences: ReferenceAudio[], options?: RequestOptions): Promise<VideoGenerationTask> {
    const content: Array<Record<string, unknown>> = [{ type: "text", text: prompt }];
    const images = references.slice(0, 9);
    // 单张参考图当作首帧(I2V), 多张则全部作为分镜参考图; H3 不允许首帧与参考输入混用
    const isFirstFrame = images.length === 1 && !videoReferences.length && !audioReferences.length;
    for (const image of images) {
        content.push({ type: "image_url", image_url: { url: await resolveMiniMaxImageUrl(image) }, role: isFirstFrame ? "first_frame" : "reference_image" });
    }
    for (const video of videoReferences.slice(0, 3)) {
        content.push({ type: "video_url", video_url: { url: await resolveMiniMaxVideoUrl(video) }, role: "reference_video" });
    }
    for (const audio of audioReferences.slice(0, 3)) {
        content.push({ type: "audio_url", audio_url: { url: await resolveMiniMaxAudioUrl(audio) }, role: "reference_audio" });
    }
    const payload = {
        model: minimaxModelName(model),
        content,
        resolution: "2K",
        duration: minimaxDuration(config.videoSeconds),
        ratio: minimaxRatio(config.size) ?? (images.length ? "adaptive" : "16:9"),
    };
    try {
        const data = await proxyFetch<{ task_id?: string; base_resp?: { status_code?: number; status_msg?: string } }>({
            url: minimaxApiUrl(config, "/v2/video_generation"),
            method: "POST",
            headers: aiHeaders(config, "application/json"),
            body: payload,
        });
        const baseError = readMiniMaxBaseResp(data);
        if (baseError) throw new Error(baseError);
        if (!data.task_id) throw new Error("MiniMax 接口没有返回任务 ID");
        return { id: data.task_id, provider: "minimax", model };
    } catch (error) {
        throw new Error(readAxiosError(error, "MiniMax 任务创建失败"));
    }
}

async function pollMiniMaxVideoTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationTaskState> {
    try {
        const data = await proxyFetch<{ task?: { status?: string; error?: { code?: string; message?: string } | null; content?: { url?: string } | null } }>({
            url: minimaxApiUrl(config, `/v2/query/video_generation/${encodeURIComponent(task.id)}`),
            method: "GET",
            headers: aiHeaders(config),
        });
        const miniMaxTask = data.task;
        if (!miniMaxTask) return { status: "pending" };
        if (miniMaxTask.status === "succeeded") {
            const url = miniMaxTask.content?.url;
            if (!url) return { status: "failed", error: "MiniMax 任务成功但没有返回视频 URL" };
            return { status: "completed", result: await videoResultFromUrl(url, options) };
        }
        if (miniMaxTask.status === "failed" || miniMaxTask.status === "cancelled" || miniMaxTask.status === "expired") {
            const reason = miniMaxTask.error?.message || miniMaxTask.error?.code || `MiniMax 视频生成${miniMaxTask.status === "expired" ? "超时" : "失败"}`;
            return { status: "failed", error: reason };
        }
        return { status: "pending" };
    } catch (error) {
        throw new Error(readAxiosError(error, "MiniMax 任务查询失败"));
    }
}

// ---------- Aigccc（Seedance 2.0 第三方网关，自有 REST 接口：/api/external/v1/...）----------

type AigcccEnvelope<T> = { code?: number; message?: string; data?: T | null; trace_id?: string };

const AIGCCC_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;
const AIGCCC_UPLOAD_MAX_SIDE = 2048;

function aigcccApiUrl(config: AiConfig, path: string) {
    // 网关路径是根路径下的绝对路径（/api/external/v1/...），不能套用 buildApiUrl 的 /v1 拼接规则
    const base = config.baseUrl.trim().replace(/\/+$/, "");
    return `${base}${path}`;
}

function aigcccHeaders(config: Pick<AiConfig, "apiFormat" | "baseUrl" | "model">) {
    return { ...proxyHintHeaders(config), "Content-Type": "application/json" };
}

function aigcccRatio(value: string) {
    if (!value || value === "auto" || value === "adaptive") return "16:9";
    const match = value.match(/^(\d+)[:x](\d+)$/i);
    if (match) {
        const w = Number(match[1]);
        const h = Number(match[2]);
        if (w && h) {
            const divisor = gcd(w, h);
            const ratio = `${w / divisor}:${h / divisor}`;
            if (["21:9", "16:9", "4:3", "1:1", "3:4", "9:16"].includes(ratio)) return ratio;
        }
    }
    return "16:9";
}

function aigcccDuration(value: string) {
    const seconds = Math.round(Number(value) || 5);
    if (!Number.isFinite(seconds) || seconds <= 0) return 5;
    return Math.min(15, Math.max(4, seconds));
}

function aigcccResolution(value: string) {
    // 网关实际输出最高 720p（1080p/更高会被静默降级），创建前直接钳制，避免「选了 1080p 实际出 720p」
    if (value === "low") return "480p";
    if (value === "high" || value === "auto" || value === "medium") return "720p";
    const resolution = Math.floor(Number(value.replace(/p$/i, "")) || 720);
    return `${Math.min(720, Math.max(480, resolution))}p`;
}

function unwrapAigccc<T>(payload: AigcccEnvelope<T>): T {
    if (!payload || typeof payload !== "object") throw new Error("Aigccc 接口没有返回数据");
    if (payload.code !== 0 || !payload.data) {
        const trace = payload.trace_id ? ` Trace id: ${payload.trace_id}` : "";
        throw new Error(`${payload.message || `Aigccc 错误 ${payload.code}`}${trace}`);
    }
    return payload.data;
}

async function createAigcccVideoTask(config: AiConfig, model: string, prompt: string, references: ReferenceImage[], videoReferences: ReferenceVideo[], audioReferences: ReferenceAudio[], options?: RequestOptions): Promise<VideoGenerationTask> {
    if (!prompt.trim() && !references.length && !videoReferences.length && !audioReferences.length) {
        throw new Error("请输入视频提示词，或连接参考图片/视频/音频");
    }
    assertSeedanceVideoReferences(videoReferences);
    assertSeedanceAudioReferences(audioReferences);
    const payload: Record<string, unknown> = {
        prompt: prompt.trim(),
        mode: "pro",
        resolution: aigcccResolution(config.vquality),
        ratio: aigcccRatio(config.size),
        duration: aigcccDuration(config.videoSeconds),
    };
    const images = references.slice(0, 9);
    if (images.length) {
        payload.images = (await uploadAigcccImages(config, images, options?.signal)).map((url) => ({ url }));
    }
    if (videoReferences.length) {
        payload.videos = videoReferences.slice(0, 3).map((video) => ({ url: aigcccReferenceUrl(video.url, "参考视频必须是公网 URL 或已上传的素材链接") }));
    }
    if (audioReferences.length) {
        payload.audios = audioReferences.slice(0, 3).map((audio) => ({ url: aigcccReferenceUrl(audio.url, "参考音频必须是公网 URL 或已上传的素材链接") }));
    }
    try {
        const data = await proxyFetch<AigcccEnvelope<{ task_id?: string; estimated_credits?: number }>>({
            url: aigcccApiUrl(config, "/api/external/v1/video/task/create"),
            method: "POST",
            headers: aigcccHeaders(config),
            body: payload,
        });
        const created = unwrapAigccc(data);
        if (!created.task_id) throw new Error("Aigccc 接口没有返回任务 ID");
        return { id: created.task_id, provider: "aigccc", model };
    } catch (error) {
        throw new Error(readAxiosError(error, "Aigccc 任务创建失败"));
    }
}

async function pollAigcccVideoTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationTaskState> {
    try {
        const state = unwrapAigccc(
            await proxyFetch<AigcccEnvelope<{ status?: string; video_url?: string; duration?: number; error?: string }>>({
                url: aigcccApiUrl(config, "/api/external/v1/video/task/status"),
                method: "POST",
                headers: aigcccHeaders(config),
                body: { task_id: task.id },
            }),
        );
        if (state.status === "succeeded") {
            if (!state.video_url) return { status: "failed", error: "Aigccc 任务成功但没有返回视频 URL" };
            return { status: "completed", result: await videoResultFromUrl(state.video_url, options) };
        }
        if (state.status === "failed") return { status: "failed", error: state.error || "Aigccc 视频生成失败" };
        return { status: "pending" };
    } catch (error) {
        throw new Error(readAxiosError(error, "Aigccc 任务查询失败"));
    }
}

// 本地参考图压缩后上传到网关临时存储（每次一图，规避网关按 key 的并发上传限流）
async function uploadAigcccImages(config: AiConfig, images: ReferenceImage[], signal?: AbortSignal) {
    const urls: string[] = [];
    for (const image of images) {
        const directUrl = image.url || image.dataUrl;
        if (isPublicMediaUrl(directUrl)) {
            urls.push(directUrl);
            continue;
        }
        const dataUrl = await imageToDataUrl(image);
        if (!dataUrl) throw new Error("参考图读取失败，请换一张图片或重新上传");
        const compressed = await compressImageDataUrl(dataUrl, AIGCCC_UPLOAD_MAX_BYTES, AIGCCC_UPLOAD_MAX_SIDE);
        const file = await dataUrlToFile({ ...image, dataUrl: compressed });
        urls.push(await uploadAigcccImage(config, file, signal));
    }
    return urls;
}

async function uploadAigcccImage(config: AiConfig, file: File, signal?: AbortSignal) {
    const formData = new FormData();
    formData.append("files", file, file.name || "reference.jpg");
    formData.set("_proxy_url", aigcccApiUrl(config, "/api/external/v1/image/upload/batch"));
    formData.set("_proxy_method", "POST");
    formData.set("_proxy_headers", JSON.stringify(proxyHintHeaders(config)));
    const response = await fetch("/canvas/api/proxy/form-data", {
        method: "POST",
        body: formData,
        credentials: "include",
        signal,
    });
    const data = (await response.json().catch(() => null)) as { success?: boolean; message?: string; data?: Array<{ url?: string }> } | null;
    if (!response.ok || !data?.success) {
        throw new Error(data?.message || statusMessage(response.status, "参考图上传失败"));
    }
    const uploaded = data.data?.[0];
    if (!uploaded?.url) throw new Error("参考图上传失败，请换一张图片或重新上传");
    return uploaded.url;
}

function aigcccReferenceUrl(url: string, message: string) {
    if (!isPublicMediaUrl(url)) throw new Error(message);
    return url;
}

async function createReplicateVideoTask(config: AiConfig, model: string, prompt: string, references: ReferenceImage[], videoReferences: ReferenceVideo[], audioReferences: ReferenceAudio[], options?: RequestOptions): Promise<VideoGenerationTask> {
    const input = await buildReplicateVideoInput(config, model, prompt, references, videoReferences, audioReferences);
    try {
        const prediction = await proxyFetch<ReplicatePrediction>({
            url: replicateApiUrl(config, model),
            method: "POST",
            headers: replicateHeaders(config),
            body: { input },
        });
        if (prediction.status === "succeeded") {
            return { id: prediction.id || "", provider: "replicate", model, result: await videoResultFromUrl(parseReplicateVideoUrl(prediction), options) };
        }
        if (!prediction.id) throw new Error("Replicate 接口没有返回任务 ID");
        return { id: prediction.id, provider: "replicate", model };
    } catch (error) {
        throw new Error(readAxiosError(error, "Replicate 视频任务创建失败"));
    }
}

async function pollReplicateVideoTask(config: AiConfig, task: VideoGenerationTask, options?: RequestOptions): Promise<VideoGenerationTaskState> {
    try {
        const state = await proxyFetch<ReplicatePrediction>({
            url: replicatePredictionUrl(config, task),
            method: "GET",
            headers: { Authorization: `Bearer ${config.apiKey}`, ...proxyHintHeaders(config) },
        });
        if (state.status === "succeeded") return { status: "completed", result: await videoResultFromUrl(parseReplicateVideoUrl(state), options) };
        if (state.status === "failed" || state.status === "canceled") return { status: "failed", error: readReplicateError(state.error) };
        return { status: "pending" };
    } catch (error) {
        throw new Error(readAxiosError(error, "Replicate 视频任务查询失败"));
    }
}

async function buildReplicateVideoInput(config: AiConfig, model: string, prompt: string, references: ReferenceImage[], videoReferences: ReferenceVideo[], audioReferences: ReferenceAudio[]) {
    const input: Record<string, unknown> = { prompt };
    const modelName = modelOptionName(model).toLowerCase();
    const aspectRatio = normalizeReplicateAspectRatio(config.size);
    if (aspectRatio) input.aspect_ratio = aspectRatio;

    const seconds = Number(normalizeVideoSeconds(config.videoSeconds));
    if (Number.isFinite(seconds)) input.duration = seconds;

    const resolution = normalizeReplicateResolution(config.vquality, modelName);
    if (resolution) input.resolution = resolution;

    // Seedance 2.0：支持多张参考图 + 参考视频 + 参考音频（与火山 Agent API 同一套多模态输入）
    if (modelName.includes("seedance") || modelName.includes("doubao-seedance")) {
        if (audioReferences.length && !references.length && !videoReferences.length) {
            throw new Error("Seedance 参考音频不能单独使用，请同时添加参考图或参考视频");
        }
        assertSeedanceVideoReferences(videoReferences);
        assertSeedanceAudioReferences(audioReferences);
        input.generate_audio = boolConfig(config.videoGenerateAudio, true);
        const images = references.slice(0, SEEDANCE_REFERENCE_LIMITS.images);
        if (images.length === 1 && !videoReferences.length && !audioReferences.length) {
            const imageUrl = await resolveReplicateVideoImageInput(images[0]);
            if (imageUrl) input.image = imageUrl;
        } else if (images.length) {
            input.reference_images = await Promise.all(images.map((image) => resolveReplicateVideoImageInput(image)));
        }
        if (videoReferences.length) {
            input.reference_videos = await Promise.all(videoReferences.slice(0, SEEDANCE_REFERENCE_LIMITS.videos).map((video) => resolveReplicateReferenceFile(config, video)));
        }
        if (audioReferences.length) {
            input.reference_audios = await Promise.all(audioReferences.slice(0, SEEDANCE_REFERENCE_LIMITS.audios).map((audio) => resolveReplicateReferenceFile(config, audio)));
        }
        return input;
    }

    // 其它 Replicate 视频模型：仅支持提示词 + 首帧参考图
    if (videoReferences.length || audioReferences.length) {
        throw new Error("当前 Replicate 视频模型只支持提示词和参考图，参考视频/音频仅 bytedance/seedance-2.0 支持");
    }

    if (modelName.includes("prunaai/p-video")) {
        // draft=true（默认）走低质量预览：更快更便宜；关掉后走完整推理，质量更好
        input.draft = boolConfig(config.videoDraft, true);
        input.fps = 24;
        input.prompt_upsampling = true;
        input.save_audio = boolConfig(config.videoGenerateAudio, true);
    }

    const firstReference = references[0];
    if (firstReference) {
        const imageUrl = await resolveReplicateVideoImageInput(firstReference);
        if (imageUrl) {
            const key = replicateImageInputKey(model);
            input[key] = imageUrl;
        }
    }

    return input;
}

// Replicate 参考视频/音频：公网 URL 直接用；本地文件先上传到 Replicate Files API 拿临时 URL（数据 URI 对视频/音频体积不现实）
const REPLICATE_REFERENCE_MAX_BYTES = 30 * 1024 * 1024;

async function resolveReplicateReferenceFile(config: AiConfig, file: ReferenceVideo | ReferenceAudio) {
    const directUrl = file.url || "";
    if (isPublicMediaUrl(directUrl)) return directUrl;
    let blob: Blob | null = null;
    if (file.storageKey) blob = await getMediaBlob(file.storageKey);
    if (!blob && directUrl.startsWith("blob:")) blob = await (await fetch(directUrl)).blob();
    if (!blob) throw new Error("参考素材读取失败，请重新上传或改用公网 URL");
    if (blob.size > REPLICATE_REFERENCE_MAX_BYTES) {
        throw new Error(`参考素材 ${(blob.size / 1024 / 1024).toFixed(1)}MB 超过 30MB 限制，请压缩后重试或改用公网 URL`);
    }
    return uploadReplicateFile(config, blob);
}

async function uploadReplicateFile(config: AiConfig, blob: Blob) {
    const dataUrl = await blobToDataUrl(blob);
    const base64 = dataUrl.includes(",") ? dataUrl.split(",", 2)[1] : dataUrl;
    if (!base64) throw new Error("参考素材读取失败，请重新上传");
    const result = await proxyFetch<{ urls?: { get?: string } }>({
        url: buildApiUrl(config.baseUrl, "/files"),
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            ...proxyHintHeaders(config),
            "Content-Type": blob.type || "application/octet-stream",
        },
        bodyBase64: base64,
    });
    const uploaded = result?.urls?.get;
    if (!uploaded) throw new Error("参考素材上传 Replicate 失败，请重试");
    return uploaded;
}

function normalizeReplicateResolution(value: string, model: string) {
    const resolution = normalizeVideoResolution(value);
    if (model.includes("prunaai/p-video")) return resolution === "1080p" ? "1080p" : "720p";
    return resolution;
}

function replicateApiUrl(config: Pick<AiConfig, "baseUrl">, model: string) {
    const baseUrl = config.baseUrl.trim().replace(/\/+$/, "");
    const cleanModel = modelOptionName(model)
        .trim()
        .replace(/^replicate:/i, "");
    const [owner, name] = cleanModel.split("/", 2);
    if (!owner || !name) throw new Error("Replicate 模型名必须使用 owner/model 格式，例如 google/veo-3 或 kling-ai/kling-v1.6-standard");
    return `${baseUrl}/models/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/predictions`;
}

function replicatePredictionUrl(config: Pick<AiConfig, "baseUrl">, task: VideoGenerationTask) {
    const baseUrl = config.baseUrl.trim().replace(/\/+$/, "");
    return `${baseUrl}/predictions/${encodeURIComponent(task.id)}`;
}

function replicateHeaders(config: Pick<AiConfig, "apiKey" | "apiFormat" | "baseUrl" | "model">) {
    return {
        Authorization: `Bearer ${config.apiKey}`,
        ...proxyHintHeaders(config),
        "Content-Type": "application/json",
    };
}

function replicateImageInputKey(model: string) {
    const value = modelOptionName(model).toLowerCase();
    if (value.includes("kling")) return "start_image";
    if (value.includes("minimax")) return "first_frame_image";
    if (value.includes("hailuo")) return "image";
    if (value.includes("wan")) return "image";
    return "image";
}

async function resolveReplicateVideoImageInput(image: ReferenceImage) {
    const directUrl = image.url || image.dataUrl;
    if (isPublicMediaUrl(directUrl)) return directUrl;
    const dataUrl = await imageToDataUrl(image);
    if (!dataUrl) throw new Error("参考图读取失败，请换一张图片或重新上传");
    if (!dataUrl.startsWith("data:image/")) return dataUrl;
    if (getDataUrlByteSize(dataUrl) <= REPLICATE_VIDEO_IMAGE_MAX_BYTES) return dataUrl;
    return compressImageDataUrl(dataUrl, REPLICATE_VIDEO_IMAGE_MAX_BYTES, REPLICATE_VIDEO_IMAGE_MAX_SIDE);
}

function normalizeReplicateAspectRatio(value: string) {
    if (!value || value === "auto") return undefined;
    if (/^\d+:\d+$/.test(value)) return value;
    const match = value.match(/^(\d+)x(\d+)$/);
    if (!match) return undefined;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!width || !height) return undefined;
    const divisor = gcd(width, height);
    return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
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

function parseReplicateVideoUrl(payload: ReplicatePrediction) {
    if (payload.status === "failed" || payload.status === "canceled") throw new Error(readReplicateError(payload.error));
    const url = findFirstUrl(payload.output);
    if (!url) throw new Error("Replicate 接口没有返回视频 URL");
    return url;
}

function findFirstUrl(value: unknown): string | null {
    if (typeof value === "string") return /^https?:\/\//i.test(value) ? value : null;
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = findFirstUrl(item);
            if (found) return found;
        }
        return null;
    }
    if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        for (const key of ["url", "video", "output", "file"]) {
            const found = findFirstUrl(record[key]);
            if (found) return found;
        }
    }
    return null;
}

function readReplicateError(error: unknown) {
    if (typeof error === "string" && error) return error;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
    return "Replicate 视频生成失败";
}

function assertSeedanceVideoReferences(videoReferences: ReferenceVideo[]) {
    const error = seedanceVideoReferenceError(videoReferences);
    if (error) throw new Error(error);
    let total = 0;
    for (const video of videoReferences) {
        if (!video.durationMs) continue;
        if (video.durationMs < 2000 || video.durationMs > 15000) throw new Error("Seedance 参考视频单个时长需要在 2-15 秒之间");
        total += video.durationMs;
    }
    if (total > 15000) throw new Error("Seedance 参考视频总时长不能超过 15 秒");
}

function assertSeedanceAudioReferences(audioReferences: ReferenceAudio[]) {
    let total = 0;
    for (const audio of audioReferences) {
        if (!audio.durationMs) continue;
        if (audio.durationMs < 2000 || audio.durationMs > 15000) throw new Error("Seedance 参考音频单个时长需要在 2-15 秒之间");
        total += audio.durationMs;
    }
    if (total > 15000) throw new Error("Seedance 参考音频总时长不能超过 15 秒");
}

function seedanceApiUrl(config: AiConfig, taskId?: string) {
    // 防呆：该路径是火山 Seedance 的任务接口（/contents/generations/tasks），
    // 只有 seedance / 火山类渠道能走到；Replicate / MiniMax / Aigccc 凭证若被误路由到此处
    // 上游会 404，这里直接抛出明确错误，避免把请求打到不存在的路径。
    if (config.apiFormat === "replicate" || config.apiFormat === "minimax" || config.apiFormat === "aigccc") {
        throw new Error(`视频渠道 ${config.apiFormat} 不应使用 Seedance 任务接口，请检查模型与凭证的绑定`);
    }
    const base = config.baseUrl.trim().replace(/\/+$/, "");
    const taskPath = "/contents/generations/tasks";
    const lowerBase = base.toLowerCase();
    if (lowerBase.endsWith(taskPath) || lowerBase.endsWith(`${taskPath}/`)) return `${base}${taskId ? `/${encodeURIComponent(taskId)}` : ""}`;
    return buildApiUrl(config.baseUrl, `/contents/generations/tasks${taskId ? `/${encodeURIComponent(taskId)}` : ""}`);
}

async function buildSeedanceContent(config: AiConfig, prompt: string, references: ReferenceImage[], videoReferences: ReferenceVideo[], audioReferences: ReferenceAudio[]) {
    const content: Array<Record<string, unknown>> = [];
    const resolvedImages = await resolveSeedanceImageUrls(config, references.slice(0, SEEDANCE_REFERENCE_LIMITS.images));
    const usedImageRefs = references.slice(0, resolvedImages.urls.length);
    const droppedImageCount = Math.max(0, Math.min(references.length, SEEDANCE_REFERENCE_LIMITS.images) - resolvedImages.urls.length);
    const text = [
        buildSeedancePromptText(prompt, usedImageRefs, videoReferences, audioReferences),
        droppedImageCount ? `注意：为避免请求内容过大，本次仅使用前 ${resolvedImages.urls.length} 张参考图，已忽略后续 ${droppedImageCount} 张。若需要更多镜头参考，请先用“分镜容器/拼图”合成一张参考图，或使用公网素材 URL。` : "",
    ]
        .filter(Boolean)
        .join("\n\n");
    if (text) content.push({ type: "text", text });
    for (const url of resolvedImages.urls) {
        content.push({ type: "image_url", image_url: { url }, role: "reference_image" });
    }
    for (const video of videoReferences.slice(0, SEEDANCE_REFERENCE_LIMITS.videos)) {
        content.push({ type: "video_url", video_url: { url: await resolveSeedanceVideoUrl(video) }, role: "reference_video" });
    }
    for (const audio of audioReferences.slice(0, SEEDANCE_REFERENCE_LIMITS.audios)) {
        content.push({ type: "audio_url", audio_url: { url: await resolveSeedanceAudioUrl(audio) }, role: "reference_audio" });
    }
    return content;
}

async function resolveSeedanceImageUrls(config: AiConfig, references: ReferenceImage[]) {
    const urls: string[] = [];
    let totalBytes = 0;
    for (const image of references) {
        const url = await resolveSeedanceImageUrl(config, image);
        const byteLength = new TextEncoder().encode(url).byteLength;
        if (urls.length && totalBytes + byteLength > SEEDANCE_PROXY_IMAGE_URL_BUDGET_BYTES) break;
        urls.push(url);
        totalBytes += byteLength;
    }
    return { urls, totalBytes };
}

async function resolveSeedanceImageUrl(config: AiConfig, image: ReferenceImage) {
    const directUrl = image.url || image.dataUrl;
    if (isPublicMediaUrl(directUrl) || directUrl.startsWith("asset://")) return directUrl;
    const dataUrl = await imageToDataUrl(image);
    if (!dataUrl) throw new Error("参考图读取失败，请换一张图片或重新上传");
    return compressSeedanceImageDataUrl(dataUrl);
}

async function resolveSeedanceVideoUrl(video: ReferenceVideo) {
    if (isPublicMediaUrl(video.url) || video.url.startsWith("asset://")) return video.url;
    throw new Error("Seedance reference videos must use a public URL or Volcengine asset:// URL. Local videos are too large for the proxy; upload them first and use the returned URL.");
    let blob: Blob | null = null;
    if (video.storageKey) blob = await getMediaBlob(video.storageKey!);
    if (!blob && video.url?.startsWith("blob:")) blob = await (await fetch(video.url!)).blob();
    if (!blob) throw new Error("参考视频必须是公网 URL、素材 ID，或本地已保存的视频");
    return blobToDataUrl(blob!);
}

async function resolveSeedanceAudioUrl(audio: ReferenceAudio) {
    if (isPublicMediaUrl(audio.url) || audio.url.startsWith("asset://")) return audio.url;
    throw new Error("Seedance reference audio must use a public URL or Volcengine asset:// URL. Local audio is too large for the proxy; upload it first and use the returned URL.");
    let blob: Blob | null = null;
    if (audio.storageKey) blob = await getMediaBlob(audio.storageKey!);
    if (!blob && audio.url?.startsWith("blob:")) blob = await (await fetch(audio.url!)).blob();
    if (!blob) throw new Error("参考音频必须是公网 URL、素材 ID，或本地已保存的音频");
    return blobToDataUrl(blob!);
}

async function videoResultFromUrl(url: string, options?: RequestOptions): Promise<VideoGenerationResult> {
    try {
        const response = await axios.get<Blob>(url, { responseType: "blob", signal: options?.signal });
        await assertVideoBlob(response.data);
        return { blob: response.data };
    } catch (error) {
        if (axios.isCancel(error) || options?.signal?.aborted) throw error;
        return { url, mimeType: "video/mp4" };
    }
}

function assertVideoConfig(config: AiConfig, model: string) {
    if (!model) throw new Error("请先配置视频模型");
    if (!config.baseUrl.trim()) throw new Error("请先配置 Base URL");
    // 平台 Key 化后不再要求客户端配置 API Key（Key 由服务端注入）
    if (config.apiFormat === "gemini") throw new Error("Gemini 调用格式暂不支持视频生成，请使用 OpenAI 格式渠道");
}

function normalizeVideoSeconds(value: string) {
    const seconds = Math.floor(Number(value) || 6);
    return String(Math.max(1, Math.min(20, seconds)));
}

function normalizeVideoSize(value: string) {
    if (value === "auto") return null;
    const size = value || "1280x720";
    if (/^\d+x\d+$/.test(size)) return size;
    return ["9:16", "2:3", "3:4"].includes(size) ? "720x1280" : "1280x720";
}

function normalizeVideoResolution(value: string) {
    if (value === "low") return "480p";
    if (value === "auto" || value === "high" || value === "medium") return "720p";
    const resolution = value.replace(/p$/i, "") || "720";
    return `${resolution}p`;
}

function unwrapVideoResponse(payload: ApiVideoResponse) {
    return unwrapEnvelope(payload, "接口没有返回视频任务");
}

function unwrapSeedanceTask(payload: ApiEnvelope<SeedanceTask>) {
    return unwrapEnvelope(payload, "Seedance 接口没有返回任务");
}

function unwrapEnvelope<T>(payload: ApiEnvelope<T>, emptyMessage: string): T {
    if (!payload) throw new Error(emptyMessage);
    if (typeof payload === "object" && "code" in payload && typeof payload.code === "number") {
        if (payload.code !== 0) throw new Error(payload.msg || "请求失败");
        if (!payload.data) throw new Error(emptyMessage);
        return payload.data;
    }
    return payload as T;
}

function readAxiosError(error: unknown, fallback: string) {
    if (axios.isCancel(error)) return "请求已取消";
    if (axios.isAxiosError<{ error?: { message?: string }; msg?: string; code?: number }>(error)) {
        const responseData = error.response?.data;
        return normalizeUpstreamError(responseData?.msg || responseData?.error?.message || statusMessage(error.response?.status, fallback));
    }
    if (error instanceof DOMException && error.name === "AbortError") return "请求已取消";
    return normalizeUpstreamError(error instanceof Error ? error.message : fallback);
}

function statusMessage(status: number | undefined, fallback: string) {
    if (status === 401 || status === 403) return "鉴权失败，请检查 API Key 或模型权限";
    if (status === 429) return "请求被限流或额度不足，请稍后重试";
    return status ? `${fallback}（${status}）` : fallback;
}

function normalizeUpstreamError(message: string) {
    if (!message) return message;
    const requestId = message.match(/request id:\s*([a-z0-9]+)/i)?.[1];
    const suffix = requestId ? ` Request id: ${requestId}` : "";
    if (/input image/i.test(message) && /real person/i.test(message)) {
        return `上游安全策略拦截：参考图可能包含真实人物，当前模型不允许用这张图生成视频。请换成二次元/虚拟角色图、三视图设定稿，或降低照片真实感后重试。${suffix}`;
    }
    if (/content policy|safety|moderation/i.test(message)) {
        return `上游安全策略拦截：当前输入或参考素材没有通过模型审核，请调整提示词或更换参考素材后重试。${suffix}`;
    }
    return message;
}

async function assertVideoBlob(blob: Blob) {
    if (!blob.type.includes("json")) return;
    let payload: { code?: number; msg?: string; error?: { message?: string } };
    try {
        payload = JSON.parse(await blob.text()) as { code?: number; msg?: string; error?: { message?: string } };
    } catch {
        return;
    }
    if (typeof payload.code === "number" && payload.code !== 0) throw new Error(payload.msg || "视频下载失败");
    if (payload.error?.message) throw new Error(payload.error.message);
}

function isPublicMediaUrl(value: string) {
    return /^https?:\/\//i.test(value || "");
}

async function compressSeedanceImageDataUrl(dataUrl: string) {
    if (!dataUrl.startsWith("data:image/")) return dataUrl;
    const originalBytes = getDataUrlByteSize(dataUrl);
    const image = await loadImage(dataUrl);
    const { width, height } = fitImageSize(image.naturalWidth || image.width || 1024, image.naturalHeight || image.height || 1024, SEEDANCE_PROXY_IMAGE_MAX_SIDE);
    if (originalBytes <= SEEDANCE_PROXY_IMAGE_MAX_BYTES && width === (image.naturalWidth || image.width) && height === (image.naturalHeight || image.height) && dataUrl.startsWith("data:image/jpeg")) {
        return dataUrl;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return dataUrl;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    let best = await canvasToDataUrl(canvas, 0.86);
    for (const quality of [0.78, 0.68, 0.58, 0.48]) {
        if (getDataUrlByteSize(best) <= SEEDANCE_PROXY_IMAGE_MAX_BYTES) break;
        best = await canvasToDataUrl(canvas, quality);
    }
    return best;
}

async function compressImageDataUrl(dataUrl: string, maxBytes: number, maxSide: number) {
    const image = await loadImage(dataUrl);
    const { width, height } = fitImageSize(image.naturalWidth || image.width || 1024, image.naturalHeight || image.height || 1024, maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return dataUrl;
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    let best = await canvasToDataUrl(canvas, 0.86);
    for (const quality of [0.78, 0.68, 0.58, 0.48, 0.38]) {
        if (getDataUrlByteSize(best) <= maxBytes) break;
        best = await canvasToDataUrl(canvas, quality);
    }
    return best;
}

function fitImageSize(width: number, height: number, maxSide: number) {
    const scale = Math.min(1, maxSide / Math.max(width, height));
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("参考图压缩失败，请换一张图片或重新上传"));
        image.src = src;
    });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, quality: number) {
    return new Promise<string>((resolve) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    resolve(canvas.toDataURL("image/jpeg", quality));
                    return;
                }
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ""));
                reader.onerror = () => resolve(canvas.toDataURL("image/jpeg", quality));
                reader.readAsDataURL(blob);
            },
            "image/jpeg",
            quality,
        );
    });
}

function delay(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
        }
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener(
            "abort",
            () => {
                clearTimeout(timer);
                reject(new DOMException("Aborted", "AbortError"));
            },
            { once: true },
        );
    });
}

function blobToDataUrl(blob: Blob) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("读取本地素材失败"));
        reader.readAsDataURL(blob);
    });
}
