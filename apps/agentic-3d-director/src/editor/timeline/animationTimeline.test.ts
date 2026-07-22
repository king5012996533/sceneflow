import { createDefaultDirectorProject } from "../store/directorStore";
import {
  applyTimelineToCamera,
  applyTimelineToObject,
  createDefaultDirectorTimeline,
  createTrajectoryTrack,
  evaluateTimelineTrack,
  getTimelinePlaybackEndTime,
  getTimelineMotionControls,
  normalizeDirectorTimeline,
  sampleTimelineTrack,
} from "./animationTimeline";

it("creates and evaluates a smooth line trajectory without mutating the base object", () => {
  const project = createDefaultDirectorProject();
  const character = project.objects.find((item) => item.kind === "character")!;
  const originalPosition = [...character.transform.position];
  const track = createTrajectoryTrack({
    object: character,
    durationSec: 10,
    preset: "line",
    width: 4,
  });
  const middle = evaluateTimelineTrack(track, 5);

  expect(track.keyframes).toHaveLength(2);
  expect(middle?.transform.position).toEqual([2, 0, 0]);
  expect(middle?.transform.rotation[1]).toBeCloseTo(Math.PI / 2);
  expect(character.transform.position).toEqual(originalPosition);
});

it("builds a closed circular path with sampled viewport points", () => {
  const project = createDefaultDirectorProject();
  const character = project.objects.find((item) => item.kind === "character")!;
  const track = createTrajectoryTrack({ object: character, durationSec: 8, preset: "circle", radius: 2 });
  const sampled = sampleTimelineTrack(track, 4);

  expect(track.keyframes).toHaveLength(13);
  const first = track.keyframes[0]!.transform.position;
  const last = track.keyframes[track.keyframes.length - 1]!.transform.position;
  expect(last[0]).toBeCloseTo(first[0], 8);
  expect(last[1]).toBeCloseTo(first[1], 8);
  expect(last[2]).toBeCloseTo(first[2], 8);
  expect(sampled.length).toBeGreaterThan(40);
  expect(track.circle).toMatchObject({ radius: 2, startAngle: 0, clockwise: false });

  [0.37, 1.91, 3.42, 6.73].forEach((timeSec) => {
    const point = evaluateTimelineTrack(track, timeSec)!.transform.position;
    const distanceToCenter = Math.hypot(point[0] - track.circle!.center[0], point[2] - track.circle!.center[2]);
    expect(distanceToCenter).toBeCloseTo(track.circle!.radius, 8);
  });
});

it("migrates legacy circular tracks to exact circle geometry", () => {
  const project = createDefaultDirectorProject();
  const character = project.objects.find((item) => item.kind === "character")!;
  const legacyTrack = createTrajectoryTrack({ object: character, durationSec: 8, preset: "circle", radius: 3 });
  delete legacyTrack.circle;

  const migrated = normalizeDirectorTimeline({
    ...createDefaultDirectorTimeline(),
    durationSec: 8,
    tracks: [legacyTrack],
  }).tracks[0]!;
  const point = evaluateTimelineTrack(migrated, 2.345)!.transform.position;

  expect(migrated.circle?.radius).toBeCloseTo(3, 6);
  expect(Math.hypot(point[0] - migrated.circle!.center[0], point[2] - migrated.circle!.center[2])).toBeCloseTo(3, 8);
});

it("drives walk and run as changing gait cycles instead of one frozen pose", () => {
  const walkStart = getTimelineMotionControls("walk", 0)!;
  const walkLater = getTimelineMotionControls("walk", 0.1)!;
  const runLater = getTimelineMotionControls("run", 0.1)!;

  expect(walkLater["leftShoulder.pitch"]!).not.toBeCloseTo(walkStart["leftShoulder.pitch"]!);
  expect(walkLater["leftShoulder.pitch"]!).toBeCloseTo(-walkLater["rightShoulder.pitch"]!);
  expect(Math.abs(runLater["leftHip.pitch"]!)).toBeGreaterThan(Math.abs(walkLater["leftHip.pitch"]!));

  const project = createDefaultDirectorProject();
  const character = project.objects.find((item) => item.kind === "character")!;
  const track = createTrajectoryTrack({ object: character, durationSec: 4, preset: "line", motion: "walk" });
  const timeline = { ...createDefaultDirectorTimeline(), durationSec: 4, tracks: [track] };
  const animatedStart = applyTimelineToObject(character, timeline, 0);
  const animatedLater = applyTimelineToObject(character, timeline, 0.1);

  expect(animatedStart.characterRig?.controls).not.toEqual(animatedLater.characterRig?.controls);
  expect(character.characterRig?.controls).not.toEqual(animatedLater.characterRig?.controls);
});

it("holds the final transform but stops character motion when its track ends", () => {
  const project = createDefaultDirectorProject();
  const character = project.objects.find((item) => item.kind === "character")!;
  const track = createTrajectoryTrack({ object: character, durationSec: 3, preset: "line", motion: "walk" });
  const timeline = { ...createDefaultDirectorTimeline(), durationSec: 10, tracks: [track] };
  const finalPosition = track.keyframes[track.keyframes.length - 1]!.transform.position;
  const beforeEnd = applyTimelineToObject(character, timeline, 2.9);
  const atEnd = applyTimelineToObject(character, timeline, 3);
  const afterEnd = applyTimelineToObject(character, timeline, 6);

  expect(beforeEnd.characterRig).not.toEqual(character.characterRig);
  expect(atEnd.transform.position).toEqual(finalPosition);
  expect(afterEnd.transform.position).toEqual(finalPosition);
  expect(atEnd.characterRig).toEqual(character.characterRig);
  expect(afterEnd.characterRig).toEqual(character.characterRig);
});

it("uses the latest enabled track end as the effective playback end", () => {
  const project = createDefaultDirectorProject();
  const character = project.objects.find((item) => item.kind === "character")!;
  const shortTrack = createTrajectoryTrack({ object: character, durationSec: 3, preset: "line" });
  const longTrack = createTrajectoryTrack({ object: character, durationSec: 6, preset: "line" });
  const timeline = { ...createDefaultDirectorTimeline(), durationSec: 10, tracks: [shortTrack] };

  expect(getTimelinePlaybackEndTime(timeline)).toBe(3);
  expect(getTimelinePlaybackEndTime({ ...timeline, tracks: [shortTrack, longTrack] })).toBe(6);
  expect(getTimelinePlaybackEndTime({ ...timeline, tracks: [{ ...shortTrack, enabled: false }] })).toBe(10);
});

it("interpolates camera position, target and FOV on the same object trajectory model", () => {
  const project = createDefaultDirectorProject();
  const camera = project.cameras[0]!;
  const cameraObject = project.objects.find((item) => item.kind === "camera")!;
  const track = createTrajectoryTrack({
    object: cameraObject,
    camera,
    durationSec: 4,
    preset: "custom",
    orientToPath: false,
    waypoints: [
      { position: [0, 2, 6], target: [0, 1, 0], fov: 40, timeSec: 0 },
      { position: [4, 3, 2], target: [1, 1, 0], fov: 60, timeSec: 4 },
    ],
  });
  const timeline = { ...createDefaultDirectorTimeline(), durationSec: 4, tracks: [track] };
  const evaluated = applyTimelineToCamera(camera, cameraObject, timeline, 2);

  expect(evaluated.transform.position).toEqual([2, 2.5, 4]);
  expect(evaluated.target).toEqual([0.5, 1, 0]);
  expect(evaluated.fov).toBe(50);
});
