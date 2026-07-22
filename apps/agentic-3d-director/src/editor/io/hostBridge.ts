import { useDirectorStore } from "../store/directorStore";
import { executeDirectorAgentCommand, isDirectorAgentCommandName } from "../agent/directorAgentCommands";
import { createDirectorAgentSnapshot, getDirectorProjectRevision } from "../agent/directorAgentProtocol";
import type { DirectorProject } from "../schema/directorProject";

interface HostPanoramaPayload {
  edgeId?: unknown;
  sourceNodeId?: unknown;
  imageUrl?: unknown;
  fileName?: unknown;
}

interface HostSessionPayload {
  instanceId?: unknown;
  theme?: unknown;
  project?: unknown;
}

interface HostAgentCommandPayload {
  requestId?: unknown;
  name?: unknown;
  arguments?: unknown;
}

export interface HostCaptureItemPayload {
  dataUrl?: unknown;
  fileName?: unknown;
}

export interface HostCaptureBatchPayload {
  captures?: HostCaptureItemPayload[];
}

interface HostConnectedPanorama {
  edgeId: string;
  sourceNodeId: string;
}

let initialized = false;
let hostConnectedPanorama: HostConnectedPanorama | null = null;
let removeUnsubscribe: (() => void) | null = null;
let projectSyncUnsubscribe: (() => void) | null = null;
let projectSyncTimer: ReturnType<typeof window.setTimeout> | null = null;
let lastProjectRevision = "";
let suppressNextPanoramaRemovalNotice = false;
let suppressNextProjectSyncNotice = false;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function getDirectorDeskHostOrigin() {
  try {
    const hostOrigin = new URLSearchParams(window.location.search).get("hostOrigin");
    if (hostOrigin) return hostOrigin;
  } catch {
    // Fall back to same-origin embedding.
  }
  return window.location.origin;
}

function normalizeTheme(value: unknown): "dark" | "light" | null {
  return value === "light" || value === "dark" ? value : null;
}

function isHostProjectPayload(value: unknown): value is DirectorProject {
  if (!value || typeof value !== "object") return false;
  const project = value as Partial<DirectorProject>;
  return (
    project.version === 1 &&
    Boolean(project.scene) &&
    Array.isArray(project.assets) &&
    Array.isArray(project.objects) &&
    Array.isArray(project.cameras)
  );
}

function applyDirectorDeskTheme(theme: "dark" | "light") {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function getInitialHostTheme() {
  try {
    return normalizeTheme(new URLSearchParams(window.location.search).get("theme"));
  } catch {
    return null;
  }
}

function notifyPanoramaRemoved() {
  if (!hostConnectedPanorama) {
    return;
  }

  window.parent?.postMessage(
    {
      type: "storyai:director-desk-panorama-removed",
      payload: hostConnectedPanorama,
    },
    getDirectorDeskHostOrigin()
  );
  hostConnectedPanorama = null;
}

function subscribeToPanoramaRemoval() {
  if (removeUnsubscribe) {
    return;
  }

  let previousPanoramaAssetId = useDirectorStore.getState().project.panoramaAssetId;
  removeUnsubscribe = useDirectorStore.subscribe((state) => {
    const nextPanoramaAssetId = state.project.panoramaAssetId;

    if (previousPanoramaAssetId && !nextPanoramaAssetId) {
      if (suppressNextPanoramaRemovalNotice) {
        suppressNextPanoramaRemovalNotice = false;
        hostConnectedPanorama = null;
      } else {
        notifyPanoramaRemoved();
      }
    }

    previousPanoramaAssetId = nextPanoramaAssetId;
  });
}

function postProjectChanged() {
  const snapshot = createDirectorAgentSnapshot(useDirectorStore.getState());
  lastProjectRevision = snapshot.revision;
  window.parent?.postMessage(
    {
      type: "storyai:director-desk-project-changed",
      payload: {
        project: snapshot.project,
        revision: snapshot.revision,
        updatedAt: new Date().toISOString(),
      },
    },
    getDirectorDeskHostOrigin()
  );
}

function subscribeToProjectSync() {
  if (projectSyncUnsubscribe) {
    return;
  }

  lastProjectRevision = getDirectorProjectRevision(useDirectorStore.getState().project);
  projectSyncUnsubscribe = useDirectorStore.subscribe((state) => {
    const nextRevision = getDirectorProjectRevision(state.project);

    if (nextRevision === lastProjectRevision) {
      return;
    }

    if (suppressNextProjectSyncNotice) {
      suppressNextProjectSyncNotice = false;
      lastProjectRevision = nextRevision;
      return;
    }

    if (projectSyncTimer) {
      window.clearTimeout(projectSyncTimer);
    }

    projectSyncTimer = window.setTimeout(() => {
      projectSyncTimer = null;
      postProjectChanged();
    }, 250);
  });
}

function importHostPanorama(payload: HostPanoramaPayload) {
  const imageUrl = normalizeString(payload.imageUrl);
  if (!imageUrl) {
    return;
  }

  const fileName = normalizeString(payload.fileName) || "画布全景图.png";
  const edgeId = normalizeString(payload.edgeId);
  const sourceNodeId = normalizeString(payload.sourceNodeId);

  hostConnectedPanorama = edgeId && sourceNodeId ? { edgeId, sourceNodeId } : null;
  useDirectorStore.getState().addImportedAsset({
    kind: "panorama",
    name: fileName,
    fileName,
    url: imageUrl,
    projectionMode: "backdrop",
  });
}

function openHostSession(payload: HostSessionPayload) {
  const instanceId = normalizeString(payload.instanceId);
  const theme = normalizeTheme(payload.theme);
  if (theme) {
    applyDirectorDeskTheme(theme);
  }
  suppressNextPanoramaRemovalNotice = Boolean(useDirectorStore.getState().project.panoramaAssetId);
  suppressNextProjectSyncNotice = true;
  useDirectorStore.getState().openScopedScene(instanceId || null);
  suppressNextProjectSyncNotice = false;
  suppressNextPanoramaRemovalNotice = false;
  hostConnectedPanorama = null;

  if (isHostProjectPayload(payload.project)) {
    suppressNextProjectSyncNotice = true;
    useDirectorStore.getState().replaceProject(payload.project);
    suppressNextProjectSyncNotice = false;
    lastProjectRevision = getDirectorProjectRevision(useDirectorStore.getState().project);
  }
}

export function postDirectorDeskCapturesToHost(
  captures: Array<{
    dataUrl: string;
    fileName?: string;
  }>
) {
  const normalizedCaptures = captures
    .map((capture, index) => {
      const dataUrl = normalizeString(capture.dataUrl);
      if (!dataUrl) {
        return null;
      }

      return {
        dataUrl,
        fileName: normalizeString(capture.fileName) || `director-desk-capture-${index + 1}.png`,
      };
    })
    .filter((capture): capture is { dataUrl: string; fileName: string } => Boolean(capture));

  if (normalizedCaptures.length === 0) {
    return;
  }

  window.parent?.postMessage(
    {
      type: "storyai:director-desk-captures-sent",
      payload: {
        captures: normalizedCaptures,
      },
    },
    getDirectorDeskHostOrigin()
  );
}

function handleHostMessage(event: MessageEvent) {
  if (event.origin !== getDirectorDeskHostOrigin()) {
    return;
  }

  if (event.data?.type === "storyai:director-desk-session") {
    openHostSession((event.data.payload || {}) as HostSessionPayload);
    return;
  }

  if (event.data?.type === "storyai:director-desk-panorama") {
    importHostPanorama((event.data.payload || {}) as HostPanoramaPayload);
    return;
  }

  if (event.data?.type === "storyai:director-agent-command") {
    const payload = (event.data.payload || {}) as HostAgentCommandPayload;
    const requestId = normalizeString(payload.requestId);
    const name = normalizeString(payload.name);

    try {
      if (!isDirectorAgentCommandName(name)) throw new Error(`未知导演命令：${name || "(empty)"}`);
      const result = executeDirectorAgentCommand(name, payload.arguments);
      window.parent?.postMessage(
        { type: "storyai:director-agent-result", payload: { requestId, ok: true, result } },
        getDirectorDeskHostOrigin()
      );
    } catch (reason) {
      window.parent?.postMessage(
        {
          type: "storyai:director-agent-result",
          payload: {
            requestId,
            ok: false,
            error: reason instanceof Error ? reason.message : String(reason),
          },
        },
        getDirectorDeskHostOrigin()
      );
    }
  }
}

export function initDirectorDeskHostBridge() {
  if (initialized) {
    return;
  }

  initialized = true;
  applyDirectorDeskTheme(getInitialHostTheme() ?? "dark");
  window.addEventListener("message", handleHostMessage);
  subscribeToPanoramaRemoval();
  subscribeToProjectSync();
}

export function clearDirectorDeskHostBridge() {
  if (!initialized) {
    return;
  }

  initialized = false;
  hostConnectedPanorama = null;
  suppressNextPanoramaRemovalNotice = false;
  suppressNextProjectSyncNotice = false;
  window.removeEventListener("message", handleHostMessage);
  if (projectSyncTimer) {
    window.clearTimeout(projectSyncTimer);
    projectSyncTimer = null;
  }
  removeUnsubscribe?.();
  removeUnsubscribe = null;
  projectSyncUnsubscribe?.();
  projectSyncUnsubscribe = null;
  lastProjectRevision = "";
}
