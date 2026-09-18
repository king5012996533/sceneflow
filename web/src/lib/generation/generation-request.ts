import { requestAudioGeneration, storeGeneratedAudio } from "@/services/api/audio";
import { requestEdit, requestGeneration, requestImageQuestion, requestToolResponse, type AiTextMessage, type ResponseFunctionTool, type ResponseInputMessage, type ResponseToolCall, type ToolResponseResult } from "@/services/api/image";
import { createVideoGenerationTask, pollVideoGenerationTask, requestVideoGeneration, storeGeneratedVideo, type VideoGenerationTask, type VideoGenerationTaskState } from "@/services/api/video";
import type { AiConfig } from "@/stores/use-config-store";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";
import { apiPath } from "@/lib/app-paths";
import { beginClientGeneration, finishClientGeneration, runGuardedGeneration } from "./generation-guard";
import { resultUrlsFromItems } from "./generation-result";
import { reportGenerationResult } from "./server-upstream-client";

type RequestOptions = { signal?: AbortSignal };

export type GenerationRequestOptions = RequestOptions;

export type ImageGenerationRequest = {
    config: AiConfig;
    prompt: string;
    references?: ReferenceImage[];
    mask?: ReferenceImage;
    options?: GenerationRequestOptions;
};

export type VideoGenerationRequest = {
    config: AiConfig;
    prompt: string;
    references?: ReferenceImage[];
    videoReferences?: ReferenceVideo[];
    audioReferences?: ReferenceAudio[];
    options?: GenerationRequestOptions;
};

export type AudioGenerationRequest = {
    config: AiConfig;
    prompt: string;
    options?: GenerationRequestOptions;
};

export type TextGenerationRequest = {
    config: AiConfig;
    messages: AiTextMessage[];
    onDelta: (text: string) => void;
    options?: GenerationRequestOptions;
};

export type ToolGenerationRequest = {
    config: AiConfig;
    messages: ResponseInputMessage[];
    tools: ResponseFunctionTool[];
    toolChoice?: "auto" | "required" | { type: "function"; name: string };
    onDelta?: (text: string) => void;
    options?: GenerationRequestOptions;
};

export async function requestGeneratedImages({ config, prompt, references = [], mask, options }: ImageGenerationRequest) {
    const count = Math.max(1, Math.min(50, Math.floor(Number(config.count) || 1)));
    return runGuardedGeneration(
        "image",
        count,
        generationMetadata(config, prompt, references.length),
        (job) => (references.length ? requestEdit(config, prompt, references, mask, options, job.id) : requestGeneration(config, prompt, options, job.id)),
        recoverDeliveredImages,
    );
}

/**
 * 浏览器这侧失败、但服务端已经替我们收下成品时的兜底。
 *
 * 2026-09-18：上游出了图、代理层也归档了，可用户那条长连接断了 —— 钱花了、图在手上，
 * 用户却只看到「请求失败」，还得自己去记录页翻。这里把归档好的成品取回来当这次的结果，
 * 画布照常出图。取不回来（没归档、权限、网络）就什么都不做，让原来的错误照旧抛出去。
 */
async function recoverDeliveredImages(job: { id: string; resultData?: unknown }): Promise<Array<{ id: string; dataUrl: string }> | undefined> {
    const urls = resultUrlsFromItems(job.id, (job.resultData as { items?: unknown } | null)?.items);
    const images: Array<{ id: string; dataUrl: string }> = [];
    for (const url of urls.slice(0, 8)) {
        if (/^https?:\/\//i.test(url)) {
            images.push({ id: newImageId(), dataUrl: url });
            continue;
        }
        const dataUrl = await fetchArchivedMedia(url);
        if (dataUrl) images.push({ id: newImageId(), dataUrl });
    }
    return images.length ? images : undefined;
}

/** 取我们自己归档的成品（同源、带 cookie）：转成 data URL，下游用法与上游返回的图完全一致 */
async function fetchArchivedMedia(path: string): Promise<string | undefined> {
    try {
        const response = await fetch(apiPath(path), { credentials: "include" });
        if (!response.ok) return undefined;
        const blob = await response.blob();
        if (!blob.size) return undefined;
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    } catch {
        return undefined;
    }
}

function newImageId() {
    return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function requestGeneratedVideo({ config, prompt, references = [], videoReferences = [], audioReferences = [], options }: VideoGenerationRequest) {
    return runGuardedGeneration("video", 1, generationMetadata(config, prompt, references.length + videoReferences.length + audioReferences.length), (job) =>
        requestVideoGeneration(config, prompt, references, videoReferences, audioReferences, options, job.id),
    );
}

export type GuardedVideoGenerationTask = VideoGenerationTask & { generationJobId?: string };

export async function createGeneratedVideoTask({ config, prompt, references = [], videoReferences = [], audioReferences = [], options }: VideoGenerationRequest): Promise<GuardedVideoGenerationTask> {
    const job = await beginClientGeneration("video", 1, generationMetadata(config, prompt, references.length + videoReferences.length + audioReferences.length));
    try {
        const task = await createVideoGenerationTask(config, prompt, references, videoReferences, audioReferences, options, job.id);
        return { ...task, generationJobId: job.id };
    } catch (error) {
        await finishClientGeneration(job.id, "failed", error).catch(() => undefined);
        throw error;
    }
}

export async function pollGeneratedVideoTask(config: AiConfig, task: GuardedVideoGenerationTask, options?: GenerationRequestOptions): Promise<VideoGenerationTaskState> {
    try {
        const state = await pollVideoGenerationTask(config, task, options);
        // 成品一到手就先上报服务端归档（服务端认领后任务即算成功，不再看浏览器后面还活着没有）
        if (task.generationJobId && state.status === "completed" && state.result.sourceUrl) {
            void reportGenerationResult(task.generationJobId, [state.result.sourceUrl]);
        }
        if (task.generationJobId && state.status !== "pending") {
            await finishClientGeneration(task.generationJobId, state.status === "completed" ? "succeeded" : "failed", state.status === "failed" ? state.error : undefined);
        }
        return state;
    } catch (error) {
        if (task.generationJobId) {
            const status = error instanceof DOMException && error.name === "AbortError" ? "cancelled" : "failed";
            await finishClientGeneration(task.generationJobId, status, error).catch((settlementError) => console.error("[generation] failed to settle video task", settlementError));
        }
        throw error;
    }
}

export async function persistGeneratedVideo(result: Awaited<ReturnType<typeof requestGeneratedVideo>>) {
    return storeGeneratedVideo(result);
}

export async function requestGeneratedAudio({ config, prompt, options }: AudioGenerationRequest) {
    return runGuardedGeneration("audio", 1, generationMetadata(config, prompt, 0), () => requestAudioGeneration(config, prompt, options));
}

export async function persistGeneratedAudio(blob: Awaited<ReturnType<typeof requestGeneratedAudio>>, format = "mp3") {
    return storeGeneratedAudio(blob, format);
}

export async function requestGeneratedText({ config, messages, onDelta, options }: TextGenerationRequest) {
    return runGuardedGeneration("text", 1, generationMetadata(config, "", 0), () => requestImageQuestion(config, messages, onDelta, options));
}

export async function requestGeneratedToolResponse({ config, messages, tools, toolChoice = "auto", onDelta, options }: ToolGenerationRequest): Promise<ToolResponseResult> {
    return runGuardedGeneration("tool", 1, generationMetadata(config, "", 0), () => requestToolResponse(config, messages, tools, toolChoice, onDelta, options));
}

function generationMetadata(config: AiConfig, prompt: string, referenceCount: number) {
    return {
        model: config.model,
        imageModel: config.imageModel,
        videoModel: config.videoModel,
        size: config.size,
        quality: config.quality,
        videoSeconds: config.videoSeconds,
        vquality: config.vquality,
        referenceCount,
        promptLength: prompt.length,
    };
}

export type { AiTextMessage, ResponseFunctionTool, ResponseInputMessage, ResponseToolCall, ToolResponseResult, VideoGenerationTask };
