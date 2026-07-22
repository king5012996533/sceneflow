import type { PosePresetId } from "./poseSchema";

export type ViewMode = "director" | "camera";
export type RightPanelKind = "scene" | "character" | "prop" | "camera";
export type DirectorObjectKind = "character" | "scene" | "prop" | "camera" | "panorama";
export const GEOMETRY_PRIMITIVE_OPTIONS = [
  { type: "box", label: "立方体" },
  { type: "sphere", label: "球体" },
  { type: "cylinder", label: "圆柱体" },
  { type: "torus", label: "环状体" },
  { type: "cone", label: "圆锥" },
  { type: "pyramid", label: "棱锥" },
] as const;
export type GeometryPrimitiveType = (typeof GEOMETRY_PRIMITIVE_OPTIONS)[number]["type"];
export type CharacterRigType = "mannequin" | "ue4-mannequin" | "mixamo" | "vrm" | "custom-humanoid";
export type CharacterBodyType =
  | "mannequin"
  | "female"
  | "broad"
  | "muscular"
  | "slim"
  | "teen"
  | "child"
  | "chibi";
export type DirectorAssetKind = "character" | "scene" | "prop" | "panorama";
export type DirectorAssetSource = "local" | "library";
export type PanoramaProjectionMode = "equirectangular" | "backdrop";

export interface DirectorTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface SceneSettings {
  scale: number;
  position: [number, number, number];
  rotation: [number, number, number];
  backgroundColor: string;
  panoramaYaw: number;
  panoramaRadius: number;
  showLabels: boolean;
  snapToGrid: boolean;
  showGround: boolean;
  groundOpacity: number;
  groundHeight: number;
}

export interface CharacterRigState {
  rigType: CharacterRigType;
  posePresetId: string | null;
  controls: Record<string, number>;
}

export interface DirectorAssetRef {
  id: string;
  kind: DirectorAssetKind;
  sourceType: "model" | "image";
  fileName: string;
  name?: string;
  url: string;
  assetSource?: DirectorAssetSource;
  projectionMode?: PanoramaProjectionMode;
}

export interface DirectorObject {
  id: string;
  name: string;
  kind: DirectorObjectKind;
  visible: boolean;
  locked: boolean;
  transform: DirectorTransform;
  bodyType?: CharacterBodyType;
  color?: string;
  assetRefId?: string;
  geometryType?: GeometryPrimitiveType;
  crowdId?: string;
  crowdLabel?: string;
  linkedCameraId?: string | null;
  characterRig?: CharacterRigState;
}

export interface DirectorCameraCapture {
  id: string;
  index: number;
  name: string;
  dataUrl: string;
}

export interface DirectorCameraShot {
  id: string;
  name: string;
  fov: number;
  transform: DirectorTransform;
  targetMode: "manual" | "object";
  targetObjectId?: string | null;
  target: [number, number, number];
  lastCaptureUrl?: string | null;
  captures?: DirectorCameraCapture[];
}

export const DIRECTOR_TRAJECTORY_PRESETS = [
  { id: "line", label: "直线路径" },
  { id: "circle", label: "圆环路径" },
  { id: "rectangle", label: "矩形路径" },
  { id: "custom", label: "自由绘制" },
] as const;

export type DirectorTrajectoryPreset = (typeof DIRECTOR_TRAJECTORY_PRESETS)[number]["id"];
export type DirectorTimelineInterpolation = "hold" | "linear" | "smooth";
export type DirectorTimelineMotion = "none" | PosePresetId;
export type DirectorTimelineTrackSource = "manual" | "preset" | "agent";

export interface DirectorTimelineCircleGeometry {
  center: [number, number, number];
  radius: number;
  startAngle: number;
  clockwise: boolean;
}

export interface DirectorTimelineKeyframe {
  id: string;
  timeSec: number;
  transform: DirectorTransform;
  target?: [number, number, number];
  fov?: number;
  interpolation: DirectorTimelineInterpolation;
}

export interface DirectorTimelineTrack {
  id: string;
  objectId: string;
  enabled: boolean;
  preset: DirectorTrajectoryPreset;
  color: string;
  orientToPath: boolean;
  motion: DirectorTimelineMotion;
  source: DirectorTimelineTrackSource;
  circle?: DirectorTimelineCircleGeometry;
  keyframes: DirectorTimelineKeyframe[];
}

export interface DirectorTimeline {
  durationSec: number;
  fps: number;
  loop: boolean;
  tracks: DirectorTimelineTrack[];
}

export interface DirectorProject {
  version: 1;
  scene: SceneSettings;
  assets: DirectorAssetRef[];
  objects: DirectorObject[];
  cameras: DirectorCameraShot[];
  activeCameraId: string | null;
  panoramaAssetId: string | null;
  /** Optional only for backwards compatibility with projects saved before timeline support. */
  timeline?: DirectorTimeline;
}
