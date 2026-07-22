import { createInitialDirectorState, useDirectorStore } from "../store/directorStore";
import { executeDirectorAgentCommand, getCurrentDirectorAgentSnapshot } from "./directorAgentCommands";

beforeEach(() => {
  localStorage.clear();
  useDirectorStore.setState({
    ...useDirectorStore.getState(),
    ...createInitialDirectorState(),
    undoStack: [],
    undoBatchDepth: 0,
    undoBatchSnapshot: null,
    undoBatchHasTrackedChanges: false,
  });
});

it("exposes exact IDs, catalogs, revision and a healthy default project", () => {
  const snapshot = getCurrentDirectorAgentSnapshot();

  expect(snapshot.revision).toMatch(/^p-[0-9a-f]{8}$/);
  expect(snapshot.project.objects.some((item) => item.id === "char_default_a")).toBe(true);
  expect(snapshot.catalog.poses.some((item) => item.id === "think")).toBe(true);
  expect(snapshot.catalog.trajectories.some((item) => item.id === "custom")).toBe(true);
  expect(snapshot.health).toEqual({ ok: true, issues: [] });
});

it("lets Agent define, preview and delete a custom character trajectory", () => {
  const before = getCurrentDirectorAgentSnapshot();
  const animated = executeDirectorAgentCommand("director_define_trajectory", {
    object_id: "char_default_a",
    expected_revision: before.revision,
    duration_sec: 6,
    motion: "run",
    waypoints: [
      { time_sec: 0, position: { x: 0, y: 0, z: 0 }, rotation_deg: { x: 0, y: 0, z: 0 } },
      { time_sec: 3, position: { x: 2, y: 0, z: -1 } },
      { time_sec: 6, position: { x: 4, y: 0, z: 0 } },
    ],
  });
  const track = animated.project.timeline?.tracks[0];

  expect(track).toMatchObject({ objectId: "char_default_a", preset: "custom", motion: "run", source: "agent" });
  expect(track?.keyframes).toHaveLength(3);
  expect(animated.ui.timelinePanelOpen).toBe(true);

  const playing = executeDirectorAgentCommand("director_set_timeline", {
    expected_revision: animated.revision,
    time_sec: 3,
    playing: true,
    loop: true,
  });
  expect(playing.ui).toMatchObject({ timelineCurrentTime: 3, timelinePlaying: true });

  const deleted = executeDirectorAgentCommand("director_delete_trajectory", {
    expected_revision: playing.revision,
    object_id: "char_default_a",
  });
  expect(deleted.project.timeline?.tracks).toEqual([]);
});

it("adds a character through one semantic undo step", () => {
  const before = getCurrentDirectorAgentSnapshot();
  const after = executeDirectorAgentCommand("director_add_character", {
    expected_revision: before.revision,
    body_type: "female",
    name: "女主角",
    position: { x: -1.5, y: 0, z: 0.5 },
    rotation_deg: { x: 0, y: 90, z: 0 },
    color: "#ff6688",
  });
  const character = after.project.objects.find((item) => item.name === "女主角");

  expect(character).toMatchObject({
    kind: "character",
    bodyType: "female",
    color: "#ff6688",
  });
  expect(character?.transform.position).toEqual([-1.5, 0, 0.5]);
  expect(character?.transform.rotation[1]).toBeCloseTo(Math.PI / 2, 5);
  expect(after.revision).not.toBe(before.revision);

  executeDirectorAgentCommand("director_undo", { expected_revision: after.revision });
  expect(useDirectorStore.getState().project.objects.some((item) => item.name === "女主角")).toBe(false);
});

it("protects manual locks and rejects stale revisions", () => {
  useDirectorStore.getState().toggleObjectLocked("char_default_a");
  const locked = getCurrentDirectorAgentSnapshot();

  expect(() =>
    executeDirectorAgentCommand("director_update_object", {
      object_id: "char_default_a",
      expected_revision: locked.revision,
      position: [1, 0, 0],
    })
  ).toThrow("已被人工锁定");

  const updated = executeDirectorAgentCommand("director_update_object", {
    object_id: "char_default_a",
    expected_revision: locked.revision,
    override_locked: true,
    position: [1, 0, 0],
  });
  expect(updated.project.objects.find((item) => item.id === "char_default_a")?.transform.position).toEqual([1, 0, 0]);

  expect(() =>
    executeDirectorAgentCommand("director_update_scene", {
      expected_revision: locked.revision,
      background_color: "#ffffff",
    })
  ).toThrow("工程版本冲突");
});

it("updates cameras by exact camera id and validates broken camera references", () => {
  const before = getCurrentDirectorAgentSnapshot();
  const updated = executeDirectorAgentCommand("director_update_camera", {
    camera_id: "cam_1",
    expected_revision: before.revision,
    target_object_id: "char_default_a",
    fov: 35,
    position: { x: 3, y: 2, z: 6 },
  });
  const camera = updated.project.cameras.find((item) => item.id === "cam_1");

  expect(camera).toMatchObject({ fov: 35, targetMode: "object", targetObjectId: "char_default_a" });
  expect(camera?.transform.position).toEqual([3, 2, 6]);

  useDirectorStore.getState().updateCamera("cam_1", {
    targetMode: "object",
    targetObjectId: "missing-object",
  });
  const validation = executeDirectorAgentCommand("director_validate");
  expect(validation.health.ok).toBe(false);
  expect(validation.health.issues.some((issue) => issue.includes("目标对象无效"))).toBe(true);
});

it("omits capture image bytes from Agent state", () => {
  useDirectorStore.getState().addCameraCaptures("cam_1", ["data:image/png;base64,very-large-payload"]);
  const snapshot = getCurrentDirectorAgentSnapshot();
  const capture = snapshot.project.cameras[0]?.captures?.[0];

  expect(capture?.dataUrl).toBe("[capture-data-omitted]");
  expect(JSON.stringify(snapshot)).not.toContain("very-large-payload");
});
