import { MANNEQUIN_POSE_PRESETS } from "../presets/mannequinPosePresets";
import { BODY_TYPE_OPTIONS } from "../runtime/mannequin/bodyTypes";
import {
  DIRECTOR_TRAJECTORY_PRESETS,
  GEOMETRY_PRIMITIVE_OPTIONS,
  type DirectorProject,
} from "../schema/directorProject";
import type { DirectorState } from "../store/directorStore";
import { normalizeDirectorTimeline } from "../timeline/animationTimeline";

export const DIRECTOR_AGENT_COMMAND_NAMES = [
  "director_get_state",
  "director_select_object",
  "director_add_character",
  "director_add_crowd",
  "director_add_primitive",
  "director_add_camera",
  "director_update_object",
  "director_update_camera",
  "director_apply_pose",
  "director_update_scene",
  "director_set_view",
  "director_set_timeline",
  "director_define_trajectory",
  "director_delete_trajectory",
  "director_delete_object",
  "director_undo",
  "director_validate",
] as const;

export type DirectorAgentCommandName = (typeof DIRECTOR_AGENT_COMMAND_NAMES)[number];

export interface DirectorAgentCommand {
  id: string;
  name: DirectorAgentCommandName;
  arguments: Record<string, unknown>;
}

export interface DirectorAgentCapability {
  name: DirectorAgentCommandName;
  description: string;
  readOnly: boolean;
  destructive: boolean;
}

export const DIRECTOR_AGENT_CAPABILITIES: DirectorAgentCapability[] = [
  {
    name: "director_get_state",
    description: "读取当前完整工程、精确对象/机位 ID、选择状态、revision 与校验结果。写操作前必须先调用。",
    readOnly: true,
    destructive: false,
  },
  {
    name: "director_select_object",
    description: "按精确 object_id 选择场景对象，传 null 可清空选择。",
    readOnly: false,
    destructive: false,
  },
  {
    name: "director_add_character",
    description: "新增一个角色，可指定体型、名称、位置、旋转、缩放和颜色。",
    readOnly: false,
    destructive: false,
  },
  {
    name: "director_add_crowd",
    description: "新增规则排列的群众角色，可指定行列、间距、体型和整体变换。",
    readOnly: false,
    destructive: false,
  },
  {
    name: "director_add_primitive",
    description: "新增立方体、球体、圆柱体、环状体、圆锥或棱锥，并可设置属性。",
    readOnly: false,
    destructive: false,
  },
  {
    name: "director_add_camera",
    description: "新增机位并设置位置、目标点、视场角和名称。",
    readOnly: false,
    destructive: false,
  },
  {
    name: "director_update_object",
    description: "按 object_id 移动、旋转、缩放、重命名、换色或设置可见/锁定状态。",
    readOnly: false,
    destructive: false,
  },
  {
    name: "director_update_camera",
    description: "按 camera_id 更新机位位置、目标对象/目标点、视场角和名称。",
    readOnly: false,
    destructive: false,
  },
  {
    name: "director_apply_pose",
    description: "给精确角色或整个 crowd_id 应用内置姿势预设。",
    readOnly: false,
    destructive: false,
  },
  {
    name: "director_update_scene",
    description: "更新场景背景、地面、标签、吸附、全景旋转和场景变换。",
    readOnly: false,
    destructive: false,
  },
  {
    name: "director_set_view",
    description: "切换导演/机位视角，可同时激活指定 camera_id。",
    readOnly: false,
    destructive: false,
  },
  {
    name: "director_set_timeline",
    description: "设置时间轴时长、循环、当前时间、播放状态和面板开关。",
    readOnly: false,
    destructive: false,
  },
  {
    name: "director_define_trajectory",
    description: "为角色、道具或机位创建预设轨迹，或用带时间的任意 waypoints 定义自定义轨迹。",
    readOnly: false,
    destructive: false,
  },
  {
    name: "director_delete_trajectory",
    description: "按 track_id 或 object_id 删除对象的动画轨迹。",
    readOnly: false,
    destructive: true,
  },
  {
    name: "director_delete_object",
    description: "按 object_id 删除对象；锁定对象默认拒绝删除。",
    readOnly: false,
    destructive: true,
  },
  {
    name: "director_undo",
    description: "撤销最近一次场景编辑。",
    readOnly: false,
    destructive: false,
  },
  {
    name: "director_validate",
    description: "检查重复 ID、无效变换、机位引用、视场角和当前选择，不修改工程。",
    readOnly: true,
    destructive: false,
  },
];

export interface DirectorAgentSnapshot {
  service: {
    name: "storyai-3d-director-desk";
    protocolVersion: 1;
  };
  revision: string;
  project: DirectorProject;
  ui: {
    viewMode: DirectorState["viewMode"];
    selectedObjectId: string | null;
    selectedObjectIds: string[];
    selectedCrowdId: string | null;
    transformMode: DirectorState["transformMode"];
    timelinePanelOpen: boolean;
    timelineCurrentTime: number;
    timelinePlaying: boolean;
    timelineExporting: boolean;
    selectedTimelineTrackId: string | null;
  };
  catalog: {
    bodyTypes: typeof BODY_TYPE_OPTIONS;
    primitives: typeof GEOMETRY_PRIMITIVE_OPTIONS;
    poses: Array<{ id: string; label: string }>;
    trajectories: typeof DIRECTOR_TRAJECTORY_PRESETS;
  };
  health: {
    ok: boolean;
    issues: string[];
  };
  agentRules: string[];
}

function isFiniteTuple(value: [number, number, number]) {
  return value.length === 3 && value.every((item) => Number.isFinite(item));
}

export function validateDirectorProject(project: DirectorProject) {
  const issues: string[] = [];
  const objectIds = new Set<string>();
  const cameraIds = new Set<string>();

  for (const object of project.objects) {
    if (objectIds.has(object.id)) issues.push(`对象 ID 重复：${object.id}`);
    objectIds.add(object.id);
    if (!isFiniteTuple(object.transform.position)) issues.push(`对象 ${object.id} 的位置不是有限数值`);
    if (!isFiniteTuple(object.transform.rotation)) issues.push(`对象 ${object.id} 的旋转不是有限数值`);
    if (!isFiniteTuple(object.transform.scale)) issues.push(`对象 ${object.id} 的缩放不是有限数值`);
    if (object.transform.scale.some((item) => item <= 0)) issues.push(`对象 ${object.id} 的缩放必须大于 0`);
    if (object.kind === "camera" && object.linkedCameraId && !project.cameras.some((item) => item.id === object.linkedCameraId)) {
      issues.push(`机位对象 ${object.id} 引用了不存在的 camera_id：${object.linkedCameraId}`);
    }
  }

  for (const camera of project.cameras) {
    if (cameraIds.has(camera.id)) issues.push(`机位 ID 重复：${camera.id}`);
    cameraIds.add(camera.id);
    if (camera.fov < 5 || camera.fov > 140 || !Number.isFinite(camera.fov)) {
      issues.push(`机位 ${camera.id} 的 FOV 必须在 5–140 之间`);
    }
    if (!isFiniteTuple(camera.target)) issues.push(`机位 ${camera.id} 的目标点不是有限数值`);
    if (camera.targetMode === "object" && (!camera.targetObjectId || !objectIds.has(camera.targetObjectId))) {
      issues.push(`机位 ${camera.id} 的目标对象无效`);
    }
  }

  if (project.activeCameraId && !cameraIds.has(project.activeCameraId)) {
    issues.push(`当前机位不存在：${project.activeCameraId}`);
  }

  const timeline = normalizeDirectorTimeline(project.timeline);
  const trackIds = new Set<string>();
  for (const track of timeline.tracks) {
    if (trackIds.has(track.id)) issues.push(`动画轨道 ID 重复：${track.id}`);
    trackIds.add(track.id);
    if (!objectIds.has(track.objectId)) issues.push(`动画轨道 ${track.id} 引用了不存在的 object_id：${track.objectId}`);
    if (track.keyframes.length < 2) issues.push(`动画轨道 ${track.id} 至少需要两个关键帧`);
    let previousTime = -Infinity;
    for (const frame of track.keyframes) {
      if (!Number.isFinite(frame.timeSec) || frame.timeSec < 0 || frame.timeSec > timeline.durationSec) {
        issues.push(`动画轨道 ${track.id} 的关键帧 ${frame.id} 超出时间轴范围`);
      }
      if (frame.timeSec < previousTime) issues.push(`动画轨道 ${track.id} 的关键帧时间未排序`);
      previousTime = frame.timeSec;
      if (!isFiniteTuple(frame.transform.position)) issues.push(`动画关键帧 ${frame.id} 的位置不是有限数值`);
      if (!isFiniteTuple(frame.transform.rotation)) issues.push(`动画关键帧 ${frame.id} 的旋转不是有限数值`);
      if (!isFiniteTuple(frame.transform.scale) || frame.transform.scale.some((item) => item <= 0)) {
        issues.push(`动画关键帧 ${frame.id} 的缩放必须是有限正数`);
      }
      if (frame.target && !isFiniteTuple(frame.target)) issues.push(`动画关键帧 ${frame.id} 的机位目标不是有限数值`);
      if (frame.fov !== undefined && (!Number.isFinite(frame.fov) || frame.fov < 5 || frame.fov > 140)) {
        issues.push(`动画关键帧 ${frame.id} 的 FOV 必须在 5–140 之间`);
      }
    }
  }

  return issues;
}

function redactBinaryProjectValue(key: string, value: unknown) {
  if (key === "dataUrl" && typeof value === "string") return value ? "[capture-data-omitted]" : value;
  if (key === "lastCaptureUrl" && typeof value === "string") return value ? "[capture-data-omitted]" : value;
  if (key === "url" && typeof value === "string" && /^(data:|blob:)/i.test(value)) {
    return `[${value.slice(0, value.indexOf(":"))}-asset-url-omitted]`;
  }
  return value;
}

function cloneAgentSafeProject(project: DirectorProject) {
  return JSON.parse(JSON.stringify(project, redactBinaryProjectValue)) as DirectorProject;
}

export function getDirectorProjectRevision(project: DirectorProject) {
  const json = JSON.stringify(project, redactBinaryProjectValue);
  let hash = 2166136261;

  for (let index = 0; index < json.length; index += 1) {
    hash ^= json.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `p-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createDirectorAgentSnapshot(state: DirectorState): DirectorAgentSnapshot {
  const issues = validateDirectorProject(state.project);

  return {
    service: {
      name: "storyai-3d-director-desk",
      protocolVersion: 1,
    },
    revision: getDirectorProjectRevision(state.project),
    project: cloneAgentSafeProject(state.project),
    ui: {
      viewMode: state.viewMode,
      selectedObjectId: state.selectedObjectId,
      selectedObjectIds: [...state.selectedObjectIds],
      selectedCrowdId: state.selectedCrowdId,
      transformMode: state.transformMode,
      timelinePanelOpen: state.timelinePanelOpen,
      timelineCurrentTime: state.timelineCurrentTime,
      timelinePlaying: state.timelinePlaying,
      timelineExporting: state.timelineExporting,
      selectedTimelineTrackId: state.selectedTimelineTrackId,
    },
    catalog: {
      bodyTypes: BODY_TYPE_OPTIONS,
      primitives: GEOMETRY_PRIMITIVE_OPTIONS,
      poses: MANNEQUIN_POSE_PRESETS.map(({ id, label }) => ({ id, label })),
      trajectories: DIRECTOR_TRAJECTORY_PRESETS,
    },
    health: {
      ok: issues.length === 0,
      issues,
    },
    agentRules: [
      "写操作前先读取最新状态，并使用返回的精确 object_id、camera_id 或 crowd_id。",
      "位置和缩放使用 [x,y,z] 米制数组；rotation_deg 使用角度数组，工程内部会转换为弧度。",
      "locked=true 是人工确认结果；没有用户明确授权时不要传 override_locked=true。",
      "写操作携带 expected_revision，发生冲突后重新读取状态再规划。",
      "动画轨迹统一绑定 object_id；角色、道具和机位都可使用预设或 waypoints。自定义 waypoints 至少两个，角色 motion 可使用任意姿势预设，walk/run 会连续循环。",
      "多步修改完成后调用 director_validate。",
    ],
  };
}
