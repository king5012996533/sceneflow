import { getDirectorObjectFocusTarget } from "../schema/cameraTarget";
import type {
  CharacterBodyType,
  DirectorCameraShot,
  DirectorObject,
  DirectorTimelineInterpolation,
  DirectorTimelineMotion,
  DirectorTransform,
  DirectorTrajectoryPreset,
  GeometryPrimitiveType,
  SceneSettings,
  ViewMode,
} from "../schema/directorProject";
import { POSE_PRESET_IDS, type PosePresetId } from "../schema/poseSchema";
import { BODY_TYPE_OPTIONS } from "../runtime/mannequin/bodyTypes";
import { useDirectorStore } from "../store/directorStore";
import {
  createDirectorAgentSnapshot,
  DIRECTOR_AGENT_COMMAND_NAMES,
  getDirectorProjectRevision,
  type DirectorAgentCommandName,
} from "./directorAgentProtocol";
import {
  getTimelinePlaybackEndTime,
  normalizeDirectorTimeline,
  type DirectorTrajectoryWaypoint,
} from "../timeline/animationTimeline";

type JsonObject = Record<string, unknown>;
type Vec3 = [number, number, number];

function object(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
}

function text(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} 不能为空`);
  return value.trim();
}

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function finiteNumber(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${label} 必须是有限数值`);
  return value;
}

function optionalNumber(value: unknown, label: string) {
  return value === undefined ? undefined : finiteNumber(value, label);
}

function vec3(value: unknown, label: string): Vec3 {
  if (Array.isArray(value) && value.length === 3) {
    return value.map((item, index) => finiteNumber(item, `${label}[${index}]`)) as Vec3;
  }

  const item = object(value);
  if (["x", "y", "z"].every((key) => key in item)) {
    return [
      finiteNumber(item.x, `${label}.x`),
      finiteNumber(item.y, `${label}.y`),
      finiteNumber(item.z, `${label}.z`),
    ];
  }

  throw new Error(`${label} 必须是 [x,y,z] 或 {x,y,z}`);
}

function optionalVec3(value: unknown, label: string) {
  return value === undefined ? undefined : vec3(value, label);
}

function degreesToRadians(value: Vec3): Vec3 {
  return value.map((item) => Number(((item * Math.PI) / 180).toFixed(6))) as Vec3;
}

function boolean(value: unknown, label: string) {
  if (typeof value !== "boolean") throw new Error(`${label} 必须是布尔值`);
  return value;
}

function optionalBoolean(value: unknown, label: string) {
  return value === undefined ? undefined : boolean(value, label);
}

function assertExpectedRevision(args: JsonObject) {
  const expected = optionalText(args.expected_revision);
  if (!expected) return;

  const actual = getDirectorProjectRevision(useDirectorStore.getState().project);
  if (expected !== actual) {
    throw new Error(`工程版本冲突：expected_revision=${expected}，current_revision=${actual}。请重新读取状态。`);
  }
}

function findObject(id: string) {
  const item = useDirectorStore.getState().project.objects.find((objectItem) => objectItem.id === id);
  if (!item) throw new Error(`未找到对象：${id}`);
  return item;
}

function findCamera(id: string) {
  const camera = useDirectorStore.getState().project.cameras.find((item) => item.id === id);
  if (!camera) throw new Error(`未找到机位：${id}`);
  return camera;
}

function assertUnlocked(item: DirectorObject, args: JsonObject) {
  if (item.locked && args.override_locked !== true) {
    throw new Error(`对象 ${item.id} 已被人工锁定；只有用户明确授权后才可设置 override_locked=true。`);
  }
}

function withUndoBatch(run: () => void) {
  const store = useDirectorStore.getState();
  store.beginUndoBatch();
  try {
    run();
  } finally {
    useDirectorStore.getState().endUndoBatch();
  }
}

function updateObjectFields(objectId: string, args: JsonObject) {
  const store = useDirectorStore.getState();
  const current = findObject(objectId);
  const position = optionalVec3(args.position, "position");
  const rotationDegrees = optionalVec3(args.rotation_deg, "rotation_deg");
  const scale = optionalVec3(args.scale, "scale");
  const name = optionalText(args.name);
  const color = optionalText(args.color);
  const bodyType = optionalText(args.body_type);

  if (scale?.some((item) => item <= 0)) throw new Error("scale 的每一项都必须大于 0");
  if (bodyType && !BODY_TYPE_OPTIONS.some((item) => item.bodyType === bodyType)) {
    throw new Error(`未知 body_type：${bodyType}`);
  }
  if (bodyType && current.kind !== "character") throw new Error(`对象 ${objectId} 不是角色，不能设置 body_type`);

  if (position || rotationDegrees || scale) {
    store.updateObjectTransform(objectId, {
      ...(position ? { position } : {}),
      ...(rotationDegrees ? { rotation: degreesToRadians(rotationDegrees) } : {}),
      ...(scale ? { scale } : {}),
    });
  }
  if (name) useDirectorStore.getState().updateObjectName(objectId, name);
  if (color) useDirectorStore.getState().updateObjectColor(objectId, color);
  if (bodyType) useDirectorStore.getState().updateCharacterBodyType(objectId, bodyType as CharacterBodyType);
  if (args.visible !== undefined && boolean(args.visible, "visible") !== findObject(objectId).visible) {
    useDirectorStore.getState().toggleObjectVisible(objectId);
  }
  if (args.locked !== undefined && boolean(args.locked, "locked") !== findObject(objectId).locked) {
    useDirectorStore.getState().toggleObjectLocked(objectId);
  }
}

function commandSelectObject(args: JsonObject) {
  assertExpectedRevision(args);
  if (args.object_id === null || args.object_id === undefined) {
    useDirectorStore.getState().selectObject(null);
    return;
  }

  const objectId = text(args.object_id, "object_id");
  findObject(objectId);
  useDirectorStore.getState().selectObject(objectId);
}

function commandAddCharacter(args: JsonObject) {
  assertExpectedRevision(args);
  const bodyType = optionalText(args.body_type) ?? "mannequin";
  if (!BODY_TYPE_OPTIONS.some((item) => item.bodyType === bodyType)) throw new Error(`未知 body_type：${bodyType}`);

  withUndoBatch(() => {
    useDirectorStore.getState().addPresetCharacter(bodyType as CharacterBodyType);
    const objectId = useDirectorStore.getState().selectedObjectId;
    if (!objectId) throw new Error("新增角色后未找到对象 ID");
    updateObjectFields(objectId, args);
  });
}

function commandAddCrowd(args: JsonObject) {
  assertExpectedRevision(args);
  const rows = Math.max(1, Math.round(optionalNumber(args.rows, "rows") ?? 2));
  const columns = Math.max(1, Math.round(optionalNumber(args.columns, "columns") ?? 3));
  const spacing = optionalNumber(args.spacing, "spacing") ?? 1.2;
  const bodyType = optionalText(args.body_type) ?? "mannequin";
  if (rows * columns > 100) throw new Error("一次最多新增 100 个群众角色");
  if (spacing <= 0) throw new Error("spacing 必须大于 0");
  if (!BODY_TYPE_OPTIONS.some((item) => item.bodyType === bodyType)) throw new Error(`未知 body_type：${bodyType}`);

  withUndoBatch(() => {
    const ids = useDirectorStore.getState().addCrowdCharacters({
      rows,
      columns,
      spacing,
      bodyType: bodyType as CharacterBodyType,
    });
    const crowdId = ids.length ? findObject(ids[0]).crowdId : null;
    if (!crowdId) throw new Error("新增群众后未找到 crowd_id");
    const transformPatch: Partial<DirectorTransform> = {};
    const position = optionalVec3(args.position, "position");
    const rotation = optionalVec3(args.rotation_deg, "rotation_deg");
    const scale = optionalVec3(args.scale, "scale");
    if (position) transformPatch.position = position;
    if (rotation) transformPatch.rotation = degreesToRadians(rotation);
    if (scale) transformPatch.scale = scale;
    if (Object.keys(transformPatch).length) useDirectorStore.getState().updateCrowdTransform(crowdId, transformPatch);
    const label = optionalText(args.name);
    const color = optionalText(args.color);
    if (label) useDirectorStore.getState().updateCrowdLabel(crowdId, label);
    if (color) useDirectorStore.getState().updateCrowdColor(crowdId, color);
  });
}

function commandAddPrimitive(args: JsonObject) {
  assertExpectedRevision(args);
  const primitive = text(args.primitive, "primitive") as GeometryPrimitiveType;
  if (!["box", "sphere", "cylinder", "torus", "cone", "pyramid"].includes(primitive)) {
    throw new Error(`未知 primitive：${primitive}`);
  }

  withUndoBatch(() => {
    useDirectorStore.getState().addGeometryPrimitive(primitive);
    const objectId = useDirectorStore.getState().selectedObjectId;
    if (!objectId) throw new Error("新增几何体后未找到对象 ID");
    updateObjectFields(objectId, args);
  });
}

function commandAddCamera(args: JsonObject) {
  assertExpectedRevision(args);
  const position = optionalVec3(args.position, "position");
  const target = optionalVec3(args.target, "target") ?? [0, 1.2, 0];
  const fov = optionalNumber(args.fov, "fov") ?? 50;
  if (fov < 5 || fov > 140) throw new Error("fov 必须在 5–140 之间");

  withUndoBatch(() => {
    const cameraId = useDirectorStore.getState().addCameraShot();
    const cameraObject = useDirectorStore
      .getState()
      .project.objects.find((item) => item.kind === "camera" && item.linkedCameraId === cameraId);
    if (!cameraObject) throw new Error("新增机位后未找到机位对象");
    if (position) useDirectorStore.getState().updateObjectTransform(cameraObject.id, { position });
    useDirectorStore.getState().updateCamera(cameraId, { fov, target, targetMode: "manual", targetObjectId: null });
    const name = optionalText(args.name);
    if (name) {
      useDirectorStore.getState().updateObjectName(cameraObject.id, name);
      useDirectorStore.getState().updateCamera(cameraId, { name });
    }
  });
}

function commandUpdateObject(args: JsonObject) {
  assertExpectedRevision(args);
  const objectId = text(args.object_id, "object_id");
  const item = findObject(objectId);
  assertUnlocked(item, args);
  withUndoBatch(() => updateObjectFields(objectId, args));
}

function commandUpdateCamera(args: JsonObject) {
  assertExpectedRevision(args);
  const cameraId = text(args.camera_id, "camera_id");
  const current = findCamera(cameraId);
  const cameraObject = useDirectorStore
    .getState()
    .project.objects.find((item) => item.kind === "camera" && item.linkedCameraId === cameraId);
  if (!cameraObject) throw new Error(`机位 ${cameraId} 缺少对应场景对象`);
  assertUnlocked(cameraObject, args);
  const fov = optionalNumber(args.fov, "fov");
  if (fov !== undefined && (fov < 5 || fov > 140)) throw new Error("fov 必须在 5–140 之间");
  const targetObjectId = optionalText(args.target_object_id);
  const manualTarget = optionalVec3(args.target, "target");
  if (targetObjectId && manualTarget) throw new Error("target 与 target_object_id 不能同时设置");
  const targetObject = targetObjectId ? findObject(targetObjectId) : null;
  if (targetObject?.kind === "camera" || targetObject?.kind === "panorama") {
    throw new Error(`对象 ${targetObjectId} 不能作为机位目标`);
  }

  withUndoBatch(() => {
    const position = optionalVec3(args.position, "position");
    if (position) useDirectorStore.getState().updateObjectTransform(cameraObject.id, { position });
    const name = optionalText(args.name);
    if (name) useDirectorStore.getState().updateObjectName(cameraObject.id, name);
    const patch: Partial<DirectorCameraShot> = {};
    if (fov !== undefined) patch.fov = fov;
    if (name) patch.name = name;
    if (targetObject) {
      patch.targetMode = "object";
      patch.targetObjectId = targetObject.id;
      patch.target = getDirectorObjectFocusTarget(targetObject);
    } else if (manualTarget) {
      patch.targetMode = "manual";
      patch.targetObjectId = null;
      patch.target = manualTarget;
    }
    if (Object.keys(patch).length) useDirectorStore.getState().updateCamera(current.id, patch);
  });
}

function commandApplyPose(args: JsonObject) {
  assertExpectedRevision(args);
  const poseId = text(args.pose_id, "pose_id") as PosePresetId;
  if (!POSE_PRESET_IDS.includes(poseId)) throw new Error(`未知 pose_id：${poseId}`);
  const objectId = optionalText(args.object_id);
  const crowdId = optionalText(args.crowd_id);
  if (Boolean(objectId) === Boolean(crowdId)) throw new Error("object_id 与 crowd_id 必须且只能提供一个");

  if (objectId) {
    const item = findObject(objectId);
    if (item.kind !== "character") throw new Error(`对象 ${objectId} 不是角色`);
    assertUnlocked(item, args);
    useDirectorStore.getState().applyPosePreset(objectId, poseId);
    return;
  }

  const members = useDirectorStore.getState().project.objects.filter((item) => item.crowdId === crowdId);
  if (!members.length) throw new Error(`未找到群众：${crowdId}`);
  const locked = members.find((item) => item.locked);
  if (locked) assertUnlocked(locked, args);
  useDirectorStore.getState().applyCrowdPosePreset(crowdId!, poseId);
}

function commandUpdateScene(args: JsonObject) {
  assertExpectedRevision(args);
  const patch: Partial<SceneSettings> = {};
  const position = optionalVec3(args.position, "position");
  const rotation = optionalVec3(args.rotation_deg, "rotation_deg");
  const backgroundColor = optionalText(args.background_color);
  if (position) patch.position = position;
  if (rotation) patch.rotation = degreesToRadians(rotation);
  if (backgroundColor) patch.backgroundColor = backgroundColor;
  const numericFields = ["scale", "panorama_yaw", "panorama_radius", "ground_opacity", "ground_height"] as const;
  const numericMap: Record<(typeof numericFields)[number], keyof SceneSettings> = {
    scale: "scale",
    panorama_yaw: "panoramaYaw",
    panorama_radius: "panoramaRadius",
    ground_opacity: "groundOpacity",
    ground_height: "groundHeight",
  };
  for (const field of numericFields) {
    const value = optionalNumber(args[field], field);
    if (value !== undefined) (patch as Record<string, unknown>)[numericMap[field]] = value;
  }
  const booleanFields = ["show_labels", "snap_to_grid", "show_ground"] as const;
  const booleanMap: Record<(typeof booleanFields)[number], keyof SceneSettings> = {
    show_labels: "showLabels",
    snap_to_grid: "snapToGrid",
    show_ground: "showGround",
  };
  for (const field of booleanFields) {
    if (args[field] !== undefined) (patch as Record<string, unknown>)[booleanMap[field]] = boolean(args[field], field);
  }
  if (patch.scale !== undefined && patch.scale <= 0) throw new Error("scale 必须大于 0");
  if (patch.groundOpacity !== undefined && (patch.groundOpacity < 0 || patch.groundOpacity > 1)) {
    throw new Error("ground_opacity 必须在 0–1 之间");
  }
  useDirectorStore.getState().updateScene(patch);
}

function commandSetView(args: JsonObject) {
  assertExpectedRevision(args);
  const mode = text(args.mode, "mode") as ViewMode;
  if (mode !== "director" && mode !== "camera") throw new Error(`未知 mode：${mode}`);
  const cameraId = optionalText(args.camera_id);
  if (cameraId) {
    findCamera(cameraId);
    useDirectorStore.getState().setActiveCamera(cameraId);
  }
  useDirectorStore.getState().setViewMode(mode);
}

function commandSetTimeline(args: JsonObject) {
  assertExpectedRevision(args);
  const durationSec = optionalNumber(args.duration_sec, "duration_sec");
  const loop = optionalBoolean(args.loop, "loop");
  const timeSec = optionalNumber(args.time_sec, "time_sec");
  const playing = optionalBoolean(args.playing, "playing");
  const openPanel = optionalBoolean(args.open_panel, "open_panel");
  if ([durationSec, loop, timeSec, playing, openPanel].every((value) => value === undefined)) {
    throw new Error("director_set_timeline 至少需要一个设置字段");
  }
  if (durationSec !== undefined && (durationSec < 0.5 || durationSec > 600)) {
    throw new Error("duration_sec 必须在 0.5–600 之间");
  }

  withUndoBatch(() => {
    if (durationSec !== undefined) useDirectorStore.getState().setTimelineDuration(durationSec);
    if (loop !== undefined) useDirectorStore.getState().setTimelineLoop(loop);
  });
  if (timeSec !== undefined) useDirectorStore.getState().setTimelineCurrentTime(timeSec);
  if (openPanel !== undefined) useDirectorStore.getState().setTimelinePanelOpen(openPanel);
  if (playing !== undefined) {
    const state = useDirectorStore.getState();
    const playbackEndTime = getTimelinePlaybackEndTime(state.project.timeline);
    if (playing && state.timelineCurrentTime >= playbackEndTime) state.setTimelineCurrentTime(0);
    useDirectorStore.getState().setTimelinePlaying(playing);
  }
}

function parseTrajectoryWaypoint(value: unknown, index: number): DirectorTrajectoryWaypoint {
  const waypoint = object(value);
  const position = vec3(waypoint.position, `waypoints[${index}].position`);
  const rotationDegrees = optionalVec3(waypoint.rotation_deg, `waypoints[${index}].rotation_deg`);
  const scale = optionalVec3(waypoint.scale, `waypoints[${index}].scale`);
  const target = optionalVec3(waypoint.target, `waypoints[${index}].target`);
  const fov = optionalNumber(waypoint.fov, `waypoints[${index}].fov`);
  const timeSec = optionalNumber(waypoint.time_sec, `waypoints[${index}].time_sec`);
  const interpolation = optionalText(waypoint.interpolation) as DirectorTimelineInterpolation | undefined;
  if (scale?.some((item) => item <= 0)) throw new Error(`waypoints[${index}].scale 必须全部大于 0`);
  if (fov !== undefined && (fov < 5 || fov > 140)) throw new Error(`waypoints[${index}].fov 必须在 5–140 之间`);
  if (timeSec !== undefined && timeSec < 0) throw new Error(`waypoints[${index}].time_sec 不能小于 0`);
  if (interpolation && !["hold", "linear", "smooth"].includes(interpolation)) {
    throw new Error(`waypoints[${index}].interpolation 必须是 hold、linear 或 smooth`);
  }

  return {
    position,
    ...(rotationDegrees ? { rotation: degreesToRadians(rotationDegrees) } : {}),
    ...(scale ? { scale } : {}),
    ...(target ? { target } : {}),
    ...(fov !== undefined ? { fov } : {}),
    ...(timeSec !== undefined ? { timeSec } : {}),
    ...(interpolation ? { interpolation } : {}),
  };
}

function commandDefineTrajectory(args: JsonObject) {
  assertExpectedRevision(args);
  const objectId = text(args.object_id, "object_id");
  const item = findObject(objectId);
  assertUnlocked(item, args);
  const waypointValues = Array.isArray(args.waypoints) ? args.waypoints : [];
  const waypoints = waypointValues.map(parseTrajectoryWaypoint);
  const preset = (optionalText(args.preset) ?? (waypoints.length ? "custom" : "line")) as DirectorTrajectoryPreset;
  if (!["line", "circle", "rectangle", "custom"].includes(preset)) throw new Error(`未知 preset：${preset}`);
  if (preset === "custom" && waypoints.length < 2) throw new Error("custom 轨迹至少需要两个 waypoints");
  const requestedDuration = optionalNumber(args.duration_sec, "duration_sec");
  const maxWaypointTime = waypoints.reduce((max, waypoint) => Math.max(max, waypoint.timeSec ?? 0), 0);
  if (requestedDuration !== undefined && maxWaypointTime > requestedDuration) {
    throw new Error("waypoint 的 time_sec 不能超过 duration_sec");
  }
  const timeline = normalizeDirectorTimeline(useDirectorStore.getState().project.timeline);
  const durationSec = requestedDuration ?? Math.max(timeline.durationSec, maxWaypointTime);
  const radius = optionalNumber(args.radius, "radius");
  const width = optionalNumber(args.width, "width");
  const depth = optionalNumber(args.depth, "depth");
  if ([radius, width, depth].some((value) => value !== undefined && value <= 0)) {
    throw new Error("radius、width、depth 必须大于 0");
  }
  const motion = (optionalText(args.motion) ?? (item.kind === "character" ? "walk" : "none")) as DirectorTimelineMotion;
  if (motion !== "none" && !POSE_PRESET_IDS.includes(motion as PosePresetId)) throw new Error(`未知 motion：${motion}`);
  if (item.kind !== "character" && motion !== "none") throw new Error("只有角色轨迹可以设置移动动作或姿势");

  const trackId = useDirectorStore.getState().createObjectTrajectory(objectId, preset, {
    durationSec,
    ...(waypoints.length ? { waypoints } : {}),
    ...(radius !== undefined ? { radius } : {}),
    ...(width !== undefined ? { width } : {}),
    ...(depth !== undefined ? { depth } : {}),
    ...(args.orient_to_path !== undefined ? { orientToPath: boolean(args.orient_to_path, "orient_to_path") } : {}),
    motion,
    source: "agent",
    ...(optionalText(args.color) ? { color: optionalText(args.color) } : {}),
  });
  if (!trackId) throw new Error(`未能为对象 ${objectId} 创建轨迹`);
  useDirectorStore.getState().selectObject(objectId);
  useDirectorStore.getState().selectTimelineTrack(trackId);
}

function commandDeleteTrajectory(args: JsonObject) {
  assertExpectedRevision(args);
  const trackId = optionalText(args.track_id);
  const objectId = optionalText(args.object_id);
  if (Boolean(trackId) === Boolean(objectId)) throw new Error("track_id 与 object_id 必须且只能提供一个");
  const timeline = normalizeDirectorTimeline(useDirectorStore.getState().project.timeline);
  const track = trackId
    ? timeline.tracks.find((item) => item.id === trackId)
    : timeline.tracks.find((item) => item.objectId === objectId);
  if (!track) throw new Error(`未找到动画轨迹：${trackId ?? objectId}`);
  const item = findObject(track.objectId);
  assertUnlocked(item, args);
  useDirectorStore.getState().deleteTimelineTrack(track.id);
}

function commandDeleteObject(args: JsonObject) {
  assertExpectedRevision(args);
  const objectId = text(args.object_id, "object_id");
  const item = findObject(objectId);
  assertUnlocked(item, args);
  const store = useDirectorStore.getState();
  store.selectObject(objectId);
  useDirectorStore.getState().deleteSelectedObject();
}

const COMMAND_HANDLERS: Record<DirectorAgentCommandName, (args: JsonObject) => void> = {
  director_get_state: () => undefined,
  director_select_object: commandSelectObject,
  director_add_character: commandAddCharacter,
  director_add_crowd: commandAddCrowd,
  director_add_primitive: commandAddPrimitive,
  director_add_camera: commandAddCamera,
  director_update_object: commandUpdateObject,
  director_update_camera: commandUpdateCamera,
  director_apply_pose: commandApplyPose,
  director_update_scene: commandUpdateScene,
  director_set_view: commandSetView,
  director_set_timeline: commandSetTimeline,
  director_define_trajectory: commandDefineTrajectory,
  director_delete_trajectory: commandDeleteTrajectory,
  director_delete_object: commandDeleteObject,
  director_undo: (args) => {
    assertExpectedRevision(args);
    useDirectorStore.getState().undo();
  },
  director_validate: () => undefined,
};

export function isDirectorAgentCommandName(value: string): value is DirectorAgentCommandName {
  return DIRECTOR_AGENT_COMMAND_NAMES.some((name) => name === value);
}

export function executeDirectorAgentCommand(name: DirectorAgentCommandName, rawArguments: unknown = {}) {
  const args = object(rawArguments);
  COMMAND_HANDLERS[name](args);
  return createDirectorAgentSnapshot(useDirectorStore.getState());
}

export function getCurrentDirectorAgentSnapshot() {
  return createDirectorAgentSnapshot(useDirectorStore.getState());
}
