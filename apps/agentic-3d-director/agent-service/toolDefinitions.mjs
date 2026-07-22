import { z } from "zod";

const vec3 = () => z.object({
  x: z.number().describe("X coordinate in metres"),
  y: z.number().describe("Y coordinate in metres"),
  z: z.number().describe("Z coordinate in metres"),
});

const expectedRevision = {
  expected_revision: z.string().optional().describe("Revision returned by director_get_state"),
};

const lockedOverride = {
  override_locked: z.boolean().optional().describe("Only true after the user explicitly authorizes overriding a manual lock"),
};

const trajectoryWaypoint = () => z.object({
  time_sec: z.number().min(0).optional().describe("Optional absolute time on the timeline in seconds"),
  position: vec3(),
  rotation_deg: vec3().optional(),
  scale: vec3().optional(),
  target: vec3().optional().describe("Camera target point; ignored for non-camera objects"),
  fov: z.number().min(5).max(140).optional().describe("Camera FOV; ignored for non-camera objects"),
  interpolation: z.enum(["hold", "linear", "smooth"]).optional(),
});

export const DIRECTOR_TOOL_DEFINITIONS = {
  director_get_state: {
    title: "读取导演台状态",
    description: "读取当前浏览器导演台的完整工程、精确对象/机位 ID、revision、能力目录和健康检查。任何写操作前先调用。",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  director_get_capabilities: {
    title: "读取导演台能力",
    description: "列出可用语义动作、用途以及安全属性。",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  director_select_object: {
    title: "选择导演台对象",
    description: "按精确 object_id 选择场景对象；省略 object_id 可清空选择。",
    inputSchema: {
      object_id: z.string().nullable().optional(),
      ...expectedRevision,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  director_add_character: {
    title: "新增角色",
    description: "新增一个有稳定 ID 的白模角色，可设置体型、名称和变换。",
    inputSchema: {
      body_type: z.enum(["mannequin", "female", "broad", "muscular", "slim", "teen", "child", "chibi"]).optional(),
      name: z.string().optional(),
      position: vec3().optional(),
      rotation_deg: vec3().optional(),
      scale: vec3().optional(),
      color: z.string().optional(),
      ...expectedRevision,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  director_add_crowd: {
    title: "新增群众",
    description: "新增 1–100 个规则排列的群众角色，并返回稳定 object_id/crowd_id。",
    inputSchema: {
      rows: z.number().int().min(1).max(10).optional(),
      columns: z.number().int().min(1).max(10).optional(),
      spacing: z.number().positive().optional(),
      body_type: z.enum(["mannequin", "female", "broad", "muscular", "slim", "teen", "child", "chibi"]).optional(),
      name: z.string().optional(),
      position: vec3().optional(),
      rotation_deg: vec3().optional(),
      scale: vec3().optional(),
      color: z.string().optional(),
      ...expectedRevision,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  director_add_primitive: {
    title: "新增几何体",
    description: "新增可编辑的灰模几何体。",
    inputSchema: {
      primitive: z.enum(["box", "sphere", "cylinder", "torus", "cone", "pyramid"]),
      name: z.string().optional(),
      position: vec3().optional(),
      rotation_deg: vec3().optional(),
      scale: vec3().optional(),
      color: z.string().optional(),
      ...expectedRevision,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  director_add_camera: {
    title: "新增机位",
    description: "新增一个机位，可设置机位位置、目标点、FOV 与名称。",
    inputSchema: {
      name: z.string().optional(),
      position: vec3().optional(),
      target: vec3().optional(),
      fov: z.number().min(5).max(140).optional(),
      ...expectedRevision,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  director_update_object: {
    title: "更新导演台对象",
    description: "按 object_id 移动、旋转、缩放、重命名、换色或设置可见/锁定状态。旋转使用角度。",
    inputSchema: {
      object_id: z.string(),
      name: z.string().optional(),
      position: vec3().optional(),
      rotation_deg: vec3().optional(),
      scale: vec3().optional(),
      color: z.string().optional(),
      visible: z.boolean().optional(),
      locked: z.boolean().optional(),
      body_type: z.enum(["mannequin", "female", "broad", "muscular", "slim", "teen", "child", "chibi"]).optional(),
      ...expectedRevision,
      ...lockedOverride,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  director_update_camera: {
    title: "更新机位",
    description: "按 camera_id 更新机位位置、目标对象/目标点、FOV 与名称。target 和 target_object_id 二选一。",
    inputSchema: {
      camera_id: z.string(),
      name: z.string().optional(),
      position: vec3().optional(),
      target: vec3().optional(),
      target_object_id: z.string().optional(),
      fov: z.number().min(5).max(140).optional(),
      ...expectedRevision,
      ...lockedOverride,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  director_apply_pose: {
    title: "应用角色姿势",
    description: "给一个 object_id 或整个 crowd_id 应用姿势。pose_id 必须来自 director_get_state 的 catalog.poses。",
    inputSchema: {
      object_id: z.string().optional(),
      crowd_id: z.string().optional(),
      pose_id: z.enum(["stand", "t-pose", "walk", "run", "sit", "crouch", "kneel-one", "kneel-two", "hands-on-hips", "lean", "bow", "think", "fight", "kick", "throw", "push", "wave", "reach", "cross-arms", "phone"]),
      ...expectedRevision,
      ...lockedOverride,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  director_update_scene: {
    title: "更新场景",
    description: "更新场景背景、地面、标签、网格吸附、全景参数或整体变换。",
    inputSchema: {
      background_color: z.string().optional(),
      position: vec3().optional(),
      rotation_deg: vec3().optional(),
      scale: z.number().positive().optional(),
      panorama_yaw: z.number().optional(),
      panorama_radius: z.number().positive().optional(),
      show_labels: z.boolean().optional(),
      snap_to_grid: z.boolean().optional(),
      show_ground: z.boolean().optional(),
      ground_opacity: z.number().min(0).max(1).optional(),
      ground_height: z.number().optional(),
      ...expectedRevision,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  director_set_view: {
    title: "切换导演台视角",
    description: "切换导演视角或机位视角，可激活指定 camera_id。",
    inputSchema: {
      mode: z.enum(["director", "camera"]),
      camera_id: z.string().optional(),
      ...expectedRevision,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  director_set_timeline: {
    title: "设置动画时间轴",
    description: "设置动画时长、循环、当前时间、播放状态或时间轴面板开关。至少提供一个字段。",
    inputSchema: {
      duration_sec: z.number().min(0.5).max(600).optional(),
      loop: z.boolean().optional(),
      time_sec: z.number().min(0).optional(),
      playing: z.boolean().optional(),
      open_panel: z.boolean().optional(),
      ...expectedRevision,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  director_define_trajectory: {
    title: "定义对象动画轨迹",
    description: "为角色、道具或机位创建直线、标准圆环、矩形轨迹，或使用 waypoints 定义任意轨迹。角色 motion 可使用任意姿势，walk/run 为连续步态；相同 object_id 的旧轨迹会被替换。",
    inputSchema: {
      object_id: z.string(),
      preset: z.enum(["line", "circle", "rectangle", "custom"]).optional(),
      duration_sec: z.number().min(0.5).max(600).optional(),
      waypoints: z.array(trajectoryWaypoint()).min(2).max(64).optional(),
      radius: z.number().positive().optional(),
      width: z.number().positive().optional(),
      depth: z.number().positive().optional(),
      orient_to_path: z.boolean().optional(),
      motion: z.enum([
        "none", "stand", "t-pose", "walk", "run", "sit", "crouch", "kneel-one", "kneel-two",
        "hands-on-hips", "lean", "bow", "think", "fight", "kick", "throw", "push", "wave", "reach",
        "cross-arms", "phone",
      ]).optional(),
      color: z.string().optional(),
      ...expectedRevision,
      ...lockedOverride,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  director_delete_trajectory: {
    title: "删除对象动画轨迹",
    description: "按 track_id 或 object_id 删除一条动画轨迹；二者必须且只能提供一个。",
    inputSchema: {
      track_id: z.string().optional(),
      object_id: z.string().optional(),
      ...expectedRevision,
      ...lockedOverride,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
  director_delete_object: {
    title: "删除导演台对象",
    description: "按 object_id 删除对象。此操作有破坏性，锁定对象默认拒绝删除。",
    inputSchema: {
      object_id: z.string(),
      ...expectedRevision,
      ...lockedOverride,
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  },
  director_undo: {
    title: "撤销导演台编辑",
    description: "撤销最近一次场景编辑。",
    inputSchema: { ...expectedRevision },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  director_validate: {
    title: "校验导演台工程",
    description: "检查当前工程的重复 ID、无效变换、机位引用、FOV 和选择状态，不修改工程。",
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
};

export const BROWSER_COMMAND_NAMES = new Set(
  Object.keys(DIRECTOR_TOOL_DEFINITIONS).filter((name) => !["director_get_state", "director_get_capabilities"].includes(name)),
);

export function publicCapabilities() {
  return Object.entries(DIRECTOR_TOOL_DEFINITIONS).map(([name, definition]) => ({
    name,
    title: definition.title,
    description: definition.description,
    readOnly: definition.annotations.readOnlyHint,
    destructive: definition.annotations.destructiveHint,
  }));
}
