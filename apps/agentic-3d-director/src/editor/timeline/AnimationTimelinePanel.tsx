import {
  Box,
  ChevronDown,
  CirclePause,
  CirclePlay,
  Download,
  LoaderCircle,
  Plus,
  Repeat2,
  Route,
  Square,
  Trash2,
  UserRound,
  Video,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { MANNEQUIN_POSE_PRESETS } from "../presets/mannequinPosePresets";
import {
  DIRECTOR_TRAJECTORY_PRESETS,
  type DirectorObject,
  type DirectorTrajectoryPreset,
} from "../schema/directorProject";
import { useDirectorStore } from "../store/directorStore";
import { getTimelinePlaybackEndTime, normalizeDirectorTimeline } from "./animationTimeline";
import { downloadTimelineVideo, recordTimelineVideo } from "./timelineVideoExport";

const MIN_PIXELS_PER_SECOND = 70;
const MAX_PIXELS_PER_SECOND = 220;

function formatTime(timeSec: number) {
  return timeSec.toFixed(2);
}

function TrackIcon({ object }: { object?: DirectorObject }) {
  if (object?.kind === "camera") return <Video aria-hidden="true" size={13} />;
  if (object?.kind === "character") return <UserRound aria-hidden="true" size={13} />;
  return <Box aria-hidden="true" size={13} />;
}

function motionLabel(motion: string) {
  if (motion === "none") return "位移";
  if (motion === "walk") return "连续行走";
  if (motion === "run") return "连续跑动";
  return MANNEQUIN_POSE_PRESETS.find((preset) => preset.id === motion)?.label ?? motion;
}

function eventTime(event: ReactPointerEvent<HTMLElement>, durationSec: number) {
  const trackCanvas = (event.currentTarget as HTMLElement).closest("[data-timeline-canvas]") as HTMLElement | null;
  if (!trackCanvas) return 0;
  const rect = trackCanvas.getBoundingClientRect();
  return Math.min(durationSec, Math.max(0, ((event.clientX - rect.left) / Math.max(1, rect.width)) * durationSec));
}

export function AnimationTimelinePanel() {
  const timelinePanelOpen = useDirectorStore((state) => state.timelinePanelOpen);
  const timeline = useDirectorStore((state) => state.project.timeline);
  const objects = useDirectorStore((state) => state.project.objects);
  const selectedObjectId = useDirectorStore((state) => state.selectedObjectId);
  const currentTime = useDirectorStore((state) => state.timelineCurrentTime);
  const playing = useDirectorStore((state) => state.timelinePlaying);
  const exporting = useDirectorStore((state) => state.timelineExporting);
  const selectedTrackId = useDirectorStore((state) => state.selectedTimelineTrackId);
  const selectedKeyframeId = useDirectorStore((state) => state.selectedTimelineKeyframeId);
  const drawingObjectId = useDirectorStore((state) => state.trajectoryDrawingObjectId);
  const draftPoints = useDirectorStore((state) => state.trajectoryDraftPoints);
  const setPanelOpen = useDirectorStore((state) => state.setTimelinePanelOpen);
  const setCurrentTime = useDirectorStore((state) => state.setTimelineCurrentTime);
  const setPlaying = useDirectorStore((state) => state.setTimelinePlaying);
  const setExporting = useDirectorStore((state) => state.setTimelineExporting);
  const setDuration = useDirectorStore((state) => state.setTimelineDuration);
  const setLoop = useDirectorStore((state) => state.setTimelineLoop);
  const selectTrack = useDirectorStore((state) => state.selectTimelineTrack);
  const createTrajectory = useDirectorStore((state) => state.createObjectTrajectory);
  const updateKeyframe = useDirectorStore((state) => state.updateTimelineKeyframe);
  const deleteTrack = useDirectorStore((state) => state.deleteTimelineTrack);
  const beginDrawing = useDirectorStore((state) => state.beginTrajectoryDrawing);
  const finishDrawing = useDirectorStore((state) => state.finishTrajectoryDrawing);
  const cancelDrawing = useDirectorStore((state) => state.cancelTrajectoryDrawing);
  const [trajectoryMenuOpen, setTrajectoryMenuOpen] = useState(false);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(110);
  const [durationDraft, setDurationDraft] = useState("10.00");
  const [videoExportProgress, setVideoExportProgress] = useState(0);
  const [videoExportMessage, setVideoExportMessage] = useState("");
  const animationFrameRef = useRef<number | null>(null);
  const normalizedTimeline = useMemo(() => normalizeDirectorTimeline(timeline), [timeline]);
  const playbackEndTime = useMemo(() => getTimelinePlaybackEndTime(timeline), [timeline]);
  const selectedObject = objects.find((item) => item.id === selectedObjectId);
  const drawingObject = objects.find((item) => item.id === drawingObjectId);
  const canvasWidth = Math.max(900, normalizedTimeline.durationSec * pixelsPerSecond);
  const secondTicks = Array.from(
    { length: Math.floor(normalizedTimeline.durationSec) + 1 },
    (_, index) => index
  );

  useEffect(() => {
    setDurationDraft(formatTime(normalizedTimeline.durationSec));
  }, [normalizedTimeline.durationSec]);

  useEffect(() => {
    if (!playing) return;
    let previousTime = performance.now();

    function tick(now: number) {
      const state = useDirectorStore.getState();
      const liveTimeline = normalizeDirectorTimeline(state.project.timeline);
      const livePlaybackEndTime = getTimelinePlaybackEndTime(state.project.timeline);
      const deltaSec = Math.min(0.1, Math.max(0, (now - previousTime) / 1000));
      previousTime = now;
      let nextTime = state.timelineCurrentTime + deltaSec;

      if (nextTime >= livePlaybackEndTime) {
        if (liveTimeline.loop) {
          nextTime %= livePlaybackEndTime;
        } else {
          state.setTimelineCurrentTime(livePlaybackEndTime);
          state.setTimelinePlaying(false);
          return;
        }
      }

      state.setTimelineCurrentTime(nextTime);
      animationFrameRef.current = requestAnimationFrame(tick);
    }

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    };
  }, [playing]);

  if (!timelinePanelOpen) return null;

  function togglePlayback() {
    if (!playing && currentTime >= playbackEndTime) setCurrentTime(0);
    setPlaying(!playing);
  }

  function applyPreset(preset: DirectorTrajectoryPreset) {
    if (!selectedObject) return;
    setTrajectoryMenuOpen(false);
    if (preset === "custom") {
      beginDrawing(selectedObject.id);
      return;
    }
    createTrajectory(selectedObject.id, preset, { source: "preset" });
  }

  function handleSeek(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    setCurrentTime(eventTime(event, normalizedTimeline.durationSec));
  }

  function beginPlayheadDrag(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    const canvas = event.currentTarget.closest("[data-timeline-canvas]") as HTMLElement | null;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    function updateFromClientX(clientX: number) {
      const nextTime = Math.min(
        normalizedTimeline.durationSec,
        Math.max(0, ((clientX - rect.left) / Math.max(1, rect.width)) * normalizedTimeline.durationSec)
      );
      setCurrentTime(nextTime);
    }

    setPlaying(false);
    updateFromClientX(event.clientX);

    function handlePointerMove(pointerEvent: PointerEvent) {
      updateFromClientX(pointerEvent.clientX);
    }

    function handlePointerUp(pointerEvent: PointerEvent) {
      updateFromClientX(pointerEvent.clientX);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  async function exportVideo() {
    const canvas = document.querySelector(".director-canvas canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      setVideoExportMessage("未找到可录制的 3D 视口");
      return;
    }

    const previousTime = useDirectorStore.getState().timelineCurrentTime;
    setVideoExportMessage("");
    setVideoExportProgress(0);
    setPlaying(false);
    setExporting(true);

    try {
      const recording = await recordTimelineVideo({
        canvas,
        durationSec: playbackEndTime,
        fps: normalizedTimeline.fps,
        onFrame: (timeSec) => useDirectorStore.getState().setTimelineCurrentTime(timeSec),
        onProgress: setVideoExportProgress,
      });
      downloadTimelineVideo(recording);
      setVideoExportMessage(`视频已导出（${recording.extension.toUpperCase()}）`);
    } catch (error) {
      setVideoExportMessage(error instanceof Error ? error.message : "视频导出失败");
    } finally {
      useDirectorStore.getState().setTimelineCurrentTime(previousTime);
      useDirectorStore.getState().setTimelineExporting(false);
      setVideoExportProgress(0);
    }
  }

  function beginKeyframeDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    trackId: string,
    keyframeId: string
  ) {
    event.preventDefault();
    event.stopPropagation();
    const canvas = event.currentTarget.closest("[data-timeline-canvas]") as HTMLElement | null;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    function timeFromClientX(clientX: number) {
      return Math.min(
        normalizedTimeline.durationSec,
        Math.max(0, ((clientX - rect.left) / Math.max(1, rect.width)) * normalizedTimeline.durationSec)
      );
    }

    function handlePointerMove(pointerEvent: PointerEvent) {
      setCurrentTime(timeFromClientX(pointerEvent.clientX));
    }

    function handlePointerUp(pointerEvent: PointerEvent) {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      const nextTime = Number(timeFromClientX(pointerEvent.clientX).toFixed(3));
      updateKeyframe(trackId, keyframeId, { timeSec: nextTime });
      setCurrentTime(nextTime);
      selectTrack(trackId, keyframeId);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  return (
    <section className="animation-timeline-panel" aria-label="动画时间轴">
      <header className="animation-timeline-toolbar">
        <div className="animation-timeline-playback">
          <button type="button" aria-label={playing ? "暂停动画" : "播放动画"} onClick={togglePlayback}>
            {playing ? <CirclePause aria-hidden="true" size={18} /> : <CirclePlay aria-hidden="true" size={18} />}
          </button>
          <button
            type="button"
            aria-label="回到时间轴开头"
            onClick={() => {
              setPlaying(false);
              setCurrentTime(0);
            }}
          >
            <Square aria-hidden="true" size={15} />
          </button>
          <button
            className={normalizedTimeline.loop ? "is-active" : ""}
            type="button"
            aria-label="循环播放"
            aria-pressed={normalizedTimeline.loop}
            onClick={() => setLoop(!normalizedTimeline.loop)}
          >
            <Repeat2 aria-hidden="true" size={17} />
          </button>
          <label className="animation-timeline-time-field">
            <span className="sr-only">当前时间</span>
            <input
              aria-label="当前时间"
              max={normalizedTimeline.durationSec}
              min={0}
              step={0.01}
              type="number"
              value={formatTime(currentTime)}
              onChange={(event) => setCurrentTime(Number(event.target.value))}
            />
            <span>/</span>
            <input
              aria-label="动画时长"
              min={0.5}
              step={0.5}
              type="number"
              value={durationDraft}
              onChange={(event) => setDurationDraft(event.target.value)}
              onBlur={() => setDuration(Number(durationDraft))}
              onKeyDown={(event) => {
                if (event.key === "Enter") setDuration(Number(durationDraft));
              }}
            />
            <span>s</span>
          </label>
        </div>

        {drawingObjectId ? (
          <div className="animation-timeline-drawing-status" role="status">
            <Route aria-hidden="true" size={15} />
            <span>正在为“{drawingObject?.name ?? drawingObjectId}”绘制：单击地面添加节点，双击或 Enter 完成</span>
            <strong>{draftPoints.length} 个节点</strong>
            <button type="button" disabled={draftPoints.length < 2} onClick={() => finishDrawing()}>
              完成轨迹
            </button>
            <button type="button" onClick={cancelDrawing}>取消</button>
          </div>
        ) : (
          <div className="animation-timeline-create-actions">
            <button
              type="button"
              disabled={!selectedObject}
              title={selectedObject ? `为 ${selectedObject.name} 新建轨道` : "请先选择角色、道具或机位"}
              onClick={() => selectedObject && createTrajectory(selectedObject.id, "line", { source: "manual" })}
            >
              <Plus aria-hidden="true" size={14} />
              新建轨道
            </button>
            <div className="animation-timeline-trajectory-menu-wrap">
              <button
                type="button"
                aria-expanded={trajectoryMenuOpen}
                disabled={!selectedObject}
                onClick={() => setTrajectoryMenuOpen((open) => !open)}
              >
                <Route aria-hidden="true" size={14} />
                绘制轨迹
                <ChevronDown aria-hidden="true" size={13} />
              </button>
              {trajectoryMenuOpen ? (
                <div className="animation-timeline-trajectory-menu" role="menu" aria-label="轨迹预设">
                  {DIRECTOR_TRAJECTORY_PRESETS.map((preset) => (
                    <button key={preset.id} type="button" role="menuitem" onClick={() => applyPreset(preset.id)}>
                      <span className={`trajectory-preset-icon is-${preset.id}`} aria-hidden="true" />
                      {preset.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}

        <div className="animation-timeline-zoom">
          <button
            className="animation-timeline-export"
            type="button"
            aria-label="导出时间轴视频"
            disabled={exporting || normalizedTimeline.tracks.length === 0}
            onClick={exportVideo}
          >
            {exporting ? <LoaderCircle aria-hidden="true" className="is-spinning" size={14} /> : <Download aria-hidden="true" size={14} />}
            <span>{exporting ? `导出中 ${Math.round(videoExportProgress * 100)}%` : "导出视频"}</span>
          </button>
          <span>缩放</span>
          <input
            aria-label="时间轴缩放"
            max={MAX_PIXELS_PER_SECOND}
            min={MIN_PIXELS_PER_SECOND}
            type="range"
            value={pixelsPerSecond}
            onChange={(event) => setPixelsPerSecond(Number(event.target.value))}
          />
          <button type="button" aria-label="收起动画时间轴" onClick={() => setPanelOpen(false)}>
            <X aria-hidden="true" size={16} />
          </button>
        </div>
      </header>

      {videoExportMessage ? <div className="animation-timeline-export-message" role="status">{videoExportMessage}</div> : null}

      <div className="animation-timeline-body">
        <div className="animation-timeline-labels" style={{ gridTemplateRows: `42px repeat(${normalizedTimeline.tracks.length}, 46px)` }}>
          <div className="animation-timeline-label is-ruler">轨道 / 时间</div>
          {normalizedTimeline.tracks.map((track) => {
            const object = objects.find((item) => item.id === track.objectId);
            return (
              <button
                className={`animation-timeline-label${track.id === selectedTrackId ? " is-active" : ""}`}
                key={track.id}
                type="button"
                onClick={() => {
                  selectTrack(track.id);
                  if (object) useDirectorStore.getState().selectObject(object.id);
                }}
              >
                <span className="animation-timeline-track-color" style={{ background: track.color }} />
                <TrackIcon object={object} />
                <span>
                  <strong>{object?.name ?? "已删除对象"}</strong>
                  <small>{track.preset === "custom" ? "自由轨迹" : DIRECTOR_TRAJECTORY_PRESETS.find((item) => item.id === track.preset)?.label}</small>
                </span>
                <span className="animation-timeline-draw-hint">
                  <Route aria-hidden="true" size={12} />
                  轨迹
                </span>
                <span
                  aria-label={`删除 ${object?.name ?? "轨道"} 的动画轨道`}
                  className="animation-timeline-delete-track"
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteTrack(track.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") deleteTrack(track.id);
                  }}
                >
                  <Trash2 aria-hidden="true" size={13} />
                </span>
              </button>
            );
          })}
        </div>

        <div className="animation-timeline-scroll">
          <div
            className="animation-timeline-canvas"
            data-timeline-canvas
            style={{ width: canvasWidth, gridTemplateRows: `42px repeat(${normalizedTimeline.tracks.length}, 46px)` }}
            onPointerDown={handleSeek}
          >
            <div className="animation-timeline-ruler">
              {secondTicks.map((second) => (
                <span key={second} style={{ left: `${(second / normalizedTimeline.durationSec) * 100}%` }}>
                  {second}s
                </span>
              ))}
            </div>
            {normalizedTimeline.tracks.map((track) => {
              const sortedFrames = [...track.keyframes].sort((a, b) => a.timeSec - b.timeSec);
              const start = sortedFrames[0]?.timeSec ?? 0;
              const end = sortedFrames[sortedFrames.length - 1]?.timeSec ?? start;
              return (
                <div
                  className={`animation-timeline-track-row${track.id === selectedTrackId ? " is-active" : ""}`}
                  key={track.id}
                >
                  <div
                    className="animation-timeline-clip"
                    style={{
                      left: `${(start / normalizedTimeline.durationSec) * 100}%`,
                      width: `${(Math.max(0.02, end - start) / normalizedTimeline.durationSec) * 100}%`,
                      background: `${track.color}33`,
                      borderColor: track.color,
                    }}
                  >
                    <span>{motionLabel(track.motion)}</span>
                  </div>
                  {sortedFrames.map((frame, index) => (
                    <button
                      aria-label={`关键帧 ${index + 1}，${formatTime(frame.timeSec)} 秒`}
                      className={`animation-timeline-keyframe${frame.id === selectedKeyframeId ? " is-active" : ""}`}
                      key={frame.id}
                      style={{ left: `${(frame.timeSec / normalizedTimeline.durationSec) * 100}%`, borderColor: track.color }}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        selectTrack(track.id, frame.id);
                        setCurrentTime(frame.timeSec);
                      }}
                      onPointerDown={(event) => beginKeyframeDrag(event, track.id, frame.id)}
                    />
                  ))}
                </div>
              );
            })}
            {normalizedTimeline.tracks.length === 0 ? (
              <div className="animation-timeline-empty">
                选择角色、道具或机位，然后新建轨道或绘制运动轨迹
              </div>
            ) : null}
            <div
              className="animation-timeline-playhead"
              style={{ left: `${(currentTime / normalizedTimeline.durationSec) * 100}%` }}
              role="slider"
              tabIndex={0}
              aria-label="时间轴播放头"
              aria-valuemin={0}
              aria-valuemax={normalizedTimeline.durationSec}
              aria-valuenow={Number(currentTime.toFixed(3))}
              aria-valuetext={`${formatTime(currentTime)} 秒`}
              onPointerDown={beginPlayheadDrag}
              onKeyDown={(event) => {
                const step = event.shiftKey ? 1 : 1 / normalizedTimeline.fps;
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  setPlaying(false);
                  setCurrentTime(currentTime - step);
                }
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  setPlaying(false);
                  setCurrentTime(currentTime + step);
                }
              }}
            >
              <span />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
