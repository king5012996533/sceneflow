import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  clearDirectorDeskHostBridge,
  initDirectorDeskHostBridge,
} from "./hostBridge";
import { createInitialDirectorState, useDirectorStore } from "../store/directorStore";

function createMemoryStorage(): Storage {
  const storage = new Map<string, string>();

  return {
    get length() {
      return storage.size;
    },
    clear: () => storage.clear(),
    getItem: (key) => storage.get(key) ?? null,
    key: (index) => Array.from(storage.keys())[index] ?? null,
    removeItem: (key) => {
      storage.delete(key);
    },
    setItem: (key, value) => {
      storage.set(key, String(value));
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryStorage());
  document.documentElement.classList.remove("dark");
  delete document.documentElement.dataset.theme;
  useDirectorStore.getState().openScopedScene(null);
  useDirectorStore.setState({
    ...useDirectorStore.getState(),
    ...createInitialDirectorState(),
  });
});

afterEach(() => {
  clearDirectorDeskHostBridge();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("imports a host panorama message into the director store", () => {
  initDirectorDeskHostBridge();

  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        type: "storyai:director-desk-panorama",
        payload: {
          edgeId: "edge-image-director",
          sourceNodeId: "node_image",
          imageUrl: "data:image/png;base64,panorama",
          fileName: "画布图片.png",
        },
      },
      origin: window.location.origin,
    })
  );

  const state = useDirectorStore.getState();
  const panoramaAsset = state.project.assets.find(
    (asset) => asset.id === state.project.panoramaAssetId
  );

  expect(panoramaAsset).toMatchObject({
    kind: "panorama",
    sourceType: "image",
    fileName: "画布图片.png",
    name: "画布图片.png",
    url: "data:image/png;base64,panorama",
  });
});

it("switches director store persistence when the host sends a card session", () => {
  initDirectorDeskHostBridge();

  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        type: "storyai:director-desk-session",
        payload: {
          instanceId: "node_director_a",
        },
      },
      origin: window.location.origin,
    })
  );

  useDirectorStore.getState().updateScene({ backgroundColor: "#151515" });

  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        type: "storyai:director-desk-session",
        payload: {
          instanceId: "node_director_b",
        },
      },
      origin: window.location.origin,
    })
  );

  expect(useDirectorStore.getState().project.scene.backgroundColor).toBe("#000000");

  useDirectorStore.getState().updateScene({ backgroundColor: "#303640" });

  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        type: "storyai:director-desk-session",
        payload: {
          instanceId: "node_director_a",
        },
      },
      origin: window.location.origin,
    })
  );

  expect(useDirectorStore.getState().project.scene.backgroundColor).toBe("#151515");
});

it("restores a host project into the active card session", () => {
  initDirectorDeskHostBridge();
  const project = {
    ...useDirectorStore.getState().project,
    scene: {
      ...useDirectorStore.getState().project.scene,
      backgroundColor: "#445566",
    },
  };

  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        type: "storyai:director-desk-session",
        payload: {
          instanceId: "node_director_restore",
          project,
        },
      },
      origin: window.location.origin,
    })
  );

  expect(useDirectorStore.getState().project.scene.backgroundColor).toBe("#445566");
});

it("notifies the host canvas when the director project changes", () => {
  vi.useFakeTimers();
  const postMessage = vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
  initDirectorDeskHostBridge();

  useDirectorStore.getState().updateScene({ backgroundColor: "#101820" });
  vi.advanceTimersByTime(250);

  expect(postMessage).toHaveBeenCalledWith(
    {
      type: "storyai:director-desk-project-changed",
      payload: expect.objectContaining({
        project: expect.objectContaining({
          scene: expect.objectContaining({ backgroundColor: "#101820" }),
        }),
        revision: expect.stringMatching(/^p-[0-9a-f]{8}$/),
        updatedAt: expect.any(String),
      }),
    },
    window.location.origin
  );
});

it("applies the light theme sent by the host session to the director desk document", () => {
  document.documentElement.classList.add("dark");
  document.documentElement.dataset.theme = "dark";
  initDirectorDeskHostBridge();

  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        type: "storyai:director-desk-session",
        payload: {
          instanceId: "node_director_light",
          theme: "light",
        },
      },
      origin: window.location.origin,
    })
  );

  expect(document.documentElement.dataset.theme).toBe("light");
  expect(document.documentElement.classList.contains("dark")).toBe(false);
});

it("applies the dark theme sent by the host session to the director desk document", () => {
  document.documentElement.dataset.theme = "light";
  initDirectorDeskHostBridge();

  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        type: "storyai:director-desk-session",
        payload: {
          instanceId: "node_director_dark",
          theme: "dark",
        },
      },
      origin: window.location.origin,
    })
  );

  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(document.documentElement.classList.contains("dark")).toBe(true);
});

it("ignores a host panorama message without an image url", () => {
  initDirectorDeskHostBridge();

  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        type: "storyai:director-desk-panorama",
        payload: {
          edgeId: "edge-image-director",
          sourceNodeId: "node_image",
        },
      },
      origin: window.location.origin,
    })
  );

  expect(useDirectorStore.getState().project.panoramaAssetId).toBeNull();
});

it("notifies the host canvas when a host-connected panorama is removed", () => {
  const postMessage = vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
  initDirectorDeskHostBridge();

  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        type: "storyai:director-desk-panorama",
        payload: {
          edgeId: "edge-image-director",
          sourceNodeId: "node_image",
          imageUrl: "data:image/png;base64,panorama",
          fileName: "画布图片.png",
        },
      },
      origin: window.location.origin,
    })
  );

  useDirectorStore.getState().removePanoramaAsset();

  expect(postMessage).toHaveBeenCalledWith(
    {
      type: "storyai:director-desk-panorama-removed",
      payload: {
        edgeId: "edge-image-director",
        sourceNodeId: "node_image",
      },
    },
    window.location.origin
  );
});

it("does not notify the host canvas when changing to a different card session clears the current panorama", () => {
  const postMessage = vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
  initDirectorDeskHostBridge();

  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        type: "storyai:director-desk-session",
        payload: {
          instanceId: "node_director_a",
        },
      },
      origin: window.location.origin,
    })
  );
  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        type: "storyai:director-desk-panorama",
        payload: {
          edgeId: "edge-image-director-a",
          sourceNodeId: "node_image_a",
          imageUrl: "data:image/png;base64,panorama-a",
          fileName: "画布图片A.png",
        },
      },
      origin: window.location.origin,
    })
  );

  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        type: "storyai:director-desk-session",
        payload: {
          instanceId: "node_director_b",
        },
      },
      origin: window.location.origin,
    })
  );

  expect(postMessage).not.toHaveBeenCalledWith(
    expect.objectContaining({
      type: "storyai:director-desk-panorama-removed",
    }),
    window.location.origin
  );
});

it("executes a semantic Agent command sent by the same-origin host", () => {
  const postMessage = vi.spyOn(window.parent, "postMessage").mockImplementation(() => undefined);
  initDirectorDeskHostBridge();

  window.dispatchEvent(
    new MessageEvent("message", {
      data: {
        type: "storyai:director-agent-command",
        payload: {
          requestId: "host-command-1",
          name: "director_update_object",
          arguments: {
            object_id: "char_default_a",
            position: { x: -2, y: 0, z: 1 },
          },
        },
      },
      origin: window.location.origin,
    })
  );

  expect(useDirectorStore.getState().project.objects[0]?.transform.position).toEqual([-2, 0, 1]);
  expect(postMessage).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "storyai:director-agent-result",
      payload: expect.objectContaining({ requestId: "host-command-1", ok: true }),
    }),
    window.location.origin
  );
});
