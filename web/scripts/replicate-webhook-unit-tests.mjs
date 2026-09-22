/**
 * Replicate webhook 鉴权与回调地址的单测（纯逻辑：只碰 crypto 与 Headers，无网络、无数据库）。
 *
 * 这条路径的要害是**鉴权不能形同虚设**：回调地址是公开的，谁都能 POST。地址里的签名就是
 * 唯一凭据，所以这里钉三件事：
 *   1. 合法签名必须过、改一个字符必须不过（含最后一位，防止比较被提前截断）；
 *   2. 签名绑任务号：拿 A 任务的签名去过 B 任务，必须不过；
 *   3. 没配密钥时一律返回 null —— 宁可不发 webhook（轮询兜底），也不能发出一个假的地址。
 *
 * 运行：npm run test:webhook
 */
import assert from "node:assert";

process.env.REPLICATE_WEBHOOK_SECRET = "unit-test-secret";

const { replicateWebhookSecret, replicateWebhookUrl, signReplicateWebhookJob, verifyReplicateWebhookSignature } = await import("../src/lib/generation/replicate-webhook.server.ts");

let passed = 0;
let failed = 0;
const check = (name, fn) => {
    try {
        fn();
        passed += 1;
        console.log(`  ok   ${name}`);
    } catch (error) {
        failed += 1;
        console.log(`  FAIL ${name} — ${error instanceof Error ? error.message : error}`);
    }
};

console.log("== 签名与校验 ==");
const jobId = "cmubaa5mg00ll9ztia8xsm9v5";
const sig = signReplicateWebhookJob(jobId);

check("密钥读得到", () => assert.equal(replicateWebhookSecret(), "unit-test-secret"));
check("能签出非空签名", () => assert.ok(sig && sig.length >= 32));
check("同一任务重复签名结果一致（无随机盐）", () => assert.equal(signReplicateWebhookJob(jobId), sig));
check("合法签名通过", () => assert.equal(verifyReplicateWebhookSignature(jobId, sig), true));
check("篡改签名不通过", () => assert.equal(verifyReplicateWebhookSignature(jobId, `${sig.slice(0, -1)}X`), false));
check("截断签名不通过（长度必须先比）", () => assert.equal(verifyReplicateWebhookSignature(jobId, sig.slice(0, 10)), false));
check("换任务号不通过（签名绑任务）", () => assert.equal(verifyReplicateWebhookSignature("cmubaa5mg00ll9ztia8xsm9vg", sig), false));
check("空签名不通过", () => assert.equal(verifyReplicateWebhookSignature(jobId, ""), false));

console.log("== 回调地址 ==");
const headers = (map) => new Headers(map);
check("用 x-forwarded-host 拼出 https 地址", () => {
    const url = replicateWebhookUrl(jobId, headers({ "x-forwarded-host": "xingtudesign.com", "x-forwarded-proto": "https" }));
    assert.ok(url, "应当拼出地址");
    const parsed = new URL(url);
    assert.equal(parsed.origin, "https://xingtudesign.com");
    assert.equal(parsed.pathname, "/api/generation/webhooks/replicate");
    assert.equal(parsed.searchParams.get("job"), jobId);
    assert.equal(parsed.searchParams.get("sig"), sig, "地址里的签名必须与签名函数一致，否则上游推回来会被我们自己拒掉");
});
check("没有 forwarded 头时退回 host", () => {
    const url = replicateWebhookUrl(jobId, headers({ host: "example.com" }));
    assert.equal(new URL(url).origin, "https://example.com");
});
check("多个代理用第一个 host（逗号分隔）", () => {
    const url = replicateWebhookUrl(jobId, headers({ "x-forwarded-host": "xingtudesign.com, internal:3003", "x-forwarded-proto": "https, http" }));
    assert.equal(new URL(url).origin, "https://xingtudesign.com");
});
check("PUBLIC_BASE_URL 优先于请求头", () => {
    process.env.PUBLIC_BASE_URL = "https://canvas.example.com";
    const url = replicateWebhookUrl(jobId, headers({ host: "ignored.example.com" }));
    assert.equal(new URL(url).origin, "https://canvas.example.com");
    delete process.env.PUBLIC_BASE_URL;
});
check("拿不到 host 时不发地址（本地开发）", () => assert.equal(replicateWebhookUrl(jobId, headers({})), null));

console.log("== 没配密钥时必须闭嘴 ==");
check("无密钥：签名与地址都返回 null", () => {
    const saved = process.env.REPLICATE_WEBHOOK_SECRET;
    const savedWorker = process.env.GENERATION_WORKER_SECRET;
    delete process.env.REPLICATE_WEBHOOK_SECRET;
    delete process.env.GENERATION_WORKER_SECRET;
    assert.equal(signReplicateWebhookJob(jobId), null);
    assert.equal(replicateWebhookUrl(jobId, headers({ host: "xingtudesign.com" })), null);
    assert.equal(verifyReplicateWebhookSignature(jobId, "whatever"), false);
    process.env.REPLICATE_WEBHOOK_SECRET = saved;
    if (savedWorker) process.env.GENERATION_WORKER_SECRET = savedWorker;
});
check("退回 GENERATION_WORKER_SECRET 也能用", () => {
    const saved = process.env.REPLICATE_WEBHOOK_SECRET;
    delete process.env.REPLICATE_WEBHOOK_SECRET;
    process.env.GENERATION_WORKER_SECRET = "worker-secret";
    const workerSig = signReplicateWebhookJob(jobId);
    assert.ok(workerSig);
    assert.equal(verifyReplicateWebhookSignature(jobId, workerSig), true);
    assert.notEqual(workerSig, sig, "换了密钥签名必须不同");
    process.env.REPLICATE_WEBHOOK_SECRET = saved;
    delete process.env.GENERATION_WORKER_SECRET;
});

console.log(failed ? `\n${failed} 项失败（通过 ${passed}）` : `\n全部通过（${passed} 项）`);
process.exit(failed ? 1 : 0);
