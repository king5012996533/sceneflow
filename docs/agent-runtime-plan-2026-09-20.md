# Agent 运行时接入方案（DSH 为底座）

> 状态：**Phase 0 已落地**（2026-09-20，见文末「Phase 0 落地记录」）；Phase 1 起待评估。
> 日期：2026-09-20

---

## 0. 一句话

保留我们自己的壳（对话面 + 画布），把 **DeepSeek Harness（DSH）当作服务端 agent 运行时**接入，创作模式收敛为两条：**agent 创作**（用户给指令，agent 调工具交付）与**画布交互**（用户自由发挥）；模型改为**平台内置**，按实际用量计费，额度不足时**暂停并可续跑**。

**非目标**：不把 DSH 的 Web UI 当产品主界面（理由见 §4.1）。

### 0.1 第一步的范围（已定）

第一步不是"全量交付"，而是**画布 Agent**：用户在画布里通过对话完成创作。

这个界定把范围收窄了三处，都是减法：

1. **交付物 = 画布上的产物**（节点、成图），不是"成品文件包"。于是"交付清单"就是「我在画布上给你放了什么」，§1.2 里标为难点之一的**交付验收基本消解**。
2. **Phase 3（工具服务端化）第一步不需要**，可延后（见 §5）。
3. 于是第一步 = **Runner + profile + MCP 桥 + run API + 计费** —— 就是 Phase 0 与 Phase 1。

**但有一条必须现在说清的代价**：第一步工具跑在浏览器侧，所以 **"关掉页面也能跑完"在第一步不成立**。Phase 2 的续跑承诺要降级为「**页面开着时**，额度不足 → 暂停 → 充值 → 继续」。这条别对外承诺错了。

---

## 1. 已确认的事实

方案是照着这些事实设计的，不是照感觉。每条都实测过。

### 1.1 服务器侧（我们的仓库）

| 事实                                                                                                                                           | 位置                                                                                                                                    | 对方案的意义                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 计费原语齐全：`deductCredits` / `grantCredits` / `refundCredits` / `adjustCredits` / `ensureDailyCreditGrant`，返回 `{allowed, balance, cost}` | `web/src/lib/credit-ledger.ts`                                                                                                          | **不用新建计费内核**，接上即可。`allowed:false` 就是暂停钩子                                                                                    |
| 幂等靠数据库唯一约束保证                                                                                                                       | `CreditTransaction @@unique([userId, type, refType, refId])`                                                                            | 重复扣费在库层被拦死，不用在应用层发明                                                                                                          |
| 每轮生成本来就有行、有幂等键、有退款依据                                                                                                       | `GenerationJob{ requestKey @unique, kind, status, creditsCost, costCents, quotaRefunded }`                                              | `kind` 已含 `text \                                                                                                                             |
| **文本类今天不计费**                                                                                                                           | `credit-pricing.ts:150` `case "text": case "tool":` → 回落 `textCredits`，默认 **0**                                                    | 现状是"对话免费"。内置模型一上线，这里就是漏洞                                                                                                  |
| **文本类在成本页是盲区**                                                                                                                       | `estimateGenerationCostCents` 对 `text`/`tool` **返回 `null`**                                                                          | 后台「成本/毛利」完全看不到 LLM 花费。必须修，否则毛利页失真                                                                                    |
| **画布状态已经存在服务端**                                                                                                                     | `model CanvasBackup { userId, type, data(Json), version }` + `/api/sync`                                                                | **"工具服务端化"从"重造状态模型"降级为"给已有文档写执行器"** —— 这是本次勘勘察最重要的发现                                                      |
| 已有 run 锁与 run 语义                                                                                                                         | `canvas/engine/scheduler/run-lock.ts`：`tryClaimCanvasRun` / `canvasRunOwner` / `forceReleaseCanvasRun`，`CanvasRunKind = "online" \    | "local" \                                                                                                                                       |
| 已有服务端 run 执行与超时                                                                                                                      | `generation-run.server.ts`：`RUN_TIMEOUT_MS = 900_000`、`RunOutcome`（含 `not-allowed`）、`startServerRun`、`resendStaleGenerationJobs` | 长任务、超时、重发的骨架已存在                                                                                                                  |
| 已有等待/结算判定                                                                                                                              | `canvas/engine/scheduler/generation-wait.ts`：`isGenerationSettled` / `waitForGeneration`                                               | agent"等生成完再继续"不用自己发明轮询                                                                                                           |
| 支付回调已存在                                                                                                                                 | `app/api/payments/callback/route.ts`                                                                                                    | 充值后触发"是否继续未完成的活"的天然锚点                                                                                                        |
| **线上是 PM2 裸跑，不是 Docker**                                                                                                               | `web/deploy.sh`：`git pull` → `npm install` → 构建 → `pm2 restart sceneflow`，`--max-memory-restart 1200M`                              | 现有的 `Dockerfile` 是**给自部署用户的 BYOK 形态**（注释写明"AI 请求由浏览器前台直连用户自己的接口"），与 SaaS 无关。跑 runner 要新建容器化链路 |
| **线上服务器只有 2G 内存**                                                                                                                     | `web/deploy.sh` 头部注释："2G 内存服务器务必先加 swap，否则构建可能被 OOM killer 杀掉"；PM2 上限 1200M                                  | **本次勘察最要命的一条**，见 §3.1                                                                                                               |
| 工具面是**浏览器侧**的，31 个，单一注册表                                                                                                      | `canvas/engine/tools/registry.ts` + `schemas.ts`，风险档 read/orchestrate/generate/write + 中文名                                       | 工具元信息单一来源，改造成本低；但**执行位置在浏览器**，这是最大分岔                                                                            |

### 1.2 DSH 侧

| 事实                                                 | 来源                                                                                                       | 意义                                                                                                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **要求 Node `^22.19.0 \                              | \                                                                                                          | >=24.0.0`，pnpm 11.7.0**                                                                                                                             |
| 版本 `0.1.6-alpha.2`，MIT                            | 根 `package.json`                                                                                          | 真 alpha。集成面必须做薄                                                                                                                             |
| 遥测有**两条**路径，不是一条                         | `packages/bundle/base/README.md`                                                                           | ①`session-telemetry-otel`（默认 `FEEDBACK_ONLY`，可设 `DISABLED`）②**`session-log-deepseek` 是默认开启的独立上报路径**。要"不依赖官方"必须两条都处理 |
| 模型 key 从**环境变量**读                            | `dsh-llm-deepseek` 配置 `apiKeyEnv: DEEPSEEK_API_KEY`                                                      | key 天然在服务端，不下发浏览器。内置模型接线干净                                                                                                     |
| **每次模型调用的 usage 可取，且 attempt 有持久结算** | `packages/llm/llm/README.md`：流以 `usage` chunk 结束；"the loop embeds in one durable attempt settlement" | **计费的钩子点**：按轮拿真实 token，不用估算                                                                                                         |
| 自定义 profile 极简                                  | `bundle/base/README.md`：一个 `package.json` 声明 `dsh.profile.bundles: ["@deepseek-ai/dsh-base"]`         | 我们自己的 profile 是一份配置，不是 fork                                                                                                             |
| 有现成的审批 / 反问 / 目标 / 任务 / 交付接缝         | `interaction/user-approval`、`user-questions`、`goal`、`jobs`、`deliverables`                              | 之前判为"中高难度"的几块，DSH 已提供                                                                                                                 |
| 交付物接缝是**文件/git 取向**                        | `deliverables`：`present` 工具 + 基于 git 快照的 `workspace-changes`                                       | 我们的交付物是画布节点与成图，**不能直接复用**，要自己做画布版                                                                                       |
| 无账号与多租户                                       | `packages/identity` 只有 `anonymous-user-id`                                                               | 鉴权、隔离、额度、订单全是我们自己的                                                                                                                 |

**补充（关于发布渠道）**：DSH 已发布到 npm。`@deepseek-ai/dsh` 的主包只有 10 个文件，真实内容是约 75 个 `@deepseek-ai/dsh-*` 依赖。注意**两条渠道的版本是错位的**：`latest` 指向 `0.1.5-rc.2`（"稳定"通道本身就是 rc），`alpha` 指向 `0.1.6-alpha.2`（master 的版本）。选哪条要在 Phase 1 明确，因为它决定我们锁的版本。

### 1.3 本机实测（2026-09-20，DSH 0.1.0-rc.6 / Windows node v24.21.0）

真跑出来的数字，不是估算：

| 指标             | 实测值                                                                  |
| ---------------- | ----------------------------------------------------------------------- |
| **冷启动到就绪** | **3.16 s**（13:53:04.068 → 13:53:07.230）                               |
| **空闲内存**     | **111 MB**（四次独立测量：111.8 / 111.1 / 113.1 / 111.0，稳定）         |
| 运行时磁盘       | **303 MB**（node_modules）                                              |
| 状态目录 `.dsh`  | 11 MB（其中 sessions 占 11 MB）                                         |
| Web 前端         | **已预构建、直接服务**（真 HTML + 约 40 个 UI 插件 bundle），零构建步骤 |
| `--dump-config`  | 2.5 s，490 行（web）/ 333 行（headless）                                |

**三条结论：**

1. **3.16 s 冷启动 ⇒ 按 run 起停完全可行，不需要常驻进程，也不需要预热池。** §6.3 里"是否需要预热池"这一项据此消掉。
2. **111 MB 空闲 ⇒ 内存不是瓶颈。** 真正的占用要看模型在跑时的表现（待测）。
3. 镜像约 **400 MB 量级**（303 MB 运行时 + node 基础镜像），CI 构建/推送/拉取都很快。

**两处必须修正方案的发现：**

- **`sdk` profile 在 0.1.0-rc.6 里不存在**——报错要求用 `dsh plugin --profile sdk add <package>` 自建。**`headless` 存在且直接可用**，它就是"web 去掉全部 `client-*` UI 插件"后的精简运行时，正是 runner 要的形态。所以 **runner 走 `headless`**，`sdk` 只留作将来需要进程内 JSON-RPC 时的选项。
- **`headless` 默认启用整套编码工具**：`tool-bash`、`tool-pwsh`、`tool-fs`、`tool-fs-search`、`tool-str-replace-editor`、`web-search-deepseek`、`tool-web`，外加 `subagent` 五件套、`tool-workflow`、`tool-ralph`。**必须用 profile patch 全部裁掉**——这是 Phase 1 一项确定的工作量，不再是想当然。

**已确认的两件事（方案原假设成立）：**

- **persona 是配置串**，由 `system-prompt` 插件的 `config.persona` 提供：`You are a coding agent powered by the {{model}} model. Your working directory is {{cwd}}.` —— patch 一层即可替换，不用改代码。
- **遥测默认已关**：`session-telemetry-otel` 的 `mode` 默认是 `DISABLED`（`process.env.DSH_TELEMETRY_MODE`），端点是 `harness-telemetry.deepseeksvc.com`；而 master 文档里提到的 `session-log-deepseek` **在 rc.6 的配置树里根本不存在**。详见 §3.6。

---

## 2. 目标架构

```
浏览器（我们的壳：一个对话面 + 画布）
   │  ① POST /api/agent/runs      （带 ic_token，我们的鉴权）
   │  ⑥ SSE 事件回流（文本增量 / 工具卡片 / 本轮用量）
   ▼
Next.js  ·  PM2 sceneflow
   ├─ /api/agent/runs          新建 run，占 run 锁，创建 GenerationJob
   ├─ /api/agent/runs/[id]/... 事件、暂停、继续、取消
   ├─ 计费结算（credit-ledger，每轮一条流水）
   └─ WS 中继  ◄──────────────┐  ③ 工具调用转发到用户浏览器
   │  ② 分配 run token        │
   ▼                          │
Runner 容器（node 22/24 + pnpm 11.7）        │
   └─ dsh --profile <我们的 profile>          │
       ├─ dsh-base                            │
       ├─ 补丁：遥测 DISABLED + 移除 session-log-deepseek
       ├─ 补丁：系统提示替换（画布创作 agent，非编码）
       ├─ 补丁：工具集裁剪（去掉 shell / 文件读写）
       ├─ 补丁：模型路由 = 平台密钥（内置模型）
       └─ MCP client ──► 我们的 MCP 桥 ──────┘
                          ④ 桥把 31 个画布工具暴露为 mcp__canvas__*
                          ⑤ 每轮 usage 回调 Next.js → 扣费
```

要点：

- **Runner 是独立容器**，不是 PM2 里的一个进程。node 版本硬要求 + 安全边界（DSH 能执行模型生成的命令）两条原因都指向这里。
- **浏览器侧工具经 MCP 桥回打**。Phase 1 保留 31 个工具原地不动，只加一座桥。桥是**我们写的代码**：一个 streamable-http 的 MCP server + 一条 WS 到浏览器。
- **按 run 起停，不常驻**。DSH 会话日志天然持久，所以 run 可以"快照后释放进程"，额度恢复后重建续跑。

---

## 3. 关键决策与理由

### 3.1 运行位置：独立主机上的容器，按 run 起停

**不能用 PM2 复用现有进程**，三条独立理由（任一条都足以否决）：

1. **node 版本不满足**：DSH 要求 `^22.19.0 || >=24.0.0` + pnpm 11.7，现有部署走 `npm install` 流程。
2. **安全边界**：DSH 能执行模型生成的命令。放进主进程等于放进有数据库和用户数据的同一个网络命名空间。它自己的 `SAFETY.md` 明确要求一次性容器。
3. **内存装不下**（决定性的一条）：线上是 **2G 内存**的机器，PM2 上限 1200M、Next.js 堆上限 768M，构建时靠 swap 才不被 OOM killer 杀掉。而 DSH 自己构建就要 `--max-old-space-size=4096`。**一次 agent run 的内存占用就足以把主站 OOM 掉。**

**因此**：

- Runner **在 CI 预构建镜像**（仓库已有 `.github`），线上只拉镜像、不构建。让 pnpm monorepo 的构建进 `deploy.sh` 这条路是走不通的。
- Runner **不能与现有 Next.js 挤在同一台 2G 服务器上**。需要独立的主机（或按需的容器主机）。
- **这是一笔新增的基础设施成本**，不是可以省掉的细节；它应当被算进评估。

不按"每用户常驻"：闲置用户白占内存；且我们已经有 `tryClaimCanvasRun` 表达"每用户同时一个 run"。

### 3.2 工具执行：先桥后迁（分两期，不是二选一）

- **Phase 1 走浏览器桥**：31 个工具一行不改，最快见到端到端闭环。
- **Phase 3 迁到服务端**：因为 `CanvasBackup` 已经存在，迁移是"给已有文档写 headless 执行器"，**有界工作**，不是重写状态模型。

这条同时决定了两个承诺的成立时间：**"关掉页面也能跑完"和"暂停期间能续跑"都只在 Phase 3 完全成立**。

### 3.3 计费：每轮一条，复用 GenerationJob

- **一轮 = 一条 `GenerationJob(kind="text"|"tool")`**，`requestKey = runId#turn`。
  - 零迁移：表、幂等键、退款策略、审计、后台页全部现成。
  - 面板需要的"本轮增量 / 累计消耗"= 单条 / 同 runId 求和，天然可算。
  - **暂停/续跑天然成立**：每轮独立结算，不用做 run 级回滚。
  - 代价：40 轮 = 40 行。为可审计性，这是优点不是缺点。

### 3.4 定价：按 token，且基数是"我们的成本 × 倍率"

- `ModelPricing` 增加 token 单价：输入 / 输出（+ 可选缓存命中价）。
- **不要写死"官方价 ×2"**：换成别的渠道或更强的模型时，2× 可能低于成本且**静默**。定为「**平台实际成本 × 后台可配倍率（默认 2）**」，官方价只作展示参考。
- 修 `estimateGenerationCostCents` 对 `text` 返回 `null` 的盲区，否则后台毛利页看不到最大的一块变动成本。

### 3.5 额度不足：阈值暂停，不是预授权冻结

- 每轮开始前检查余额；低于「预估下一轮成本」就**暂停**。
- 好处：**垫付上界 = 单轮成本**，有界且小。
- 暂停必须**快照后释放进程**，不能挂容器等充值——否则一百个暂停 run 就是一百份被占住的资源，那才是真亏。
- 配套：暂停 run 的 TTL、每用户暂停 run 数量上限、归档后释放工作区（保留会话日志即可恢复）。
- 续跑**要用户确认**，不能静默：用户充值本来想买别的，结果被一个三天前的 run 吃掉，是最典型的差评来源。

### 3.6 "不依赖官方"：显式关死遥测 + 锁版本

实测后的准确版本（此前基于 master 文档的判断有一半不成立）：

- **`session-telemetry-otel`**：rc.6 里默认模式已是 `DISABLED`（`process.env.DSH_TELEMETRY_MODE || 'DISABLED'`），端点为 `harness-telemetry.deepseeksvc.com/v1/logs`。**不能依赖默认值**——容器里显式设 `DSH_TELEMETRY_MODE=DISABLED` 并在守卫里断言。
- **`session-log-deepseek`**：master 的 base README 称它"默认开启"，但 **rc.6 的 web/headless 配置树里都没有它**。所以当前版本没有这个洞，**但升级时必须重新核对**——这条要写成版本升级的检查项，而不是一次性判断。
- 锁死 DSH 版本，只走 profile patch 与 MCP 协议边界，**不直接 import 内部包**。上游是 alpha（rc 通道的 `latest` 本身就是 rc），替我们决定向后兼容。
- **版本通道要显式选**：npm `latest` = `0.1.5-rc.2`，`alpha` = `0.1.6-alpha.2`，而本机装的是 `0.1.0-rc.6`。三者配置树可能不同（`sdk` profile 就是一个例子），锁版本时必须同时锁通道。

### 3.7 状态不外置

**run 的任何中间状态都必须落在会话日志或 `CanvasBackup` 里**，不能留在浏览器或我们的进程内。否则"暂停"会变成"从头重跑"——用户充完钱回来发现进度归零，比直接失败更伤。

### 3.8 Runner 主机：买什么、以及先别买

**已实测**：DSH 是预构建产物，`npm install` 装完即跑，**不需要在服务器上构建那个 206 MB 的 monorepo**（构建要 4 GB 内存）。冷启动 **3.16 s**、空闲 **111 MB**、运行时磁盘 **303 MB**（§1.3）。我们走 `headless` profile，而它的前端本就是预构建的、不需要构建。

**部署形态**：CI 构建镜像（`npm install` + 我们的 profile 包）→ 推 ghcr.io（现有 `ghcr.io/basketikun/infinite-canvas` 同款做法）→ 服务器只拉取运行。**服务器永远不编译。**

**规格建议**（独立主机，不与主站同机）：

| 项       | 建议           | 理由（实测支撑）                                         |
| -------- | -------------- | -------------------------------------------------------- |
| 内存     | **4 GB 起**    | 空闲 111 MB/run；按 400 MB/run 量级估，4G 能扛 6~10 并发 |
| CPU      | 2 核           | agent 以 IO 等待为主；3.16 s 冷启动说明单核也够          |
| 磁盘     | 40 GB+         | 镜像约 400 MB + 每 run 工作区，非常宽裕                  |
| 产品形态 | 轻量应用服务器 | 正合适，不需要独服                                       |

**不需要预热池。** 3.16 s 冷启动意味着按 run 起容器用户感知不到，常驻进程与预热池都可省掉——这同时消掉了"闲置用户占内存"的担忧。

**但先别买。** 第一步的全部代码（runner profile、MCP 桥、`/api/agent/runs`）在本地跑与在服务器上跑**逐字相同**：

1. 先在**你自己的 Windows 机器**上跑通（node v24 已满足 `>=24`）。
2. 体验确认对了，再买机器、把同一套镜像搬上去。

这样不浪费任何工作，还把"买错规格"的风险推到体验验证之后。

**不要**把 runner 临时塞进现有线上服务器做验证：2G 内存上一次 run 就可能把主站 OOM 掉，等于用生产事故换一个本来免费的验证。

---

## 4. 不做的事

### 4.1 不用 DSH 的 Web UI 当主界面

不是审美，是三条硬事实：

1. 它的 Web 服务端**只绑回环**，`dsh web` 命令**直接拒绝 `--host 0.0.0.0`**；原文写明载体自身不拥有 TLS/认证/Origin 策略。
2. 鉴权是**进程级 token 换签名 cookie**，单租户；`packages/identity` 只有一个 `anonymous-user-id`。
3. 于是要当 SaaS 主界面，就得**每用户一个进程 + 自搭鉴权代理**——省掉的那块对话界面远小于新增的运维负担。而且它的外壳是给编码 agent 的（文件树、终端、插件管理器）。

### 4.2 不做的事（其余）

- 不删 BYOK：留作高级用户的逃生舱，也是我们成本敞口的减压阀。
- 不做 DSH 的 `web` 桌面/Electron 形态。
- 不碰已经关掉的批次三/四（图层拆分、透明底）。

---

## 5. 分期方案

每期都可独立验收、独立上线，前一期的产物在后期原样复用。

### Phase 0 —— 计费地基（不等任何决策，可立即开工）

**范围**

- `ModelPricing` 增 token 单价（输入/输出/缓存）；`getGenerationCreditsCost` 支持按 token 计算文本类。
- 后台「逐模型能力标定」增加文本模型的按 token 计价区块（复用现有 UI 与 `sanitizePricing` 收口）。
- `estimateGenerationCostCents` 的 `text`/`tool` 分支返回真实成本估算。
- 流水可复算：模型 / 输入 token / 输出 token / 缓存 token / 单价 / 倍率 / 本轮积分。

**为什么先做**：它与"工具在哪跑""用谁的 UI"完全解耦；不做它，agent 一上线就在裸奔烧钱。

**验收点**

1. 单测 + 回归守卫全绿（新增 token 计价单测；守卫断言单价来源单一、不得在别处硬编码）。
2. 后台配置往返：改 token 价 → 保存 → 目录接口读到新值，且**不误伤其它字段**（沿用批次二那套整表保存校验）。
3. 模拟一轮文本调用 → `CreditTransaction` 出现一条可复算的消费流水，`refType/refId` 正确。
4. 后台成本页对文本类**不再返回 null**，毛利率可算。

### Phase 1 —— 运行时最小闭环

**范围**

- 容器化 Runner：node 22/24 + pnpm 11.7，镜像内预装 DSH（锁版本）。
- **镜像在 CI 预构建**（仓库已有 `.github`），线上只拉取。**不进 `deploy.sh`** —— 它现在走 `npm install` + 本机构建，而 DSH 构建要 `--max-old-space-size=4096`，2G 机器上不可能。
- **独立的 runner 主机**。不与现有 Next.js 同机（§3.1 第 3 条）。
- 我们的 profile：`dsh-base` + 补丁（关两条遥测 / 换系统提示 / 裁工具集 / 内置模型路由 = 平台密钥从环境变量注入）。
- **MCP 桥**：streamable-http MCP server + 到浏览器的 WS 中继，把 31 个画布工具暴露为 `mcp__canvas__*`。
- Next.js 新增 `/api/agent/runs`：新建 run（占 `tryClaimCanvasRun` 的锁）→ 调 runner → SSE 回事件 → 每轮结算。
- 服务端鉴权：run token（我们签发、runner 校验）。

**验收点**（真机浏览器，端到端走一遍真实用户动作）

1. 一句话 → agent 产出计划 → 调用 3~5 个**真实**画布工具（节点真的出现在画布上）。
2. **自检**：agent 读回画布状态并与计划比对，不一致时能自己纠正。
3. **交付清单**：列出产出了什么、每个产物在哪、花了多少积分。
4. 每轮扣费流水正确，且**同一 run 不会出现重复扣费**（重放/重试验证）。
5. 越权防护：run token 不能访问别人的 run；工具白名单外的东西调不到。
6. 回归：现有图片/视频生成链路、`/studio`、画布面板**全部不受影响**。

### Phase 2 —— 计费闭环与暂停续跑

**范围**

- 每轮阈值暂停 + 快照释放 + TTL + 每用户暂停 run 上限。
- 支付回调触发"有未完成的活，是否继续"（不静默）。
- 计费面板：本轮增量 / 本 run 累计 / 剩余额度 / 所用模型，并说明"上下文重发"是机制。
- 触顶时的部分交付：交付已完成部分，不是整个丢弃。

**验收点**

1. 余额不足 → 暂停（不是失败），状态与已产出物可查。
2. 充值 → 确认续跑 → **从断点继续，不重跑已完成轮次**；会话上下文连续。
3. 垫付上界：实测不超过单轮成本。
4. 暂停 run 的进程**确实被释放**（不是挂着）；超 TTL 自动归档且可恢复。
5. 面板数字与数据库流水逐条对得上。

### Phase 3 —— 工具服务端化（**第一步不阻塞，可延后**）

**范围**

- 基于 `CanvasBackup` 文档实现 headless 工具执行器，逐步替换 MCP 桥（可双轨并存，按工具逐个切）。
- 交付物模型：画布版 `present`（交付物 = 画布节点 / 成图 / 导出物），不复用 git 取向的 `workspace-changes`。

**验收点**

1. **页面关闭状态下**完成一次生成型交付（这是本期的核心承诺）。
2. 同一操作在浏览器侧与服务端侧结果一致（逐工具比对，避免两套语义漂移）。
3. 漂移守卫：同一工具的两种实现不得各自解析参数。

### Phase 4 —— 界面收编

**范围**

- 一个对话面替代现有**四个**重叠的 agent 面板（`canvas-assistant-panel` / `canvas-orchestrator-panel` / `canvas-automation-agent-panel` / `canvas-local-agent-panel`）。
- 淘汰 `/studio` 参数面板中被 agent 取代的部分（模型/尺寸/比例/分辨率/参考图等"人肉翻译意图"的控件）。
- 保留画布交互的完整能力。

**验收点**

1. 逐个走查现有 agent 能力，**删除后无功能回归**（列出对照表，逐项验证）。
2. 桌面 1440 + 手机 390 双视口验证；触屏命中区不退化（沿用批次二的标准）。
3. 画布交互这条腿的功能一条不少。

---

## 6. 风险与未决问题

### 6.1 风险

| 风险                   | 说明                                                           | 缓解                                                           |
| ---------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| DSH 是 `0.1.6-alpha.2` | 官方声明会有破坏性变更                                         | 锁版本；只走 SDK/MCP 边界；不 import 内部包                    |
| 上游改协议             | 我们的桥/适配器失效                                            | 集成面做薄；runner 镜像与代码分离，可独立回滚                  |
| 单点资损               | agent 自循环烧钱                                               | 每 run 硬预算（token/轮数/积分三重上限），触顶即停             |
| MCP 桥成为瓶颈         | WS 断线、浏览器关页                                            | Phase 3 服务端化；桥掉线时工具调用失败要**明确报错**而不是静默 |
| 两套工具语义漂移       | 浏览器版与服务端版行为不一致                                   | Phase 3 的漂移守卫 + 逐工具比对                                |
| 文本计费上线后用户反弹 | "我一句话怎么花了这么多"                                       | 面板分列本轮/累计；规划用便宜模型、执行才升级                  |
| **服务器容量**         | 线上仅 2G 内存，PM2 上限 1200M、Next 堆 768M，构建靠 swap 续命 | runner 独立主机 + CI 预构建镜像；绝不与主站同机（§3.1）        |

### 6.2 需要你拍板的（按优先级）

1. **第一阶段先做哪条腿？** 我建议 Phase 0（计费地基）先做——它不等任何决策，且是防裸奔的前提。
2. ~~**"全量交付"交付什么？**~~ **已定**：第一步不是全量交付，而是画布 Agent（§0.1），交付物 = 画布上的产物。
3. **`/studio` 工作台保不保留？** 保留则 Phase 4 只删参数面板不删页面；降级为"agent 产出的查看器"则删得更狠。
4. **每 run 的默认积分上限定多少？** 这个数字决定暂停阈值与垫付上界。

### 6.3 待核实（不影响开工，但要早查）

- **一次真实 run 的内存峰值**（本机可测，需要在界面里跑一条真实指令）：这是唯一还没量到的关键数字。空闲 111 MB 只是下限——模型流、工具调用、会话增长都会往上加。**它直接决定 4 GB 到底能扛几个并发。**
- **线上服务器的 node 版本**：`deploy.sh` 里看不出来（只 `npm install` + `node server.js`）。DSH 要求 `>=22.19`。按 §3.1 的结论不建议同机；若要同机，这是前置条件。
- **`session-log-deepseek` 的版本差异**：rc.6 里不存在，master 文档称它默认开启。**升级 DSH 时必须重新核对**——这是个升级检查项，不是一次性判断。
- 独立 runner 主机的选型与成本（本方案**唯一新增的基础设施支出**，应计入评估）。

已由 §1.3 实测消掉的两项：镜像体积与冷启动时间、是否需要预热池（不需要）。

- `session-log-deepseek` 移除后是否有功能损失（会话标题之类）。
- 我们 profile 裁剪工具集后，DSH 的基础能力是否仍完整（例如它内部是否依赖 shell 做 compaction）。

---

## 7. 附：本方案复用的既有资产

不新建的东西（全部复用）：`credit-ledger` 计费内核、`CreditTransaction` 幂等约束、`GenerationJob` 行模型与退款策略、`CanvasBackup` 状态模型、`tryClaimCanvasRun` run 锁、`generation-run.server` 的 run/超时/重发骨架、`generation-wait` 的等待判定、`payments/callback` 充值锚点、31 个工具的单一注册表与 schemas、后台的能力标定与定价 UI、以及门禁体系（tsc / guard / 28 套单测 / build）。

新建的东西（有界）：Runner 容器与 profile、CI 镜像链路、**一台独立 runner 主机**、MCP 桥、`/api/agent/runs` 一族、token 计价、暂停续跑状态机、画布版交付物、一个对话面。

---

## 8. Phase 0 落地记录（2026-09-20）

### 交付物

| 文件 | 作用 |
| --- | --- |
| `web/src/lib/credit-pricing.ts` | `ModelPricing` 增三个 token 单价（元 / 百万 token）；`textTurnCostCents` / `textTurnCredits`（成本 → 分 → × 倍率 → 向上取整积分）；`hasTextTokenPricing` |
| `web/src/lib/generation/upstream-usage.ts` | 上游用量读取（OpenAI / DeepSeek / Anthropic / Gemini 四种报文形状）+ 流式 SSE 扫描器 + 透传用的 `teeStreamForUsage` |
| `web/src/lib/generation/text-billing.server.ts` | `settleTextTurnUsage`：一轮文本调用结束后的结算（幂等、按余额垫付、把用量与单价快照写进任务） |
| `web/src/app/api/proxy/route.ts` | 代理接线：拿到 usage 就按 token 结算（JSON 路径等结算完再回，流式路径边透传边收尾结算） |
| `web/src/lib/model-capability-spec.ts` | `toCostYuanNumber` + 清洗白名单收口（保留两位小数，拒负价与 > ¥10000/百万） |
| `web/src/app/(user)/admin/credential-pricing-editor.tsx` | 文本模型专属「按 token 计价」区块（三个成本价框 + 已启用按量结算标记） |
| `web/src/app/(user)/admin/operation-config-tab.tsx` | 全局「文本计价倍率」（默认 2） |
| `web/scripts/alias-hooks.mjs` | 让纯逻辑单测能 `import "@/..."`（Node 内置钩子，不引第三方 loader） |

### 验收点对照

1. **单测 + 守卫全绿**：新增 `test:textpricing` 43 项；守卫断言单价来源单一（不得在别处硬编码）、清洗白名单、结算必被调用。门禁全程 `EXIT=0`。
2. **后台配置往返**：API 层 A1–A10 + 真机浏览器各走一遍。界面上把输入成本改成 `21`、缓存命中改成 `0.33`、2K 档改成 `7` → 保存 → 库里读回 `{"textInputCostYuanPerMillion":21,"textCachedInputCostYuanPerMillion":0.33,"imageCredits2k":7}`，同一凭证的 `capabilities` / `enabled` / `priority` / 别的模型定价一个字节没动。全局倍率在界面上改 `2.5` → 库里读到 `2.5`（新键过了白名单，未被 400 拦），再改回 `2`。
3. **可复算流水**：真机端到端 27/27。真实 https 出站（httpbin base64 回显端点）+ 真实代理链路，用量写死在报文里，断言是「用量 × 单价 × 倍率」复算。含幂等（同一 requestKey 第二次不再扣）、余额不足只扣到 0 且缺口记账、流式收尾结算。
4. **成本页不再为 null**：文本任务建单即写 `costCents`；后台「对账」页从「平台成本 ¥0（文本整块被过滤）」变成能算出成本，毛利率可算。

### 已知取舍

- **结算不预扣**：配了 token 价的模型建单时 `creditsCost = 0`，钱在拿到上游用量后才收。上游不报用量 = 这一轮收不到钱（宁可漏收也不乱扣）。
- **流式路径不 await 结算**：`flush()` 里 fire-and-forget，客户端不被结算拖慢一帧；代价是这一轮的钱晚几十毫秒到账。
- **没配 token 价的模型行为完全不变**，仍按次预扣 —— 这条是回归线，套件里 C1 专门守着。
