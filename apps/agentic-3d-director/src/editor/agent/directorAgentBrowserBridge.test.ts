import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  clearDirectorAgentBrowserBridge,
  getDirectorAgentConnectionStatus,
  initDirectorAgentBrowserBridge,
} from "./directorAgentBrowserBridge";

function jsonResponse(body: unknown = { ok: true }) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  vi.useFakeTimers();
  delete window.__storyAiDirectorAgentBridgeRuntime;
  delete window.__storyAiDirectorAgentClientId;
  delete window.storyAiDirectorAgent;
});

afterEach(() => {
  clearDirectorAgentBrowserBridge();
  delete window.__storyAiDirectorAgentBridgeRuntime;
  delete window.__storyAiDirectorAgentClientId;
  delete window.storyAiDirectorAgent;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("keeps one stable client id across StrictMode-style cleanup and remount", async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    const path = String(input);
    return jsonResponse(path.includes("/pending?") ? { ok: true, command: null } : { ok: true });
  });
  vi.stubGlobal("fetch", fetchMock);

  initDirectorAgentBrowserBridge();
  await flushPromises();
  clearDirectorAgentBrowserBridge();
  initDirectorAgentBrowserBridge();
  await flushPromises();

  const connectPayloads = fetchMock.mock.calls
    .filter(([input]) => String(input).endsWith("/connect"))
    .map(([, init]) => JSON.parse(String(init?.body)) as { clientId: string });

  expect(connectPayloads).toHaveLength(2);
  expect(connectPayloads[0]?.clientId).toBeTruthy();
  expect(connectPayloads[1]?.clientId).toBe(connectPayloads[0]?.clientId);
});

it("disposes a previous HMR bridge runtime before taking ownership", async () => {
  const previousDispose = vi.fn();
  window.__storyAiDirectorAgentBridgeRuntime = { owner: Symbol("old-bridge"), dispose: previousDispose };
  vi.stubGlobal("fetch", vi.fn(async () => jsonResponse()));

  initDirectorAgentBrowserBridge();
  await flushPromises();

  expect(previousDispose).toHaveBeenCalledOnce();
  expect(window.__storyAiDirectorAgentBridgeRuntime?.owner.description).toBe("storyai-director-agent-bridge");
});

it("tolerates two transient poll failures and recovers without showing disconnected", async () => {
  let pendingAttempts = 0;
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path.includes("/pending?")) {
      pendingAttempts += 1;
      if (pendingAttempts <= 2) throw new TypeError("temporary proxy failure");
      return jsonResponse({ ok: true, command: null });
    }
    return jsonResponse();
  });
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.stubGlobal("fetch", fetchMock);

  initDirectorAgentBrowserBridge();
  await flushPromises();
  expect(getDirectorAgentConnectionStatus()).toBe("connected");

  await vi.advanceTimersByTimeAsync(350);
  expect(getDirectorAgentConnectionStatus()).toBe("connected");
  await vi.advanceTimersByTimeAsync(350);
  expect(getDirectorAgentConnectionStatus()).toBe("connected");
  await vi.advanceTimersByTimeAsync(350);
  expect(getDirectorAgentConnectionStatus()).toBe("connected");
  expect(pendingAttempts).toBe(3);
  expect(warn).toHaveBeenCalledTimes(2);
});
