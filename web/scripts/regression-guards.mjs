import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function read(path) {
    return readFileSync(join(root, path), "utf8");
}

function assert(condition, message) {
    if (!condition) failures.push(message);
}

function assertIncludes(path, text, message) {
    assert(read(path).includes(text), message || `${path} should include ${text}`);
}

function assertNotMatches(path, pattern, message) {
    assert(!pattern.test(read(path)), message || `${path} should not match ${pattern}`);
}

function assertNotExists(path, message) {
    assert(!existsSync(join(root, path)), message || `${path} should not exist`);
}

function walkFiles(path) {
    const fullPath = join(root, path);
    if (!existsSync(fullPath)) return [];
    return readdirSync(fullPath).flatMap((entry) => {
        const child = `${path}/${entry}`;
        const childFullPath = join(root, child);
        return statSync(childFullPath).isDirectory() ? walkFiles(child) : [child];
    });
}

function assertNoAppDirectGenerationApiImports() {
    const offenders = walkFiles("src/app")
        .filter((path) => /\.(tsx?|jsx?)$/.test(path))
        .filter((path) => /@\/services\/api\/(?:image|video|audio)/.test(read(path)));
    assert(!offenders.length, `app pages must use src/lib/generation/generation-request.ts instead of direct generation API imports: ${offenders.join(", ")}`);
}

assert(existsSync(join(root, "src/app/api/auth/verify-code/route.ts")), "verify-code route must exist; SMS login depends on it.");
assertIncludes("src/components/layout/login-modal.tsx", "/api/auth/verify-code", "login modal must keep calling verify-code.");
assertIncludes("src/app/api/auth/send-code/route.ts", "storeCode", "send-code must persist the code after provider send succeeds.");
assertIncludes("src/app/api/auth/verify-code/route.ts", "verifyCode", "verify-code must validate saved codes.");

assertIncludes("src/services/api/video.ts", "compressSeedanceImageDataUrl", "Seedance local reference images must be compressed before proxying.");
assertIncludes("src/services/api/video.ts", "SEEDANCE_PROXY_IMAGE_MAX_BYTES = 260 * 1024", "Seedance reference images should stay aggressively compressed before proxying.");
assertIncludes("src/services/api/video.ts", "SEEDANCE_PROXY_IMAGE_URL_BUDGET_BYTES = 2_800_000", "Seedance reference image payload guard should reserve room under the online gateway limit.");
assertIncludes("src/services/api/proxy-client.ts", "status === 413", "proxy client must translate 413 into a clear user-facing message.");
assertIncludes("src/lib/generation/generation-request.ts", "requestGeneratedImages", "generation requests must keep a unified app-facing entry.");
assertIncludes("src/lib/generation/generation-request.ts", "runGuardedGeneration", "all unified generation requests must pass through the backend job guard.");
assertIncludes("src/lib/generation/generation-jobs.server.ts", "pg_advisory_xact_lock", "generation quota and concurrency checks must serialize per user.");
assertIncludes("src/lib/generation/generation-jobs.server.ts", "quotaRefunded", "failed generation jobs must refund reserved quota.");
assertIncludes("src/app/api/proxy/route.ts", "requireCurrentUser", "the upstream proxy must reject anonymous callers.");
assertIncludes("prisma/schema.prisma", "model GenerationJob", "generation lifecycle logs must remain persisted.");

// —— 素材代理（2026-09-16 线上事故）：字节系 CDN（v3-dy-o.zjcdn.com / v16-dola.dola.com）按 Referer 防盗链，
// 浏览器带本站 Referer 直连一律 403（下载不到、<video> 也放不出来），服务端不带 Referer 请求同一地址才是 200。
// 铁律：浏览器不得直连第三方素材地址，视频/音频的下载与播放都必须经同源素材代理。
assertIncludes("src/services/asset-proxy.ts", "assetProxyUrl", "跨域素材必须统一走同源素材代理，不得在浏览器直连第三方 CDN。");
assertIncludes("src/services/asset-proxy.ts", 'from "@/lib/asset-tier"', "素材类型要能从调用方传到代理，体积档位不能只靠上游响应头判断。");
assertIncludes("src/services/asset-proxy.ts", "&kind=", "跨域素材地址必须带上类型提示，代理才能选对体积档位。");
assertIncludes("src/services/api/video.ts", "fetchAssetBlob(mediaUrl, options?.signal, \"video\")", "视频结果必须经素材代理下载，不能在浏览器直连上游直链。");
assertNotMatches("src/services/api/video.ts", /axios\.get<Blob>\(mediaUrl/, "禁止在浏览器直连上游视频直链（防盗链 CDN 会 403）。");
assertIncludes("src/services/file-storage.ts", "assetKindFromPrefix", "参考视频/音频的公网 URL 下载必须带类型提示走素材代理。");
assertIncludes("src/services/file-storage.ts", "fetchAssetBlob(input", "参考视频/音频的公网 URL 下载必须走素材代理。");
assertIncludes("src/app/(user)/canvas/components/canvas-node.tsx", 'assetProxyUrl(upgradeInsecureMediaUrl(node.metadata.content), "video")', "视频节点播放上游直链时必须经素材代理，否则防盗链下无法播放。");
assertIncludes("src/app/(user)/canvas/components/canvas-node.tsx", 'assetProxyUrl(upgradeInsecureMediaUrl(node.metadata.content), "audio")', "音频节点播放上游直链时必须经素材代理，否则防盗链下无法播放。");
assertIncludes("src/app/(user)/canvas/hooks/use-canvas-video-generation.ts", 'fetchAssetBlob(videoUrl, undefined, "video")', "尾帧提取取回远端视频必须走素材代理（主代理有渠道白名单，CDN 会被拒）。");
// 2026-09-16 第二起线上事故：dola/zjcdn 的成品 mp4 响应头是 binary/octet-stream，只按 content-type 判档
// 会把 43MB 的视频按图片档（25MB）拒掉 → 413。档位与 MIME 判定收在 lib/asset-tier.ts（配单测 test:asset）。
assertIncludes("src/lib/asset-tier.ts", "MEDIA_ASSET_LIMIT_BYTES", "音视频素材需要独立的体积上限（图片 25MB，音视频与主代理对齐）。");
assertIncludes("src/lib/asset-tier.ts", "MEDIA_URL_HINT", "上游 MIME 不可信时要用 URL 线索兜底判断是不是音视频。");
assertIncludes("src/lib/asset-tier.ts", "mediaContentType", "上游返回 binary/octet-stream 时要补回准确媒体类型，否则 blob 落库成 octet-stream，时长/尺寸元数据丢失。");
assertNotMatches("src/lib/asset-tier.ts", /return \/\^\(video\|audio\)\/i\.test\(contentType\) \? MEDIA/, "体积档位不得只看上游 content-type（octet-stream 的视频会被误判成图片档）。");
assertIncludes("src/app/api/proxy/asset/route.ts", 'searchParams.get("kind")', "素材代理必须接受调用方的类型提示。");
assertIncludes("src/app/api/proxy/asset/route.ts", "assetLimitBytes(", "素材代理的体积上限必须走统一判定，不能就地写死。");
assertIncludes("src/app/api/proxy/asset/route.ts", 'req.headers.get("range")', "素材代理要转发 Range，<video> 拖动进度不能每次拉整段。");
assertIncludes("src/app/api/proxy/asset/route.ts", "Content-Range", "分段响应必须回传 Content-Range，否则浏览器会把它当成完整文件。");
assertIncludes("src/app/api/proxy/asset/route.ts", "pipeThrough", "超过缓冲阈值的素材必须流式透传，整段 Buffer 会把进程顶到 PM2 重启线。");

assertNoAppDirectGenerationApiImports();

assertIncludes("src/app/(user)/canvas/utils/canvas-agent-ops.ts", 'type: "run_pipeline"', "the canvas agent must keep an executable pipeline operation.");
assertIncludes("src/app/(user)/canvas/engine/tools/schemas.ts", "canvas_run_pipeline", "the creation agent must expose pipeline execution.");
assertIncludes("src/app/(user)/canvas/engine/tools/schemas.ts", "canvas_continue_video", "the creation agent must expose tail-frame continuation.");
assertIncludes("src/app/(user)/canvas/utils/agent-prompt.ts", "MANGA_PRODUCTION_SKILL", "the creation agent must keep the manga production skill constraints.");

// —— 画布 Agent 执行层（一次到位重构）：工具注册表唯一来源 + 多阶段数据链不得退化 ——
assertIncludes("src/app/(user)/canvas/engine/tools/registry.ts", "TOOL_POLICIES", "工具风险档/确认策略必须在唯一注册表登记，不得再散落在各处。");
assertIncludes("src/app/(user)/canvas/engine/types.ts", "createdNodeIds", "工具回执契约必须携带 createdNodeIds（下游引用上游产出的唯一依据）。");
assertIncludes("src/app/(user)/canvas/engine/engine.ts", "createdNodeIds", "引擎必须按前后快照差集回填 createdNodeIds。");
assertIncludes("src/app/(user)/canvas/utils/canvas-agent-executor.ts", "upstreamNodeIds", "子 Agent 必须接收上游阶段产出的节点 ID，否则多阶段生产断链。");
assertIncludes("src/app/(user)/canvas/utils/canvas-agent-executor.ts", "derivedContext", "子 Agent 必须接收上游派生上下文。");
assertIncludes("src/app/(user)/canvas/utils/canvas-agent-executor.ts", "context.getSnapshot()", "执行器必须读取引擎快照；ops 由引擎提交，执行器不得重复提交。");
assertNotMatches("src/app/(user)/canvas/utils/canvas-agent-executor.ts", /onApplyOps\s*:\s*\(ops\)/, "执行器不得再持有自己的画布提交路径（会造成双重提交/重复建节点）。");
assertIncludes("src/app/(user)/canvas/hooks/use-online-agent-runner.ts", "toolNeedsConfirmation", "工具确认策略必须查注册表。");
assertNotMatches("src/app/(user)/canvas/hooks/use-online-agent-runner.ts", /ALWAYS_CONFIRM_TOOLS|AUTO_RUN_CAPABLE_TOOLS|toolCallLabel\(/, "runner 不得再维护重复的工具确认名单与英文标签表。");
assertIncludes("src/app/(user)/canvas/components/canvas-orchestrator-panel.tsx", '{ value: "log", label: "日志"', "编排面板日志页签的值必须与渲染分支一致（曾因 history/log 不一致导致点了没反应）。");
assertNotExists("src/app/(user)/canvas/utils/online-agent-tools.ts", "工具定义已迁到 engine/tools/schemas.ts，旧的 online-agent-tools.ts 不得回归。");
assertNotExists("src/app/(user)/canvas/components/canvas-creative-agent-panel.tsx", "死面板已删除：canvas-creative-agent-panel 不得回归。");
assertNotExists("src/app/(user)/agent-lab/page.tsx", "agent-lab 演示页已删除，不得回归。");

// —— 工程记忆（记忆层）：跨会话事实必须落盘并注入，不得只活在对话里 ——
assertIncludes("src/app/(user)/canvas/engine/memory/project-memory.ts", "mergeMemory", "工程记忆必须支持增量合并（按 kind+name 去重，不覆盖历史事实）。");
assertIncludes("src/app/(user)/canvas/engine/memory/project-memory.ts", "normalizeMemory", "工程记忆必须做形状规整，脏数据不得污染提示词。");
assertIncludes("src/app/(user)/canvas/stores/use-canvas-store.ts", "memory", "工程记忆必须挂在 CanvasProject 上，随工程落盘并同步到服务端。");
assertIncludes("src/app/(user)/canvas/engine/tools/schemas.ts", "canvas_memory_write", "Agent 必须能把长期事实写入工程记忆。");
assertIncludes("src/app/(user)/canvas/engine/tools/schemas.ts", "canvas_memory_read", "Agent 必须能读取工程记忆全文。");
assertIncludes("src/app/(user)/canvas/engine/engine.ts", "getMemory", "引擎必须把记忆读写接进工具执行路径（不得回落到 ops 归约，否则无 ops 会被判为失败）。");
assertIncludes("src/app/(user)/canvas/utils/online-agent-memory.ts", "describeMemoryForPrompt", "在线助手每轮必须注入工程记忆，否则记忆等于没写。");
assertIncludes("src/app/(user)/canvas/utils/canvas-agent-executor.ts", "injectMemory", "子 Agent 必须注入工程记忆，否则跨阶段角色/风格一致性无从保证。");

// —— 生产调度层：状态机落盘、生成等待、单写者锁 ——
assertIncludes("src/app/(user)/canvas/engine/scheduler/run-state.ts", "normalizeRunState", "运行状态必须能做脏数据规整，否则刷新页面后无法安全续跑。");
assertIncludes("src/app/(user)/canvas/engine/scheduler/run-state.ts", "hasDependencyCycle", "计划成环/悬空依赖必须在创建期判死，否则运行期死锁。");
assertIncludes("src/app/(user)/canvas/engine/scheduler/run-state.ts", "blockableStages", "上游失败必须显式把下游判为跳过，否则 Run 永远不收敛。");
assertIncludes("src/app/(user)/canvas/engine/scheduler/run-state.ts", "resetRetryableStages", "失败阶段重试必须能重开被连带跳过的下游。");
assertIncludes("src/app/(user)/canvas/stores/use-canvas-store.ts", "activeRun", "生产运行必须挂在 CanvasProject 上随工程落盘（断点续跑的前提）。");
assertIncludes("src/app/(user)/canvas/utils/canvas-agent-executor.ts", "executeRun", "多阶段生产必须由 RunState 状态机驱动，不得再用一次性遍历。");
assertIncludes("src/app/(user)/canvas/utils/canvas-agent-executor.ts", "waitForGeneration", "派发过生成的阶段必须等生成落地再放行下游（否则下游拿半成品生产）。");
assertIncludes("src/app/(user)/canvas/engine/scheduler/run-state.ts", "planRunStep", "调度决策（跳过/中断/暂停/预算/并发）必须收在一个纯函数里，执行器只负责照着做。");
assertIncludes("src/app/(user)/canvas/utils/canvas-agent-executor.ts", "planRunStep", "执行器必须消费状态机的调度决策，不得自己另写一套跳过/暂停判断。");
assertNotExists("src/app/(user)/canvas/utils/canvas-agent-orchestrator-types.ts", "计划/进度已合并进 engine/scheduler/run-state.ts，旧的 orchestrator-types 不得回归（会重新出现计划与进度两份真相）。");
assertIncludes("src/app/(user)/canvas/engine/scheduler/run-lock.ts", "tryClaimCanvasRun", "画布必须同时只被一个运行写入（在线对话与全自动生产共用一把锁）。");
assertNotMatches("src/app/(user)/canvas/engine/scheduler/run-lock.ts", /depth/, "画布锁不得做成可重入：同 id 重复启动必须被拒（否则会并发写同一块画布）。");
assertIncludes("src/app/(user)/canvas/hooks/use-online-agent-runner.ts", "tryClaimCanvasRun", "在线对话运行必须声明画布写入权，否则会与生产流程交叉改写同一块画布。");
assertIncludes("src/app/(user)/canvas/components/canvas-local-agent-panel.tsx", "tryClaimCanvasRun", "本地 Agent 是另一位写入者，写画布前必须取写入权。");
assertIncludes("src/app/(user)/canvas/utils/canvas-agent-executor.ts", "stageAbort", "阶段超时/中断必须真的打断在飞的模型请求，不能只是不再等待（否则请求还会继续写画布）。");
assertIncludes("src/app/(user)/canvas/utils/canvas-agent-executor.ts", "生成超时未完成", "生成没落地不得当作阶段成功放行下游（下游会拿半成品生产）。");
assertIncludes("src/app/(user)/canvas/components/canvas-orchestrator-panel.tsx", "abortRef.current?.abort()", "面板卸载必须中断在飞的运行，否则循环会在用户看不见的地方继续写画布。");
assertIncludes("src/app/(user)/canvas/components/canvas-run-timeline.tsx", "runProgress", "生产运行必须把阶段进度摊开给用户看（跑到哪、谁失败、能否继续）。");
assertIncludes("src/app/(user)/canvas/utils/online-agent-tool-ops.ts", "workflowStageReferenceKeys", "workflow cards must keep stage dependency references.");
assertIncludes("src/app/(user)/canvas/utils/online-agent-tool-ops.ts", "withNodeReferenceTokens", "workflow prompts must include @node references for upstream assets.");
assertIncludes("src/app/(user)/canvas/utils/online-agent-memory.ts", "safeMessageText", "the online agent must stringify message content safely.");
assertIncludes("src/app/(user)/canvas/utils/online-agent-memory.ts", "isPollutedAgentMessage", "the online agent must filter polluted object-placeholder history.");
assertNotMatches("src/app/(user)/canvas/components/canvas-assistant-panel.tsx", /toolChoice:\s*"required"/, "the online agent must not force tool calls for normal chat.");
assertIncludes("src/app/(user)/canvas/components/canvas-agent-chat-ui.tsx", "AgentMarkdownText", "assistant messages should render structured markdown instead of raw table text.");
assertIncludes("src/app/(user)/canvas/components/canvas-agent-chat-ui.tsx", "AgentMarkdownTable", "assistant markdown tables should render as scrollable tables.");
assertIncludes("src/app/(user)/canvas/components/canvas-assistant-panel.tsx", "chatEndRef", "online agent chat should keep a scroll anchor for new messages.");
assertIncludes("src/app/(user)/canvas/components/canvas-assistant-panel.tsx", "scrollIntoView", "online agent chat should auto-scroll to new messages.");
assertIncludes("src/app/(user)/canvas/hooks/use-canvas-pipeline-runner.ts", "runCanvasPipeline", "pipeline execution must stay connected to the unified node generator.");
assertIncludes("src/app/(user)/canvas/[id]/canvas-client-page.tsx", "runPipeline", "the canvas page must keep pipeline execution wired through the pipeline runner hook.");
assertIncludes("src/app/(user)/canvas/[id]/canvas-client-page.tsx", "assetAutoArchived", "generated reusable assets must automatically return to the asset library.");

assertIncludes("src/app/(user)/pricing/page.tsx", "CreditPackagesSection", "pricing 页必须保留积分包充值区（套餐已下线，纯积分充值）。");
assertNotMatches("src/app/(user)/pricing/page.tsx", /applyPlan|\/api\/billing\/plans|setPlans|planIcons/, "pricing 页不得残留套餐卡片/下单逻辑（套餐已下线）。");

assertNotMatches("src/app/(user)/image/page.tsx", /请升级套餐继续使用/, "image quota copy should route users to manual opening, not nonexistent online upgrade.");
assertNotMatches("src/app/(user)/video/page.tsx", /请升级套餐继续使用/, "video quota copy should route users to manual opening, not nonexistent online upgrade.");
assertNotMatches("src/app/(user)/canvas/[id]/canvas-client-page.tsx", /请升级套餐继续使用|申请内测或升级套餐/, "canvas quota copy should avoid misleading upgrade/beta wording.");
assertNotMatches("src/components/layout/app-top-nav.tsx", /parseApiDraft|enrichExperienceApiDraft|体验官配置渠道|ExperienceOfficerModal/, "BYOK 下线：体验官「自行填 Key」助手已移除，不应残留自行配置 API Key 的入口。");

// —— 套餐系统下线（纯积分制）：不得残留任何订阅/权益入口 ——
assertNotExists("src/app/api/billing/plans/route.ts", "套餐已下线：/api/billing/plans 路由必须删除。");
assertNotExists("src/app/api/billing/subscription/route.ts", "套餐已下线：/api/billing/subscription 路由必须删除。");
assertNotExists("src/app/api/generation/quota/route.ts", "套餐已下线：/api/generation/quota 路由必须删除。");
assertNotExists("src/lib/client-entitlements.ts", "套餐已下线：client-entitlements 必须删除。");
assertNotMatches("prisma/schema.prisma", /model (Plan|Entitlement|Subscription)\b/, "套餐已下线：Prisma schema 不得保留 Plan/Entitlement/Subscription 模型。");
assertNotMatches("src/app/(user)/admin/page.tsx", /planDrafts|套餐权益|手动开通|activeSubscriptions|当前套餐/, "套餐已下线：admin 后台不得保留套餐管理入口。");
assertNotMatches("src/lib/billing.ts", /DEFAULT_PLANS|ensureDefaultPlans|activateSubscription|getPlanAmount|getPeriodEnd|sortPlanEntitlements/, "套餐已下线：billing 工具不得保留套餐相关函数。");
assertNotMatches("src/lib/server-entitlements.ts", /getActiveSubscription|getServerEntitlements|parseEntitlementLimit/, "套餐已下线：server-entitlements 不得保留订阅/权益读取。");
assertNotMatches("src/lib/credit-migration.ts", /sub_compensation/, "套餐已下线：存量订阅折算补偿逻辑必须移除。");
assertNotMatches("src/app/api/billing/orders/route.ts", /planId|getPlanAmount/, "套餐已下线：订单接口只保留积分包下单。");
assertNotMatches("src/middleware.ts", /\/api\/billing\/plans/, "套餐已下线：middleware 不得放行 /api/billing/plans。");

// —— 平台模型驱动前端 + 彻底删除配置入口 ——
assertNotExists("src/components/layout/app-config-modal.tsx", "配置入口已删除：app-config-modal 组件必须删除。");
assertNotMatches("src/stores/use-config-store.ts", /openConfigDialog|setConfigDialogOpen|isConfigOpen|shouldPromptContinue|clearPromptContinue/, "配置弹窗已删除：config store 不得保留 openConfigDialog 家族成员。");
assertNotMatches("src/app/(user)/image/page.tsx", /openConfigDialog|onMissingConfig|请先完成配置/, "image 页不得保留配置弹窗调用。");
assertNotMatches("src/app/(user)/video/page.tsx", /openConfigDialog|onMissingConfig|请先完成配置/, "video 页不得保留配置弹窗调用。");
const canvasConfigEntryFiles = [
    "src/app/(user)/canvas/[id]/canvas-client-page.tsx",
    "src/app/(user)/canvas/hooks/use-canvas-image-edit-dialogs.ts",
    "src/app/(user)/canvas/hooks/use-canvas-image-tools.ts",
    "src/app/(user)/canvas/hooks/use-canvas-retry-generation.ts",
    "src/app/(user)/canvas/components/canvas-config-node-panel.tsx",
    "src/app/(user)/canvas/components/canvas-node-prompt-panel.tsx",
    "src/app/(user)/canvas/components/canvas-image-settings-popover.tsx",
    "src/app/(user)/canvas/components/canvas-assistant-panel.tsx",
];
for (const file of canvasConfigEntryFiles) {
    assertNotMatches(file, /openConfigDialog|onMissingConfig/, `${file} 不得保留配置弹窗调用。`);
}
assertNotMatches("src/components/layout/user-status-actions.tsx", /Settings2|showConfig/, "导航栏不得保留自行配置齿轮入口。");
assertNotMatches("src/components/layout/app-top-nav.tsx", /AppConfigModal/, "顶部导航不得渲染配置弹窗。");
// 前端模型选项唯一来源 = 平台模型目录（管理员后台 ProviderCredential）
assertIncludes("src/stores/platform-catalog-store.ts", "models", "平台目录 store 必须保存完整模型列表（models）。");
assertIncludes("src/stores/use-config-store.ts", "reconcilePlatformModels", "config store 必须提供目录重建动作 reconcilePlatformModels。");
assertIncludes("src/components/layout/client-root-init.tsx", "reconcilePlatformModels", "应用启动必须把平台目录同步进 config store。");
assertIncludes("src/components/model-picker.tsx", "暂无可用模型，请联系管理员在后台配置平台模型", "模型空态文案应引导联系管理员配置平台模型。");
assertNotMatches("src/stores/use-config-store.ts", /grok-imagine-video/, "config store 不得保留占位模型默认值。");

// —— 后台可配置积分定价（图片每张 / 视频每秒）——
assertIncludes("prisma/schema.prisma", "pricing", "ProviderCredential 必须支持逐模型积分定价（pricing Json）。");
assertIncludes("src/lib/credit-pricing.ts", "videoCreditsStandard", "定价表必须支持视频分档计价（标准/高清，按条计费，与上游结算口径一致）。");
assertIncludes("src/lib/credit-pricing.ts", "isHighQuality", "视频高清档必须只按 vquality 判定（读 metadata.quality 会让 768P 误按高清扣费）。");
assertIncludes("src/lib/credential-store.server.ts", "resolveConfiguredPricing", "服务端必须能按模型解析后台逐模型定价。");
assertIncludes("src/lib/generation/generation-jobs.server.ts", "resolveConfiguredPricing", "扣费必须接入后台逐模型定价（未配置退回内置草案）。");
assertIncludes("src/app/api/admin/credentials/route.ts", "sanitizePricing", "后台定价落库前必须清洗。");
assertIncludes("src/app/api/platform/catalog/route.ts", "pricing", "平台目录必须下发逐模型定价（供前端预检/成本展示）。");
assertIncludes("src/stores/platform-catalog-store.ts", "getPlatformPricing", "客户端必须能按模型取后台定价。");
assertIncludes("src/app/(user)/admin/credential-pricing-editor.tsx", "videoCreditsStandard", "后台必须提供逐模型定价编辑器（含视频分档）。");
assertIncludes("src/app/(user)/admin/credential-form-fields.tsx", "pickPricing", "后台表单必须提供 pickPricing。");

// —— Aigccc / Seedance 2.0 网关接入 ——
assertIncludes("src/stores/use-config-store.ts", '"aigccc"', "ApiCallFormat 必须支持 aigccc。");
assertIncludes("src/stores/use-config-store.ts", 'value.includes("aigccc666.com")', "config store 必须按 aigccc666.com 识别网关 Base URL。");
assertIncludes("src/app/api/proxy/route.ts", 'isHostOrSubdomain(target.hostname, "aigccc666.com")', "proxy 必须用域名边界匹配为 aigccc 注入 ApiKey（禁止 includes 子串，防 Key 外泄 H-1）。");
assertIncludes("src/app/api/proxy/form-data/route.ts", 'isHostOrSubdomain(target.hostname, "aigccc666.com")', "form-data proxy 必须用域名边界匹配为 aigccc 注入 ApiKey（禁止 includes 子串）。");
assertNotMatches("src/app/api/proxy/route.ts", /includes\("aigccc666\.com"\)/, "proxy 不得再用 includes 子串匹配 aigccc 域名（H-1 平台 Key 外泄）。");
assertNotMatches("src/app/api/proxy/form-data/route.ts", /includes\("aigccc666\.com"\)/, "form-data proxy 不得再用 includes 子串匹配 aigccc 域名（H-1）。");

// —— 安全加固（2026-08-18 审计）——
assertIncludes("src/lib/url-safety.ts", "embeddedIpv4", "SSRF 校验必须识别内嵌 IPv4（mapped/NAT64/6to4/IPv4-compatible，H-2）。");
assertIncludes("src/lib/url-safety.ts", "resolvePinnedTarget", "SSRF 必须 DNS 固定解析（防重绑定，H-3）。");
assertIncludes("src/lib/url-safety.ts", "servername", "DNS 固定解析后 TLS SNI 必须仍用原始域名（证书校验）。");
// —— 出站代理（2026-09-18：服务器无法直连 api.apimart.ai，改用运维侧隧道代理）——
assertIncludes("src/lib/url-safety.ts", "OUTBOUND_PROXY_HOSTS", "出站代理必须由环境变量白名单控制，不得改成对所有域名生效。");
assertIncludes("src/lib/url-safety.ts", "isHostOrSubdomain(host, base)", "出站代理白名单必须域名边界匹配（禁止子串，否则 evilapimart.ai 会被顺带放行）。");
assertIncludes("src/lib/url-safety.ts", "if (!rawUrl || !rawHosts) return null;", "未配置出站代理时必须退回纯直连路径（行为与旧版一致）。");
assertIncludes("src/lib/url-safety.ts", "tlsConnect({ socket, servername: target.hostname })", "经代理的 https 请求必须在隧道内用真实域名做 SNI（证书校验对象不能是代理）。");
assertNotMatches("src/lib/url-safety.ts", /rawHosts\s*\.\s*includes\(/, "出站代理白名单不得用 includes 子串匹配。");
// —— 异步任务制图片通道（2026-09-18：apimart 用 code:200 且先收单再取件）——
assertIncludes("src/services/api/image.ts", "isSuccessCode", "图片上游成功码必须走统一判定：apimart 用 code:200，只认 code===0 会把成功判成失败。");
assertNotMatches("src/services/api/image.ts", /payload\.code !== 0/, "不得退回「只认 code===0」的成功码判定（会把 apimart 的成功应答判成失败）。");
assertIncludes("src/services/api/image.ts", "resolveImageSubmission", "任务制通道必须识别 task_id 并轮询取件，不能只解析一次性应答。");
assertIncludes("src/services/api/image-task.ts", "parseImageTaskState", "任务取件解析必须收在 image-task 模块里（配单测）。");
// —— 画幅写法兜底（2026-09-18：apimart 上的 gemini 图像模型只认比例串，不收像素尺寸）——
// 实测报错：unsupported image aspect ratio "1824:1024", … supported ratios: 16:9, 1:1, …
// 这类提交被上游直接拒收（未建任务、未计费），所以可以照它列出的比例重投一次。
assertIncludes("src/services/api/image.ts", "readAspectRetryRatio", "上游以画幅写法拒绝时必须能识别并按它列出的比例重投，否则画布 16:9 预设会秒失败。");
assertIncludes("src/services/api/image.ts", "isAspectRejection", "只有上游明确说「画幅不支持」才允许重投：内容审核等 400 必须原样抛出，不得盲目重试。");
assertIncludes("src/services/api/image-ratio.ts", "pickSupportedRatio", "按上游列出的比例挑最接近值必须收在 image-ratio 模块里（配单测）。");
assertNotMatches("src/services/api/image-ratio.ts", /proxyFetch|fetch\(|axios/, "image-ratio 必须是纯逻辑（不触网），才能在浏览器与 Node 下直接单测。");
// —— 素材下载重试（2026-09-18：getapib.org 三个 IP 里有一个连不通，DNS 轮转 → 同一张图时好时坏）——
assertIncludes("src/app/api/proxy/asset/route.ts", "ASSET_ATTEMPTS", "素材下载失败必须换解析结果重试，否则「上游已出图计费、前端却拿不回来」会反复出现。");
assertIncludes("src/lib/url-safety.ts", "canFallbackToOtherAddresses", "GET 类请求必须在多个已校验地址间回退，否则个别不可达 IP 会让同一张图时好时坏。");
assertIncludes("src/lib/url-safety.ts", "init?.body == null", "带请求体的请求不得换址重试（重复投递可能重复扣费）。");
assertIncludes("src/app/api/proxy/asset/route.ts", "fetchSafely(url", "素材下载重试的每次尝试都必须重新过 fetchSafely（安全校验不得被重试绕过）。");
assertIncludes("src/lib/credential-store.server.ts", "isHostOrSubdomain(targetHost, credHost)", "凭证 host 匹配必须边界匹配（禁止反向后缀，H-1）。");
assertNotMatches("src/lib/credential-store.server.ts", /endsWith\(`\.\$\{targetHost\}`\)/, "凭证匹配不得允许反向后缀（H-1）。");
assertIncludes("src/app/api/payments/callback/route.ts", "createHmac", "支付回调必须做 HMAC 签名验证（H-4）。");
assertIncludes("src/app/api/payments/callback/route.ts", "prisma.$transaction", "支付回调必须事务内原子入账（H-5）。");
assertIncludes("src/app/api/payments/callback/route.ts", "order.amount", "支付回调必须核对订单金额（H-4）。");
assertIncludes("src/lib/generation/generation-jobs.server.ts", "normalizeGenerationMetadata", "扣费必须基于服务端规范化的 metadata（H-6）。");
assertIncludes("src/lib/generation/generation-config.ts", "normalizeGenerationMetadata", "服务端必须提供 metadata 规范化函数（H-6）。");

// —— M4/M5 限流 ——
assertIncludes("src/app/api/auth/send-code/route.ts", "auth:sendcode:target:daily", "验证码必须按目标每日上限（M5）。");
assertIncludes("src/app/api/auth/send-code/route.ts", "auth:sendcode:ip:daily", "验证码必须按 IP 每日上限（M5）。");
assertIncludes("src/app/api/auth/login/route.ts", "auth:login:account:", "登录必须按账号限流（M4）。");
assertIncludes("src/services/api/video.ts", "createAigcccVideoTask", "视频服务必须提供 aigccc 任务创建分支。");
assertIncludes("src/services/api/video.ts", "pollAigcccVideoTask", "视频服务必须提供 aigccc 任务轮询分支。");
assertIncludes("src/services/api/video.ts", "/api/external/v1/video/task/create", "aigccc 创建任务必须走网关 /api/external/v1 路径。");
assertIncludes("src/services/api/video.ts", "Math.min(720", "aigccc 分辨率必须钳到 720p（网关实际最高只输出 720p）。");
assertIncludes("src/services/api/video.ts", 'apiFormat === "aigccc"', "视频服务必须按 apiFormat=aigccc 分发（先于 seedance 启发式）。");
assertIncludes("src/app/(user)/admin/credential-form-fields.tsx", 'value: "aigccc"', "后台凭证表单必须提供 Aigccc 预设。");
assertIncludes("src/app/(user)/admin/credential-capability-editor.tsx", "supportsCapability", "能力编辑器必须阻止未知模型名被默认标成图片能力（文本模型误开开关会跑到图片列表，画布 Agent 选不到）。");

// —— 上游流内错误必须原样上报（2026-09-10 线上事故）——
// 中转站用「HTTP 200 + 流内 error 事件」报错（过载/限流/渠道不可用）。
// 只解析 choices 会把错误静默丢掉，画布 Agent 最终只回一句「模型没有返回内容」，
// 用户看不到真实原因（实测 ggwk 中转 gpt-5.6-terra 过载就是这个报文）。
assertIncludes("src/services/api/image.ts", "responseErrorMessage(chunk)", "chat-completions 流必须识别流内 error 事件，否则退化成假空回复。");
assertIncludes("src/services/api/image.ts", "if (streamError) {", "识别到流内错误后必须抛出，不能继续当作正常空回复。");
assertIncludes("src/services/api/image.ts", "withUpstreamHint", "上游过载/限流错误必须给用户中文可读提示。");

assertIncludes("src/services/api/image.ts", "if (tools.length) return await requestChatCompletionResponse(", "带 tools 的轮次必须走非流式：线上（ggwk 中转）流式 + tools 实测 48~122s 且经常在约 78s 网关超时后回 overloaded，非流式稳定 3.3s。");
assertIncludes("src/services/api/image.ts", "toChatCompletionBody", "流式与非流式必须共用同一份 Chat Completions 请求体转换。");

// —— 多模态用户消息不得被 String() 成 "[object Object]"（2026-09-10 线上事故）——
// 画布 Agent 每条用户消息都是内容块数组（正文 + 选中节点参考图），
// 转换时直接 String() 会让模型收到 "[object Object]"，只能回「我没收到你的要求」，参考图也从未真正上传。
assertIncludes("src/services/api/image.ts", "function toChatCompletionContent(", "Chat Completions 请求体必须按内容块转换多模态消息，不能 String()。");
assertNotMatches("src/services/api/image.ts", /content: String\(msg\.content \|\| ""\)/, "不得再把消息内容直接 String()（数组会变成 [object Object]）。");
assertIncludes("src/services/api/image.ts", "part.type === \"text\" ? part.text : \"\"", "纯文本内容块必须折叠回字符串，保持最小请求体。");

// —— 在线对话的生成闭环（2026-09-10 用户反馈：只出两张卡，生图还得用户自己点）——
// 提示词派发 + 等待落地 + 把真实产出交回模型，三件事缺一件，链路就断在「已触发生成」上。
assertIncludes("src/app/(user)/canvas/hooks/use-online-agent-runner.ts", "waitForDispatchedGenerations", "在线对话派发生成后必须等生成落地，否则模型会把「正在生成」当成「已完成」而停下。");
assertNotMatches("src/app/(user)/canvas/hooks/use-online-agent-runner.ts", /continueAfterResults\(sessionId, assistantId, messages, result\.toolCalls, toolResults, step\)/, "工具回执必须先经过生成等待再交给模型，不能直接续跑。");
assertIncludes("src/app/(user)/canvas/hooks/use-online-agent-runner.ts", "waitForGeneration", "等待实现必须复用调度层的 waitForGeneration，不要在对话层另写一套轮询。");
assertIncludes("src/app/(user)/canvas/hooks/use-online-agent-runner.ts", "本次新产出节点", "生成落地后必须把新产出节点 id 交给模型，否则它无法引用产出继续下一步（图生视频等）。");
assertIncludes("src/app/(user)/canvas/engine/scheduler/generation-wait.ts", "dispatchedGenerationNodeIds", "「哪些工具回执派发了生成」必须收在一个纯函数里，避免对话层与生产层判定漂移。");
assertIncludes("src/app/(user)/canvas/engine/scheduler/generation-wait.ts", "没有真正启动", "生成没真正启动（节点一直空闲）必须单独识别，否则会把界面和下游卡满 8 分钟超时。");
// 2026-09-10 线上实测事故：等待集合里追加了「派发后新建的媒体节点」，但状态查询只映射了派发时的节点 id，
// 新节点状态读成 undefined 被当成未完成 —— 结果永远结算不了，只能干等 8 分钟超时（画布上图片其实早就绪）。
assertIncludes("src/app/(user)/canvas/engine/scheduler/generation-wait.ts", "options.getStatuses(watched)", "状态查询必须按本轮全部等待对象取值，否则追加进来的节点永远读不到状态。");
assertNotMatches("src/app/(user)/canvas/engine/scheduler/generation-wait.ts", /options\.getStatuses\(\)/, "禁止用空参调用状态读取器：等待集合与状态集合必须是同一个。");
assertIncludes("src/app/(user)/canvas/hooks/use-online-agent-runner.ts", "getStatuses: (watchedIds)", "在线对话的状态读取必须消费传入的等待对象清单。");
assertIncludes("src/app/(user)/canvas/utils/canvas-agent-executor.ts", "dispatchedGenerationNodeIds", "生产执行器必须复用同一份派发判定，不得保留私有实现。");
assertIncludes("src/app/(user)/canvas/utils/agent-prompt.ts", "autoRun=true", "用户要成品时必须把生成跑起来（生成类工具 / autoRun），不能停在两张待点确认的卡片上。");
assertNotMatches("src/app/(user)/canvas/utils/agent-prompt.ts", /除非用户明确要求立即生成，否则只创建可确认流程卡/, "旧的「一律只建卡」规范会让生成永远停在用户手点，不得回归。");
assertIncludes("src/app/(user)/canvas/utils/agent-prompt.ts", "只有回执是「生成已完成」时", "回执说生成还没落地时不得谎报完成，提示词必须禁止这种说法。");

// —— 素材本地副本（2026-09-18 事故：上游已出图并计费，前端经 /api/proxy/asset 取图 502）——
// 取过一次就留本地副本，之后不再赌那条会抖的 CDN，也不受上游 24 小时清理影响。
assertIncludes("src/lib/asset-cache.server.ts", "os.homedir()", "副本目录必须由主目录推导（与 media-store 同规则），不得用 cwd。");
assertIncludes("src/lib/asset-cache.server.ts", "export function resolveAssetCacheDir(", "目录解析必须留成纯函数，便于单测锁定「不在构建产物内」。");
assertIncludes("src/app/api/proxy/asset/route.ts", "readCachedAsset(rawUrl)", "素材路由必须先查本地副本。");
assertIncludes("src/app/api/proxy/asset/route.ts", "writeCachedAsset(rawUrl, { body: buffer, contentType })", "完整读取的素材必须落本地副本。");
assertIncludes("src/app/api/proxy/asset/route.ts", "if (!range && response.status === 200)", "分部响应（206）与流式透传不得写入副本，否则会把半张图当成完整副本回给用户。");
assertIncludes("src/app/api/proxy/asset/route.ts", '\"X-Asset-Cache\": \"hit\"', "命中本地副本必须留标记，线上排查要能一眼看出有没有回源。");
{
    const assetRoute = read("src/app/api/proxy/asset/route.ts");
    const cachedAt = assetRoute.indexOf("await readCachedAsset(");
    const fetchAt = assetRoute.indexOf("await fetchAsset(");
    assert(cachedAt > -1 && fetchAt > -1 && cachedAt < fetchAt, "素材路由必须先查副本再回源，顺序反了等于没缓存。");
}

// —— 参考图生图（表单代理）的上游状态必须留痕 ——
// 2026-09-18：apimart 回「/v1/images/edits only supports Grok image models」导致三次秒失败，
// 但该路由只记了目标 host、不记状态码，日志里查不到，最后是靠数据库里的报错文本才定位到。
assertIncludes("src/app/api/proxy/form-data/route.ts", "[proxy/form-data] 上游 ${response.status}", "表单代理必须记录上游 4xx/5xx，否则这条路线的失败是黑盒。");

// —— 参考图生图：编辑端点被拒时改走生成端点 + image_urls（2026-09-18 apimart 事故）——
// apimart 的 /v1/images/edits 只接受 Grok 图像模型，qwen / seedream / gemini 一律秒拒；
// 文档写明图生图走 /v1/images/generations + `image_urls`（URL 与 Data URI 可混填）。
assertIncludes("src/services/api/image.ts", "isEditsEndpointUnsupported(message)", "参考图生图必须识别「编辑端点不吃这个模型」的答复并改道。");
assertIncludes("src/services/api/image.ts", "if (!mask && isEditsEndpointUnsupported(message))", "带蒙版的编辑不能改道（生成端点不接蒙版），必须在改道前挡掉。");
assertIncludes("src/services/api/image.ts", "buildReferenceGenerationBody({", "改道请求体必须走统一构造函数，便于单测钉住形状。");
assertIncludes("src/services/api/image-reference.ts", "image_urls", "改道必须带上 image_urls，否则等于退回文生图、参考图白传。");
assertNotMatches("src/services/api/image-reference.ts", /fetch\(|axios|proxyFetch/, "改道模块必须是纯逻辑，不碰网络，便于单测。");
assertIncludes("src/services/api/image-reference.ts", "mime.toLowerCase()", "seedream 要求 Data URI 的格式小写，必须统一压成小写。");

// —— 超时任务兜底清扫（2026-09-18 事故：7 条 running 挂着 24 积分没人退，最久 24 天）——
// 积分先扣后结，而「结算」原本只由浏览器和「同一用户下次生成」的懒清扫负责：
// 浏览器中途消失（关标签页/刷新/断网）就没人关账，用户不回来就永远挂着。
// 铁律：清扫只能走幂等退款、只能条件认领 running、不得抢轮询器的任务。
assertIncludes("src/lib/generation/generation-sweep.server.ts", "refundCredits(tx,", "清扫必须走 credit-ledger 的幂等退款，不得自己改余额（否则会重复退）。");
assertIncludes("src/lib/generation/generation-sweep.server.ts", "where: { id: job.id, status: \"running\" }", "清扫认领必须带 status=running 条件，防并发/重复调用把同一条任务结算两次。");
assertIncludes("src/lib/generation/generation-sweep.server.ts", "isSweepExcluded(job)", "清扫必须跳过有轮询器认领的任务（replicate + 取件地址），那种任务归轮询器自己的超时逻辑管。");
assertIncludes("src/lib/generation/generation-stale.ts", "isSweepExcluded", "跳过规则必须收在纯模块里（配单测），且图片通道的任务不得被一起跳过。");
assertNotMatches("src/lib/generation/generation-stale.ts", /fetch\(|axios|prisma|import /, "超时判定必须是纯逻辑（不触网、不连库），才能在 Node 下直接单测。");
assertIncludes("src/lib/generation/generation-jobs.server.ts", "import { STALE_JOB_MS } from \"./generation-stale\"", "懒清扫与全局清扫必须共用同一个超时阈值，不得各留一份数字。");
assertIncludes("src/app/api/internal/generation/sweep/route.ts", "GENERATION_WORKER_SECRET", "内部清扫接口必须校验 worker 密钥（与 internal/generation/poll 同一把）。");
assertIncludes("src/app/api/internal/generation/sweep/route.ts", 'req.headers.get("x-generation-worker-secret")', "worker 密钥必须从请求头取，不得放进 URL 查询串（会落到访问日志里）。");
assertNotMatches("src/app/api/internal/generation/sweep/route.ts", /getServerSession|requireCurrentUser|export async function GET/, "清扫接口不得对外开放，也不得有免鉴权的 GET 入口，只能由服务器 cron 带密钥 POST。");
// 内部路由是「中间件放行 + 路由自校验」的组合拳：中间件放行整段 /api/internal，
// 所以这一段下面每个新路由都必须自带 worker 密钥校验，否则等于把定时任务入口裸奔在公网。
// 2026-09-18 实测踩过：不放行的话请求先被会话中间件挡成 401「请先登录」，密钥校验根本轮不到执行。
assertIncludes("src/middleware.ts", '"/api/internal"', "内部定时任务入口必须在中间件里放行，否则请求到不了路由自己的密钥校验（poll 路由因此从没跑通过）。");
for (const route of walkFiles("src/app/api/internal").filter((path) => path.endsWith("route.ts"))) {
    assert(read(route).includes("GENERATION_WORKER_SECRET"), `${route} 在 /api/internal 下必须自带 worker 密钥校验（中间件已放行这一整段路径）。`);
}

// —— 图片任务的上游留痕（2026-09-18 事故：全库 1900+ 条图片任务的 provider/model/externalId 全空）——
// 任务卡在 running 时服务端既不知道用的哪个模型、也不知道上游任务号，只能退款了事、没法取件。
assertIncludes("src/services/api/image.ts", "reportUpstreamTask(serverJobId", "图片任务拿到上游任务号后必须留痕，否则卡住时无从追账、也没法取件。");
assertIncludes("src/lib/generation/server-upstream-client.ts", "keepalive: true", "留痕请求必须 keepalive：页面跳转/关闭时也要尽量发出去。");
assertNotMatches("src/lib/generation/server-upstream-client.ts", /throw/, "留痕必须尽力而为，不得把异常抛回生成链路。");
assertIncludes("src/services/api/image-task.ts", "upstreamProviderFromBaseUrl", "上游渠道标识必须收在纯模块里（配单测），不能就地拼字符串。");
assertIncludes("src/app/api/generation/jobs/[id]/upstream/route.ts", "isSameOriginRequest", "留痕接口必须校验同源，且只写登录用户名下的任务。");
assertIncludes("src/app/api/generation/jobs/[id]/upstream/route.ts", "P2002", "同一上游任务号重复记录必须给出可读答复，不能裸 500（GenerationJob 上有 (provider, externalId) 唯一约束，实测踩过）。");
{
    const jobsServer = read("src/lib/generation/generation-jobs.server.ts");
    const at = jobsServer.indexOf("export async function recordGenerationUpstream(");
    assert(at > -1, "服务端必须提供 recordGenerationUpstream 留痕入口。");
    const body = at > -1 ? jobsServer.slice(at, jobsServer.indexOf("\n}", at)) : "";
    assert(body.includes("userId"), "留痕必须按 userId 归属写，不能改别人的任务。");
    assert(body.includes('status: "running"'), "留痕只能写还在跑的任务。");
    assert(!body.includes("nextPollAt"), "图片留痕不得设 nextPollAt：设了就会被轮询器抢走，超时清扫也就不敢碰它了。");
}

if (failures.length) {
    console.error("Regression guards failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}

console.log("Regression guards passed.");
