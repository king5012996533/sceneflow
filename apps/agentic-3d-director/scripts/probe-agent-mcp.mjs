import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "storyai-director-agent-probe", version: "0.1.0" });
const transport = new StdioClientTransport({ command: "node", args: ["agent-service/index.mjs"] });

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const names = new Set(tools.tools.map((tool) => tool.name));
  for (const required of [
    "director_get_state",
    "director_get_capabilities",
    "director_add_character",
    "director_update_object",
    "director_update_camera",
    "director_apply_pose",
    "director_set_timeline",
    "director_define_trajectory",
    "director_delete_trajectory",
    "director_delete_object",
    "director_validate",
  ]) {
    if (!names.has(required)) throw new Error(`缺少 MCP 工具：${required}`);
  }

  const capabilities = await client.callTool({ name: "director_get_capabilities", arguments: {} });
  if (!Array.isArray(capabilities.structuredContent?.actions)) throw new Error("能力工具没有返回结构化 actions");
  if (process.env.STORYAI_AGENT_PROBE_LIVE === "1") {
    const state = await client.callTool({ name: "director_get_state", arguments: {} });
    if (!state.structuredContent?.revision || !state.structuredContent?.project) {
      throw new Error("MCP 未能读取已连接浏览器的工程状态");
    }
  }
  console.log(`OK: MCP 暴露 ${tools.tools.length} 个导演台语义工具。`);
} finally {
  await client.close().catch(() => undefined);
}
