import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { createInitialDirectorState, useDirectorStore } from "../store/directorStore";
import { AnimationTimelinePanel } from "./AnimationTimelinePanel";

const videoMocks = vi.hoisted(() => ({
  downloadTimelineVideo: vi.fn(),
  recordTimelineVideo: vi.fn(),
}));

vi.mock("./timelineVideoExport", () => videoMocks);

beforeEach(() => {
  vi.clearAllMocks();
  videoMocks.recordTimelineVideo.mockResolvedValue({
    blob: new Blob(["video"]),
    extension: "webm",
    mimeType: "video/webm",
  });
  localStorage.clear();
  useDirectorStore.setState({
    ...useDirectorStore.getState(),
    ...createInitialDirectorState(),
    timelinePanelOpen: true,
  });
});

it("creates a preset path for the selected object and renders its keyframes", async () => {
  const user = userEvent.setup();
  const character = useDirectorStore.getState().project.objects.find((item) => item.kind === "character")!;
  useDirectorStore.getState().selectObject(character.id);

  render(<AnimationTimelinePanel />);
  expect(screen.getByRole("region", { name: "动画时间轴" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: /绘制轨迹/ }));
  await user.click(screen.getByRole("menuitem", { name: "圆环路径" }));

  const track = useDirectorStore.getState().project.timeline?.tracks[0];
  expect(track).toMatchObject({ objectId: character.id, preset: "circle", motion: "walk" });
  expect(screen.getByText(character.name)).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /关键帧/ })).toHaveLength(13);
});

it("enters and completes free drawing from draft ground points", async () => {
  const user = userEvent.setup();
  const character = useDirectorStore.getState().project.objects.find((item) => item.kind === "character")!;
  useDirectorStore.getState().selectObject(character.id);
  render(<AnimationTimelinePanel />);

  await user.click(screen.getByRole("button", { name: /绘制轨迹/ }));
  await user.click(screen.getByRole("menuitem", { name: "自由绘制" }));
  act(() => useDirectorStore.getState().addTrajectoryDraftPoint([2, 0, 1]));

  expect(screen.getByRole("status")).toHaveTextContent("2 个节点");
  await user.click(screen.getByRole("button", { name: "完成轨迹" }));

  expect(useDirectorStore.getState().trajectoryDrawingObjectId).toBeNull();
  expect(useDirectorStore.getState().project.timeline?.tracks[0]?.preset).toBe("custom");
});

it("drags the vertical playhead to scrub the animation time", () => {
  const character = useDirectorStore.getState().project.objects.find((item) => item.kind === "character")!;
  act(() => {
    useDirectorStore.getState().selectObject(character.id);
    useDirectorStore.getState().createObjectTrajectory(character.id, "line");
  });
  const { container } = render(<AnimationTimelinePanel />);
  const canvas = container.querySelector("[data-timeline-canvas]") as HTMLElement;
  Object.defineProperty(canvas, "getBoundingClientRect", {
    value: () => ({ left: 100, right: 1100, top: 0, bottom: 200, width: 1000, height: 200, x: 100, y: 0, toJSON: () => ({}) }),
  });
  const playhead = screen.getByRole("slider", { name: "时间轴播放头" });

  fireEvent.pointerDown(playhead, { clientX: 300 });
  fireEvent.pointerMove(window, { clientX: 850 });
  fireEvent.pointerUp(window, { clientX: 850 });

  expect(useDirectorStore.getState().timelineCurrentTime).toBeCloseTo(7.5, 3);
  expect(playhead).toHaveAttribute("aria-valuetext", "7.50 秒");
});

it("enables video export once the timeline has an object track", () => {
  const character = useDirectorStore.getState().project.objects.find((item) => item.kind === "character")!;
  const { rerender } = render(<AnimationTimelinePanel />);
  expect(screen.getByRole("button", { name: "导出时间轴视频" })).toBeDisabled();

  act(() => useDirectorStore.getState().createObjectTrajectory(character.id, "line"));
  rerender(<AnimationTimelinePanel />);

  expect(screen.getByRole("button", { name: "导出时间轴视频" })).toBeEnabled();
});

it("restarts from zero when replaying at the last enabled track end", () => {
  const character = useDirectorStore.getState().project.objects.find((item) => item.kind === "character")!;
  act(() => {
    useDirectorStore.getState().createObjectTrajectory(character.id, "line", { durationSec: 3 });
    useDirectorStore.getState().setTimelineCurrentTime(3);
  });
  render(<AnimationTimelinePanel />);

  fireEvent.click(screen.getByRole("button", { name: "播放动画" }));

  expect(useDirectorStore.getState().timelineCurrentTime).toBe(0);
  expect(useDirectorStore.getState().timelinePlaying).toBe(true);
});

it("exports only through the last enabled track end", async () => {
  const user = userEvent.setup();
  const character = useDirectorStore.getState().project.objects.find((item) => item.kind === "character")!;
  const viewport = document.createElement("div");
  viewport.className = "director-canvas";
  viewport.appendChild(document.createElement("canvas"));
  document.body.appendChild(viewport);
  act(() => useDirectorStore.getState().createObjectTrajectory(character.id, "line", { durationSec: 3 }));
  render(<AnimationTimelinePanel />);

  await user.click(screen.getByRole("button", { name: "导出时间轴视频" }));

  await waitFor(() =>
    expect(videoMocks.recordTimelineVideo).toHaveBeenCalledWith(expect.objectContaining({ durationSec: 3 }))
  );
  expect(videoMocks.downloadTimelineVideo).toHaveBeenCalledOnce();
  viewport.remove();
});
