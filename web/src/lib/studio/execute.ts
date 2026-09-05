import { createGeneratedVideoTask, persistGeneratedVideo, pollGeneratedVideoTask, requestGeneratedImages, type GuardedVideoGenerationTask } from "@/lib/generation/generation-request";
import { getDataUrlByteSize, readImageMeta } from "@/lib/image-utils";
import { seedanceVideoReferenceError, seedanceVideoReferenceHint } from "@/lib/seedance-video";
import { uploadImage } from "@/services/image-storage";
import type { AiConfig } from "@/stores/use-config-store";
import { nanoid } from "nanoid";
import type { StudioImageResult, StudioInstruction, StudioMessage, StudioVideoResult } from "./types";

export type StudioMessageUpdate = Partial<Omit<StudioMessage, "id">>;

/**
 * v1 直连生成执行入口（v2 导演通道预留）。
 * 按指令 kind 分派：图片同步请求；视频创建异步任务 + 轮询。
 * 通过 onUpdate 把进度写回对应的 assistant 消息。
 */
export async function executeStudioInstruction(instruction: StudioInstruction, onUpdate: (update: StudioMessageUpdate) => void): Promise<void> {
    if (instruction.kind === "image") {
        await runImageGeneration(instruction, onUpdate);
    } else {
        await runVideoGeneration(instruction, onUpdate);
    }
}

async function runImageGeneration(instruction: StudioInstruction, onUpdate: (update: StudioMessageUpdate) => void) {
    const startedAt = performance.now();
    const result = await requestGeneratedImages({ config: instruction.config, prompt: instruction.prompt, references: instruction.references });
    const image = result[0];
    if (!image) throw new Error("接口没有返回图片");
    // 持久化到存储（与参考图同一套）：会话只留 storageKey，避免每次保存把全部 base64 重写进 IndexedDB。
    // 存储失败（配额等）时回退为 dataUrl 直存，不阻塞生成。
    const persisted = await uploadImage(image.dataUrl).catch(() => null);
    const meta = persisted ? { width: persisted.width, height: persisted.height } : await readImageMeta(image.dataUrl);
    const studioImage: StudioImageResult = {
        kind: "image",
        id: image.id,
        dataUrl: persisted?.url ?? image.dataUrl,
        storageKey: persisted?.storageKey,
        width: meta.width,
        height: meta.height,
        bytes: persisted?.bytes ?? getDataUrlByteSize(image.dataUrl),
        durationMs: performance.now() - startedAt,
    };
    onUpdate({ status: "success", results: [studioImage], error: undefined });
}

async function runVideoGeneration(instruction: StudioInstruction, onUpdate: (update: StudioMessageUpdate) => void) {
    // 生成前再做一次参考素材校验（与视频创作台一致）
    const referenceError = seedanceVideoReferenceError(instruction.videoReferences);
    if (referenceError) {
        throw new Error(`${referenceError}。${seedanceVideoReferenceHint}`);
    }
    const startedAt = Date.now();
    const task = await createGeneratedVideoTask({
        config: instruction.config,
        prompt: instruction.prompt,
        references: instruction.references,
        videoReferences: instruction.videoReferences,
        audioReferences: instruction.audioReferences,
    });
    onUpdate({ task, status: "pending" });
    await pollVideoTask(task, instruction.config, startedAt, onUpdate);
}

/**
 * 轮询视频任务直到完成/失败/超时。
 * 页面刷新后可用同一个 task 恢复轮询（消息里持久化了 task）。
 */
export async function pollVideoTask(task: GuardedVideoGenerationTask, config: AiConfig, startedAt: number, onUpdate: (update: StudioMessageUpdate) => void): Promise<void> {
    // GenVideo / MiniMax 生成较慢（GenVideo 上游建议首次轮询就等 5 分钟），走长轮询通道（10s × 240 ≈ 40 分钟）
    const isSlowProvider = task.provider === "genvideo" || task.provider === "minimax";
    const delayMs = isSlowProvider ? 10000 : task.provider === "seedance" ? 5000 : 2500;
    const attempts = isSlowProvider ? 240 : 120;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
        const state = await pollGeneratedVideoTask(config, task);
        if (state.status === "completed") {
            const stored = await persistGeneratedVideo(state.result);
            const video: StudioVideoResult = {
                kind: "video",
                id: nanoid(),
                url: stored.url,
                storageKey: stored.storageKey,
                width: stored.width || 1280,
                height: stored.height || 720,
                bytes: stored.bytes,
                mimeType: stored.mimeType,
                durationMs: Date.now() - startedAt,
            };
            onUpdate({ status: "success", results: [video], task: undefined, error: undefined });
            return;
        }
        if (state.status === "failed") throw new Error(state.error);
        if (attempt === attempts - 1) throw new Error("视频生成超时，请稍后重试");
        await sleep(delayMs);
    }
}

function sleep(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}
