import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

import { runDirectorAgent } from "./agent.mjs";
import { BROWSER_COMMAND_NAMES, publicCapabilities } from "./toolDefinitions.mjs";

const CLIENT_STALE_MS = 8_000;
const COMMAND_TIMEOUT_MS = 30_000;
const CLIENT_REJECTION_LOG_INTERVAL_MS = 30_000;

class DirectorAgentHttpError extends Error {
  constructor(message, statusCode = 400, code) {
    super(message);
    this.name = "DirectorAgentHttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function normalizeClientPresence(value) {
  if (!value || typeof value !== "object") return null;
  const visibilityState = ["visible", "hidden", "prerender"].includes(value.visibilityState)
    ? value.visibilityState
    : "unknown";
  return {
    url: typeof value.url === "string" ? value.url.slice(0, 2000) : "",
    visibilityState,
    focused: value.focused === true,
  };
}

function clientPresenceFromSearchParams(searchParams) {
  const visibilityState = searchParams.get("visibility_state");
  const focused = searchParams.get("focused");
  const url = searchParams.get("url");
  if (visibilityState === null && focused === null && url === null) return null;
  return normalizeClientPresence({
    visibilityState,
    focused: focused === "true",
    url: url ?? "",
  });
}

function canTakeOverConnection(clientPresence) {
  return clientPresence?.visibilityState === "visible" && clientPresence.focused === true;
}

function isLoopbackOrigin(origin) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return url.hostname === "127.0.0.1" || url.hostname === "localhost" || url.hostname === "[::1]";
  } catch {
    return false;
  }
}

function json(response, status, value, origin) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...(isLoopbackOrigin(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Headers": "Content-Type",
  });
  response.end(JSON.stringify(value));
}

async function readJson(request, limit = 4_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > limit) throw new Error("请求内容超过 4MB 限制");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function requiredString(value, label) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} 不能为空`);
  return value.trim();
}

class DirectorBrowserBroker {
  activeClientId = null;
  activeClientPresence = null;
  lastSeenAt = 0;
  latestSnapshot = null;
  queue = [];
  pending = new Map();
  rejectedClientLogAt = new Map();

  constructor(onConnectionEvent = () => undefined) {
    this.onConnectionEvent = onConnectionEvent;
  }

  isConnected() {
    return Boolean(this.activeClientId && Date.now() - this.lastSeenAt < CLIENT_STALE_MS);
  }

  connect(clientId, snapshot, clientPresenceValue) {
    const clientPresence = normalizeClientPresence(clientPresenceValue);
    if (this.activeClientId && this.activeClientId !== clientId) {
      const previousClientId = this.activeClientId;
      const previousPresence = this.activeClientPresence;
      const previousWasConnected = this.isConnected();
      if (previousWasConnected && !canTakeOverConnection(clientPresence)) {
        const now = Date.now();
        const lastLoggedAt = this.rejectedClientLogAt.get(clientId) ?? 0;
        if (now - lastLoggedAt >= CLIENT_REJECTION_LOG_INTERVAL_MS) {
          this.rejectedClientLogAt.set(clientId, now);
          this.onConnectionEvent({
            type: "client_rejected",
            clientId,
            client: clientPresence,
            activeClientId: previousClientId,
            activeClient: previousPresence,
          });
        }
        throw new DirectorAgentHttpError(
          "另一个导演台页面正在使用 Agent；切换到当前页面后会自动接管",
          409,
          "DIRECTOR_AGENT_CLIENT_CONFLICT",
        );
      }
      const takeoverMessage = previousWasConnected
        ? "当前前台导演台页面已接管 Agent 连接"
        : "旧导演台连接已过期，新页面已接管 Agent 连接";
      this.rejectAll(takeoverMessage);
      this.queue = [];
      this.rejectedClientLogAt.delete(clientId);
      this.onConnectionEvent({
        type: previousWasConnected ? "client_takeover" : "stale_client_replaced",
        clientId,
        client: clientPresence,
        previousClientId,
        previousClient: previousPresence,
      });
    } else if (!this.activeClientId) {
      this.onConnectionEvent({ type: "client_connected", clientId, client: clientPresence });
    }
    this.activeClientId = clientId;
    if (clientPresence) this.activeClientPresence = clientPresence;
    this.lastSeenAt = Date.now();
    this.latestSnapshot = snapshot;
  }

  touch(clientId, clientPresenceValue) {
    if (!this.activeClientId || clientId !== this.activeClientId) {
      throw new DirectorAgentHttpError(
        "浏览器 Agent 会话已失效，请刷新导演台",
        409,
        "DIRECTOR_AGENT_SESSION_STALE",
      );
    }
    const clientPresence = normalizeClientPresence(clientPresenceValue);
    if (clientPresence) this.activeClientPresence = clientPresence;
    this.lastSeenAt = Date.now();
  }

  sync(clientId, snapshot, clientPresence) {
    this.touch(clientId, clientPresence);
    this.latestSnapshot = snapshot;
  }

  next(clientId, clientPresence) {
    this.touch(clientId, clientPresence);
    return this.queue.shift() ?? null;
  }

  result(clientId, payload) {
    this.touch(clientId, payload.client);
    const commandId = requiredString(payload.commandId, "commandId");
    const entry = this.pending.get(commandId);
    if (!entry) throw new Error(`未知或已过期的命令：${commandId}`);
    this.pending.delete(commandId);
    clearTimeout(entry.timer);
    if (payload.ok) {
      this.latestSnapshot = payload.result;
      entry.resolve(payload.result);
    } else {
      if (payload.snapshot) this.latestSnapshot = payload.snapshot;
      entry.reject(new Error(typeof payload.error === "string" ? payload.error : "导演命令执行失败"));
    }
  }

  execute(name, argumentsValue = {}) {
    if (!BROWSER_COMMAND_NAMES.has(name)) throw new Error(`未知导演命令：${name}`);
    if (!this.isConnected()) throw new Error("导演台浏览器未连接；请打开网页并等待 Agent 状态变为已连接");
    const expectedRevision = typeof argumentsValue.expected_revision === "string" ? argumentsValue.expected_revision : null;
    if (expectedRevision && expectedRevision !== this.latestSnapshot?.revision) {
      throw new Error(
        `工程版本冲突：expected_revision=${expectedRevision}，current_revision=${this.latestSnapshot?.revision ?? "unknown"}`,
      );
    }
    const command = { id: randomUUID(), name, arguments: argumentsValue };
    this.queue.push(command);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(command.id);
        this.queue = this.queue.filter((item) => item.id !== command.id);
        reject(new Error(`导演命令 ${name} 等待浏览器响应超时`));
      }, COMMAND_TIMEOUT_MS);
      this.pending.set(command.id, { resolve, reject, timer });
    });
  }

  rejectAll(message) {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(new Error(message));
    }
    this.pending.clear();
  }

  status() {
    const connected = this.isConnected();
    return {
      connected,
      clientId: connected ? this.activeClientId : null,
      client: connected ? this.activeClientPresence : null,
      revision: this.latestSnapshot?.revision ?? null,
      pendingCommands: this.queue.length,
    };
  }
}

export function createDirectorAgentHttpServer({ onConnectionEvent } = {}) {
  const broker = new DirectorBrowserBroker(onConnectionEvent);
  const server = createServer(async (request, response) => {
    const origin = request.headers.origin;
    try {
      if (request.method === "OPTIONS") {
        response.writeHead(204, {
          ...(isLoopbackOrigin(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        });
        response.end();
        return;
      }

      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (request.method === "GET" && url.pathname === "/api/director-agent/health") {
        json(response, 200, { ok: true, service: "storyai-director-agent", ...broker.status() }, origin);
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/director-agent/state") {
        if (!broker.latestSnapshot) throw new Error("导演台尚未连接，暂无工程状态");
        json(response, 200, { ok: true, result: broker.latestSnapshot, connection: broker.status() }, origin);
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/director-agent/capabilities") {
        json(response, 200, { ok: true, result: { actions: publicCapabilities() } }, origin);
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/director-agent/pending") {
        const clientId = requiredString(url.searchParams.get("client_id"), "client_id");
        json(response, 200, {
          ok: true,
          command: broker.next(clientId, clientPresenceFromSearchParams(url.searchParams)),
        }, origin);
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/director-agent/connect") {
        const payload = await readJson(request);
        broker.connect(requiredString(payload.clientId, "clientId"), payload.snapshot, payload.client);
        json(response, 200, { ok: true, connection: broker.status() }, origin);
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/director-agent/state") {
        const payload = await readJson(request);
        broker.sync(requiredString(payload.clientId, "clientId"), payload.snapshot, payload.client);
        json(response, 200, { ok: true }, origin);
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/director-agent/result") {
        const payload = await readJson(request);
        broker.result(requiredString(payload.clientId, "clientId"), payload);
        json(response, 200, { ok: true }, origin);
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/director-agent/command") {
        const payload = await readJson(request);
        const result = await broker.execute(requiredString(payload.name, "name"), payload.arguments ?? {});
        json(response, 200, { ok: true, result }, origin);
        return;
      }
      if (request.method === "POST" && url.pathname === "/api/director-agent/chat") {
        const payload = await readJson(request);
        if (!Array.isArray(payload.messages) || payload.messages.length === 0) throw new Error("对话消息不能为空");
        const messages = payload.messages.slice(-12).map((item) => {
          if (!item || typeof item !== "object") throw new Error("对话消息格式无效");
          if ((item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string") {
            throw new Error("对话消息格式无效");
          }
          return { role: item.role, content: item.content.slice(0, 6000) };
        });
        const result = await runDirectorAgent({
          messages,
          getState: () => broker.latestSnapshot,
          execute: (name, args) => broker.execute(name, args),
        });
        json(response, 200, { ok: true, result }, origin);
        return;
      }

      json(response, 404, { ok: false, error: "Not found" }, origin);
    } catch (error) {
      const statusCode = error instanceof DirectorAgentHttpError ? error.statusCode : 400;
      json(response, statusCode, {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        ...(error instanceof DirectorAgentHttpError && error.code ? { code: error.code } : {}),
      }, origin);
    }
  });

  return { server, broker };
}

export async function startDirectorAgentHttpServer(port = 4319) {
  const { server } = createDirectorAgentHttpServer({
    onConnectionEvent: (event) => {
      process.stderr.write(`[StoryAI Director Agent] ${new Date().toISOString()} ${JSON.stringify(event)}\n`);
    },
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  process.stderr.write(`StoryAI Director Agent service: http://127.0.0.1:${port}\n`);
  return server;
}
