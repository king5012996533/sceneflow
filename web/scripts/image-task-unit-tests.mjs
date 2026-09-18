/**
 * 异步任务制图片通道（apimart）纯逻辑单元测试。
 *
 * 起因：后台配好 apimart 后出图「秒失败」，界面只显示「请求失败」四个字，F12 无报错、
 * 服务端日志里也没有上游 4xx。实测抓到两个真相：
 *   1. apimart 用 HTTP 风格的 code:200 表示成功，而 parseImagePayload 只认 code===0
 *      → 成功应答被判成失败（msg 为空 → 落到兜底文案「请求失败」）；
 *   2. 它的出图是异步任务制，提交应答里根本没有图，只有 task_id。
 *
 * 下面用当时抓到的**真实报文**当夹具，把这两条都钉住：
 *   - 提交：{"code":200,"data":[{"status":"submitted","task_id":"task_..."}]}
 *   - 取件：GET /v1/tasks/{id} → {"code":200,"data":{... "result":{"images":[{"url":["<URL>"]}]}}}
 *
 * 运行：npm run test:imagetask
 */
import assert from "node:assert";

import { envelopeMessage, isSuccessCode, parseImageTaskState, pickSubmittedTaskId, upstreamProviderFromBaseUrl } from "../src/services/api/image-task.ts";

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

// —— 线上原样报文 ——
const SUBMIT_RESPONSE = {
    code: 200,
    data: [{ status: "submitted", task_id: "task_01M2T0Y8VT2F42K6X83H0S05HB" }],
};
const TASK_IMAGE_URL =
    "https://getapib.org/image/9998210272702196-f18c0b41-c603-48fc-9a84-3fd2abf0820d-image_task_01M2T0YKN9ZXCWCAGMHGNZ6GJ6_0.png";
const POLL_COMPLETED = {
    code: 200,
    data: {
        actual_time: 11,
        completed: 1789727297,
        cost: 0.020572,
        created: 1789727286,
        credits_cost: 0.20572,
        estimated_time: 100,
        id: "task_01M2T0Y8VT2F42K6X83H0S05HB",
        progress: 100,
        result: { images: [{ expires_at: 1789813697, url: [TASK_IMAGE_URL] }] },
        status: "completed",
    },
};
const NOT_FOUND = { error: { message: "Invalid URL (GET /v1/images/tasks/task_x)", type: "invalid_request_error", param: "", code: "" } };
const SYNC_OPENAI = { created: 1789727297, data: [{ b64_json: "iVBORw0KGgo=" }] };

console.log("异步任务制图片通道单元测试");

check("成功码：0 与 HTTP 风格 2xx 都算成功", () => {
    assert.strictEqual(isSuccessCode(0), true);
    assert.strictEqual(isSuccessCode(200), true, "apimart 用 code:200 表示成功，不能判成失败");
    assert.strictEqual(isSuccessCode(201), true);
    assert.strictEqual(isSuccessCode(undefined), true, "标准 OpenAI 响应没有 code 字段");
    assert.strictEqual(isSuccessCode("200"), true, "非数字一律不当作错误码");
});

check("成功码：4xx/5xx 与其它非零码仍是失败", () => {
    assert.strictEqual(isSuccessCode(400), false);
    assert.strictEqual(isSuccessCode(401), false);
    assert.strictEqual(isSuccessCode(500), false);
    assert.strictEqual(isSuccessCode(1), false, "genvideo 系用 0 表示成功，非零要判失败");
});

check("任务应答识别：只有带 task_id 才走轮询，同步通道不受影响", () => {
    assert.strictEqual(pickSubmittedTaskId(SUBMIT_RESPONSE), "task_01M2T0Y8VT2F42K6X83H0S05HB");
    assert.strictEqual(pickSubmittedTaskId(SYNC_OPENAI), "", "同步返回 b64 的通道不能被误判成任务制");
    assert.strictEqual(pickSubmittedTaskId({ code: 200, data: { status: "submitted" } }), "", "data 不是数组时不算");
    assert.strictEqual(pickSubmittedTaskId({}), "");
    assert.strictEqual(pickSubmittedTaskId(null), "");
});

check("取件解析：真实 completed 报文能取出图片地址", () => {
    const state = parseImageTaskState(POLL_COMPLETED);
    assert.strictEqual(state.status, "completed");
    assert.deepStrictEqual(state.urls, [TASK_IMAGE_URL], "url 字段是数组，要能展开取出");
});

check("取件解析：进行中 → pending，不误判为完成", () => {
    assert.strictEqual(parseImageTaskState({ code: 200, data: { status: "processing", progress: 40 } }).status, "pending");
    assert.strictEqual(parseImageTaskState({ code: 200, data: { status: "" } }).status, "pending");
});

check("取件解析：失败带原因（不能只回「请求失败」）", () => {
    const state = parseImageTaskState({ code: 200, data: { status: "failed", error: "内容审核未通过" } });
    assert.strictEqual(state.status, "failed");
    assert.strictEqual(state.error, "内容审核未通过");
});

check("取件解析：没有 status 但有图，按完成处理", () => {
    const state = parseImageTaskState({ code: 200, data: { result: { images: [{ url: ["https://cdn.example.com/a.png"] }] } } });
    assert.strictEqual(state.status, "completed");
    assert.deepStrictEqual(state.urls, ["https://cdn.example.com/a.png"]);
});

check("取件解析：结构无法识别时判失败并给出原因，而不是无限 pending", () => {
    assert.strictEqual(parseImageTaskState({ code: 200, data: "oops" }).status, "failed");
    assert.ok(parseImageTaskState({ code: 200, data: "oops" }).error.length > 0, "要带上可读原因");
});

check("错误文案提取：覆盖各家中转站字段名", () => {
    assert.strictEqual(envelopeMessage(NOT_FOUND), "Invalid URL (GET /v1/images/tasks/task_x)");
    assert.strictEqual(envelopeMessage({ error: "目标地址不在已注册渠道白名单内" }), "目标地址不在已注册渠道白名单内");
    assert.strictEqual(envelopeMessage({ msg: "积分不足" }), "积分不足");
    assert.strictEqual(envelopeMessage({ code: 200, data: { fail_reason: "上游超时" } }), "上游超时");
    assert.strictEqual(envelopeMessage({ code: 200, data: [{ error: "渠道不可用" }] }), "渠道不可用");
    assert.strictEqual(envelopeMessage({}), "");
});

check("上游渠道标识：从 baseUrl 取主机名（写进 GenerationJob.provider 供追账）", () => {
    assert.strictEqual(upstreamProviderFromBaseUrl("https://api.apimart.ai/v1"), "api.apimart.ai");
    assert.strictEqual(upstreamProviderFromBaseUrl("https://www.aigccc666.com/v1/"), "www.aigccc666.com");
    assert.strictEqual(upstreamProviderFromBaseUrl("http://127.0.0.1:3000/v1"), "127.0.0.1");
});

check("上游渠道标识：地址非法时给 unknown 而不是抛错（留痕绝不能拖垮生成）", () => {
    assert.strictEqual(upstreamProviderFromBaseUrl(""), "unknown");
    assert.strictEqual(upstreamProviderFromBaseUrl("not a url"), "unknown");
    assert.strictEqual(upstreamProviderFromBaseUrl(undefined), "unknown");
});

check("上游渠道标识：不会与轮询器认领的通道名撞车（撞了就等于把任务交给轮询器管）", () => {
    assert.notStrictEqual(upstreamProviderFromBaseUrl("https://api.replicate.com/v1"), "replicate");
});

console.log(failures.length === 0 ? `\n全部通过：${passed} 项` : `\n通过 ${passed} 项，失败 ${failures.length} 项：${failures.join("、")}`);
