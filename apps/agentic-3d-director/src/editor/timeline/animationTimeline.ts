import type {
  DirectorCameraShot,
  DirectorObject,
  DirectorTimeline,
  DirectorTimelineInterpolation,
  DirectorTimelineKeyframe,
  DirectorTimelineMotion,
  DirectorTimelineTrack,
  DirectorTimelineTrackSource,
  DirectorTrajectoryPreset,
  DirectorTransform,
} from "../schema/directorProject";
import { POSE_PRESET_IDS } from "../schema/poseSchema";
import { MANNEQUIN_POSE_PRESETS } from "../presets/mannequinPosePresets";

export const DEFAULT_TIMELINE_DURATION_SEC = 10;
export const DEFAULT_TIMELINE_FPS = 24;
export const MIN_TIMELINE_DURATION_SEC = 0.5;
export const MAX_TIMELINE_DURATION_SEC = 600;

type Vec3 = [number, number, number];

export interface DirectorTrajectoryWaypoint {
  timeSec?: number;
  position: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  target?: Vec3;
  fov?: number;
  interpolation?: DirectorTimelineInterpolation;
}

export interface CreateTrajectoryTrackInput {
  object: DirectorObject;
  camera?: DirectorCameraShot;
  durationSec: number;
  preset: DirectorTrajectoryPreset;
  waypoints?: DirectorTrajectoryWaypoint[];
  radius?: number;
  width?: number;
  depth?: number;
  orientToPath?: boolean;
  motion?: DirectorTimelineMotion;
  source?: DirectorTimelineTrackSource;
  color?: string;
}

export interface EvaluatedTimelineTrack {
  transform: DirectorTransform;
  target?: Vec3;
  fov?: number;
}

let timelineIdSequence = 0;

function createTimelineId(prefix: string) {
  timelineIdSequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${timelineIdSequence.toString(36)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function cloneVec3(value: Vec3): Vec3 {
  return [...value] as Vec3;
}

function cloneTransform(transform: DirectorTransform): DirectorTransform {
  return {
    position: cloneVec3(transform.position),
    rotation: cloneVec3(transform.rotation),
    scale: cloneVec3(transform.scale),
  };
}

function lerp(a: number, b: number, progress: number) {
  return a + (b - a) * progress;
}

function lerpVec3(a: Vec3, b: Vec3, progress: number): Vec3 {
  return [lerp(a[0], b[0], progress), lerp(a[1], b[1], progress), lerp(a[2], b[2], progress)];
}

function interpolationProgress(progress: number, interpolation: DirectorTimelineInterpolation) {
  const value = clamp(progress, 0, 1);
  if (interpolation === "hold") return 0;
  if (interpolation === "smooth") return value * value * (3 - 2 * value);
  return value;
}

function defaultMotionForObject(object: DirectorObject): DirectorTimelineMotion {
  return object.kind === "character" ? "walk" : "none";
}

function isDirectorTimelineMotion(value: unknown): value is DirectorTimelineMotion {
  return value === "none" || POSE_PRESET_IDS.includes(value as (typeof POSE_PRESET_IDS)[number]);
}

function defaultColorForObject(object: DirectorObject) {
  if (object.kind === "camera") return "#a9d8ff";
  return object.color ?? "#18c7e6";
}

function inferCircleGeometry(track: DirectorTimelineTrack) {
  if (track.preset !== "circle" || track.keyframes.length < 4) return undefined;
  const positions = track.keyframes.map((frame) => frame.transform.position);
  const minX = Math.min(...positions.map((position) => position[0]));
  const maxX = Math.max(...positions.map((position) => position[0]));
  const minZ = Math.min(...positions.map((position) => position[2]));
  const maxZ = Math.max(...positions.map((position) => position[2]));
  const center: Vec3 = [(minX + maxX) / 2, positions[0][1], (minZ + maxZ) / 2];
  const radii = positions.map((position) => Math.hypot(position[0] - center[0], position[2] - center[2]));
  const radius = radii.reduce((sum, value) => sum + value, 0) / radii.length;
  const maxDeviation = Math.max(...radii.map((value) => Math.abs(value - radius)));
  if (!Number.isFinite(radius) || radius <= 0.01 || maxDeviation > Math.max(0.05, radius * 0.08)) return undefined;

  const first = positions[0];
  const second = positions[1];
  const firstX = first[0] - center[0];
  const firstZ = first[2] - center[2];
  const secondX = second[0] - center[0];
  const secondZ = second[2] - center[2];

  return {
    center,
    radius,
    startAngle: Math.atan2(firstZ, firstX),
    clockwise: firstX * secondZ - firstZ * secondX < 0,
  };
}

function evenlyTimedWaypoints(positions: Vec3[], durationSec: number): DirectorTrajectoryWaypoint[] {
  const divisor = Math.max(1, positions.length - 1);
  return positions.map((position, index) => ({
    position,
    timeSec: Number(((durationSec * index) / divisor).toFixed(3)),
    interpolation: "smooth",
  }));
}

function presetWaypoints(
  base: Vec3,
  preset: Exclude<DirectorTrajectoryPreset, "custom">,
  durationSec: number,
  radius: number,
  width: number,
  depth: number
) {
  if (preset === "line") {
    return evenlyTimedWaypoints([base, [base[0] + width, base[1], base[2]]], durationSec);
  }

  if (preset === "rectangle") {
    return evenlyTimedWaypoints(
      [
        base,
        [base[0] + width, base[1], base[2]],
        [base[0] + width, base[1], base[2] + depth],
        [base[0], base[1], base[2] + depth],
        base,
      ],
      durationSec
    );
  }

  const center: Vec3 = [base[0] - radius, base[1], base[2]];
  const segments = 12;
  const positions = Array.from({ length: segments + 1 }, (_, index): Vec3 => {
    const angle = (index / segments) * Math.PI * 2;
    return [center[0] + Math.cos(angle) * radius, base[1], center[2] + Math.sin(angle) * radius];
  });
  return evenlyTimedWaypoints(positions, durationSec);
}

export function createDefaultDirectorTimeline(): DirectorTimeline {
  return {
    durationSec: DEFAULT_TIMELINE_DURATION_SEC,
    fps: DEFAULT_TIMELINE_FPS,
    loop: false,
    tracks: [],
  };
}

export function normalizeDirectorTimeline(timeline?: DirectorTimeline): DirectorTimeline {
  const fallback = createDefaultDirectorTimeline();
  if (!timeline || typeof timeline !== "object") return fallback;

  const durationSec = clamp(
    finite(timeline.durationSec, fallback.durationSec),
    MIN_TIMELINE_DURATION_SEC,
    MAX_TIMELINE_DURATION_SEC
  );
  const fps = clamp(Math.round(finite(timeline.fps, fallback.fps)), 1, 120);
  const tracks = Array.isArray(timeline.tracks)
    ? timeline.tracks
        .filter((track) => track && typeof track.id === "string" && typeof track.objectId === "string")
        .map((track) => ({
          ...track,
          enabled: track.enabled !== false,
          color: typeof track.color === "string" ? track.color : "#18c7e6",
          orientToPath: Boolean(track.orientToPath),
          motion: isDirectorTimelineMotion(track.motion) ? track.motion : "none",
          source: (track.source === "agent" || track.source === "preset" ? track.source : "manual") as DirectorTimelineTrackSource,
          circle:
            track.circle &&
            Array.isArray(track.circle.center) &&
            track.circle.center.length === 3 &&
            finite(track.circle.radius, 0) > 0
              ? {
                  center: cloneVec3(track.circle.center),
                  radius: finite(track.circle.radius, 2),
                  startAngle: finite(track.circle.startAngle, 0),
                  clockwise: Boolean(track.circle.clockwise),
                }
              : inferCircleGeometry(track),
          keyframes: Array.isArray(track.keyframes)
            ? track.keyframes
                .filter((frame) => frame && typeof frame.id === "string" && frame.transform)
                .map((frame) => ({
                  ...frame,
                  timeSec: clamp(finite(frame.timeSec, 0), 0, durationSec),
                  interpolation: (
                    frame.interpolation === "hold" || frame.interpolation === "linear"
                      ? frame.interpolation
                      : "smooth") as DirectorTimelineInterpolation,
                  transform: cloneTransform(frame.transform),
                  target: frame.target ? cloneVec3(frame.target) : undefined,
                  fov: frame.fov === undefined ? undefined : clamp(finite(frame.fov, 50), 5, 140),
                }))
                .sort((a, b) => a.timeSec - b.timeSec)
            : [],
        }))
    : [];

  return {
    durationSec,
    fps,
    loop: Boolean(timeline.loop),
    tracks,
  };
}

export function createTrajectoryTrack(input: CreateTrajectoryTrackInput): DirectorTimelineTrack {
  const durationSec = clamp(
    finite(input.durationSec, DEFAULT_TIMELINE_DURATION_SEC),
    MIN_TIMELINE_DURATION_SEC,
    MAX_TIMELINE_DURATION_SEC
  );
  const radius = Math.max(0.1, finite(input.radius, 2));
  const width = Math.max(0.1, finite(input.width, 3));
  const depth = Math.max(0.1, finite(input.depth, 2));
  const baseTransform = cloneTransform(input.object.transform);
  const waypoints = input.waypoints?.length
    ? input.waypoints
    : input.preset === "custom"
      ? evenlyTimedWaypoints([baseTransform.position, cloneVec3(baseTransform.position)], durationSec)
      : presetWaypoints(baseTransform.position, input.preset, durationSec, radius, width, depth);
  const lastIndex = Math.max(1, waypoints.length - 1);
  const keyframes: DirectorTimelineKeyframe[] = waypoints.map((waypoint, index) => ({
    id: createTimelineId("keyframe"),
    timeSec: clamp(
      finite(waypoint.timeSec, (durationSec * index) / lastIndex),
      0,
      durationSec
    ),
    transform: {
      position: cloneVec3(waypoint.position),
      rotation: waypoint.rotation ? cloneVec3(waypoint.rotation) : cloneVec3(baseTransform.rotation),
      scale: waypoint.scale ? cloneVec3(waypoint.scale) : cloneVec3(baseTransform.scale),
    },
    target: waypoint.target
      ? cloneVec3(waypoint.target)
      : input.camera
        ? cloneVec3(input.camera.target)
        : undefined,
    fov: waypoint.fov ?? input.camera?.fov,
    interpolation: waypoint.interpolation ?? "smooth",
  }));

  return {
    id: createTimelineId("track"),
    objectId: input.object.id,
    enabled: true,
    preset: input.preset,
    color: input.color ?? defaultColorForObject(input.object),
    orientToPath: input.orientToPath ?? input.object.kind !== "camera",
    motion: input.motion ?? defaultMotionForObject(input.object),
    source: input.source ?? "preset",
    circle:
      input.preset === "circle" && !input.waypoints?.length
        ? {
            center: [baseTransform.position[0] - radius, baseTransform.position[1], baseTransform.position[2]],
            radius,
            startAngle: 0,
            clockwise: false,
          }
        : undefined,
    keyframes: keyframes.sort((a, b) => a.timeSec - b.timeSec),
  };
}

export function getTimelineTrack(timeline: DirectorTimeline | undefined, objectId: string) {
  return normalizeDirectorTimeline(timeline).tracks.find((track) => track.enabled && track.objectId === objectId);
}

export function evaluateTimelineTrack(track: DirectorTimelineTrack, timeSec: number): EvaluatedTimelineTrack | null {
  const frames = [...track.keyframes].sort((a, b) => a.timeSec - b.timeSec);
  if (!track.enabled || frames.length === 0) return null;
  if (frames.length === 1) {
    const frame = frames[0];
    return {
      transform: cloneTransform(frame.transform),
      target: frame.target ? cloneVec3(frame.target) : undefined,
      fov: frame.fov,
    };
  }

  const clampedTime = clamp(timeSec, frames[0].timeSec, frames[frames.length - 1].timeSec);
  const left = [...frames].reverse().find((frame) => frame.timeSec <= clampedTime) ?? frames[0];
  const right = frames.find((frame) => frame.timeSec > clampedTime) ?? left;
  const rawProgress = right === left ? 0 : (clampedTime - left.timeSec) / Math.max(0.001, right.timeSec - left.timeSec);
  const progress = interpolationProgress(rawProgress, left.interpolation);
  const circleProgress =
    track.circle && frames.length >= 2
      ? clamp(
          (clampedTime - frames[0].timeSec) /
            Math.max(0.001, frames[frames.length - 1].timeSec - frames[0].timeSec),
          0,
          1
        )
      : null;
  const circleAngle =
    circleProgress === null || !track.circle
      ? null
      : track.circle.startAngle + (track.circle.clockwise ? -1 : 1) * Math.PI * 2 * circleProgress;
  const position =
    circleAngle === null || !track.circle
      ? lerpVec3(left.transform.position, right.transform.position, progress)
      : [
          track.circle.center[0] + Math.cos(circleAngle) * track.circle.radius,
          track.circle.center[1],
          track.circle.center[2] + Math.sin(circleAngle) * track.circle.radius,
        ] as Vec3;
  const rotation = lerpVec3(left.transform.rotation, right.transform.rotation, progress);

  if (track.orientToPath && circleAngle !== null && track.circle) {
    const direction = track.circle.clockwise ? -1 : 1;
    const deltaX = -Math.sin(circleAngle) * direction;
    const deltaZ = Math.cos(circleAngle) * direction;
    rotation[1] = Math.atan2(deltaX, deltaZ);
  } else if (track.orientToPath && right !== left) {
    const deltaX = right.transform.position[0] - left.transform.position[0];
    const deltaZ = right.transform.position[2] - left.transform.position[2];
    if (Math.hypot(deltaX, deltaZ) > 0.001) rotation[1] = Math.atan2(deltaX, deltaZ);
  }

  return {
    transform: {
      position,
      rotation,
      scale: lerpVec3(left.transform.scale, right.transform.scale, progress),
    },
    target:
      left.target && right.target
        ? lerpVec3(left.target, right.target, progress)
        : left.target
          ? cloneVec3(left.target)
          : right.target
            ? cloneVec3(right.target)
            : undefined,
    fov:
      left.fov !== undefined && right.fov !== undefined
        ? lerp(left.fov, right.fov, progress)
        : left.fov ?? right.fov,
  };
}

export function getTimelineMotionControls(motion: DirectorTimelineMotion, timeSec: number) {
  if (motion === "none") return null;

  if (motion === "walk" || motion === "run") {
    const running = motion === "run";
    const cadenceHz = running ? 2.45 : 1.65;
    const phase = timeSec * cadenceHz * Math.PI * 2;
    const stride = Math.sin(phase);
    const oppositeStride = -stride;
    const footCycle = Math.sin(phase + Math.PI / 2);
    const bounce = Math.abs(Math.sin(phase));
    const armSwing = running ? 48 : 26;
    const hipSwing = running ? 46 : 28;
    const kneeBase = running ? 16 : 4;
    const kneeLift = running ? 48 : 26;

    return {
      "body.offsetY": bounce * (running ? 0.07 : 0.035),
      "body.pitch": running ? 7 : 1.5,
      "torso.yaw": stride * (running ? 5 : 3),
      "leftShoulder.pitch": stride * armSwing,
      "rightShoulder.pitch": oppositeStride * armSwing,
      "leftElbow.bend": running ? 70 + stride * 8 : 8 + Math.max(0, stride) * 12,
      "rightElbow.bend": running ? 70 + oppositeStride * 8 : 8 + Math.max(0, oppositeStride) * 12,
      "leftHip.pitch": oppositeStride * hipSwing,
      "rightHip.pitch": stride * hipSwing,
      "leftKnee.bend": kneeBase + Math.max(0, -footCycle) * kneeLift,
      "rightKnee.bend": kneeBase + Math.max(0, footCycle) * kneeLift,
      "leftFoot.pitch": Math.max(0, footCycle) * (running ? 22 : 12),
      "rightFoot.pitch": Math.max(0, -footCycle) * (running ? 22 : 12),
    };
  }

  return { ...(MANNEQUIN_POSE_PRESETS.find((preset) => preset.id === motion)?.controls ?? {}) };
}

export function resolveTimelineTime(timeline: DirectorTimeline | undefined, timeSec: number) {
  const normalized = normalizeDirectorTimeline(timeline);
  if (normalized.loop && normalized.durationSec > 0) {
    return ((timeSec % normalized.durationSec) + normalized.durationSec) % normalized.durationSec;
  }
  return clamp(timeSec, 0, normalized.durationSec);
}

export function getTimelinePlaybackEndTime(timeline: DirectorTimeline | undefined) {
  const normalized = normalizeDirectorTimeline(timeline);
  const enabledTrackEndTimes = normalized.tracks
    .filter((track) => track.enabled && track.keyframes.length > 0)
    .map((track) => Math.max(...track.keyframes.map((frame) => frame.timeSec)))
    .filter((timeSec) => timeSec > 0);
  if (enabledTrackEndTimes.length === 0) return normalized.durationSec;
  return Math.min(normalized.durationSec, Math.max(...enabledTrackEndTimes));
}

function isTimelineTrackMotionActive(track: DirectorTimelineTrack, timeSec: number) {
  if (track.motion === "none" || track.keyframes.length < 2) return false;
  const firstTime = Math.min(...track.keyframes.map((frame) => frame.timeSec));
  const lastTime = Math.max(...track.keyframes.map((frame) => frame.timeSec));
  return timeSec >= firstTime && timeSec < lastTime;
}

export function applyTimelineToObject(
  object: DirectorObject,
  timeline: DirectorTimeline | undefined,
  timeSec: number
): DirectorObject {
  const track = getTimelineTrack(timeline, object.id);
  if (!track) return object;
  const resolvedTime = resolveTimelineTime(timeline, timeSec);
  const evaluated = evaluateTimelineTrack(track, resolvedTime);
  if (!evaluated) return object;
  const motionActive = isTimelineTrackMotionActive(track, resolvedTime);

  return {
    ...object,
    transform: evaluated.transform,
    characterRig:
      object.kind === "character" && object.characterRig && motionActive
        ? {
            ...object.characterRig,
            posePresetId: track.motion,
            controls: getTimelineMotionControls(track.motion, resolvedTime) ?? object.characterRig.controls,
          }
        : object.characterRig,
  };
}

export function applyTimelineToCamera(
  camera: DirectorCameraShot,
  cameraObject: DirectorObject | undefined,
  timeline: DirectorTimeline | undefined,
  timeSec: number
): DirectorCameraShot {
  if (!cameraObject) return camera;
  const track = getTimelineTrack(timeline, cameraObject.id);
  if (!track) return camera;
  const evaluated = evaluateTimelineTrack(track, resolveTimelineTime(timeline, timeSec));
  if (!evaluated) return camera;

  return {
    ...camera,
    transform: evaluated.transform,
    target: evaluated.target ?? camera.target,
    fov: evaluated.fov ?? camera.fov,
  };
}

export function sampleTimelineTrack(track: DirectorTimelineTrack, subdivisions = 16): Vec3[] {
  const frames = [...track.keyframes].sort((a, b) => a.timeSec - b.timeSec);
  if (frames.length === 0) return [];
  if (frames.length === 1) return [cloneVec3(frames[0].transform.position)];

  if (track.circle) {
    const segments = Math.max(64, frames.length * Math.max(1, subdivisions));
    const direction = track.circle.clockwise ? -1 : 1;
    return Array.from({ length: segments + 1 }, (_, index) => {
      const angle = track.circle!.startAngle + direction * Math.PI * 2 * (index / segments);
      return [
        track.circle!.center[0] + Math.cos(angle) * track.circle!.radius,
        track.circle!.center[1],
        track.circle!.center[2] + Math.sin(angle) * track.circle!.radius,
      ];
    });
  }

  const samples: Vec3[] = [];
  frames.slice(0, -1).forEach((left, index) => {
    const right = frames[index + 1];
    for (let step = 0; step < subdivisions; step += 1) {
      const timeSec = lerp(left.timeSec, right.timeSec, step / subdivisions);
      const evaluated = evaluateTimelineTrack(track, timeSec);
      if (evaluated) samples.push(evaluated.transform.position);
    }
  });
  samples.push(cloneVec3(frames[frames.length - 1].transform.position));
  return samples;
}
