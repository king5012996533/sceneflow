# AGENTS.md

本文档用于约束本项目中的 AI / 自动化开发行为。开发时优先遵循本文件，其次遵循用户当前消息。

## 基本原则

- 先读现有代码，再动手修改，优先沿用项目已有结构和写法。
- 写代码保持最少行数，能简单实现就不要引入复杂抽象。
- 标准格式、协议、解析、压缩、加密、日期等通用能力优先使用成熟稳定的库，不要手写底层实现，除非用户明确要求或项目已有实现必须沿用。
- 不要为了“兼容更多场景”写大量分支，只实现当前明确需要的功能。
- 项目尚未上线，不需要兼容旧数据；表结构或字段调整时直接按新设计修改，不写旧字段兼容、数据迁移兜底或删除旧表的清理逻辑，除非用户明确要求。
- 每次写完代码，不需要检查语法，不需要执行构建，用户会自己做。
- 不要改无关文件，不要顺手重构。
- 如果工作区已有用户改动，不要回滚，不要覆盖；只在必要范围内追加修改。

## 反复提醒沉淀

- 如果开发过程中总是遇到某个问题，或者用户反复提醒同一个注意事项，需要把该注意事项补充到本文件。
- 补充时写成明确、可执行的规则，避免只写模糊描述。
- 新规则应放到最相关的章节；找不到合适章节时放到“项目注意事项”。

## 后端规范

- 后端使用 Next.js API Routes（App Router）+ Prisma 7 + PostgreSQL。
- API Route 只处理 HTTP 入参、鉴权、返回 JSON；业务逻辑放 `web/src/lib/`。
- 新增数据表时同步生成 Prisma migration（离线生成：`prisma migrate diff --from-schema <旧schema备份> --to-schema prisma/schema.prisma --script`），并更新 `docs/content/docs/backend/backend-database.mdx`。
- 写库操作保持幂等：退款按 `(refType, refId)` 查重、订单入账按状态迁移守卫，重复回调不得重复到账。
- 金额一律以「分」存储（`*Cents` 字段），前端用 `formatCny` 展示；积分一律为整数。

## 前端规范

- 前端使用 Next.js App Router、React、TypeScript、Ant Design、Tailwind、Zustand。
- 编写 Ant Design 相关代码时，参考 https://ant.design/llms-full.txt 理解组件 API、示例和设计规范，并优先结合项目当前 antd 版本与既有写法。
- API 请求统一放在 `web/src/services/api/`。
- 全局或跨页面状态优先放在 `web/src/stores/`。
- 已经放在全局 store 或全局 hook 中的状态/动作，组件需要时直接使用对应 store/hook，不要为了“纯组件”层层透传 props；避免一个组件传递过多参数。
- 全局组件、全局常量、全局配置等全局性质的内容不要作为 props 或参数层层传递；哪里需要就在哪里直接从对应全局入口获取。
- 多个页面重复出现的 UI 副作用动作，例如复制文本并提示、下载并提示、统一确认弹窗，优先抽成 `web/src/hooks/` 下的全局 hook；不要放进 store，除非它确实是需要共享/订阅的状态。
- 画布相关状态和组件放在 `web/src/app/(user)/canvas/` 内部。
- 页面里只有一个主业务组件时直接写在 `page.tsx`，不要单独拆 `Manager` 组件再传一堆 props。
- 不要新增只做简单转发的组件，例如只 `return <X>{children}</X>` 或只换个名字透传 props；直接在使用处使用真实组件或把逻辑写进当前文件。
- 页面私有 hook 放在对应页面目录下，例如 `admin/assets/use-admin-assets.ts`；只有多个页面真实复用的 hook 才放到外层 `hooks/`。
- 管理后台页面私有组件放到各自页面目录的 `components/` 下，例如 `admin/assets/components/`、`admin/prompts/components/`；不要为了单页面使用放到 `admin/components/` 共享目录。
- 管理后台主题、背景、卡片阴影、表格配色等统一在 `web/src/lib/app-theme.ts`、`AppProviders` 或必要的全局 CSS 作用域中配置；页面私有组件不要自己写 `dark ? ...` 主题分支。
- 组件优先使用函数组件和现有 hooks，不新增大型状态管理方案。
- UI 图标优先使用 `lucide-react` 或项目已经使用的 Ant Design 图标。
- 页面文案保持中文。
- 不要在组件里堆太多无关逻辑；复杂逻辑优先抽成同目录工具函数或小组件。
- 样式优先由组件自己管理；组件私有样式优先使用 Tailwind className 或少量内联 style，不要为单个组件新增大量全局 CSS。
- 全局 CSS 只放基础变量、全局重置、跨页面通用样式和少量第三方组件必要覆盖；不要在 `globals.css` 堆页面私有样式。
- 代码尽量短小直接，少拆不必要组件，少做多层 props 传递，避免为了抽象堆出更多代码。
- **大文件拆分红线**：单个文件避免超过约 350 行。新增页面/后台 tab 时拆成独立组件文件（如 `admin/credits-tab.tsx`、`components/credits/*`）；存量超千行大文件（`canvas-client-page.tsx`、`image.ts`、`video.ts` 等）只做小改动，新增 UI 一律独立成组件再 import，绝不继续往里堆逻辑。
- 前端业务数据需要浏览器本地持久化时，默认使用 `localforage`；`localStorage` 只用于极小的简单配置，不要用来保存业务列表、生成记录、图片、base64 或大 JSON。

## 画布 UI 规范

- 做 canvas 前端 UI 时必须遵循当前画布主题。
- 优先使用 `canvasThemes`、`useThemeStore` 或 Ant Design `ConfigProvider` token。
- 不要硬编码黑白、stone、slate 等颜色导致浅色/深色主题不一致。
- 新增画布按钮、弹窗、浮层时，尽量复用已有工具栏、节点面板、Modal 的视觉风格。
- 画布顶部工具栏和状态信息优先采用极简扁平风格：无边框、无阴影、无胶囊背景，融入整体背景，弱化按钮感，仅保留轻微 hover 反馈，保持简洁现代、低视觉重量。
- 图片节点尺寸逻辑要尊重原始比例，除非功能明确要求自由变形。
- 批量生成、多图展示、助手面板等画布交互要尽量简洁，不要占用过多画布空间。

## 文档规范

- README 保持简洁，只放项目介绍、核心功能、快速开始和文档入口。
- `docs/index.md` 放给 AI 使用的文档索引，不要再放到 `docs/content/docs/` 内容目录里。
- 详细功能介绍写到 `docs/content/docs/overview/features.mdx`。
- 后续待办写到 `docs/content/docs/progress/todo.mdx`。
- 已实现但还需要用户测试确认的事项写到 `docs/content/docs/progress/pending-test.mdx`。
- `docs/content/docs/progress/pending-test.mdx` 用来记录这个版本实际做了哪些可测试变更；`CHANGELOG.md` 的 `Unreleased` 只保留对这些变更的版本级归纳，避免逐条照搬实现细节。
- 每次 todo 事项完成后，先从 `docs/content/docs/progress/todo.mdx` 移到 `docs/content/docs/progress/pending-test.mdx`，不要直接写进正式功能说明；用户确认测试通过后再更新 `docs/content/docs/overview/features.mdx`。
- 每次任务完成前，都要根据实际变更检查并更新 `docs/content/docs/progress/todo.mdx` 和 `docs/content/docs/progress/pending-test.mdx`；如果功能或待办没有变化，也要确认无需修改。
- 接口响应规则写到 `docs/content/docs/backend/api-response.mdx`。
- 数据库结构写到 `docs/content/docs/backend/backend-database.mdx`。
- 文档不要写过期日期；除非用户明确要求记录具体时间。

## 发版本流程

- 发版本时，先把 `CHANGELOG.md` 的 `Unreleased` 变更整理成新的版本记录，并保留空的 `Unreleased` 标题。
- 按当前版本号提升一个版本，更新根目录 `VERSION`。
- 将当前未提交的代码全部提交到 Git。
- 提交完成后，给当前提交打最新版本号对应的 tag，例如 `v0.0.5`。
- 发版本流程中不要执行编译、测试或构建，除非用户明确要求。

## 项目注意事项

- 当前画布项目和“我的素材”主要保存在浏览器本地，不要在文档中误写成已支持云同步。
- 上游 API Key 由平台统一管理（ProviderCredential），客户端不保存任何 Key；涉及安全说明时按平台密钥架构写。
- Docker 静态资源路径目前仍是待办项，文档中不要过度承诺生产部署已经完全验证。

## 积分制 / 平台密钥（2026-08 起）

- 平台统一管理上游 API Key（`ProviderCredential`，AES-256-GCM 加密存 `keyEnc`），客户端不再必须自带 Key。**平台密钥永不进客户端**，只能经 `/api/proxy`、`/api/proxy/form-data` 出网。
- 代理取 Key：只使用平台凭证（`ProviderCredential`）。Gemini 用 `x-goog-api-key` 注入，Aigccc 网关（provider=aigccc 或目标 host 为 aigccc666.com）用 `ApiKey` 头注入，其余用 `Authorization: Bearer`；无平台凭证则不注入 Key。
- Aigccc / Seedance 2.0 第三方网关（`https://www.aigccc666.com`，请求头 `ApiKey`）：`apiFormat="aigccc"`（按 Base URL 识别），视频链路在 `web/src/services/api/video.ts`（`createAigcccVideoTask` / `pollAigcccVideoTask`，分发先于 seedance 启发式）。接口：创建 `POST /api/external/v1/video/task/create`（body：`prompt / mode（仅 pro|fast，默认 pro）/ images / videos / audios / resolution / ratio / duration`；本地参考图先 `POST /api/external/v1/image/upload/batch` multipart 上传到网关临时存储，顺序单张上传规避按 key 并发限流；视频/音频参考仅支持公网 URL；分辨率输出最高 720p（1080p 会被网关静默降级，代码先钳到 720p））；轮询 `POST /api/external/v1/video/task/status`（`code=0` + `data.status`，≥5s 间隔）。后台「平台密钥」选 provider=aigccc 预设，模型能力标定为 `seedance-video`（复用 Seedance 设置面板）。
- 积分账本（`credit-ledger.ts`）：扣减用 `updateMany({ balance: { gte: cost } })` 原子守卫，禁止读-改-写；退款按 `(refType, refId)` 幂等；余额与流水必须在同一事务（`$transaction` + `pg_advisory_xact_lock`）内变更。
- 收费卡点在 `beginGenerationJob`（`generation-jobs.server.ts`）：先算 `creditsCost`（admin 为 0，不扣），事务内每日赠送（`daily_credit_grant`，幂等）→ 原子扣减 → 失败/取消/超时退款。余额不足返回 403，客户端弹「积分余额不足」弹窗（`components/credits/insufficient-credits-modal.tsx`）。
- 积分定价：内置草案在 `web/src/lib/credit-pricing.ts`（`getGenerationCreditsCost`，客户端预检/成本展示/服务端扣费共用同一纯函数）。后台可在「平台密钥 → 逐模型定价」按模型覆盖（`ProviderCredential.pricing`，Json，key=模型名）：图片每张 `imageCredits`、视频每秒 `videoCreditsPerSecond`（实际扣费 = 每秒 × 计费时长，向上取整；时长 `-1`/非法/缺失按 6 秒计）、音频每次 `audioCredits`、文本/工具每次 `textCredits`；未配置的模型退回内置草案。匹配取绑定该模型且启用的最高优先级凭证（priority desc, createdAt asc，与代理解析一致）。按 `GenerationJob.costCents` 实账校准；对账看 admin「对账」tab。
- 前端余额唯一来源是 `useCreditBalance` hook（读 `/api/billing/credits`），充值/生成后调 `refresh()`。
- 运营配置（`OperationConfig`）走 `lib/operation-config.ts` 读取（30s 进程内缓存），admin 后台「运营配置」tab 编辑后自动失效缓存。
- 存量迁移（`lib/credit-migration.ts`）：登录时幂等补建积分账户、新用户赠送积分。
- 平台模型「能力标定」（`ProviderCredential.capabilities`，Json，key=模型名）：后台逐模型配置与前端设置面板一一对应（图片：画质/宽高比/张数；Seedance：分辨率/比例/时长/声音/水印；通用视频：清晰度/尺寸/秒数）。词汇表与默认值在 `lib/model-capability-spec.ts`（服务端清洗 `sanitizeCapabilities` 与客户端共用）；admin 编辑入口在「平台密钥」tab（`credential-form-fields.tsx` / `credential-capability-editor.tsx` / `model-capability-fields.tsx`）。
- 逐模型积分定价（`ProviderCredential.pricing`，Json，key=模型名）：admin 在「平台密钥」表单内配置（`credential-pricing-editor.tsx`），落库前 `sanitizePricing`（只保留 ≥0 整数）；`/api/platform/catalog` 附带每模型 `pricing`，前端余额预检（image/video 页）与画布成本角标与实际扣费一致（目录 60s 缓存，改价约 1 分钟内生效）。
- 能力下发：`GET /api/platform/catalog`（登录即可访问，不含 Key）→ `stores/platform-catalog-store.ts`（60s TTL）→ 图片/视频设置面板按能力过滤选项，未配置退回内置默认。代理路由提示头 `x-sf-provider` / `x-sf-model` 由 `image.ts` / `video.ts` / `audio.ts` 的 `proxyHintHeaders` 统一发出，让「模型绑定」真正参与取 Key。
- 前端模型选项唯一来源 = 平台目录：`ClientRootInit` 启动拉目录 → `useConfigStore.reconcilePlatformModels` 重建各能力模型列表并归一化选中项（分类优先 `capabilities.kind`，text/audio 退回名称启发式）；`resolveModelChannel` 对原始模型名查目录返回平台合成渠道（`baseUrl` 取目录、无 Key）。后台改模型约 60s 内生效。
- 用户侧「配置」入口已彻底删除：无自行填 Base URL / 模型 / Key 的界面；WebDAV 备份配置代码（`services/app-sync.ts`、`services/webdav-sync.ts`、`/api/webdav-proxy`）无 UI 入口，保持休眠不删。
