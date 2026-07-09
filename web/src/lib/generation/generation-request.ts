import { requestAudioGeneration, storeGeneratedAudio } from "@/services/api/audio";
import { requestEdit, requestGeneration, requestImageQuestion, requestToolResponse, type AiTextMessage, type ResponseFunctionTool, type ResponseInputMessage, type ResponseToolCall, type ToolResponseResult } from "@/services/api/image";
import { createVideoGenerationTask, pollVideoGenerationTask, requestVideoGeneration, storeGeneratedVideo, type VideoGenerationTask, type VideoGenerationTaskState } from "@/services/api/video";
import type { AiConfig } from "@/stores/use-config-store";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";
import { beginClientGeneration, finishClientGeneration, runGuardedGeneration } from "./generation-guard";

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
    return runGuardedGeneration("image", count, generationMetadata(config, prompt, references.length), () =>
        references.length ? requestEdit(config, prompt, references, mask, options) : requestGeneration(config, prompt, options),
    );
}

export async function requestGeneratedVideo({ config, prompt, references = [], videoReferences = [], audioReferences = [], options }: VideoGenerationRequest) {
    return runGuardedGeneration("video", 1, generationMetadata(config, prompt, references.length + videoReferences.length + audioReferences.length), () =>
        requestVideoGeneration(config, prompt, references, videoReferences, audioReferences, options),
    );
}

export type GuardedVideoGenerationTask = VideoGenerationTask & { generationJobId?: string };

export async function createGeneratedVideoTask({ config, prompt, references = [], videoReferences = [], audioReferences = [], options }: VideoGenerationRequest): Promise<GuardedVideoGenerationTask> {
    const job = await beginClientGeneration("video", 1, generationMetadata(config, prompt, references.length + videoReferences.length + audioReferences.length));
    try {
        const task = await createVideoGenerationTask(config, prompt, references, videoReferences, audioReferences, options);
        return { ...task, generationJobId: job.id };
    } catch (error) {
        await finishClientGeneration(job.id, "failed", error).catch(() => undefined);
        throw error;
    }
}

export async function pollGeneratedVideoTask(config: AiConfig, task: GuardedVideoGenerationTask, options?: GenerationRequestOptions): Promise<VideoGenerationTaskState> {
    const state = await pollVideoGenerationTask(config, task, options);
    if (task.generationJobId && state.status !== "pending") {
        await finishClientGeneration(task.generationJobId, state.status === "completed" ? "succeeded" : "failed", state.status === "failed" ? state.error : undefined);
    }
    return state;
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
