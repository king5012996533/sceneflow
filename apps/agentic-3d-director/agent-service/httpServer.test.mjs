import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createDirectorAgentHttpServer } from "./httpServer.mjs";

const connectionEvents = [];
const { server } = createDirectorAgentHttpServer({
  onConnectionEvent: (event) => connectionEvents.push(event),
});
let baseUrl;

before(async () => {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function json(path, init) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  return { response, body: await response.json() };
}

test("queues MCP/HTTP commands for the connected browser and returns its authoritative result", async () => {
  const clientId = "browser-test";
  const initialSnapshot = { revision: "p-00000001", project: { objects: [] } };
  const connected = await json("/api/director-agent/connect", {
    method: "POST",
    body: JSON.stringify({ clientId, snapshot: initialSnapshot }),
  });
  assert.equal(connected.response.status, 200);

  const commandResponsePromise = json("/api/director-agent/command", {
    method: "POST",
    body: JSON.stringify({
      name: "director_add_character",
      arguments: { expected_revision: initialSnapshot.revision, name: "测试角色" },
    }),
  });

  let command = null;
  for (let attempt = 0; attempt < 20 && !command; attempt += 1) {
    const pending = await json(`/api/director-agent/pending?client_id=${clientId}`);
    command = pending.body.command;
    if (!command) await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(command.name, "director_add_character");
  assert.equal(command.arguments.name, "测试角色");

  const nextSnapshot = { revision: "p-00000002", project: { objects: [{ id: "char_2" }] } };
  const result = await json("/api/director-agent/result", {
    method: "POST",
    body: JSON.stringify({ clientId, commandId: command.id, ok: true, result: nextSnapshot }),
  });
  assert.equal(result.response.status, 200);

  const completed = await commandResponsePromise;
  assert.equal(completed.response.status, 200);
  assert.deepEqual(completed.body.result, nextSnapshot);

  const state = await json("/api/director-agent/state");
  assert.equal(state.body.result.revision, "p-00000002");
});

test("rejects stale expected revisions before queueing a browser command", async () => {
  const result = await json("/api/director-agent/command", {
    method: "POST",
    body: JSON.stringify({
      name: "director_update_scene",
      arguments: { expected_revision: "p-stale", background_color: "#fff" },
    }),
  });

  assert.equal(result.response.status, 400);
  assert.match(result.body.error, /工程版本冲突/);
});

test("keeps the active browser lease stable and only lets a focused visible page take over", async () => {
  const backgroundClientInit = {
    method: "POST",
    body: JSON.stringify({
      clientId: "browser-background",
      snapshot: { revision: "p-background", project: { objects: [] } },
      client: { url: "http://localhost:5173/", visibilityState: "hidden", focused: false },
    }),
  };
  const backgroundClient = await json("/api/director-agent/connect", backgroundClientInit);
  const backgroundClientRetry = await json("/api/director-agent/connect", backgroundClientInit);

  assert.equal(backgroundClient.response.status, 409);
  assert.equal(backgroundClient.body.code, "DIRECTOR_AGENT_CLIENT_CONFLICT");
  assert.equal(backgroundClientRetry.response.status, 409);
  assert.equal(
    connectionEvents.filter((event) => event.type === "client_rejected" && event.clientId === "browser-background").length,
    1,
  );

  const beforeTakeover = await json("/api/director-agent/health");
  assert.equal(beforeTakeover.body.clientId, "browser-test");
  assert.equal(beforeTakeover.body.revision, "p-00000002");

  const foregroundClient = await json("/api/director-agent/connect", {
    method: "POST",
    body: JSON.stringify({
      clientId: "browser-foreground",
      snapshot: { revision: "p-foreground", project: { objects: [] } },
      client: { url: "http://localhost:5173/", visibilityState: "visible", focused: true },
    }),
  });

  assert.equal(foregroundClient.response.status, 200);
  assert.equal(foregroundClient.body.connection.clientId, "browser-foreground");
  assert.deepEqual(foregroundClient.body.connection.client, {
    url: "http://localhost:5173/",
    visibilityState: "visible",
    focused: true,
  });

  const staleClientPoll = await json("/api/director-agent/pending?client_id=browser-test");
  assert.equal(staleClientPoll.response.status, 409);
  assert.equal(staleClientPoll.body.code, "DIRECTOR_AGENT_SESSION_STALE");
});
