/**
 * 「上游请求信封」判定的单测（纯逻辑）。
 *
 * 起因：2026-09-18 那 7 天 170 条失败里，51 条死在我们自己这侧（部署重启、900 秒超时、
 * 连接被重置）。同步通道没有上游任务号 —— 发起调用的进程一没，成品就永远拿不回来，
 * 而上游照收费。所以把「怎么问上游」留在服务端，进程死了也能原样再问一次（阶段 1），
 * 更进一步：干脆由服务端替浏览器执行（阶段 2）。
 *
 * 这里钉住的是这套机制的**代价控制**——补发是要向上游多付一次钱的：
 *   - 已经结账 / 已经有成品 / 有人正在调 / 手上有上游任务号 → 一律不补发；
 *   - 每单最多补发 N 次（默认 1），预算记在任务记录上，进程被杀也不会变成无限重试；
 *   - 可重放通道、服务端执行开关默认全关：这是拿钱换确定性的开关，必须由运维显式打开。
 *
 * 运行：npm run test:envelope
 */
import assert from "node:assert";

import {
    DEFAULT_MAX_RESEND_ATTEMPTS,
    ENVELOPE_FRESH_MS,
    MAX_ENVELOPE_AGE_MS,
    MAX_ENVELOPE_BODY_BYTES,
    RESEND_AFTER_MS,
    canRunOnServer,
    decideResend,
    envelopeKey,
    hasKeptArtifact,
    hostOf,
    isEnvelopeFresh,
    isEnvelopeReplayable,
    isHostMatch,
    matchesChannel,
    pickProviderLabel,
    readEnvelope,
    readResendState,
    resolveReplayConfig,
    resolveServerRunPolicy,
    shouldPersistEnvelope,
    shouldSpoolBody,
} from "../src/lib/generation/generation-envelope.ts";

let passed = 0;
const failures = [];

function check(name, fn) {
    try {
        fn();
        passed++;
        console.log(`  ok  ${name}`);
    } catch (error) {
        failures.push(name);
        console.error(`  FAIL ${name}\n       ${error.message}`);
        process.exitCode = 1;
    }
}

const NOW = 1_800_000_000_000;

function envelope(overrides = {}) {
    return {
        url: "https://www.ggwk1.online/v1/images/generations",
        method: "POST",
        headers: { "x-sf-provider": "openai" },
        contentType: "application/json",
        // 线上 ProviderCredential.provider 存的是协议标签：ggwk1 与 apimart 都是 openai
        provider: "openai",
        model: "gpt-image-2",
        spoolKey: "job-1/request.bin",
        bodyBytes: 1024,
        origin: "live",
        savedAt: NOW - ENVELOPE_FRESH_MS - 1000,
        ...overrides,
    };
}

const REPLAY = { hosts: ["www.ggwk1.online"], providers: [], maxAttempts: DEFAULT_MAX_RESEND_ATTEMPTS };

// —— 该不该留信封 ——

check("留信封：带任务号、非流式、不是成品下载的才留", () => {
    assert.strictEqual(shouldPersistEnvelope({ hasJobId: true, bodyBytes: 1024 }), true);
    assert.strictEqual(shouldPersistEnvelope({ hasJobId: true, bodyBytes: 1024, method: "POST" }), true);
});

check("留信封：没有任务号（文本/工具调用）不留 —— 成品的归属都说不清，留它没意义", () => {
    assert.strictEqual(shouldPersistEnvelope({ hasJobId: false, bodyBytes: 1024 }), false);
});

check("留信封：流式对话与成品下载不留（重放它们变不出新东西）", () => {
    assert.strictEqual(shouldPersistEnvelope({ hasJobId: true, bodyBytes: 1024, stream: true }), false);
    assert.strictEqual(shouldPersistEnvelope({ hasJobId: true, bodyBytes: 1024, responseType: "blob" }), false);
});

check("留信封：超大素材信封不留（落盘也发不出去，宁可这一单走补取件）", () => {
    assert.strictEqual(shouldPersistEnvelope({ hasJobId: true, bodyBytes: MAX_ENVELOPE_BODY_BYTES + 1 }), false);
    assert.strictEqual(shouldPersistEnvelope({ hasJobId: true, bodyBytes: MAX_ENVELOPE_BODY_BYTES }), true);
});

check("请求体：有字节才落盘（GET 这类没有请求体）", () => {
    assert.strictEqual(shouldSpoolBody(0), false);
    assert.strictEqual(shouldSpoolBody(1), true);
});

// —— 信封结构 ——

check("槽位：主/备两个槽位各占一个 metadata 键，改道方案不会被主请求覆盖", () => {
    assert.strictEqual(envelopeKey("primary"), "upstreamEnvelope");
    assert.strictEqual(envelopeKey("fallback"), "upstreamEnvelopeFallback");
});

check("读信封：结构不认识、类型不对、超出年龄上限的一律当作没有", () => {
    const stored = { upstreamEnvelope: envelope() };
    assert.strictEqual(readEnvelope(stored)?.url, "https://www.ggwk1.online/v1/images/generations");
    assert.strictEqual(readEnvelope(stored, "fallback"), null);
    assert.strictEqual(readEnvelope({ upstreamEnvelope: "文本" }), null);
    assert.strictEqual(readEnvelope({ upstreamEnvelope: ["数组"] }), null);
    assert.strictEqual(readEnvelope(null), null);
    assert.strictEqual(readEnvelope({}), null);
    // 字段缺一个就当没有信封：不做半截重放
    assert.strictEqual(isEnvelopeReplayable({ ...envelope(), url: "" }), false);
    assert.strictEqual(isEnvelopeReplayable({ ...envelope(), url: "不是地址" }), false);
    assert.strictEqual(isEnvelopeReplayable({ ...envelope(), method: "  " }), false);
    assert.strictEqual(isEnvelopeReplayable(envelope(), NOW), true);
    assert.strictEqual(isEnvelopeReplayable({ ...envelope(), savedAt: NOW - MAX_ENVELOPE_AGE_MS - 1 }, NOW), false);
});

check("新鲜度：刚存下的信封算「正在有人调」，不补发", () => {
    assert.strictEqual(isEnvelopeFresh({ ...envelope(), savedAt: NOW - 1000 }, NOW), true);
    assert.strictEqual(isEnvelopeFresh({ ...envelope(), savedAt: NOW - ENVELOPE_FRESH_MS - 1 }, NOW), false);
    assert.strictEqual(isEnvelopeFresh(null, NOW), false);
});

check("成品：认领过（有归档键）就算已经在手上，没有补发的必要", () => {
    assert.strictEqual(hasKeptArtifact({ items: [{ archiveKey: "job-1/0" }] }), true);
    assert.strictEqual(hasKeptArtifact({ items: [{ url: "https://x/1.png" }] }), false);
    assert.strictEqual(hasKeptArtifact({ items: [] }), false);
    assert.strictEqual(hasKeptArtifact(null), false);
    assert.strictEqual(hasKeptArtifact({ items: "文本" }), false);
});

// —— 补发决策 ——

function decide(overrides = {}) {
    return decideResend({
        status: "running",
        hasArtifact: false,
        envelope: envelope(),
        attempts: 0,
        startedAt: NOW - RESEND_AFTER_MS - 60_000,
        inFlight: false,
        config: REPLAY,
        now: NOW,
        ...overrides,
    });
}

check("补发：正常情形（任务在跑、没成品、没人正在调、超过时间阈值）→ 发", () => {
    assert.deepStrictEqual(decide(), { resend: true });
});

check("补发：已经结账的任务一律不动（成功的不能再发，失败/取消的已经退过款）", () => {
    for (const status of ["succeeded", "failed", "cancelled", null, undefined]) {
        assert.deepStrictEqual(decide({ status }), { resend: false, reason: "not-running" });
    }
});

check("补发：已经有成品就不发（避免同一次生成向上游付两遍钱）", () => {
    assert.deepStrictEqual(decide({ hasArtifact: true }), { resend: false, reason: "has-artifact" });
});

check("补发：没有信封 / 信封刚存下 / 有人正在调 → 都不发", () => {
    assert.deepStrictEqual(decide({ envelope: null }), { resend: false, reason: "no-envelope" });
    assert.deepStrictEqual(decide({ envelope: envelope({ savedAt: NOW - 1000 }) }), { resend: false, reason: "envelope-fresh" });
    assert.deepStrictEqual(decide({ inFlight: true }), { resend: false, reason: "call-in-flight" });
});

check("补发：手上有上游任务号的（任务制通道）不重放提交 —— 那只会在上游多建一个任务、多收一次钱", () => {
    assert.deepStrictEqual(decide({ externalId: "task_abc" }), { resend: false, reason: "upstream-task-known" });
});

check("补发：渠道不在可重放名单里就不发（默认谁都不重放）", () => {
    assert.deepStrictEqual(decide({ envelope: envelope({ url: "https://api.apimart.ai/v1/images/generations" }) }), { resend: false, reason: "channel-not-replayable" });
    assert.deepStrictEqual(decide({ config: { hosts: [], providers: [], maxAttempts: 1 } }), { resend: false, reason: "channel-not-replayable" });
    assert.deepStrictEqual(decide({ config: { hosts: ["quanzil.com"], providers: [], maxAttempts: 1 } }), { resend: false, reason: "channel-not-replayable" }, "名单里没有这个渠道就不发");
    assert.deepStrictEqual(decide({ provider: "aigccc", config: { hosts: [], providers: ["aigccc"], maxAttempts: 1 } }), { resend: true }, "也可以按渠道标签放行（aigccc 这类网关靠标签区分）");
});

// —— 渠道匹配（按主机名，不是按渠道标签）——
// 线上 ProviderCredential.provider 存的是协议标签（ggwk1 与 apimart 都是 openai），
// 只按标签配会把任务制通道一起放进重放名单：那类通道的提交应答里只有任务号，
// 重放一次只会在上游多建一个任务、多收一次钱。

check("渠道匹配：精确主机名或子域算命中，禁止子串匹配", () => {
    assert.strictEqual(hostOf("https://www.ggwk1.online/v1/images/generations"), "www.ggwk1.online");
    assert.strictEqual(hostOf("不是地址"), "");
    assert.strictEqual(hostOf(undefined), "");
    assert.strictEqual(isHostMatch("www.ggwk1.online", "www.ggwk1.online"), true);
    assert.strictEqual(isHostMatch("api.www.ggwk1.online", "www.ggwk1.online"), true);
    assert.strictEqual(isHostMatch("evil-www.ggwk1.online", "www.ggwk1.online"), false, "子串匹配会让 evil- 前缀的域名混进白名单");
    assert.strictEqual(isHostMatch("ggwk1.online", "www.ggwk1.online"), false, "父域不算命中（白名单写哪个就只放行哪个）");
});

check("渠道匹配：主机名与标签任一命中即可；名单为空一律不匹配", () => {
    const matcher = { hosts: ["ggwk1.online"], providers: ["aigccc"] };
    assert.strictEqual(matchesChannel({ url: "https://www.ggwk1.online/v1/x" }, matcher), true);
    assert.strictEqual(matchesChannel({ url: "https://aigccc666.com/v1/x", provider: "aigccc" }, matcher), true);
    assert.strictEqual(matchesChannel({ url: "https://api.apimart.ai/v1/x", provider: "openai" }, matcher), false);
    assert.strictEqual(matchesChannel({ url: "https://api.apimart.ai/v1/x" }, { hosts: [], providers: [] }), false);
    assert.strictEqual(matchesChannel({ provider: "AIGCCC" }, matcher), true, "标签大小写不影响判定");
});

check("补发：预算用完就不再发（每单默认 1 次）", () => {
    assert.deepStrictEqual(decide({ attempts: 1 }), { resend: false, reason: "budget-spent" });
    assert.deepStrictEqual(decide({ attempts: 1, config: { ...REPLAY, maxAttempts: 2 } }), { resend: true });
});

check("补发：任务刚开跑就补发会与还在飞的那次调用撞车，必须等够时间", () => {
    assert.deepStrictEqual(decide({ startedAt: NOW - 1000 }), { resend: false, reason: "too-early" });
    assert.deepStrictEqual(decide({ startedAt: null }), { resend: false, reason: "too-early" });
    assert.deepStrictEqual(decide({ startedAt: "不是时间" }), { resend: false, reason: "too-early" });
    assert.deepStrictEqual(decide({ startedAt: new Date(NOW - RESEND_AFTER_MS - 1) }), { resend: true });
    assert.deepStrictEqual(decide({ startedAt: new Date(NOW - 1000), resendAfterMs: 0 }), { resend: true });
});

check("补发预算：任务记录里读不出来就是 0 次（宁可多发一次，也不接受「付一次、图上谁都没有」）", () => {
    assert.deepStrictEqual(readResendState(null), { attempts: 0, lastAt: undefined, lastError: undefined });
    assert.deepStrictEqual(readResendState({ resend: { attempts: 2, lastAt: 123 } }), { attempts: 2, lastAt: 123, lastError: undefined });
    assert.deepStrictEqual(readResendState({ resend: { attempts: -5 } }).attempts, 0);
});

// —— 运维开关（默认全关，改一个环境变量即可回滚） ——

check("可重放渠道：默认空（谁都不重放），要显式列出主机名才打开", () => {
    assert.deepStrictEqual(resolveReplayConfig({}), { hosts: [], providers: [], maxAttempts: DEFAULT_MAX_RESEND_ATTEMPTS });
    assert.deepStrictEqual(resolveReplayConfig({ SERVER_REPLAY_HOSTS: "" }).hosts, []);
    assert.deepStrictEqual(resolveReplayConfig({ SERVER_REPLAY_HOSTS: " WWW.ggwk1.online , quanzil.com ,, " }).hosts, ["www.ggwk1.online", "quanzil.com"]);
    assert.deepStrictEqual(resolveReplayConfig({ SERVER_REPLAY_PROVIDERS: "AIGCCC" }).providers, ["aigccc"]);
});

check("可重放预算：读不出/负数退回默认值，上限 5（拿钱换确定性的幅度要有人管）", () => {
    assert.strictEqual(resolveReplayConfig({}).maxAttempts, DEFAULT_MAX_RESEND_ATTEMPTS);
    assert.strictEqual(resolveReplayConfig({ SERVER_REPLAY_MAX_ATTEMPTS: "3" }).maxAttempts, 3);
    assert.strictEqual(resolveReplayConfig({ SERVER_REPLAY_MAX_ATTEMPTS: "0" }).maxAttempts, 0);
    assert.strictEqual(resolveReplayConfig({ SERVER_REPLAY_MAX_ATTEMPTS: "9" }).maxAttempts, 5);
    assert.strictEqual(resolveReplayConfig({ SERVER_REPLAY_MAX_ATTEMPTS: "不是数字" }).maxAttempts, DEFAULT_MAX_RESEND_ATTEMPTS);
});

check("服务端执行开关：默认关闭（这是把整条链路换个主人，必须运维显式打开）", () => {
    assert.deepStrictEqual(resolveServerRunPolicy({}), { enabled: false, hosts: [], providers: [] });
    assert.deepStrictEqual(resolveServerRunPolicy({ SERVER_RUN_GENERATION: "0" }), { enabled: false, hosts: [], providers: [] });
    assert.strictEqual(resolveServerRunPolicy({ SERVER_RUN_GENERATION: "on" }).enabled, true);
    assert.deepStrictEqual(resolveServerRunPolicy({ SERVER_RUN_GENERATION: "1", SERVER_RUN_HOSTS: "WWW.GGWK1.online" }), { enabled: true, hosts: ["www.ggwk1.online"], providers: [] });
});

check("服务端执行：拿不准一律不走（宁可按老路径多等一会儿，也不要让这一单没人管）", () => {
    const on = resolveServerRunPolicy({ SERVER_RUN_GENERATION: "1", SERVER_RUN_HOSTS: "www.ggwk1.online" });
    const url = "https://www.ggwk1.online/v1/images/generations";
    assert.strictEqual(canRunOnServer({ policy: on, provider: "openai", url, hasJobId: true }), true);
    assert.strictEqual(canRunOnServer({ policy: resolveServerRunPolicy({ SERVER_RUN_HOSTS: "www.ggwk1.online" }), provider: "openai", url, hasJobId: true }), false, "开关关着时谁都不走");
    assert.strictEqual(canRunOnServer({ policy: on, provider: "openai", url, hasJobId: false }), false, "没有任务号就没有归档的归属");
    assert.strictEqual(canRunOnServer({ policy: on, provider: "openai", url, hasJobId: true, stream: true }), false, "流式对话由浏览器自己接，服务端替不了");
    assert.strictEqual(canRunOnServer({ policy: on, provider: "openai", url, hasJobId: true, responseType: "blob" }), false, "成品下载不是生成");
    assert.strictEqual(canRunOnServer({ policy: on, provider: "openai", url: "https://api.apimart.ai/v1/images/generations", hasJobId: true }), false, "没点名的渠道（任务制通道）一律走老路径");
    assert.strictEqual(canRunOnServer({ policy: resolveServerRunPolicy({ SERVER_RUN_GENERATION: "1" }), provider: "openai", url, hasJobId: true }), false, "开了开关却没点名渠道 = 谁都不走（空名单不等于全放行）");
});

check("渠道标签：调用方显式声明的优先，其次用凭证解析出来的", () => {
    assert.strictEqual(pickProviderLabel("AIGCCC", "openai"), "aigccc");
    assert.strictEqual(pickProviderLabel(undefined, "openai"), "openai");
    assert.strictEqual(pickProviderLabel("", ""), "");
});

console.log(failures.length === 0 ? `\n全部通过：${passed} 项` : `\n通过 ${passed} 项，失败 ${failures.length} 项：${failures.join("、")}`);
