/**
 * 上游失败原因可读化的单测（纯逻辑）。
 *
 * 起因：2026-09-18 线上失败任务的头号文案是「请求失败」四个字——没有状态码、没有上游失败码、
 * 没有网络错误码。于是：判不出「上游到底出图没有」（出了图就该补取件、把成品和额度要回来），
 * 也没法跟中转站对账。这里钉住「失败文案必须带上线索」这条规矩。
 *
 * 运行：npm run test:upstream
 */
import assert from "node:assert";

import { MAX_UPSTREAM_ERROR_CHARS, composeUpstreamFailure, describeEnvelopeFailure, describeHttpStatus, describeMissingCandidates, describeNetworkFailure, describeUnusableSuccess, upstreamErrorMessage } from "../src/lib/generation/upstream-error.ts";

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

check("HTTP 状态：认得出的给语义，5xx 至少留住状态码", () => {
    assert.strictEqual(describeHttpStatus(401), "鉴权失败，请检查 API Key 或模型权限");
    assert.strictEqual(describeHttpStatus(403), "鉴权失败，请检查 API Key 或模型权限");
    assert.match(describeHttpStatus(429), /限流|额度/);
    assert.strictEqual(describeHttpStatus(408), "上游响应超时（HTTP 408）");
    assert.strictEqual(describeHttpStatus(413), "请求内容过大（HTTP 413）");
    assert.strictEqual(describeHttpStatus(500), "上游网关异常（HTTP 500）");
    assert.strictEqual(describeHttpStatus(502), "上游网关异常（HTTP 502）");
    assert.strictEqual(describeHttpStatus(504), "上游网关异常（HTTP 504）");
    assert.strictEqual(describeHttpStatus(400, "请求失败"), "请求失败（HTTP 400）");
    assert.strictEqual(describeHttpStatus(418, "请求失败"), "请求失败（HTTP 418）");
});

check("HTTP 状态：读不出来就退回 fallback，不编造状态", () => {
    assert.strictEqual(describeHttpStatus(undefined), "请求失败");
    assert.strictEqual(describeHttpStatus(null), "请求失败");
    assert.strictEqual(describeHttpStatus(0), "请求失败");
    assert.strictEqual(describeHttpStatus(NaN), "请求失败");
    assert.strictEqual(describeHttpStatus("abc", "失败"), "失败");
    assert.strictEqual(describeHttpStatus("503"), "上游网关异常（HTTP 503）", "字符串数字也要认");
});

check("网络错误：错误码 + 目标主机都要留下（ETIMEDOUT 103.252.114.11:443）", () => {
    const error = Object.assign(new Error("connect ETIMEDOUT 103.252.114.11:443"), { code: "ETIMEDOUT" });
    const detail = describeNetworkFailure(error);
    assert.match(detail, /ETIMEDOUT/);
    assert.match(detail, /103\.252\.114\.11/);
});

check("网络错误：undici 把真实原因藏在 cause 里", () => {
    const error = new TypeError("fetch failed");
    error.cause = Object.assign(new Error("getaddrinfo ENOTFOUND getapib.org"), { code: "ENOTFOUND" });
    const detail = describeNetworkFailure(error);
    assert.match(detail, /ENOTFOUND/);
    assert.match(detail, /getapib\.org/);
});

check("网络错误：只有 host 或只有 code 时也要给出一半线索", () => {
    assert.match(describeNetworkFailure(new Error("read ECONNRESET api.apimart.ai:443")), /ECONNRESET/);
    assert.match(describeNetworkFailure(Object.assign(new Error("boom"), { code: "EPIPE" })), /EPIPE/);
});

check("网络错误：什么都不知道时才说「没拿到 HTTP 响应」，其余一律空串", () => {
    assert.match(describeNetworkFailure(new TypeError("Failed to fetch")), /没拿到 HTTP 响应/);
    assert.strictEqual(describeNetworkFailure(new Error("上游返回 500")), "", "有 HTTP 语义就不是网络层问题");
    assert.strictEqual(describeNetworkFailure(undefined), "");
    assert.strictEqual(describeNetworkFailure("plain string"), "");
    assert.strictEqual(describeNetworkFailure({}), "");
});

check("失败码：带上码和响应结构摘要，别只剩四个字", () => {
    assert.strictEqual(describeEnvelopeFailure(403, "顶层{code,data}，data 数组1项"), "上游返回失败码 403（顶层{code,data}，data 数组1项）");
    assert.strictEqual(describeEnvelopeFailure(500), "上游返回失败码 500");
    assert.strictEqual(describeEnvelopeFailure("E_PARAM", "顶层{code,msg}"), "上游返回失败码 E_PARAM（顶层{code,msg}）");
    assert.strictEqual(describeEnvelopeFailure(undefined), "");
    assert.strictEqual(describeEnvelopeFailure(""), "");
    assert.strictEqual(describeEnvelopeFailure(null), "");
});

check("组装：分段拼接、去重、去掉被包含的短句", () => {
    assert.strictEqual(composeUpstreamFailure(["上游返回失败码 502", "网络错误 ETIMEDOUT"]), "上游返回失败码 502；网络错误 ETIMEDOUT");
    assert.strictEqual(composeUpstreamFailure(["请求失败", "请求失败（HTTP 502）"]), "请求失败（HTTP 502）");
    assert.strictEqual(composeUpstreamFailure(["内容审核未通过", "内容审核未通过"]), "内容审核未通过");
    assert.strictEqual(composeUpstreamFailure([undefined, null, "", "  ", "真原因"]), "真原因");
});

check("组装：一段都没有时给 fallback，长度封顶", () => {
    assert.strictEqual(composeUpstreamFailure([null, undefined, ""]), "请求失败");
    assert.strictEqual(composeUpstreamFailure([], "自定义兜底"), "自定义兜底");
    const long = composeUpstreamFailure(["x".repeat(1000)]);
    assert.ok(long.length <= MAX_UPSTREAM_ERROR_CHARS, `长度应封顶，实际 ${long.length}`);
    assert.ok(long.endsWith("…"));
});

check("信封文案：各家中转站的字段名都要认（msg / message / error 字符串或对象 / data 里的原因）", () => {
    assert.strictEqual(upstreamErrorMessage({ msg: "额度不足" }), "额度不足");
    assert.strictEqual(upstreamErrorMessage({ message: "服务繁忙" }), "服务繁忙");
    assert.strictEqual(upstreamErrorMessage({ error_message: "鉴权失败" }), "鉴权失败");
    assert.strictEqual(upstreamErrorMessage({ error: "boom" }), "boom");
    assert.strictEqual(upstreamErrorMessage({ error: { message: "overloaded" } }), "overloaded");
    assert.strictEqual(upstreamErrorMessage({ error: { detail: "no quota" } }), "no quota");
    assert.strictEqual(upstreamErrorMessage({ data: { fail_reason: "内容审核未通过" } }), "内容审核未通过");
    assert.strictEqual(upstreamErrorMessage({ data: [{ reason: "上游超时" }] }), "上游超时");
    // Replicate 的失败报文没有 error 字段，原因在顶层 detail（2026-09-19 的 401 就长这样）
    assert.strictEqual(upstreamErrorMessage({ title: "Unauthenticated", detail: "You did not pass a valid authentication token" }), "You did not pass a valid authentication token");
    assert.strictEqual(upstreamErrorMessage({ detail: "  " }), "");
});

check("信封文案：正常的成功应答必须读不出错误，别把成功当失败", () => {
    assert.strictEqual(upstreamErrorMessage({ choices: [{ message: { content: "收到" } }] }), "");
    assert.strictEqual(upstreamErrorMessage({ code: 0, data: [{ url: "https://x/y.png" }] }), "");
    assert.strictEqual(upstreamErrorMessage({}), "");
    assert.strictEqual(upstreamErrorMessage(null), "");
    assert.strictEqual(upstreamErrorMessage("plain"), "");
});

check("没有候选：上游自己说了原因就用它（这类 200 里的失败信封最常见）", () => {
    const message = describeMissingCandidates({ code: 500, message: "服务繁忙，请稍后重试" });
    assert.match(message, /服务繁忙/);
    assert.match(message, /候选/);
    assert.match(describeMissingCandidates({ error: { message: "Our servers are currently overloaded" } }), /overloaded/);
    assert.match(describeMissingCandidates({ msg: "渠道不可用" }), /渠道不可用/);
});

check("没有候选：上游没说话时，把 finish_reason 与报文片段带上，不能只会说「请稍后重试」", () => {
    const empty = describeMissingCandidates({ choices: [] }, { shape: "顶层{choices}" });
    assert.match(empty, /候选/);
    assert.match(empty, /顶层\{choices\}/, "要有结构摘要");
    assert.match(empty, /choices/, "片段里要能看到报文原文");
    const filtered = describeMissingCandidates({ choices: [{ finish_reason: "content_filter" }] }, { finishReason: "content_filter" });
    assert.match(filtered, /content_filter/);
});

check("没有候选：无论上游回什么鬼东西，文案都不能是空的，也不能只有「请稍后重试」", () => {
    for (const payload of [{}, [], null, undefined, "", "<html>502 Bad Gateway</html>", { foo: "bar" }, 42]) {
        const message = describeMissingCandidates(payload, { shape: "顶层{}" });
        assert.ok(message.trim().length > 8, `不能是空文案：${JSON.stringify(payload)} → ${message}`);
        assert.match(message, /候选/, `要说清是「没有候选」：${JSON.stringify(payload)} → ${message}`);
    }
});

check("2xx 但报文用不了：认得出来（记日志用），且不能误报正常成功", () => {
    // 该记的
    assert.ok(describeUnusableSuccess("/v1/chat/completions", { code: 500, message: "服务繁忙" }));
    assert.ok(describeUnusableSuccess("/v1/chat/completions", { choices: [] }));
    assert.ok(describeUnusableSuccess("/v1/chat/completions", { choices: [{ finish_reason: "content_filter" }] }));
    assert.ok(describeUnusableSuccess("/v1/chat/completions", { code: 0, msg: "失败" }), "对话端点没有 choices 字段就该记一笔");
    assert.ok(describeUnusableSuccess("/v1/images/generations", { code: 500, data: [] }));
    assert.ok(describeUnusableSuccess("/v1/chat/completions", { error: { message: "overloaded" } }));
    // 不该记的（正常成功一律空串，否则日志会被刷屏）
    assert.strictEqual(describeUnusableSuccess("/v1/chat/completions", { choices: [{ message: { content: "收到" } }] }), "");
    assert.strictEqual(describeUnusableSuccess("/v1/images/generations", { code: 200, data: [{ url: "https://x/y.png" }] }), "");
    assert.strictEqual(describeUnusableSuccess("/v1/tasks/task_1", { code: 200, data: { status: "completed" } }), "");
    assert.strictEqual(describeUnusableSuccess("/v1/chat/completions", null), "");
    assert.strictEqual(describeUnusableSuccess("/v1/chat/completions", "not-json"), "");
});

console.log(`\n上游失败原因单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
