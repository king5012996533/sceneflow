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
assertIncludes("src/services/api/video.ts", "SEEDANCE_PROXY_IMAGE_MAX_BYTES = 420 * 1024", "Seedance reference image payload guard should stay under the online gateway limit.");
assertIncludes("src/services/api/proxy-client.ts", "status === 413", "proxy client must translate 413 into a clear user-facing message.");
assertIncludes("src/lib/generation/generation-request.ts", "requestGeneratedImages", "generation requests must keep a unified app-facing entry.");
assertIncludes("src/lib/generation/generation-request.ts", "runGuardedGeneration", "all unified generation requests must pass through the backend job guard.");
assertIncludes("src/lib/generation/generation-jobs.server.ts", "pg_advisory_xact_lock", "generation quota and concurrency checks must serialize per user.");
assertIncludes("src/lib/generation/generation-jobs.server.ts", "quotaRefunded", "failed generation jobs must refund reserved quota.");
assertIncludes("src/app/api/proxy/route.ts", "requireCurrentUser", "the upstream proxy must reject anonymous callers.");
assertIncludes("prisma/schema.prisma", "model GenerationJob", "generation lifecycle logs must remain persisted.");
assertNoAppDirectGenerationApiImports();
assertIncludes("src/app/(user)/canvas/utils/canvas-agent-ops.ts", 'type: "run_pipeline"', "the canvas agent must keep an executable pipeline operation.");
assertIncludes("src/app/(user)/canvas/components/canvas-assistant-panel.tsx", "canvas_run_pipeline", "the online creation agent must expose pipeline execution.");
assertIncludes("src/app/(user)/canvas/components/canvas-assistant-panel.tsx", "canvas_continue_video", "the creation agent must expose tail-frame continuation.");
assertIncludes("src/app/(user)/canvas/[id]/canvas-client-page.tsx", "runCanvasPipeline", "pipeline execution must stay connected to the unified node generator.");
assertIncludes("src/app/(user)/canvas/[id]/canvas-client-page.tsx", "assetAutoArchived", "generated reusable assets must automatically return to the asset library.");

assertNotMatches("src/app/(user)/pricing/page.tsx", /暂不收款|不收款|可以免费|免费开通权益/, "pricing copy must not imply beta packages are free.");
assertIncludes("src/app/(user)/pricing/page.tsx", "付费手动开通权益", "pricing copy must keep paid manual opening clear.");
assertIncludes("src/app/(user)/pricing/page.tsx", "申请开通联系管理员", "pricing CTA should route paid plans to admin-assisted opening.");

assertNotMatches("src/app/(user)/image/page.tsx", /请升级套餐继续使用/, "image quota copy should route users to manual opening, not nonexistent online upgrade.");
assertNotMatches("src/app/(user)/video/page.tsx", /请升级套餐继续使用/, "video quota copy should route users to manual opening, not nonexistent online upgrade.");
assertNotMatches("src/app/(user)/canvas/[id]/canvas-client-page.tsx", /请升级套餐继续使用|申请内测或升级套餐/, "canvas quota copy should avoid misleading upgrade/beta wording.");

if (failures.length) {
    console.error("Regression guards failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
}

console.log("Regression guards passed.");
