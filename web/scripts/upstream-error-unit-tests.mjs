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

import { MAX_UPSTREAM_ERROR_CHARS, composeUpstreamFailure, describeEnvelopeFailure, describeHttpStatus, describeNetworkFailure } from "../src/lib/generation/upstream-error.ts";

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

console.log(`\n上游失败原因单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
