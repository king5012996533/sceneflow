#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { startDirectorAgentHttpServer } from "./httpServer.mjs";
import { DIRECTOR_TOOL_DEFINITIONS, publicCapabilities } from "./toolDefinitions.mjs";

const serviceUrl = (process.env.STORYAI_DIRECTOR_AGENT_URL || "http://127.0.0.1:4319").replace(/\/$/, "");

async function serviceRequest(path, init) {
  let response;
  try {
    response = await fetch(`${serviceUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    throw new Error(`无法连接 StoryAI Director Agent 服务（${serviceUrl}）。请先在项目目录运行 npm run agent。`, {
      cause: error,
    });
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.ok) throw new Error(body.error || `Agent 服务返回 ${response.status}`);
  return body.result;
}

function toolResult(result) {
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result && typeof result === "object" ? result : { result },
  };
}

function errorResult(error) {
  return {
    isError: true,
    content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
  };
}

async function startMcp() {
  const server = new McpServer(
    { name: "storyai-3d-director-desk", version: "0.1.0" },
    {
      instructions:
        "Operate the currently open StoryAI 3D Director Desk through semantic tools. Read director_get_state first, use exact IDs, preserve locked objects, pass expected_revision on writes, and finish multi-step edits with director_validate.",
    },
  );

  for (const [name, definition] of Object.entries(DIRECTOR_TOOL_DEFINITIONS)) {
    server.registerTool(
      name,
      {
        title: definition.title,
        description: definition.description,
        inputSchema: definition.inputSchema,
        annotations: definition.annotations,
      },
      async (args = {}) => {
        try {
          if (name === "director_get_state") return toolResult(await serviceRequest("/api/director-agent/state"));
          if (name === "director_get_capabilities") return toolResult({ actions: publicCapabilities() });
          return toolResult(
            await serviceRequest("/api/director-agent/command", {
              method: "POST",
              body: JSON.stringify({ name, arguments: args }),
            }),
          );
        } catch (error) {
          return errorResult(error);
        }
      },
    );
  }

  await server.connect(new StdioServerTransport());
}

const httpIndex = process.argv.indexOf("--http");
if (httpIndex >= 0) {
  const requestedPort = Number(process.argv[httpIndex + 1]);
  await startDirectorAgentHttpServer(Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 4319);
} else {
  await startMcp();
}
