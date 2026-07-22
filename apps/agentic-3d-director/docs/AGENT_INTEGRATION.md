# Agent 与 MCP 接入指南

## 架构

导演台采用浏览器权威状态模型：所有 Agent 命令最终仍调用现有 Zustand Store action，再由 React Three Fiber 更新 3D 视口。

```text
网页导演助手 ──> POST /api/director-agent/chat ─┐
                                                 ├─> 127.0.0.1:4319 命令队列
Codex MCP stdio ─> 本机 HTTP 代理 ───────────────┘
                                                          │
                                                          v
                                                    浏览器语义命令执行器
                                                          │
                                                          v
                                                    Zustand + 3D 视口
```

这样做的关键收益是：手工操作、网页助手和 MCP 不会各自维护一份工程，也不会通过脆弱的 DOM 点击模拟业务操作。

## 启动

安装依赖后，分别启动本机 Agent 服务和网页：

```bash
npm install
npm run agent
```

```bash
npm run dev
```

打开 `http://127.0.0.1:5173/`。右上角“导演助手”显示“已连接当前导演工程”后即可对话。

网页助手调用本机已登录的 Codex CLI，不需要把 API Key 放进浏览器。可通过 `CODEX_CLI_PATH` 指定 Codex 可执行文件：

```bash
CODEX_CLI_PATH=/absolute/path/to/codex npm run agent
```

## 在 Codex 中启用 MCP

仓库已提供项目级 [`.codex/config.toml`](../.codex/config.toml)。Codex 只会在用户信任该项目时加载项目配置。启动 Agent 服务、打开导演台网页后，重启 Codex 或新建一个任务，再检查 MCP 工具列表。

如果不使用项目配置，也可以加入用户级 `~/.codex/config.toml`：

```toml
[mcp_servers.storyai_director]
command = "node"
args = ["/absolute/path/to/agentic-3d-director/agent-service/index.mjs"]
startup_timeout_sec = 15
tool_timeout_sec = 60
```

典型指令：

```text
先读取当前导演台工程。新增一男一女两个角色，让他们站在画面左右并面向彼此；
把机位调整为看向两人中点的中景，保留所有人工锁定内容，完成后校验工程。
```

动画与轨迹也使用语义工具，不需要 Agent 操作界面：

```text
读取当前工程，让女主角在 8 秒内沿半径 2 米的圆环行走；
让当前机位从右后方移动到正面，并在 0、4、8 秒分别看向女主角，打开循环播放，最后校验工程。
```

`motion` 可使用 `none` 或任意现有姿势 ID；`walk` / `run` 会根据时间相位生成连续步态，不再冻结在一张姿势上。圆环预设使用显式圆心和半径求值，旧工程里的圆环关键帧会自动迁移为标准圆。

视频导出由时间轴面板的“导出视频”触发。浏览器按能力选择 WebM 或 MP4，录制时实时推进时间轴并隐藏轨迹、网格和机位辅助线；结束后恢复导出前的时间位置。为避免未经确认的大文件副作用，视频导出目前不暴露为 MCP 工具。

MCP Server 会要求 Agent 先读取 `director_get_state`、使用精确 ID、携带 `expected_revision`，并在多步编辑后调用 `director_validate`。

## 语义工具

| Tool | 用途 |
| --- | --- |
| `director_get_state` | 读取完整工程、revision、目录和健康状态 |
| `director_get_capabilities` | 读取能力与安全属性 |
| `director_select_object` | 选择或清空选择对象 |
| `director_add_character` | 新增角色 |
| `director_add_crowd` | 新增群众阵列 |
| `director_add_primitive` | 新增基础几何体 |
| `director_add_camera` | 新增机位 |
| `director_update_object` | 更新对象名称、变换、颜色、可见性和锁定 |
| `director_update_camera` | 更新机位位置、目标与 FOV |
| `director_apply_pose` | 给角色或群众应用姿势 |
| `director_update_scene` | 更新背景、地面、标签和场景变换 |
| `director_set_view` | 切换导演/机位视角 |
| `director_set_timeline` | 设置时长、循环、当前时间、播放状态和面板开关 |
| `director_define_trajectory` | 为角色、道具或机位创建预设轨迹或任意 waypoints |
| `director_delete_trajectory` | 按轨道或对象删除动画轨迹 |
| `director_delete_object` | 删除对象，默认保护人工锁定 |
| `director_undo` | 撤销一次场景编辑 |
| `director_validate` | 校验对象、变换、机位引用和 FOV |

## 宿主页面调用

除 HTTP/MCP 外，嵌入导演台的同源宿主也可发送语义命令：

```ts
iframe.contentWindow?.postMessage(
  {
    type: "storyai:director-agent-command",
    payload: {
      requestId: "request-1",
      name: "director_update_object",
      arguments: {
        object_id: "char_default_a",
        position: { x: -1, y: 0, z: 0 },
        expected_revision: "p-12345678",
      },
    },
  },
  window.location.origin
);
```

导演台用 `storyai:director-agent-result` 返回 `{ requestId, ok, result | error }`。页面内也暴露同源调试 API：

```ts
window.storyAiDirectorAgent?.getState();
window.storyAiDirectorAgent?.execute("director_validate");
```

## 安全与限制

- 本机服务只监听 `127.0.0.1:4319`，不对局域网或公网开放。
- MCP 写入的是当前已连接浏览器工程；网页必须保持打开。当前只允许一个活跃导演台页面接管连接。
- 每个工程状态都带内容哈希 revision。旧 revision 的写操作会被拒绝，Agent 必须重新读取状态。
- `locked=true` 的对象默认不能被 Agent 更新、删除或换姿势。只有用户明确授权时才允许 `override_locked=true`。
- 截图和本地模型的二进制 Data URL 不进入 Agent 上下文。
- 动画时间轴和轨迹属于工程数据；角色、道具、机位共用关键帧模型。Agent 自定义轨迹最多包含 64 个 waypoints，且至少两个。角色可使用任意姿势 ID，其中 `walk` / `run` 是连续循环动作。
- 播放预览不会逐帧写回对象或制造撤销记录；修改时间轴、轨道和关键帧本身仍会进入工程 revision 与撤销栈。
- 截图/导出不在 Agent 工具白名单中，避免未经确认的大文件副作用。

## 验证

```bash
npm run build
npm test -- --run src/editor/agent/directorAgentCommands.test.ts src/App.test.tsx src/editor/io/hostBridge.test.ts
npm run test:agent
npm run agent:mcp:probe
```

当 Agent 服务与网页都已启动时，可额外验证 MCP 能读取实时浏览器状态：

```bash
STORYAI_AGENT_PROBE_LIVE=1 npm run agent:mcp:probe
```
