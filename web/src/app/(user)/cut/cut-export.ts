"use client";

import type { FFmpeg } from "@ffmpeg/ffmpeg";

import type { CutClip } from "./cut-store";
import { getClipBlob } from "./cut-media";

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoading: Promise<FFmpeg> | null = null;
/** 导出进行中的进度回调（0..1），由 exec 的 progress 事件驱动 */
let currentProgress: ((progress: number) => void) | null = null;
const logTail: string[] = [];

async function ensureFfmpeg(): Promise<FFmpeg> {
    if (ffmpegInstance?.loaded) return ffmpegInstance;
    if (ffmpegLoading) return ffmpegLoading;
    ffmpegLoading = (async () => {
        const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
        const base = `${window.location.origin}/vendor/ffmpeg`;
        const ffmpeg = new FFmpeg();
        ffmpeg.on("progress", ({ progress }) => currentProgress?.(progress));
        ffmpeg.on("log", ({ message }) => {
            logTail.push(message);
            if (logTail.length > 80) logTail.shift();
        });
        await ffmpeg.load({
            coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
            classWorkerURL: `${base}/worker.js`,
        });
        ffmpegInstance = ffmpeg;
        return ffmpeg;
    })();
    try {
        return await ffmpegLoading;
    } catch (error) {
        ffmpegLoading = null;
        ffmpegInstance = null;
        throw error;
    }
}

function resetFfmpeg() {
    try {
        ffmpegInstance?.terminate();
    } catch {}
    ffmpegInstance = null;
    ffmpegLoading = null;
}

export type CutExportResult = { blob: Blob; width: number; height: number };

/**
 * 在浏览器内用 ffmpeg.wasm 把时间轴素材拼接导出为 mp4。
 * 先按裁剪范围逐段 trim + 统一画布，concat 拼接；优先带音频，
 * 若素材无音轨导致失败则回退为纯视频导出。
 */
export async function exportCutVideo(clips: CutClip[], onProgress: (progress: number) => void): Promise<CutExportResult> {
    if (clips.length === 0) throw new Error("时间轴还没有素材");

    onProgress(0.01);
    const ffmpeg = await ensureFfmpeg();
    const { fetchFile } = await import("@ffmpeg/util");
    const inputNames: string[] = [];
    const outputName = "cut-output.mp4";

    currentProgress = (raw) => {
        // exec 的 progress 事件只覆盖合成阶段，映射到整体 10%~100%
        const mapped = Math.min(1, Math.max(0, 0.1 + raw * 0.9));
        onProgress(mapped);
    };
    try {
        for (let i = 0; i < clips.length; i += 1) {
            onProgress(0.02 + (0.08 * i) / clips.length);
            const name = `input-${i}.mp4`;
            inputNames.push(name);
            await ffmpeg.writeFile(name, await fetchFile(await getClipBlob(clips[i])));
        }
        onProgress(0.1);

        // 画布取各素材最大宽高，上限 1920x1080，保持偶数（libx264/yuv420p 要求）
        let canvasW = 0;
        let canvasH = 0;
        for (const clip of clips) {
            canvasW = Math.max(canvasW, clip.width || 1280);
            canvasH = Math.max(canvasH, clip.height || 720);
        }
        canvasW = Math.min(1920, Math.max(2, canvasW));
        canvasH = Math.min(1080, Math.max(2, canvasH));
        if (canvasW % 2 !== 0) canvasW += 1;
        if (canvasH % 2 !== 0) canvasH += 1;

        const videoParts: string[] = [];
        const audioParts: string[] = [];
        const videoStreamLabels: string[] = [];
        const audioStreamLabels: string[] = [];
        clips.forEach((clip, i) => {
            const start = clip.startMs / 1000;
            const end = clip.endMs / 1000;
            videoStreamLabels.push(`[v${i}]`);
            audioStreamLabels.push(`[a${i}]`);
            videoParts.push(
                `[${i}:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS,scale=${canvasW}:${canvasH}:force_original_aspect_ratio=decrease,pad=${canvasW}:${canvasH}:(ow-iw)/2:(oh-ih)/2,fps=30,setsar=1[v${i}]`,
            );
            audioParts.push(`[${i}:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS,aresample=44100[a${i}]`);
        });
        const n = clips.length;
        const baseArgs = clips.flatMap((_, i) => ["-i", inputNames[i]]);
        const concatInputs = [...videoStreamLabels, ...audioStreamLabels].join("");

        let exitCode = await ffmpeg.exec([
            "-v",
            "error",
            ...baseArgs,
            "-filter_complex",
            `${[...videoParts, ...audioParts, `${concatInputs}concat=n=${n}:v=1:a=1[vout][aout]`].join(";")}`,
            "-map",
            "[vout]",
            "-map",
            "[aout]",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            outputName,
        ]);
        if (exitCode !== 0) {
            // 素材可能无音轨，回退纯视频
            exitCode = await ffmpeg.exec([
                "-v",
                "error",
                ...baseArgs,
                "-filter_complex",
                `${[...videoParts, `${videoStreamLabels.join("")}concat=n=${n}:v=1:a=0[vout]`].join(";")}`,
                "-map",
                "[vout]",
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "23",
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
                outputName,
            ]);
        }
        if (exitCode !== 0) {
            resetFfmpeg();
            const detail = logTail.slice(-3).join(" ").trim().slice(0, 200);
            throw new Error(`ffmpeg 合成失败（退出码 ${exitCode}）${detail ? `：${detail}` : ""}`);
        }

        const data = await ffmpeg.readFile(outputName);
        return { blob: new Blob([data.slice()], { type: "video/mp4" }), width: canvasW, height: canvasH };
    } finally {
        for (const name of [...inputNames, outputName]) {
            try {
                await ffmpeg.deleteFile(name);
            } catch {}
        }
        currentProgress = null;
    }
}
