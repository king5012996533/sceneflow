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
assertNoAppDirectGenerationApiImports();

assertIncludes("src/app/(user)/canvas/utils/canvas-agent-ops.ts", 'type: "run_pipeline"', "the canvas agent must keep an executable pipeline operation.");
assertIncludes("src/app/(user)/canvas/utils/online-agent-tools.ts", "canvas_run_pipeline", "the online creation agent must expose pipeline execution.");
assertIncludes("src/app/(user)/canvas/utils/online-agent-tools.ts", "canvas_continue_video", "the creation agent must expose tail-frame continuation.");
assertIncludes("src/app/(user)/canvas/utils/online-agent-tools.ts", "MANGA_PRODUCTION_SKILL", "the creation agent must keep the manga production skill constraints.");
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

if (failures.length) {
    console.error("Regression guards failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}

console.log("Regression guards passed.");
