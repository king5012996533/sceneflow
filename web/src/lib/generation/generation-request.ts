import { requestAudioGeneration, storeGeneratedAudio } from "@/services/api/audio";
import { requestEdit, requestGeneration, requestImageQuestion, requestToolResponse, type AiTextMessage, type ResponseFunctionTool, type ResponseInputMessage, type ResponseToolCall, type ToolResponseResult } from "@/services/api/image";
import { createVideoGenerationTask, pollVideoGenerationTask, requestVideoGeneration, storeGeneratedVideo, type VideoGenerationTask, type VideoGenerationTaskState } from "@/services/api/video";
import type { AiConfig } from "@/stores/use-config-store";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";

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
    return references.length ? requestEdit(config, prompt, references, mask, options) : requestGeneration(config, prompt, options);
}

export async function requestGeneratedVideo({ config, prompt, references = [], videoReferences = [], audioReferences = [], options }: VideoGenerationRequest) {
    return requestVideoGeneration(config, prompt, references, videoReferences, audioReferences, options);
}

export async function createGeneratedVideoTask({ config, prompt, references = [], videoReferences = [], audioReferences = [], options }: VideoGenerationRequest): Promise<VideoGenerationTask> {
    return createVideoGenerationTask(config, prompt, references, videoReferences, audioReferences, options);
}

export async function pollGeneratedVideoTask(config: AiConfig, task: VideoGenerationTask, options?: GenerationRequestOptions): Promise<VideoGenerationTaskState> {
    return pollVideoGenerationTask(config, task, options);
}

export async function persistGeneratedVideo(result: Awaited<ReturnType<typeof requestGeneratedVideo>>) {
    return storeGeneratedVideo(result);
}

export async function requestGeneratedAudio({ config, prompt, options }: AudioGenerationRequest) {
    return requestAudioGeneration(config, prompt, options);
}

export async function persistGeneratedAudio(blob: Awaited<ReturnType<typeof requestGeneratedAudio>>, format = "mp3") {
    return storeGeneratedAudio(blob, format);
}

export async function requestGeneratedText({ config, messages, onDelta, options }: TextGenerationRequest) {
    return requestImageQuestion(config, messages, onDelta, options);
}

export async function requestGeneratedToolResponse({ config, messages, tools, toolChoice = "auto", onDelta, options }: ToolGenerationRequest): Promise<ToolResponseResult> {
    return requestToolResponse(config, messages, tools, toolChoice, onDelta, options);
}

export type { AiTextMessage, ResponseFunctionTool, ResponseInputMessage, ResponseToolCall, ToolResponseResult, VideoGenerationTask };
