export const TIMELINE_VIDEO_MIME_CANDIDATES = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4",
] as const;

export interface TimelineVideoRecording {
  blob: Blob;
  extension: "webm" | "mp4";
  mimeType: string;
}

export interface RecordTimelineVideoOptions {
  canvas: HTMLCanvasElement;
  durationSec: number;
  fps: number;
  onFrame: (timeSec: number) => void;
  onProgress?: (progress: number) => void;
}

type CaptureStreamCanvas = HTMLCanvasElement & {
  captureStream?: (frameRate?: number) => MediaStream;
};

function nextAnimationFrame() {
  return new Promise<number>((resolve) => requestAnimationFrame(resolve));
}

export function selectTimelineVideoMimeType(
  isTypeSupported: (mimeType: string) => boolean = (mimeType) =>
    typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mimeType)
) {
  return TIMELINE_VIDEO_MIME_CANDIDATES.find((mimeType) => isTypeSupported(mimeType)) ?? "";
}

export async function recordTimelineVideo({
  canvas,
  durationSec,
  fps,
  onFrame,
  onProgress,
}: RecordTimelineVideoOptions): Promise<TimelineVideoRecording> {
  const captureStream = (canvas as CaptureStreamCanvas).captureStream;
  if (typeof MediaRecorder === "undefined" || typeof captureStream !== "function") {
    throw new Error("当前浏览器不支持视频录制，请使用最新版 Chrome、Edge 或 Safari");
  }

  const safeDurationSec = Math.max(0.1, durationSec);
  const safeFps = Math.min(60, Math.max(1, Math.round(fps)));
  const mimeType = selectTimelineVideoMimeType();
  const stream = captureStream.call(canvas, safeFps);
  const chunks: BlobPart[] = [];
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : undefined);
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }
  const stopped = new Promise<Blob>((resolve, reject) => {
    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    recorder.addEventListener("error", () => reject(new Error("视频录制失败")), { once: true });
    recorder.addEventListener(
      "stop",
      () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" })),
      { once: true }
    );
  });

  try {
    onFrame(0);
    onProgress?.(0);
    await nextAnimationFrame();
    await nextAnimationFrame();
    recorder.start(Math.max(100, Math.round(1000 / safeFps) * 4));
    const startedAt = performance.now();

    await new Promise<void>((resolve) => {
      function step(now: number) {
        const timeSec = Math.min(safeDurationSec, Math.max(0, (now - startedAt) / 1000));
        onFrame(timeSec);
        onProgress?.(timeSec / safeDurationSec);

        if (timeSec >= safeDurationSec) {
          requestAnimationFrame(() => resolve());
          return;
        }
        requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
    });

    recorder.stop();
    const blob = await stopped;
    if (blob.size === 0) throw new Error("浏览器没有生成有效的视频数据");
    const resolvedMimeType = blob.type || recorder.mimeType || mimeType || "video/webm";

    return {
      blob,
      extension: resolvedMimeType.startsWith("video/mp4") ? "mp4" : "webm",
      mimeType: resolvedMimeType,
    };
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

export function downloadTimelineVideo(recording: TimelineVideoRecording, baseName = "director-timeline") {
  const url = URL.createObjectURL(recording.blob);
  const anchor = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  anchor.href = url;
  anchor.download = `${baseName}-${timestamp}.${recording.extension}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
