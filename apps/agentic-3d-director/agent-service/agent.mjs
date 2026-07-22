import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { BROWSER_COMMAND_NAMES, publicCapabilities } from "./toolDefinitions.mjs";

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function findCodex() {
  const candidates = [
    process.env.CODEX_CLI_PATH,
    "/Applications/Codex.app/Contents/Resources/codex",
    "/Applications/ChatGPT.app/Contents/Resources/codex",
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }

  return "codex";
}

function run(command, args, input, timeoutMs = 180_000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], env: process.env });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(Buffer.from(chunk)));
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("导演助手响应超时"));
    }, timeoutMs);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      const output = Buffer.concat(stdout).toString("utf8");
      const errors = Buffer.concat(stderr).toString("utf8");
      if (code === 0) resolve({ stdout: output, stderr: errors });
      else reject(new Error(errors.trim() || output.trim() || `Codex exited with ${code}`));
    });
    child.stdin.end(input);
  });
}

function safeDecision(value) {
  if (!value || typeof value !== "object") throw new Error("导演助手返回了无效结果");
  const message = typeof value.message === "string" && value.message.trim() ? value.message.trim() : "已完成。";
  const commands = Array.isArray(value.commands)
    ? value.commands.flatMap((entry) => {
        if (!entry || typeof entry !== "object" || typeof entry.name !== "string") return [];
        if (!BROWSER_COMMAND_NAMES.has(entry.name)) return [];
        try {
          const argumentsValue = JSON.parse(entry.arguments_json || "{}");
          if (!argumentsValue || typeof argumentsValue !== "object" || Array.isArray(argumentsValue)) return [];
          return [{ name: entry.name, arguments: argumentsValue }];
        } catch {
          return [];
        }
      })
    : [];
  return { message, commands };
}

export async function runDirectorAgent({ messages, getState, execute }) {
  const codex = await findCodex();
  let state = getState();
  if (!state) throw new Error("导演台尚未连接，请打开网页并等待“已连接当前导演工程”");
  const root = await mkdtemp(join(tmpdir(), "storyai-director-agent-"));
  const schemaPath = join(root, "response.schema.json");
  const outputPath = join(root, "response.json");
  const allowedCommands = [...BROWSER_COMMAND_NAMES];
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["message", "commands"],
    properties: {
      message: { type: "string" },
      commands: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "arguments_json"],
          properties: {
            name: { type: "string", enum: allowedCommands },
            arguments_json: { type: "string", description: "A JSON object encoded as a string" },
          },
        },
      },
    },
  };
  await writeFile(schemaPath, JSON.stringify(schema), "utf8");
  const conversation = messages
    .slice(-12)
    .map((item) => `${item.role === "user" ? "用户" : "导演助手"}：${item.content}`)
    .join("\n");
  const prompt = `你是 StoryAI 3D 导演台内的专业导演助手。你只输出符合 schema 的 JSON。\n\n工作规则：\n1. 必须根据当前工程状态里的精确 ID 操作，绝不编造对象。\n2. 用户需求明确时输出可执行 commands；含糊或缺少破坏性操作授权时先提一个简洁问题，commands 留空。\n3. 位置/缩放使用 {x,y,z} 米制对象，旋转使用 rotation_deg 的角度对象。\n4. locked=true 是人工决定，除非用户明确要求覆盖，否则绝不设置 override_locked。\n5. 只使用能力清单中已有字段，不操作 DOM，不重置工程，不导出图片。\n6. 多步操作按依赖顺序输出；服务会自动为每一步附加最新 expected_revision。\n7. 完成多步写操作后追加 director_validate。\n8. 回答用简洁中文，说明实际执行或需要澄清的内容。\n\n能力清单：\n${JSON.stringify(publicCapabilities())}\n\n当前完整工程状态：\n${JSON.stringify(state)}\n\n最近对话：\n${conversation}`;

  try {
    await run(
      codex,
      [
        "exec",
        "--ephemeral",
        "--skip-git-repo-check",
        "--ignore-user-config",
        "--ignore-rules",
        "-s",
        "read-only",
        "-c",
        'approval_policy="never"',
        "--output-schema",
        schemaPath,
        "--output-last-message",
        outputPath,
        "-",
      ],
      prompt,
    );
    const decision = safeDecision(JSON.parse(await readFile(outputPath, "utf8")));
    const commandResults = [];

    for (const command of decision.commands) {
      try {
        const argumentsValue = {
          ...command.arguments,
          ...(command.name === "director_validate" ? {} : { expected_revision: state.revision }),
        };
        state = await execute(command.name, argumentsValue);
        commandResults.push({ name: command.name, ok: true });
      } catch (error) {
        commandResults.push({
          name: command.name,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
        break;
      }
    }

    return { message: decision.message, commands: commandResults, state };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
