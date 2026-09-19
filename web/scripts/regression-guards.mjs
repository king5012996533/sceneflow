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
assertIncludes("src/lib/generation/generation-jobs.server.ts", "quotaRefunded", "生成任务必须记下「这笔到底退没退」，结算与对账都靠它。");
// —— 生成积分退款政策（2026-09-19 起：失败/取消一律不退，就算什么都没生成也不退）——
// 钱照收，就意味着「上游到底有没有产出」比以前更要紧：图必须尽量交到用户手上，
// 而这正是下面归档/抢救/补取件那几条链路的活。政策本身只允许有一处开关，调用点不许各判各的。
{
    const policy = read("src/lib/generation/generation-refund-policy.ts");
    assert(policy.includes("GENERATION_REFUNDS_ENABLED = false"), "2026-09-19 起生成失败/取消不退还积分（老板定的规则），开关不得被悄悄翻成 true。");
    assert(policy.includes("export function shouldRefundGeneration("), "退款与否必须收成一个判定，调用点照它执行。");
    assertNotMatches("src/lib/generation/generation-refund-policy.ts", /fetch\(|axios|prisma|import /, "退款政策必须是纯逻辑（不触网、不连库、无依赖），才能直接单测。");
    for (const file of [
        "src/lib/generation/generation-jobs.server.ts",
        "src/lib/generation/generation-sweep.server.ts",
        "src/lib/generation/replicate-poller.server.ts",
    ]) {
        assertIncludes(file, "shouldRefundGeneration(", `${file} 的退款必须走 generation-refund-policy，不得自己在结算处写死退或不退。`);
    }
    // 结算路径不得退回「失败即退」的旧写法（配额标记要跟退款事实一致）
    assertNotMatches("src/lib/generation/generation-jobs.server.ts", /quotaRefunded: status !== "succeeded"/, "quotaRefunded 记的是「退没退」，不是「是不是失败」：政策改成不退之后，这个写法会把每一条失败都记成已退款。");
    // 不退款之后，「收了钱却没给图」就成了必须天天看的数字
    assertIncludes("src/lib/generation/generation-report.server.ts", "upstream_failed_charged", "日报要有一栏「上游失败 · 已收费」：不退款之后，这就是「钱收了、图没给」的计数。");
}
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
// 「拉取上游模型」必须认得各家不同的列表信封：Replicate 用 { results: [{owner, name}] }，
// 不认就会显示 0 个模型；只取 name 又会拼出 "flux-schnell" 这种半截名字（贴进列表必 404）。
assertIncludes("src/app/api/admin/credential-models/route.ts", "record.results", "拉取上游模型要认 Replicate 的 results 信封。");
assert(
    /owner && repo \? `\$\{owner\}\/\$\{repo\}` : repo/.test(read("src/app/api/admin/credential-models/route.ts")),
    "Replicate 的模型名必须拼回 owner/name，否则拉回来的是半截名字。",
);

// —— 图片按分辨率分档定价（2026-09-19：过去所有分辨率一个价，2K/4K 按 1K 卖，越卖越亏）——
// 后台按「尺寸 × 分辨率 × 张数」标定，价格按分辨率分档；口径必须处处一致，否则会出现
// 「面板显示 8、实扣 16」或「后台配了不生效」。
assertIncludes("src/lib/image-resolution.ts", "IMAGE_RESOLUTION_TIERS", "分辨率档位（1K/2K/4K）必须收在 image-resolution 模块里（客户端预检与服务端扣费共用同一把尺子）。");
assertIncludes("src/lib/image-resolution.ts", "TIER_2K_MIN_PIXELS", "档位必须按总像素判定：按最长边会把普通 16:9（1824x1024）算成 2K，用户选普通尺寸就被多扣钱。");
assertIncludes("src/lib/image-resolution.ts", "applyImageResolutionPricing", "2K/4K 专价优先、未配沿用基础价的规则必须在纯函数里（配单测，防止哪天上线的改动悄悄涨价）。");
assertIncludes("src/lib/credit-pricing.ts", "imageResolutionTier", "图片扣费必须先判定本次请求落在哪一档分辨率。");
assertIncludes("src/lib/credit-pricing.ts", "applyImageResolutionPricing", "图片扣费必须套用分辨率分档（不接 = 后台配了 2K/4K 价也不生效）。");
assertIncludes("src/lib/model-capability-spec.ts", "imageCredits2k", "定价落库白名单必须放行 2K 档价（漏掉 = 后台填了也存不进去）。");
assertIncludes("src/lib/model-capability-spec.ts", "imageCredits4k", "定价落库白名单必须放行 4K 档价（漏掉 = 后台填了也存不进去）。");
assertIncludes("src/lib/model-capability-spec.ts", "normalizeImageCapability", "旧标定（分辨率写在宽高比后缀里）必须能读出新形状，否则老模型的能力标定会失效。");
assertIncludes("src/app/(user)/admin/model-capability-fields.tsx", "IMAGE_RESOLUTION_OPTIONS", "后台能力标定必须能逐模型勾选分辨率档位（不勾的档位用户面板上不应出现）。");
assertIncludes("src/app/(user)/admin/credential-pricing-editor.tsx", "IMAGE_TIERS", "后台必须能按分辨率分档设置图片价（1K/2K/4K 三个输入框）。");
assertIncludes("src/app/(user)/admin/credential-form-fields.tsx", "capabilities={form.capabilities}", "定价编辑器必须拿到能力标定（用于标注「该档位没勾」）。");
assertIncludes("src/components/image-settings-panel.tsx", "IMAGE_RESOLUTION_OPTIONS", "用户面板必须有「分辨率」一轴。");
assertIncludes("src/components/image-settings-panel.tsx", "normalizeImageCapability", "用户面板必须走能力归一化（兼容旧标定形状）。");
assertIncludes("src/components/image-settings-panel.tsx", "imageRatioOf", "用户面板判当前比例必须走 imageRatioOf：只认像素串的话，默认配置的 size=\"1:1\" 会被当成自定义像素，用户一点分辨率档位尺寸就被写成 auto（线上复现过）。");
assertIncludes("src/components/studio/studio-settings-drawer.tsx", "model={model}", "studio 抽屉必须把当前模型传给图像设置面板：抽屉里切模型只改 imageModel，面板若按 config.model 取值会继续用旧模型算价（分辨率分档后会显示错价、档位/张数上限也会错）。");
assertNotMatches("src/components/image-settings-panel.tsx", /selectedRatio\s*=\s*[^;]*ratioForImageSize/, "不得再用 ratioForImageSize 直接判当前比例（它只认像素串，会把比例串判成自定义像素）。");
assertIncludes("src/constant/credits.tsx", "options?.size", "客户端积分预检必须带 size：不带会把 2K/4K 按 1K 价显示，预检与实扣不一致。");
assertNotMatches("src/app/(user)/studio/page.tsx", /videoSizeToImageSize\s*\(/, "studio 不得再把像素尺寸压成比例：用户选的 2K/4K 会被降级，出图口径与面板选择不一致。");
assertIncludes("package.json", "test:resolution", "分辨率分档必须有单测入口（npm run test:resolution）。");

// —— 画质档位轴（2026-09-19 Replicate gpt-image-2.5-flare：它没有 1K/2K/4K 像素档，只有 low…max 六档画质）——
// 事故背景：面板把「分辨率」当成唯一的保真度轴，而这个模型的真实入参只有 quality。
// 于是「选 2K」发不出任何东西（像素由上游按 quality 定），用户以为买了高清、拿到的仍是默认档。
assertIncludes("src/lib/model-capability-spec.ts", "qualityTiers?: ImageQuality[]", "能力标定必须有「画质档位轴」这一项，否则模型用 quality 表达分辨率时无从标定。");
assertIncludes("src/lib/model-capability-spec.ts", "IMAGE_QUALITY_TIER_OPTIONS", "画质档位必须有独立选项清单（low…max + auto），不能拿「画质（高级）」那四个凑。");
assertIncludes("src/lib/model-capability-spec.ts", "normalizeQualityTiers", "画质档位必须归一化：只留合法取值、没标与标了空要能分清。");
assertIncludes("src/components/image-settings-panel.tsx", "qualityTierOptions", "用户面板必须认画质档位轴，否则标了也不显示。");
assertIncludes("src/components/image-settings-panel.tsx", 'onConfigChange("quality", item.value)', "画质档位必须写进 config.quality（写进 size 就变成像素档，发的还是老参数）。");
assertIncludes("src/components/image-settings-panel.tsx", "usesQualityAxis", "画质档位轴必须能整轴替掉分辨率档位并收起像素输入（像素由上游按 quality 决定，写数字是骗用户）。");
assertIncludes("src/app/(user)/admin/model-capability-fields.tsx", "IMAGE_QUALITY_TIER_OPTIONS", "后台能力标定必须能勾画质档位轴（只能在代码里写死的话，换模型就得改代码）。");
assertIncludes("src/app/(user)/admin/credential-pricing-editor.tsx", "qualityTierPriceFields", "画质档位轴的模型必须逐档定价（上游六档成本跨度 50 倍，三个像素桶装不下，必然有档位赔钱）。");
assertIncludes("src/app/(user)/admin/credential-pricing-editor.tsx", "imageQualityCredits", "逐档价必须落进 imageQualityCredits，否则后台填了也没人读。");
assertIncludes("src/lib/image-resolution.ts", 'xhigh: "4k"', "xhigh/max 必须归到最高价桶：落回 1K 桶等于「用户选最贵画质、我们按最便宜价扣」。");
assertIncludes("src/lib/image-resolution.ts", 'max: "4k"', "xhigh/max 必须归到最高价桶（同上）。");
// —— 逐画质档定价（2026-09-19 第二轮：上游 flate 六档 $0.012…$0.50，auto 也是 $0.25）——
assertIncludes("src/lib/image-resolution.ts", "applyImageQualityPricing", "逐档计价必须是一个可被 node 单测直接加载的纯函数，不能埋在 credit-pricing 的别名里。");
assertIncludes("src/lib/credit-pricing.ts", "applyImageQualityPricing", "扣费必须真的走逐档计价，否则后台配了新价也扣不着。");
assertIncludes("src/lib/credit-pricing.ts", "imageQualityCredits", "ModelPricing 必须带逐档价表（pricing 是 Json 字段，不用改表结构）。");
assertIncludes("src/lib/model-capability-spec.ts", "sanitizeQualityCredits", "后台保存逐档价必须经服务端清洗（只留合法档位、≥0 整数）。");
// auto 是这批档位里最容易漏的一个：上游对 auto 的报价与 xhigh 相同，落回基础价就是每张赔 11 个积分
assertIncludes("src/lib/credit-pricing.ts", "auto: 178", "成本估算表必须把 auto 按 $0.25 计（与 xhigh 同价），否则后台毛利页会把它算成最便宜那档。");
assertIncludes("src/lib/credit-pricing.ts", "FLARE_QUALITY_COST_CENTS", "成本估算必须按画质档给（原先所有图片一律 30 分，后台毛利页两种方向都是错的）。");
// —— 出图格式（2026-09-19：上游 output_format 是显式字段，用户可选 webp/png）——
assertIncludes("src/lib/model-capability-spec.ts", "outputFormats?: ImageOutputFormat[]", "能力标定必须能标「这个模型支持哪些出图格式」，标了面板才出现格式行。");
assertIncludes("src/lib/model-capability-spec.ts", "normalizeImageOutputFormat", "格式取值必须归一化：发一个上游不认的值就是 422，认不出来一律回 webp。");
assertIncludes("src/lib/model-capability-spec.ts", "IMAGE_OUTPUT_FORMAT_OPTIONS", "格式选项必须有单一清单（后台与面板共用）。");
assertIncludes("src/components/image-settings-panel.tsx", "outputFormatOptions", "用户面板必须按能力标定显示格式行（没标 = 不显示，行为与过去一致）。");
assertIncludes("src/components/image-settings-panel.tsx", 'onConfigChange("outputFormat"', "格式选择必须写进 config.outputFormat，否则选了也不生效。");
assertIncludes("src/services/api/image.ts", "replicateOutputFormatPayload", "Replicate 请求必须按用户选的格式发 output_format（写死 webp 等于面板在骗人）。");
assertIncludes("src/services/api/image.ts", 'outputFormat === "png" ? {} : { output_compression: 90 }', "png 是无损格式，不该带压缩率（带了对 webp/jpeg 才有意义）。");
assertIncludes("src/stores/use-config-store.ts", "outputFormat", "config 必须持久化出图格式，否则刷新就丢。");
assertIncludes("src/lib/generation/generation-config.ts", "normalizeImageOutputFormat(node?.metadata?.outputFormat", "节点元数据里的格式必须能回灌到请求（重试要按原格式复现）。");
// 2026-09-19：出网隧道断掉时，这条路由以前把 fetch 的异常冒成裸 500，前端只看到「Replicate 任务创建失败」，
// 任务号也没进日志——隧道断了与上游拒绝长得一模一样。现在两条路分开报，失败文案必须带线索。
assertIncludes("src/app/api/generation/jobs/[id]/replicate/route.ts", "describeNetworkFailure(", "启动失败必须区分「连不上上游（出网通道）」与「上游拒绝」，网络层错误码要带出来。");
assertIncludes("src/app/api/generation/jobs/[id]/replicate/route.ts", "composeUpstreamFailure(", "启动失败的文案必须走 upstream-error 的统一口径（状态码 + 上游原话）。");
assertIncludes("src/lib/generation/upstream-error.ts", "record.detail", "上游把原因放在顶层 detail 时也要读出来（Replicate 的失败报文就是这样，读不到就只剩「任务创建失败」）。");
assertIncludes("src/app/api/generation/jobs/[id]/replicate/route.ts", "出网通道不可用", "出网通道不通时必须在服务端日志里留下任务号与目标地址。");
assertNotMatches("src/app/api/generation/jobs/[id]/replicate/route.ts", /status: response\.status \|\| 502/, "上游的 401/403 不得照抄成本路由的状态码（前端会当成登录过期），一律按 502 报上游失败。");

// —— Aigccc / Seedance 2.0 网关接入 ——
assertIncludes("src/stores/use-config-store.ts", '"aigccc"', "ApiCallFormat 必须支持 aigccc。");
assertIncludes("src/stores/use-config-store.ts", 'value.includes("aigccc666.com")', "config store 必须按 aigccc666.com 识别网关 Base URL。");
// aigccc 的 ApiKey 注入规则已收进 platformAuthHeaders（代理路由与补取件共用同一份）；
// proxy/route.ts 现在必须走那个共享函数，规则本身仍必须是域名边界匹配（禁止 includes 子串，H-1 防 Key 外泄）。
assertIncludes("src/lib/credential-store.server.ts", 'isHostOrSubdomain(hostname, "aigccc666.com")', "平台鉴权头规则必须用域名边界匹配为 aigccc 注入 ApiKey（禁止 includes 子串，防 Key 外泄 H-1）。");
assertNotMatches("src/lib/credential-store.server.ts", /includes\("aigccc666\.com"\)/, "平台鉴权头规则不得用 includes 子串匹配 aigccc 域名（H-1 平台 Key 外泄）。");
// 2026-09-18：两条代理路由的鉴权收进 upstream-auth.server.ts（补发与服务端执行也要发上游请求），
// 路由只负责调它。aigccc 的 apikey 头规则留在 platformAuthHeaders 里，不得在别处再抄一份。
assertIncludes("src/lib/generation/upstream-auth.server.ts", "platformAuthHeaders(", "上游鉴权必须走共享的头规则（platformAuthHeaders），不得再就地写一套。");
assertNotMatches("src/lib/generation/upstream-auth.server.ts", /includes\("aigccc666\.com"\)/, "上游鉴权不得用 includes 子串匹配 aigccc 域名（H-1 平台 Key 外泄）。");
assertIncludes("src/app/api/proxy/route.ts", "authorizeUpstreamRequest(", "JSON 代理必须走共享的鉴权实现（信封重放与它用同一份）。");
assertIncludes("src/app/api/proxy/form-data/route.ts", "authorizeUpstreamRequest(", "form-data 代理必须走共享的鉴权实现（信封重放与它用同一份）。");
assertNotMatches("src/app/api/proxy/route.ts", /includes\("aigccc666\.com"\)/, "proxy 不得再用 includes 子串匹配 aigccc 域名（H-1 平台 Key 外泄）。");
assertNotMatches("src/app/api/proxy/form-data/route.ts", /includes\("aigccc666\.com"\)/, "form-data proxy 不得再用 includes 子串匹配 aigccc 域名（H-1）。");
// 信封要落库，所以平台密钥绝不能被写进去：platformAuthHeaders 会产出的每个头名都必须在摘除名单里
for (const credentialHeader of ["authorization", "apikey", "x-goog-api-key"]) {
    assertIncludes("src/lib/generation/upstream-auth.server.ts", `"${credentialHeader}"`, `信封摘除名单必须包含 ${credentialHeader}：漏掉它，平台密钥会被写进任务记录的 metadata。`);
}

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
assertIncludes("src/lib/url-safety.ts", "raceConnect", "多地址必须并发抢连：个别地址是黑洞时，串行换址会把一次取件拖到 30 秒以上（实测 32 秒），浏览器早断开。");
assertIncludes("src/lib/url-safety.ts", "socket.setTimeout(0)", "抢连用的空闲超时必须在建连成功后清掉，否则慢速下载会被中途掐断。");
assertIncludes("src/lib/url-safety.ts", "createConnection: () => socket", "抢连只抢「连接」：请求必须写在唯一胜出的那条连接上，不得为换址重投请求（生成类请求重投会重复扣费）。");
assertNotMatches("src/lib/url-safety.ts", /for \(const candidate of addresses\)/, "多地址不得再串行逐个试：黑洞地址会把一次取件拖到 30 秒以上（实测 32 秒）。");
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

// —— Replicate 任务的取件（2026-09-19 事故：图片走 Replicate 渠道后任务永远卡在 running）——
// 现象：预测在上游 10 秒就跑完了，库里 pollAttempts 始终为 0、status 永远 running ——
// 没有任何入口调用过轮询器（internal/generation/poll 只写了路由，crontab 里从来没有这一条）。
// 两层必须都在：事件流驱动（客户端在等结果时秒级出图）+ cron 兜底（页面关掉后仍能取回归档）。
assertIncludes("src/lib/generation/replicate-poller.server.ts", "export async function pollReplicateJobById(", "轮询器必须提供单任务入口：cron 最快一分钟一轮，等结果的用户不能等那么久。");
assertIncludes("src/lib/generation/replicate-poller.server.ts", "return pollReplicateJob(job as ReplicateJobRow)", "单任务入口必须与批量扫描共用同一份取件逻辑，不得各写一份（会重复取件/重复退款）。");
assertIncludes("src/lib/generation/replicate-poller.server.ts", 'provider: "replicate"', "轮询只认领 provider=replicate 的任务：别的通道外链是客户端取件，轮询会在上游多建一次调用。");
assertIncludes("src/app/api/generation/jobs/[id]/events/route.ts", "pollReplicateJobById(id)", "等结果的事件流必须驱动轮询，否则用户只能等 cron 兜底（一分钟）才看到图。");
assertIncludes("src/app/api/generation/jobs/[id]/events/route.ts", "where: { id, userId: user.id }", "事件流只能读登录用户自己名下的任务。");
assertNotMatches("src/app/api/generation/jobs/[id]/events/route.ts", /fetchSafely|api\.replicate\.com/, "取件逻辑只能有一份（replicate-poller.server.ts），事件流不得就地回源上游。");
assertIncludes("src/app/api/internal/generation/poll/route.ts", "pollReplicateJobs", "内部轮询入口必须由服务器 crontab 定时调用（每分钟），页面关掉后仍要能把结果取回归档。");

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

// —— 生成成品归档目录（2026-09-18：同一个「把数据放进构建产物」的坑，第三个漏网模块）——
// server-media-storage 原本写 process.cwd()/.data/generation-media，而生产 PM2 的 cwd 就是
// .next/standalone：next build 默认 cleanDistDir 会递归删掉整个 .next，等于每次部署都把
// 已归档的成品删光（用户回头打不开自己刚生成的东西）。
assertIncludes("src/lib/generation/server-media-storage.server.ts", "export function resolveGenerationMediaDir(", "成品归档目录必须留成纯函数，便于单测锁定「不在构建产物内」。");
for (const storageModule of ["src/lib/media-store.server.ts", "src/lib/asset-cache.server.ts", "src/lib/generation/server-media-storage.server.ts"]) {
    assert(read(storageModule).includes("os.homedir()"), `${storageModule} 的落盘目录必须由主目录推导，不得用 cwd（部署一次就清空一次）。`);
}

// —— 服务端握住成品（2026-09-18：上游 99% 成功、交付只有 55%，差价全由平台承担）——
// 交付（下载/上传/回报）原本全发生在用户标签页里：标签页一关/一断/一刷新，上游已出图并计费，
// 我们手里什么都没有，只能退款。现在客户端一拿到地址就上报，服务端自己取一份归档。
// 铁律：① 先认领（快速判成功）再归档——认领必须抢在「浏览器下载失败→关成 failed」之前，
//       否则退款已出手、上游的钱还是我们出；② 已关成失败/取消的任务不翻案（退款已出手）；
//       ③ 归档失败不等于生成失败，不给用户退款也不改判。
{
    const route = read("src/app/api/generation/jobs/[id]/result/route.ts");
    assertIncludes("src/app/api/generation/jobs/[id]/result/route.ts", "isSameOriginRequest", "成品上报接口必须校验同源，且只能写登录用户名下的任务。");
    assertIncludes("src/app/api/generation/jobs/[id]/result/route.ts", 'runtime = "nodejs"', "成品归档要落盘，必须跑在 nodejs 运行时。");
    assertIncludes("src/app/api/generation/jobs/[id]/result/route.ts", "normalizeResultUrls(", "成品地址必须走纯模块归一（只收 http(s) 直链、限量限长），不得就地过滤。");
    assertIncludes("src/app/api/generation/jobs/[id]/result/route.ts", 'status: "running"', "认领必须是条件更新（status=running），防并发重复结算。");
    assertNotMatches("src/app/api/generation/jobs/[id]/result/route.ts", /quotaRefunded: true/, "成品上报只负责判成功，不得写退款标记（退款只能由失败/取消结算出手）。");
    assertIncludes("src/app/api/generation/jobs/[id]/result/route.ts", 'job.status !== "running" && job.status !== "succeeded"', "已关成失败/取消的任务不得被成品上报翻案（退款已出手）。");
    const claimAt = route.indexOf("updateMany(");
    const archiveAt = route.indexOf("archiveGenerationResults(");
    assert(claimAt > -1 && archiveAt > -1 && claimAt < archiveAt, "必须先认领（判成功）再归档：认领是毫秒级写库，必须抢在客户端把任务关成 failed 之前落地。");
}
assertIncludes("src/services/api/image.ts", "reportGenerationResult(", "图片拿到成品地址后必须上报服务端归档，交付不得只靠浏览器。");
// 视频是这条链路上最脆的一环：地址是 dola/zjcdn 这类会过期、按 Referer 防盗链的第三方直链，
// 浏览器下载失败或页面被关掉就判失败退款，而上游的钱早花了（121 条成功里只有 22 条留了地址）。
assertIncludes("src/services/api/video.ts", "sourceUrl", "上游取件地址必须跟着视频结果一起传出来，否则上报时无地址可用。");
assertIncludes("src/services/api/video.ts", "reportVideoResult", "视频成品一到手就得上报服务端归档。");
assertIncludes("src/services/api/video.ts", "void reportGenerationResult(", "上报是后台动作，不得 await 拖慢出片。");
{
    const request = read("src/lib/generation/generation-request.ts");
    const at = request.indexOf("export async function pollGeneratedVideoTask(");
    const body = at > -1 ? request.slice(at, request.indexOf("\n}", at)) : "";
    assert(body.includes("reportGenerationResult("), "异步任务制视频（先建任务、再轮询）过去结算时一个成品地址都不留，必须补上报。");
    assert(body.indexOf("reportGenerationResult(") < body.indexOf("finishClientGeneration("), "视频也必须先上报（认领）再结算：反了就等于先退款、再想把钱要回来。");
}
assertIncludes("src/lib/generation/server-upstream-client.ts", "reportGenerationResult", "客户端必须有成品上报入口。");
assertNotMatches("src/lib/generation/generation-result.ts", /fetch\(|prisma|axios|import /, "成品归档的判定逻辑必须是纯逻辑（不触网、不连库、无依赖），才能在 Node 下直接单测。");
assertIncludes("src/lib/generation/server-media-storage.server.ts", "archiveGenerationMedia", "服务端归档模块必须保留归档写入入口。");

// —— 超时任务的服务端补取件（2026-09-18：判了超时退款，上游其实出了图，差价平台认）——
// 铁律：① 补取件跑在「关闭 + 退款」之前；② 只有留了上游任务号 + 取件地址的任务才补；
//       ③ 补回来的任务按成功结算、绝不退款；④ 认领仍是条件更新，不覆盖用户自己的结算。
{
    const sweep = read("src/lib/generation/generation-sweep.server.ts");
    const recoverAt = sweep.indexOf("recoverStaleGenerationJob(job");
    const refundAt = sweep.indexOf("refundCredits(tx, job.userId");
    assert(recoverAt > -1, "清扫必须先尝试补取件：上游其实产出了的任务不该退款了事。");
    assert(refundAt > -1 && recoverAt < refundAt, "补取件必须跑在关闭退款之前，否则成品还没取回就把钱退了。");
    assert(sweep.includes("isRecoveryEligible(job)"), "只有留了上游任务号 + 取件地址的任务才谈得上补取件。");
}
assertIncludes("src/lib/generation/generation-recovery.ts", "decideRecovery", "补取件的判定必须收在纯模块里（配单测），清扫只管照着执行。");
assertNotMatches("src/lib/generation/generation-recovery.ts", /fetch\(|prisma|axios|import /, "补取件判定必须是纯逻辑（不触网、不连库、无依赖），才能直接单测。");
{
    const recovery = read("src/lib/generation/generation-recovery.server.ts");
    assert(recovery.includes("platformAuthHeaders("), "补取件必须复用与代理路由同一份鉴权头规则（各网关要求不同，两份规则必然漂移）。");
    assert(recovery.includes("parseImageTaskState("), "补取件必须复用客户端那套任务报文解析，不得自写一份。");
    assert(recovery.includes("fetchSafely("), "补取件是服务端发起的对外请求，必须走 fetchSafely 过 SSRF 校验。");
    assert(recovery.includes('where: { id: job.id, status: "running" }'), "补取件认领必须带 status=running 条件，不得覆盖用户自己的结算。");
    assert(!recovery.includes("refundCredits"), "补取件只负责把成品取回并按成功结算，退款是清扫的事。");
}
// 鉴权头规则只有一份：代理路由（浏览器请求）、信封重放（服务端自己问上游）共用同一份实现
assertIncludes("src/lib/generation/upstream-auth.server.ts", "platformAuthHeaders(", "上游鉴权必须用共享的鉴权头规则，不得再就地写一套。");
assertIncludes("src/lib/credential-store.server.ts", "export function platformAuthHeaders(", "平台鉴权头规则必须集中导出，供代理、补取件与信封重放共用。");

// —— 成品的保留期与自动清理（2026-09-18：归档只进不出会撑爆磁盘，但也不能用完即删）——
// 归档目录现在只进不出，一张图 1–3MB、一条视频几十 MB，迟早占满磁盘；可是删早了又回到
// 「上游钱了、用户没拿到、我们也就没法收额度」的黑洞。所以定一条有边界的保留期：
// 默认 2 天（今天 + 昨天），每天凌晨清一次更早的；判定收在纯模块里，清理程序照着执行。
{
    const pure = read("src/lib/generation/generation-media-retention.ts");
    assert(pure.includes("DEFAULT_RETENTION_DAYS = 2"), "成品默认保留 2 天（今天 + 昨天）：留太短用户第二天来找就扑空，等于没留。");
    assert(pure.includes("MIN_RETENTION_DAYS = 1"), "保留期下限必须是 1 天：允许配出「0 天」就等于允许把成品全删光。");
    assertNotMatches("src/lib/generation/generation-media-retention.ts", /fetch\(|prisma|axios|import /, "保留期判定必须是纯逻辑（不触网、不连库、无依赖），才能直接单测。");
    const prune = read("src/lib/generation/generation-media-retention.server.ts");
    assert(prune.includes("parseArchiveKey("), "清理只认 <jobId>/<index> 形态的文件：目录里将来多出来的东西一律不碰（删文件不可逆）。");
    assert(prune.includes("shouldPurgeArchiveFile("), "删不删必须走纯模块的判定（时间读不出来/修改时间在未来一律不删）。");
    assert(prune.includes("rmdir("), "任务目录里文件清空了才收掉目录本身。");
    assert(prune.includes("ENOENT"), "归档目录不存在（还没人生成过）不是错误，清理必须当成空处理。");
    assertIncludes("src/app/api/internal/generation/media-prune/route.ts", "GENERATION_WORKER_SECRET", "清理入口必须校验内部 worker 密钥，不得对外开放。");
    // 过期后要明说「已过保留期」，不能让用户对着一张破图猜
    assertIncludes("src/app/api/generation/jobs/[id]/media/[index]/route.ts", "purgedMediaMessage(", "媒体路由必须把「已过保留期被清理」与「从未归档」区分开。");
    assertIncludes("src/app/api/generation/jobs/[id]/media/[index]/route.ts", "resolveRetentionDays(", "媒体路由提示的保留天数必须与清理任务用同一份配置。");
    // 2026-09-19：任务表的 resultUrl 指向的正是这条路由，而它原先死认 userId，管理员点开别人的
    // 任务一律 404 —— 后台生成记录的预览列整列破图。管理员放行，普通用户照旧按归属收敛。
    const mediaRoute = read("src/app/api/generation/jobs/[id]/media/[index]/route.ts");
    assert(mediaRoute.includes('user.role === "admin"'), "媒体路由必须放行管理员，否则后台看不到用户生成的图（预览整列破图）。");
    assert(mediaRoute.includes("userId: user.id"), "放行管理员之外，普通用户仍必须按 userId 收敛，不得变成谁都能取。");
}

// —— 用户自助的「生成记录」（2026-09-18：有东西可交付，这笔额度才收得下去）——
{
    const route = read("src/app/api/generation/records/route.ts");
    assert(route.includes("userId: user.id"), "生成记录只能回当前登录用户自己的任务。");
    assertNotMatches("src/app/api/generation/records/route.ts", /externalGetUrl|externalId/, "上游任务号/取件地址属内部凭据，不得随生成记录出网。");
    assert(route.includes("hasGenerationMedia("), "记录里要标出成品是否还在（已清理的不该渲染成破图）。");
    assertIncludes("src/app/(user)/records/page.tsx", "downloadUrl", "生成记录页必须提供成品下载入口，否则用户还是拿不到东西。");
    assertIncludes("src/constant/navigation-tools.ts", 'slug: "records"', "生成记录必须在导航里有入口，不然没人找得到。");
    // 新页面同样要接上旧外链（basePath 时代所有外链都带 /canvas 前缀，别名表是唯一的兼容层）
    assertIncludes("src/lib/old-url-aliases.ts", '"/canvas/records": "/records"', "旧 /canvas/records 外链必须能归一化到新页面，与其他工具页一致。");
}

// —— 成品抢救（2026-09-18 黑洞：上游 99% 成功，我们 374 条「成功」里 370 条手里什么都没有）——
// 内联成品（b64_json）与上游临时直链都只存在于「上游」和「用户浏览器」这两处不属于我们的地方，
// 所以服务端必须在代理层就把上游报文里的成品取出来自己留着。这里钉住「不能悄悄退回去」的几件事。
{
    const pure = read("src/lib/generation/generation-result.ts");
    assert(pure.includes("MAX_EXTRACTED_ARTIFACTS = 8"), "单次抢救最多 8 份成品：无上限的提取会一口气吃掉内存。");
    assert(pure.includes("MIN_INLINE_BASE64_CHARS"), "短 base64 不得当成品：任务号、哈希、图标会被误认为图片。");
    assert(pure.includes("detectMediaMime("), "内联成品的类型必须按文件头判定，不能信上游声明的 MIME。");
    const rescue = read("src/lib/generation/generation-rescue.server.ts");
    assert(rescue.includes('data: { status: "succeeded"'), "抢救必须先认领（判成功），抢在客户端把任务关成失败、退款出手之前。");
    assert(rescue.indexOf('data: { status: "succeeded"') < rescue.indexOf("void archiveResultSources("), "认领必须发生在归档之前：这笔账怎么结只看上游有没有产出，不看我们有没有落盘。");
    assert(rescue.includes("RESCUABLE_KINDS"), "只有会产出成品的通道（图片/视频）才抢救，文本与工具调用不落盘。");
    assertNotMatches("src/lib/generation/generation-rescue.server.ts", /externalGetUrl|apiKey|Authorization/i, "抢救只留成品，不得把上游凭据写进生成记录。");
    assertIncludes("src/app/api/proxy/route.ts", "salvageGenerationArtifacts(", "JSON 代理是内联成品唯一经过的地方，必须抢救。");
    assertIncludes("src/app/api/proxy/form-data/route.ts", "salvageGenerationArtifacts(", "参考图生图主路径走 form-data 代理，同样必须抢救。");
    // 客户端不带任务号，服务端就不知道这份成品该归档给谁 —— 这是整条链路最容易被顺手删掉的一环
    const image = read("src/services/api/image.ts");
    assert(image.includes("jobId: serverJobId"), "图片代理请求必须带上任务号，否则服务端拿到成品也不知道归档给哪条任务。");
    assert(image.includes('formData.set("_proxy_job"'), "form-data 生图路径同样要带任务号。");
    // 服务端收下了、浏览器却没拿到：用户必须还能看到这张图（否则钱花了、图在服务器上，他却对着「请求失败」）
    const guard = read("src/lib/generation/generation-guard.ts");
    assert(guard.includes("recover?"), "结算失败后要留一个「服务端其实已判成功」的补救入口。");
    assert(guard.includes('settled?.status === "succeeded"'), "补救必须以服务端结算结果为准，不能拿本地状态猜。");
    assertIncludes("src/lib/generation/generation-request.ts", "recoverDeliveredImages", "图片生成失败时必须尝试把服务端已归档的成品取回来给用户。");
    // 取件实现只有一份（server-run-client）：兜底恢复与「服务端替我们执行」要的是同一件事，
    // 各写一份迟早一边改了、另一边取不到图。下标映射仍在 resultUrlsFromItems 里，别自己拼媒体路径。
    assertIncludes("src/lib/generation/generation-request.ts", "imagesFromServerRun(", "补救取件必须复用统一的取件实现（server-run-client），不得各写一份。");
    assertIncludes("src/lib/generation/server-run-client.ts", "resultUrlsFromItems(", "补救取件地址要走统一的下标映射，别自己拼媒体路径。");
}

// —— 「客户端放弃」不再等于「上游没产出」（2026-09-18 黑洞最后一环）——
// 浏览器那条长连接一断，客户端就报失败退款；可我们发往上游的请求还在飞（代理的 abort 只挂自家 900s 超时，
// 不跟随客户端信号），上游几十秒后带着成品回来时任务已经 failed，抢救只能空手而归：钱付了、图丢了、额度还退了。
// 这里钉住「谁看见真相谁定论」这条链：登记在飞 → 暂缓结账 → 上游出成品就认领、确认没成品才退款。
{
    const inflight = read("src/lib/generation/upstream-inflight.ts");
    assert(inflight.includes("export function beginUpstreamCall"), "上游调用必须留「还在飞」的登记，否则结算侧无从判断该不该等。");
    assert(inflight.includes("export function takeClientGaveUp"), "「客户端已放弃」必须能被唯一认领一次，避免重复结账。");

    assertIncludes("src/app/api/proxy/route.ts", "beginUpstreamCall(", "JSON 代理（图片直连主路径）必须登记在飞调用。");
    assertIncludes("src/app/api/proxy/form-data/route.ts", "beginUpstreamCall(", "form-data 代理（参考图生图主路径）必须登记在飞调用。");

    const jobs = read("src/lib/generation/generation-jobs.server.ts");
    assert(jobs.includes("isUpstreamCallInFlight("), "客户端报失败时，结算必须先看我们的上游调用还在不在飞。");
    assert(jobs.includes("noteClientGaveUp("), "在上飞期间客户端报失败，只能记账不能结账退款。");
    assert(jobs.includes("DEFERRABLE_KINDS"), "只有会产出成品的通道（图片/视频）才延后结账，文本没有等的必要。");
    assert(jobs.includes("export async function settleDeferredClientFailure"), "延后结账必须有人接手：上游调用结束时确认没成品才退款。");
    const settleGuard = jobs.slice(jobs.indexOf("export async function settleDeferredClientFailure"));
    assert(settleGuard.indexOf("isUpstreamCallInFlight(jobId)") < settleGuard.indexOf("takeClientGaveUp(jobId)"), "还有调用在飞时不得认领放弃记录，否则会提前把任务判死。");
    assert(settleGuard.includes("job.externalId"), "手上已有上游任务号的任务交给补取件（generation-recovery）定论，代理侧不得抢先退款。");
    assertIncludes("src/lib/generation/generation-rescue.server.ts", "takeClientGaveUp(", "抢救认领成功即定论，必须把放弃记录取走，免得反过来把成功改判失败。");

    // 被暂缓的这段时间里，用户不该只看到「请求失败」——成品一到就要照常出图
    const guard = read("src/lib/generation/generation-guard.ts");
    assert(guard.includes("shouldAwaitUpstreamSettlement("), "结算被暂缓（仍是 running）时，客户端必须等上游出结论而不是直接报失败。");
    assert(read("src/lib/generation/generation-recovery.ts").includes('settledStatus === "running"'), "「服务端还没结账 → 继续等」这条规则必须留在纯逻辑里，客户端只照做。");
    assert(guard.includes("awaitDeferredSettlement("), "等待必须是轮询服务端状态，而不是本地干等一个定时器。");
    assertIncludes("src/app/api/generation/jobs/[id]/route.ts", "export async function GET", "客户端要轮询任务状态，任务接口必须提供读接口。");
}

// —— 客户端报失败跑赢了上游调用的登记：成品随后到达仍要认领（2026-09-18 补网）——
// 结算请求小、跑得快；代理请求背着几 MB 素材、慢半拍。竞速输掉的那一次，
// 任务已被结为失败并退款，上游却照跑照出图：成品不能扔，钱也不该再向用户收一次。
{
    const recovery = read("src/lib/generation/generation-recovery.ts");
    assert(recovery.includes("export function isLateRescueClaimable"), "「已结为失败但成品随后到达」必须有一条明确的判定，不能散在调用处。");
    assert(recovery.includes("export function isNetworkLayerFailure"), "「没拿到 HTTP 响应」与「上游明确报错」必须分开：前者真伪未定，后者已有结论。");
    assert(recovery.includes("export function shouldAwaitUpstreamSettlement"), "要不要等上游结论的规则必须收成一个判定，客户端只负责照做。");

    const rescue = read("src/lib/generation/generation-rescue.server.ts");
    assert(rescue.includes("decideRescueAction("), "抢救侧必须用这条判定来决定能不能补认领，否则成品照样被丢掉。");
    assert(/quotaRefunded: job\.quotaRefunded/.test(rescue), "补认领不得改动退款事实：原来退过的照旧记「已退」，没退过的（2026-09-19 起）不得被记成「已退」。");

    const guard = read("src/lib/generation/generation-guard.ts");
    assert(guard.includes("shouldAwaitUpstreamSettlement(") && guard.includes("isNetworkLayerFailure("), "客户端报网络层失败时也要等服务端出结论——这正是用户看到的「请求失败」。");
    assert(guard.includes("keepWaitingOnFailure"), "网络层失败下的「已失败」不算结论：上游成品可能几分钟后才被服务端补认领回来，那时该照常出图。");
}

// —— 用户取消：上游停不下来，图不能扔（2026-09-18 真机验证：1.5 秒取消，200 秒后上游返回完整 PNG，被静默丢弃）——
{
    const recovery = read("src/lib/generation/generation-recovery.ts");
    assert(recovery.includes("export function decideRescueAction"), "成品到达该怎么处置必须收成一条决策，散在调用处迟早漏分支。");
    assert(recovery.includes("CANCELED_ARTIFACT_WINDOW_MS") && recovery.includes("export function isCanceledArtifactKeepable"), "取消后的成品保留必须有自己的窗口与判定。");

    const rescue = read("src/lib/generation/generation-rescue.server.ts");
    assert(rescue.includes("decideRescueAction("), "抢救必须照决策执行，不得各写一套条件。");
    assert(rescue.includes("keep-artifact"), "用户取消的任务要把上游已经画完的图留下（退款政策归政策，图不能丢）。");
    assert(rescue.includes("没能留下"), "有成品却保不住的分支必须留痕：取消口子就是静默丢弃藏了几天。");
    assert(rescue.includes('externalStatus: "dropped"'), "丢弃要打标记，日报才能把「有成品却没留下」数出来。");
    // dropped 的口径只有「上游出了图、这条任务手上一份都没有」。
    // 任务已经有归档成品时后到的报文只是重复（补发与在跑的服务端调用撞车就会这样），
    // 拿它打 dropped 会让日报凭空告警 —— 2026-09-19 线上真留下过这样一条成功任务。
    assert(rescue.includes("hasKeptArtifact(job.resultData)"), "丢成品前必须先分清是「重复到达」还是「真的丢了」：手上已有归档成品时不许打 dropped。");
    assert(rescue.indexOf("hasKeptArtifact(job.resultData)") < rescue.indexOf('externalStatus: "dropped"'), "重复到达的判断必须发生在打 dropped 之前，否则等于没判。");

    const result = read("src/lib/generation/generation-result.server.ts");
    assert(result.includes('status: { in: ["succeeded", "cancelled"] }'), "取消的任务也要能挂上成品，否则归档了记录页也看不到。");
}

// —— 每日对账：把「上游给了成品、我们没收费」变成可数的数字 ——
{
    const report = read("src/lib/generation/generation-report.ts");
    assert(report.includes("export function buildDailyReport"), "日报的归账与排版必须在纯逻辑里，才好单测。");
    assert(report.includes("有成品却没留下"), "日报必须单独列出「有成品却没留下」，这是白烧钱的直接指标。");
    assertIncludes("src/lib/generation/generation-report.server.ts", "externalStatus", "日报要从任务上读「丢弃」标记，否则这项永远是 0。");
    assertIncludes("src/app/api/internal/generation/daily-report/route.ts", "GENERATION_WORKER_SECRET", "日报接口是内部接口，必须校验 worker 密钥。");
}

// —— 阶段 1/2：请求信封存服务端 + 服务端替浏览器执行（2026-09-18 深夜）——
// 背景：7 天 170 条失败里 51 条死在我们自己这侧（部署重启、900 秒超时、连接被重置），
// 而同步通道没有上游任务号 —— 发起调用的进程一没，成品就永远拿不回来（上游照收费）。
{
    const envelope = read("src/lib/generation/generation-envelope.ts");
    // 纯逻辑：判定与执行分开，判定这一半才能在 Node 下直接单测（补发是拿钱换确定性，必须钉得住）
    assert(!/^import|require\(/.test(envelope), "信封的判定必须是纯逻辑（无 import），才能在 Node 下直接单测。");
    assert(envelope.includes("MAX_ENVELOPE_BODY_BYTES"), "留信封必须有体积上限：超大素材信封落盘不划算，宁可这一单走补取件。");
    assert(envelope.includes("export function decideResend") && envelope.includes("budget-spent"), "补发必须收成一条决策，且必须带预算上限（每单最多补发几次）。");
    assert(envelope.includes('input.status !== "running"') && envelope.includes("has-artifact"), "已经结账或已经有成品的任务一律不补发。");
    assert(envelope.includes("call-in-flight"), "有调用在飞时不得补发：那是双份计费最直接的来源。");
    assert(envelope.includes("upstream-task-known"), "手上有上游任务号的（任务制通道）不得重放提交：那只会在上游多建一个任务、多收一次钱。");
    // 服务端执行默认关闭：这是把整条链路换个主人，必须由运维显式打开、也能一个变量改回去
    assert(envelope.includes("SERVER_RUN_GENERATION") && envelope.includes("if (!input.policy.enabled) return false;"), "服务端执行开关必须默认关闭（运维显式打开），出问题能一个环境变量回滚。");
    // 白名单按主机名配：线上 ProviderCredential.provider 是协议标签（ggwk1 与 apimart 都是 openai），
    // 只按标签配会把任务制通道（提交只回任务号、需要有人轮询）一起放进名单，那是这套机制最不该碰的一类。
    assert(envelope.includes("SERVER_RUN_HOSTS") && envelope.includes("SERVER_REPLAY_HOSTS"), "可补发/可服务端执行的渠道必须按主机名配（渠道标签分不开 ggwk1 与 apimart）。");
    assert(envelope.includes("hosts.endsWith") || envelope.includes("isHostMatch"), "渠道主机名必须做域名边界匹配，不得用子串匹配（evil-前缀域名会混进白名单）。");
    assert(envelope.includes("EnvelopeSlot") && envelope.includes("upstreamEnvelopeFallback"), "信封要分主/备两个槽位：改道方案不能被主请求覆盖。");

    const auth = read("src/lib/generation/upstream-auth.server.ts");
    assert(auth.includes("stripCredentialHeaders("), "信封落库前必须摘掉鉴权头（包括 aigccc 的 apikey 与 gemini 的 x-goog-api-key）。");
    assert(!/sk-[A-Za-z0-9]/.test(auth), "信封相关代码里不得出现任何真实密钥字面量。");

    const spool = read("src/lib/generation/generation-spool.server.ts");
    assert(spool.includes("os.homedir()") && !spool.includes("process.cwd()"), "信封必须落在用户主目录下：放在 cwd 等于每次部署（也就是最需要它的时候）被清空。");
    assert(spool.includes("safeJobId("), "信封的文件路径必须由任务号推导并校验，防止目录穿越。");
    assert(spool.includes("不影响本次生成"), "信封写失败绝不能让这次生成失败：它保的是「万一这也挂了」，不能成为新的失败点。");
    // jsonb_build_object 是 variadic "any"：参数不给类型，Postgres 会直接报 42P18
    // "could not determine data type of parameter $1"。线上实测踩到（信封全部落库失败、延后全部回落同步），
    // 而单测跑的是纯逻辑、碰不到这条 SQL —— 只能用门禁把它钉住。
    assert(/jsonb_build_object\(\$\{envelopeKey\(slot\)\}::text/.test(spool), "写 metadata 的 jsonb_build_object 键必须显式 ::text，否则 Postgres 无法推断参数类型（42P18）。");
    assert(/jsonb_build_object\('resend', \$\{JSON\.stringify\(state\)\}::jsonb\)/.test(spool), "补发记账的 jsonb_build_object 值必须显式 ::jsonb。");

    const jsonRoute = read("src/app/api/proxy/route.ts");
    const formRoute = read("src/app/api/proxy/form-data/route.ts");
    for (const [name, route] of [
        ["JSON 代理", jsonRoute],
        ["form-data 代理", formRoute],
    ]) {
        assert(route.includes("saveUpstreamEnvelope("), `${name}必须把这次调用的信封留给服务端（阶段 1 的全部依据）。`);
        assert(route.indexOf("saveUpstreamEnvelope(") < route.indexOf("fetchSafely("), `${name}必须在**发出请求之前**落信封：反过来，进程死在半路时这一单既没成品也没信封。`);
        assert(route.includes("canRunOnServer(") && route.includes("resolveServerRunPolicy("), `${name}的延后必须由服务端策略决定（客户端只声明，不决定）。`);
        assert(route.includes("stripCredentialHeaders("), `${name}落库的信封不得带鉴权头。`);
        assert(route.includes("findRunnableGenerationJob("), `${name}只能把任务交给本人、且仍在跑的任务（已结账的任务不接受新的上游调用）。`);
    }
    assert(jsonRoute.includes("deferred: true") && formRoute.includes("deferred: true"), "延后执行必须回一个可识别的 202（客户端据此转轮询），不能只回任务号。");
    // 执行器读的是**磁盘上**的请求体：交给它的信封必须带 spoolKey。
    // 2026-09-19 线上踩到：把内存里那份（没有 spoolKey）交给执行器，等于发了个空请求体，
    // 上游回 400 invalid JSON request body —— 延后路径当场全废，而日志里只有一句「上游 400」。
    const storedCall = "startServerRun({ job, envelope: stored })";
    assert(jsonRoute.includes(storedCall), "JSON 代理延后执行必须用落盘后返回的那份信封（带 spoolKey），不能用内存里拼的。");
    assert(formRoute.includes(storedCall), "form-data 代理延后执行同样必须用落盘后返回的那份信封（素材也是靠它读回来）。");

    const run = read("src/lib/generation/generation-run.server.ts");
    assert(run.includes("beginUpstreamCall(") && run.includes("isUpstreamCallInFlight("), "服务端执行与补发必须登记在飞状态，否则补发会与它自己并发重投。");
    assert(run.includes("recordResendAttempt("), "补发前必须先记预算：进程被杀也不能变成无限重试。");
    assert(run.includes("AbortSignal.timeout(RUN_TIMEOUT_MS)"), "服务端执行必须有超时，不得裸 fetch 一个可能永不返回的上游。");
    assert(run.includes("salvageGenerationArtifacts("), "服务端执行必须走同一套抢救与结账，不得另写一份归档逻辑。");
    assert(run.includes("body: retry.body"), "被拒收后改道重投必须把改好的请求体一起交给执行器：磁盘上那份是原请求，不会自己变成新画幅。");

    const resendRoute = read("src/app/api/internal/generation/resend/route.ts");
    assert(resendRoute.includes('req.headers.get("x-generation-worker-secret")'), "补发接口是内部接口，密钥必须从请求头取（不得放进 URL 查询串）。");
    assert(resendRoute.includes('runtime = "nodejs"'), "补发接口要用 node runtime（要读 spool 目录、要连库）。");

    // 结账侧必须知道「补发还有机会」：部署重启后在飞登记簿是空的，客户端那句「失败」若照旧结账，
    // 补发就永远等不到一条 running 的任务 —— 阶段 1 等于白做（2026-09-18 深夜实测踩到）。
    const jobs = read("src/lib/generation/generation-jobs.server.ts");
    assert(jobs.includes("hasResendPendingForJob(") && jobs.includes("hasResendPending("), "客户端上报失败时，必须确认服务端手上还有没有可补发的信封，有就先别结账。");
    assert(jobs.includes("holdForResend"), "「先别判死」只适用于客户端上报的失败（服务端自己看见上游答复的失败就是结论，不该再等）。");
    assertIncludes("src/app/api/generation/jobs/[id]/route.ts", "holdForResend: status === \"failed\"", "客户端上报失败的入口必须声明 holdForResend。");
    assertIncludes("src/lib/generation/generation-run.server.ts", "settleDeferredClientFailure(", "补发彻底没戏时（信封没了/过期、预算用完）要当场按失败结账，不能等到 30 分钟后的清扫。");
    assertIncludes("src/lib/generation/generation-run.server.ts", "TERMINAL_SKIP_REASONS", "「哪些跳过原因等于没救了」必须收在纯模块里，不能就地写一串字符串。");

    const client = read("src/services/api/proxy-client.ts");
    assert(client.includes("export async function proxyFetchDeferrable") && client.includes("status === 202"), "客户端必须能识别服务端的 202 并转到轮询（老路径与延后路径共用一份响应解析）。");
    const image = read("src/services/api/image.ts");
    assert(image.includes("proxyFetchDeferrable<") && image.includes("awaitServerRunImages("), "图片主路径（生成与参考图生图）必须接上服务端执行的那条路。");
    const serverRun = read("src/lib/generation/server-run-client.ts");
    assert(serverRun.includes("AbortError"), "用户在服务端执行期间点取消必须抛 AbortError：否则会被结算成「失败」而不是「取消」。");

    // 在飞登记簿必须挂在 globalThis 上：Next 给每个路由各打一份 bundle，
    // 模块级 Map 会让「代理路由写、补发路由读」变成两份互不相见的表 ——
    // 2026-09-19 实测因此对着正在跑的任务又补发了一次，上游多收一次钱。
    const inflight = read("src/lib/generation/upstream-inflight.ts");
    assert(inflight.includes("globalThis") && /globalScope\[REGISTRY_KEY\]/.test(inflight), "在飞登记簿必须挂在 globalThis 上，否则各路由各一份，补发会与服务端执行撞车。");
    assert(!/^const calls = new Map/m.test(inflight), "在飞登记簿不得是模块级 Map（跨路由不可见）。");

    // 登记的「在飞」要一直握到报文正文读完：fetch 在响应头到达时就返回，正文（成品）随后才到。
    // 停在响应头那一刻撤登记，补发会以为没人管了而重发一次 —— 上游的成品常常是「先回头、后送身」，
    // 2026-09-19 线上两次因此多付一次上游（一次成品还被当成重复报文丢掉）。
    assertNotMatches("src/lib/generation/generation-run.server.ts", /await fetchSafely\([\s\S]{0,900}?\} finally \{\s*release\(\);\s*\}/, "在飞登记不得在「收到响应头」时就撤，必须等报文正文读完。");
    const runForRelease = read("src/lib/generation/generation-run.server.ts");
    assert(runForRelease.indexOf("await response.text()") < runForRelease.lastIndexOf("release();"), "读取报文正文必须发生在撤登记之前。");
}

// —— 「上游没有返回任何候选结果」必须说得出原因（2026-09-19）——
// 老板报的就是这一句：既不说上游到底答了什么，也不说该重试还是该改配置；而服务端只记 4xx/5xx，
// 那次调用在上游侧等于没发生过，谁都查不下去。现在这条链路必须做到三件事。
{
    const imageApi = read("src/services/api/image.ts");
    assert(imageApi.includes("describeMissingCandidates"), "「没有候选」的文案必须带上可查的原因（finish_reason / 报文片段），不能只回一句请稍后重试。");
    // 判定顺序：先确认真的没有候选，再看信封。反了会把 {"msg":"ok","choices":[…]} 这种成功应答当失败。
    const normalized = imageApi.replace(/\r\n/g, "\n");
    assert(
        /const message = payload\.choices\?\.\[0\]\?\.message;\n\s*if \(!message\) \{\n(?:(?!\n\s*\}\n).)*responseErrorMessage\(payload\)/s.test(normalized),
        "必须先确认没有候选、再看上游信封：顺序反了会把带 msg 的成功应答当成失败。",
    );
    assertIncludes("src/app/api/proxy/route.ts", "describeUnusableSuccess", "代理必须把「HTTP 2xx 但报文用不了」记进日志，否则客户端报错时服务端一个字都没留。");
    assertIncludes("src/app/api/proxy/route.ts", "describeRequestModel", "代理日志要带模型名，否则同一个渠道下几十个模型，出事了不知道是哪个。");
    // 模型名必须在请求体被释放之前取出来：route.ts 为了省内存会把 envelope.body 置空，
    // 拿到上游响应后再读就已经是 undefined 了（2026-09-19 线上日志实测：只有 target 没有 model）。
    const proxyRoute = read("src/app/api/proxy/route.ts");
    assert(
        proxyRoute.indexOf("requestModel = describeRequestModel(envelope.body)") >= 0 && proxyRoute.indexOf("requestModel = describeRequestModel(envelope.body)") < proxyRoute.indexOf("envelope.body = undefined;"),
        "模型名要在 envelope.body 被置空之前取出来，否则日志里只剩 target。",
    );
    assertNotMatches("src/app/api/proxy/route.ts", /console\.(log|error)\(`\[proxy\][^`]*\$\{describeRequestModel\(envelope\.body\)\}/, "日志里不要现读 envelope.body（那时它已被置空），用提前取好的 requestModel。");
}

// —— 代理客户端必须把上游报文解包交回（2026-09-19 线上事故）——
// proxyFetch 一度把「调用结局对象」{ deferred, data } 整个当报文返回，于是所有非流式调用方都读空字段：
// 对话轮次读 choices 读空（报「上游没有返回任何候选结果」）、视频/任务制通道读 task_id 读空。
// 单测见 scripts/proxy-client-unit-tests.mjs，这里再加一道源码级断言，防止有人图省事又写回一行强转。
{
    const proxyClient = read("src/services/api/proxy-client.ts").replace(/\r\n/g, "\n");
    assertNotMatches("src/services/api/proxy-client.ts", /return \(await readProxyOutcome<T>\(res\)\) as T;/, "proxyFetch 不得把结局对象当报文返回（调用方会读空 choices / code / task_id）。");
    assert(/const outcome = await readProxyOutcome<T>\(res\);[\s\S]{0,260}?return outcome\.data;/.test(proxyClient), "proxyFetch 必须交回 outcome.data（上游报文本身）。");
}

// —— 删除画布也要落到云端（空列表的坑）——
// 项目变更的自动同步有意跳过空列表（免得还没从云端恢复就先拿空列表覆盖掉），
// 代价是删到最后一个画布时云端备份留在原地，删掉的画布其实没离开云端。
// 删除是明确的用户动作，所以这条路径必须自己推一次。
{
    assertIncludes("src/app/(user)/canvas/components/canvas-delete-projects-dialog.tsx", "pushProjectsBackup", "删除画布后要立刻推一次云端备份，否则空列表永远同步不上去。");
    const cloudSync = read("src/app/(user)/canvas/utils/cloud-sync.ts");
    assertIncludes("src/app/(user)/canvas/utils/cloud-sync.ts", '"/canvas/api/sync"', "云端备份要打到 /canvas/api/sync。");
    assert(cloudSync.includes('type: "projects"'), "备份信封要带 type=projects。");
}

if (failures.length) {
    console.error("Regression guards failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}

console.log("Regression guards passed.");
