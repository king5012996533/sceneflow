import { useMemo } from "react";
import { Route, Trash2 } from "lucide-react";
import { MANNEQUIN_POSE_PRESETS } from "../presets/mannequinPosePresets";
import { DIRECTOR_TRAJECTORY_PRESETS, type DirectorTimelineMotion, type DirectorTrajectoryPreset } from "../schema/directorProject";
import { useDirectorStore } from "../store/directorStore";
import { normalizeDirectorTimeline } from "../timeline/animationTimeline";
import {
  InspectorAxisGroup,
  InspectorPanel,
  InspectorSection,
  InspectorSelectField,
  InspectorTextField,
} from "./InspectorControls";

type Vec3 = [number, number, number];

function replaceAxis(tuple: Vec3, axis: 0 | 1 | 2, value: number): Vec3 {
  return tuple.map((item, index) => (index === axis ? value : item)) as Vec3;
}

export function TrajectoryInspectorPanel() {
  const storedTimeline = useDirectorStore((state) => state.project.timeline);
  const timeline = useMemo(() => normalizeDirectorTimeline(storedTimeline), [storedTimeline]);
  const objects = useDirectorStore((state) => state.project.objects);
  const selectedTrackId = useDirectorStore((state) => state.selectedTimelineTrackId);
  const selectedKeyframeId = useDirectorStore((state) => state.selectedTimelineKeyframeId);
  const selectTimelineTrack = useDirectorStore((state) => state.selectTimelineTrack);
  const setTimelineCurrentTime = useDirectorStore((state) => state.setTimelineCurrentTime);
  const createObjectTrajectory = useDirectorStore((state) => state.createObjectTrajectory);
  const updateTimelineTrack = useDirectorStore((state) => state.updateTimelineTrack);
  const updateTimelineKeyframe = useDirectorStore((state) => state.updateTimelineKeyframe);
  const deleteTimelineTrack = useDirectorStore((state) => state.deleteTimelineTrack);
  const track = timeline.tracks.find((item) => item.id === selectedTrackId);
  const object = track ? objects.find((item) => item.id === track.objectId) : undefined;
  const keyframe = track
    ? track.keyframes.find((item) => item.id === selectedKeyframeId) ?? track.keyframes[0]
    : undefined;

  if (!track || !object || !keyframe) return null;

  function updatePosition(axis: 0 | 1 | 2, value: string) {
    updateTimelineKeyframe(track!.id, keyframe!.id, {
      transform: {
        ...keyframe!.transform,
        position: replaceAxis(keyframe!.transform.position, axis, Number(value)),
      },
    });
  }

  function updateRotation(axis: 0 | 1 | 2, value: string) {
    updateTimelineKeyframe(track!.id, keyframe!.id, {
      transform: {
        ...keyframe!.transform,
        rotation: replaceAxis(keyframe!.transform.rotation, axis, Number(value)),
      },
    });
  }

  function updateScale(axis: 0 | 1 | 2, value: string) {
    updateTimelineKeyframe(track!.id, keyframe!.id, {
      transform: {
        ...keyframe!.transform,
        scale: replaceAxis(keyframe!.transform.scale, axis, Math.max(0.01, Number(value))),
      },
    });
  }

  function changePreset(preset: string) {
    createObjectTrajectory(object!.id, preset as DirectorTrajectoryPreset, {
      durationSec: timeline.durationSec,
      motion: track!.motion,
      orientToPath: track!.orientToPath,
      source: "preset",
      color: track!.color,
    });
  }

  function changeMotion(motion: string) {
    updateTimelineTrack(track!.id, { motion: motion as DirectorTimelineMotion });
  }

  return (
    <InspectorPanel
      title={object.kind === "camera" ? "机位" : object.kind === "character" ? "角色" : "模型"}
      ariaLabel="运动轨迹右侧属性面板"
      className="trajectory-inspector"
      tabs={[
        { label: "属性", active: false, onClick: () => selectTimelineTrack(null) },
        { label: "运动轨迹", active: true, onClick: () => undefined },
      ]}
    >
      <InspectorSelectField
        label="轨迹预设"
        ariaLabel="轨迹预设"
        value={track.preset}
        options={DIRECTOR_TRAJECTORY_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))}
        onChange={changePreset}
      />
      {object.kind === "character" ? (
        <InspectorSelectField
          label="移动动作"
          ariaLabel="轨迹移动动作"
          value={track.motion}
          options={[
            { value: "none", label: "仅移动（保持当前姿势）" },
            ...MANNEQUIN_POSE_PRESETS.map((preset) => ({
              value: preset.id,
              label:
                preset.id === "walk"
                  ? "行走（连续步态）"
                  : preset.id === "run"
                    ? "跑动（连续步态）"
                    : preset.label,
            })),
          ]}
          onChange={changeMotion}
        />
      ) : null}
      <label className="trajectory-inspector-toggle">
        <input
          checked={track.orientToPath}
          type="checkbox"
          onChange={() => updateTimelineTrack(track.id, { orientToPath: !track.orientToPath })}
        />
        <span>沿轨迹自动朝向</span>
      </label>

      <InspectorSection title={`关键帧 ${track.keyframes.indexOf(keyframe) + 1} / ${track.keyframes.length}`}>
        <div className="trajectory-keyframe-list" role="list" aria-label="轨迹关键帧">
          {track.keyframes.map((frame, index) => (
            <button
              className={frame.id === keyframe.id ? "is-active" : ""}
              key={frame.id}
              type="button"
              onClick={() => {
                selectTimelineTrack(track.id, frame.id);
                setTimelineCurrentTime(frame.timeSec);
              }}
            >
              <span>{index + 1}</span>
              {frame.timeSec.toFixed(2)}s
            </button>
          ))}
        </div>
      </InspectorSection>
      <InspectorTextField
        label="时间"
        ariaLabel="轨迹关键帧时间"
        min="0"
        max={String(timeline.durationSec)}
        step="0.01"
        type="number"
        value={keyframe.timeSec}
        onChange={(value) => {
          const timeSec = Number(value);
          updateTimelineKeyframe(track.id, keyframe.id, { timeSec });
          setTimelineCurrentTime(timeSec);
        }}
      />
      <InspectorAxisGroup
        label="位置"
        axes={(["X", "Y", "Z"] as const).map((axis, index) => ({
          axis,
          ariaLabel: `轨迹关键帧位置 ${axis}`,
          value: keyframe.transform.position[index],
          onChange: (value) => updatePosition(index as 0 | 1 | 2, value),
        }))}
      />
      <InspectorAxisGroup
        label="旋转"
        axes={(["X", "Y", "Z"] as const).map((axis, index) => ({
          axis,
          ariaLabel: `轨迹关键帧旋转 ${axis}`,
          value: keyframe.transform.rotation[index],
          onChange: (value) => updateRotation(index as 0 | 1 | 2, value),
        }))}
      />
      <InspectorAxisGroup
        label="缩放"
        axes={(["X", "Y", "Z"] as const).map((axis, index) => ({
          axis,
          ariaLabel: `轨迹关键帧缩放 ${axis}`,
          step: "0.01",
          min: "0.01",
          value: keyframe.transform.scale[index],
          onChange: (value) => updateScale(index as 0 | 1 | 2, value),
        }))}
      />
      {keyframe.target ? (
        <InspectorAxisGroup
          label="机位目标"
          axes={(["X", "Y", "Z"] as const).map((axis, index) => ({
            axis,
            ariaLabel: `轨迹机位目标 ${axis}`,
            value: keyframe.target![index],
            onChange: (value) =>
              updateTimelineKeyframe(track.id, keyframe.id, {
                target: replaceAxis(keyframe.target!, index as 0 | 1 | 2, Number(value)),
              }),
          }))}
        />
      ) : null}
      {keyframe.fov !== undefined ? (
        <InspectorTextField
          label="FOV"
          ariaLabel="轨迹机位 FOV"
          min="5"
          max="140"
          step="1"
          type="number"
          value={keyframe.fov}
          onChange={(value) => updateTimelineKeyframe(track.id, keyframe.id, { fov: Number(value) })}
        />
      ) : null}
      <button className="trajectory-inspector-delete" type="button" onClick={() => deleteTimelineTrack(track.id)}>
        <Trash2 aria-hidden="true" size={14} />
        删除整条轨迹
      </button>
      <div className="trajectory-inspector-source">
        <Route aria-hidden="true" size={13} />
        来源：{track.source === "agent" ? "Agent 定义" : track.source === "preset" ? "轨迹预设" : "手动绘制"}
      </div>
    </InspectorPanel>
  );
}
