import { useDirectorStore } from "../store/directorStore";
import {
  executeDirectorAgentCommand,
  getCurrentDirectorAgentSnapshot,
  isDirectorAgentCommandName,
} from "./directorAgentCommands";
import type { DirectorAgentCommand, DirectorAgentSnapshot } from "./directorAgentProtocol";

export type DirectorAgentConnectionStatus = "connecting" | "connected" | "disconnected";

export const DIRECTOR_AGENT_STATUS_EVENT = "storyai:director-agent-status";

type DirectorAgentClientPresence = {
  url: string;
  visibilityState: DocumentVisibilityState;
  focused: boolean;
};

type DirectorAgentBridgeRuntime = {
  owner: symbol;
  dispose: () => void;
};

declare global {
  interface Window {
    storyAiDirectorAgent?: {
      getState: () => DirectorAgentSnapshot;
      execute: (name: string, args?: Record<string, unknown>) => DirectorAgentSnapshot;
    };
    __storyAiDirectorAgentBridgeRuntime?: DirectorAgentBridgeRuntime;
    __storyAiDirectorAgentClientId?: string;
  }
}

const POLL_INTERVAL_MS = 350;
const RECONNECT_INTERVAL_MS = 3000;
const DISCONNECT_FAILURE_THRESHOLD = 3;
const bridgeOwner = Symbol("storyai-director-agent-bridge");

let status: DirectorAgentConnectionStatus = "disconnected";
let initialized = false;
let stopRequested = false;
let pollTimer: number | null = null;
let syncTimer: number | null = null;
let unsubscribe: (() => void) | null = null;
let clientId = "";
let consecutiveRequestFailures = 0;

class DirectorAgentRequestError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.name = "DirectorAgentRequestError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function createClientId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `browser-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getOrCreateClientId() {
  window.__storyAiDirectorAgentClientId ||= createClientId();
  return window.__storyAiDirectorAgentClientId;
}

function getClientPresence(): DirectorAgentClientPresence {
  return {
    url: window.location.href,
    visibilityState: document.visibilityState,
    focused: document.hasFocus(),
  };
}

function isCurrentBridgeOwner() {
  return window.__storyAiDirectorAgentBridgeRuntime?.owner === bridgeOwner;
}

function setStatus(next: DirectorAgentConnectionStatus) {
  if (next === status) return;
  status = next;
  window.dispatchEvent(new CustomEvent(DIRECTOR_AGENT_STATUS_EVENT, { detail: next }));
}

export function getDirectorAgentConnectionStatus() {
  return status;
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
    throw new DirectorAgentRequestError(body.error ?? `Agent 服务返回 ${response.status}`, response.status, body.code);
  }
  return response;
}

function markConnectionHealthy() {
  if (consecutiveRequestFailures > 0) {
    console.info(`[StoryAI Agent] 连接已恢复，之前连续失败 ${consecutiveRequestFailures} 次`);
  }
  consecutiveRequestFailures = 0;
}

function isSessionFailure(reason: unknown) {
  return reason instanceof DirectorAgentRequestError
    && (reason.code === "DIRECTOR_AGENT_SESSION_STALE" || reason.code === "DIRECTOR_AGENT_CLIENT_CONFLICT");
}

function handleRequestFailure(operation: string, reason: unknown) {
  consecutiveRequestFailures += 1;
  console.warn(
    `[StoryAI Agent] ${operation}失败（连续 ${consecutiveRequestFailures} 次）`,
    reason instanceof Error ? reason.message : reason,
  );
  if (isSessionFailure(reason) || consecutiveRequestFailures >= DISCONNECT_FAILURE_THRESHOLD) {
    setStatus("disconnected");
  }
}

async function syncState() {
  if (status !== "connected" || stopRequested) return;
  try {
    await request("/api/director-agent/state", {
      method: "POST",
      body: JSON.stringify({ clientId, snapshot: getCurrentDirectorAgentSnapshot(), client: getClientPresence() }),
    });
    markConnectionHealthy();
  } catch (reason) {
    handleRequestFailure("同步工程状态", reason);
  }
}

function scheduleStateSync() {
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    void syncState();
  }, 120);
}

async function postCommandResult(command: DirectorAgentCommand) {
  try {
    if (!isDirectorAgentCommandName(command.name)) throw new Error(`未知导演命令：${command.name}`);
    const snapshot = executeDirectorAgentCommand(command.name, command.arguments);
    await request("/api/director-agent/result", {
      method: "POST",
      body: JSON.stringify({ clientId, commandId: command.id, ok: true, result: snapshot, client: getClientPresence() }),
    });
    markConnectionHealthy();
  } catch (reason) {
    await request("/api/director-agent/result", {
      method: "POST",
      body: JSON.stringify({
        clientId,
        commandId: command.id,
        ok: false,
        error: reason instanceof Error ? reason.message : String(reason),
        snapshot: getCurrentDirectorAgentSnapshot(),
        client: getClientPresence(),
      }),
    }).catch(() => undefined);
  }
}

async function poll() {
  if (stopRequested) return;

  if (status !== "connected") {
    await connect();
    schedulePoll(getDirectorAgentConnectionStatus() === "connected" ? POLL_INTERVAL_MS : RECONNECT_INTERVAL_MS);
    return;
  }

  try {
    const presence = getClientPresence();
    const query = new URLSearchParams({
      client_id: clientId,
      visibility_state: presence.visibilityState,
      focused: String(presence.focused),
      url: presence.url,
    });
    const response = await request(`/api/director-agent/pending?${query.toString()}`);
    const body = (await response.json()) as { command?: DirectorAgentCommand | null };
    markConnectionHealthy();
    if (body.command) await postCommandResult(body.command);
  } catch (reason) {
    handleRequestFailure("轮询导演命令", reason);
  }

  schedulePoll(status === "connected" ? POLL_INTERVAL_MS : RECONNECT_INTERVAL_MS);
}

function schedulePoll(delay: number) {
  if (stopRequested) return;
  if (pollTimer !== null) window.clearTimeout(pollTimer);
  pollTimer = window.setTimeout(() => {
    pollTimer = null;
    void poll();
  }, delay);
}

async function connect() {
  if (stopRequested || typeof fetch !== "function") return;
  setStatus("connecting");
  try {
    await request("/api/director-agent/connect", {
      method: "POST",
      body: JSON.stringify({ clientId, snapshot: getCurrentDirectorAgentSnapshot(), client: getClientPresence() }),
    });
    if (stopRequested || !isCurrentBridgeOwner()) return;
    markConnectionHealthy();
    setStatus("connected");
  } catch (reason) {
    if (stopRequested || !isCurrentBridgeOwner()) return;
    console.warn("[StoryAI Agent] 连接本机 Agent 服务失败", reason instanceof Error ? reason.message : reason);
    setStatus("disconnected");
  }
}

function handlePageActivityChange() {
  if (stopRequested || !isCurrentBridgeOwner()) return;
  const presence = getClientPresence();
  if (status === "connected" || (presence.visibilityState === "visible" && presence.focused)) {
    schedulePoll(0);
  }
}

export function initDirectorAgentBrowserBridge() {
  if (initialized && isCurrentBridgeOwner()) return clearDirectorAgentBrowserBridge;

  const previousRuntime = window.__storyAiDirectorAgentBridgeRuntime;
  if (previousRuntime && previousRuntime.owner !== bridgeOwner) previousRuntime.dispose();

  window.__storyAiDirectorAgentBridgeRuntime = { owner: bridgeOwner, dispose: clearDirectorAgentBrowserBridge };
  initialized = true;
  stopRequested = false;
  consecutiveRequestFailures = 0;
  clientId = getOrCreateClientId();
  window.storyAiDirectorAgent = {
    getState: getCurrentDirectorAgentSnapshot,
    execute: (name, args = {}) => {
      if (!isDirectorAgentCommandName(name)) throw new Error(`未知导演命令：${name}`);
      return executeDirectorAgentCommand(name, args);
    },
  };
  unsubscribe = useDirectorStore.subscribe(scheduleStateSync);
  document.addEventListener("visibilitychange", handlePageActivityChange);
  window.addEventListener("focus", handlePageActivityChange);
  window.addEventListener("blur", handlePageActivityChange);
  void connect().finally(() => schedulePoll(status === "connected" ? POLL_INTERVAL_MS : RECONNECT_INTERVAL_MS));

  return clearDirectorAgentBrowserBridge;
}

export function clearDirectorAgentBrowserBridge() {
  if (!initialized) return;
  if (window.__storyAiDirectorAgentBridgeRuntime && !isCurrentBridgeOwner()) return;
  initialized = false;
  stopRequested = true;
  if (pollTimer !== null) window.clearTimeout(pollTimer);
  if (syncTimer !== null) window.clearTimeout(syncTimer);
  pollTimer = null;
  syncTimer = null;
  unsubscribe?.();
  unsubscribe = null;
  document.removeEventListener("visibilitychange", handlePageActivityChange);
  window.removeEventListener("focus", handlePageActivityChange);
  window.removeEventListener("blur", handlePageActivityChange);
  delete window.storyAiDirectorAgent;
  if (isCurrentBridgeOwner()) delete window.__storyAiDirectorAgentBridgeRuntime;
  setStatus("disconnected");
}

if (import.meta.hot) {
  import.meta.hot.dispose(clearDirectorAgentBrowserBridge);
}
