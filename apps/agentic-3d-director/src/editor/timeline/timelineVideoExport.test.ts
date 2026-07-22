import { afterEach, vi } from "vitest";
import { recordTimelineVideo, selectTimelineVideoMimeType } from "./timelineVideoExport";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("prefers VP9 WebM when the browser supports it", () => {
  expect(selectTimelineVideoMimeType((mimeType) => mimeType === "video/webm;codecs=vp9")).toBe(
    "video/webm;codecs=vp9"
  );
});

it("falls back to MP4 or the MediaRecorder default", () => {
  expect(selectTimelineVideoMimeType((mimeType) => mimeType === "video/mp4")).toBe("video/mp4");
  expect(selectTimelineVideoMimeType(() => false)).toBe("");
});

it("records the canvas stream while advancing timeline frames", async () => {
  let animationTime = 100;
  const stopTrack = vi.fn();
  const onFrame = vi.fn();

  class FakeMediaRecorder extends EventTarget {
    static isTypeSupported(mimeType: string) {
      return mimeType === "video/webm";
    }

    mimeType = "video/webm";

    start() {}

    stop() {
      const dataEvent = new Event("dataavailable") as Event & { data: Blob };
      Object.defineProperty(dataEvent, "data", { value: new Blob(["video-frame"], { type: this.mimeType }) });
      this.dispatchEvent(dataEvent);
      this.dispatchEvent(new Event("stop"));
    }
  }

  vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
  vi.spyOn(performance, "now").mockReturnValue(200);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    animationTime += 50;
    queueMicrotask(() => callback(animationTime));
    return animationTime;
  });

  const recording = await recordTimelineVideo({
    canvas: {
      captureStream: () => ({ getTracks: () => [{ stop: stopTrack }] }),
    } as unknown as HTMLCanvasElement,
    durationSec: 0.2,
    fps: 24,
    onFrame,
  });

  expect(recording).toMatchObject({ extension: "webm", mimeType: "video/webm" });
  expect(recording.blob.size).toBeGreaterThan(0);
  expect(onFrame).toHaveBeenCalledWith(0);
  expect(onFrame).toHaveBeenLastCalledWith(0.2);
  expect(stopTrack).toHaveBeenCalledOnce();
});
