---
name: ui-verify
description: 做完任何 UI/前端改动后，在真实浏览器中打开页面校验效果（Codex 式自校验）。Use when a task touched UI components, canvas, pages, styles, or any user-facing change — before declaring the task done, verify it in the browser.
when-to-use: 校验界面、打开网页看看、检查页面效果、UI 完成后自查、截图看看效果
allowed-tools: run_terminal_command, use_tool, search_tool, read_file, list_dir, grep
compatibility: Requires npx(Windows node)、Windows Chrome、deepseek-vision-assistant 技能
---

# UI 浏览器校验（做完任务先开网页自查）

任何涉及用户可见界面的改动，收工前必须走一遍「构建 → 浏览器打开 → 截图 → 视觉模型检查 → 修复 → 复验」闭环。未校验就宣称完成 = 不合格。

## 本项目环境（不要猜，直接用）

- 项目根：`/mnt/c/Users/Administrator/AppData/Local/hermes/infinite-canvas`
- 应用目录：`web/`（Next.js，`basePath=/canvas`）
- 本地构建（WSL 无原生 node，用 Windows node）：
  `cd web && "/mnt/c/Program Files/nodejs/node.exe" "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js" run build`
- 生产环境：`https://xingtudesign.com`（部署由用户在 VPS 手动执行：`git pull && bash deploy.sh`，需要时提示用户部署）
- 浏览器 MCP：`playwright`（无头 Chrome，已配置 executable-path + user-data-dir，登录态可持久化）
- 视觉检查：`deepseek-vision-assistant` 技能的 `scripts/analyze_image.py`，模型 `gpt-5.6-terra`，必须后台运行

## 校验步骤

1. **先构建**：`npm run build` 必须通过（构建失败直接修，不用开浏览器）。
2. **确定受影响的页面**：这次改动涉及哪些路由？列出 URL（见下），不要只截一个页面。
3. **浏览器打开**：用 playwright MCP 依次打开每个页面：
   - 用 `search_tool` 查 playwright 的工具（`browser_navigate`、`browser_screenshot`、`browser_click` 等），按 schema 调用。
   - 需登录的页面：先导航到 `https://xingtudesign.com/canvas/login`，用测试账号登录（user-data-dir 已持久化，首次登录后后续免登录）。
4. **截图**：每个页面截一张 1440 宽度的图，存到 `AppData/Local/Temp/ui-shots/`（Windows 可见路径，Chrome/脚本才能读写）。
5. **视觉检查**：把截图交给视觉模型分析（后台跑，不要同步等）：
   ```
   cd /mnt/c/Users/Administrator/.grok/skills/deepseek-vision-assistant
   python3 scripts/analyze_image.py <截图路径> --question "对照任务预期检查：<改动点>。指出布局/文字/图片/交互问题" --model gpt-5.6-terra --max-width 1280 --timeout 300 --max-output 2500
   ```
   视觉模型不可用时，退化为 DOM/控制台/代码检查，并明确告知用户"视觉模型不可用，本次用 DOM 方式校验"。
6. **对比预期**：截图结论 vs 任务目标，逐项核对。发现问题 → 修复 → 重新构建 → 重新截图（最多 2 轮）。
7. **汇报**：改了哪些页面、截图结论（好/问题）、遗留问题、是否已请求部署。

## 常用 URL（basePath=/canvas）

| 页面           | URL                                         |
| -------------- | ------------------------------------------- |
| 画布库（主页） | https://xingtudesign.com/canvas             |
| 画布编辑器     | https://xingtudesign.com/canvas/<projectId> |
| 生图工作台     | https://xingtudesign.com/canvas/image       |
| 视频创作台     | https://xingtudesign.com/canvas/video       |
| 我的素材       | https://xingtudesign.com/canvas/assets      |
| 提示词中心     | https://xingtudesign.com/canvas/prompts     |
| 定价           | https://xingtudesign.com/canvas/pricing     |
| 登录           | https://xingtudesign.com/canvas/login       |
| 管理后台       | https://xingtudesign.com/canvas/admin       |

## 规则

- 每个受影响页面都要验证，禁止只截首页就说"没问题"。
- 截图必须通过视觉模型分析，禁止把图片直接读进对话（会撑爆上下文）。
- 移动端/窄屏适配的改动，额外用 `--viewport-size=390,844` 截一张移动端图。
- 视觉模型分析是后台任务：启动后先做别的事，轮询结果，不要让界面看起来卡死。
