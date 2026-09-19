/**
 * 代理客户端「报文解包」单测（纯逻辑，fetch 用桩替掉）。
 *
 * 起因：2026-09-19 对话报「上游没有返回任何候选结果」。查下去发现是 proxyFetch 把
 * 「调用结局对象」{ deferred, data } 当成上游报文整个交了回来 —— 调用方读 choices / code /
 * task_id 全是 undefined。这条链路要是没有断言钉住，改一次代理返回结构就会再犯一次，
 * 而且症状会散落在对话、视频、任务制图片各处，看起来互不相关。
 *
 * 运行：npm run test:proxyclient
 */
import assert from "node:assert";

import { proxyFetch, proxyFetchDeferrable, readProxyOutcome } from "../src/services/api/proxy-client.ts";

let passed = 0;
const failures = [];

async function check(name, fn) {
    try {
        await fn();
        passed++;
        console.log(`  ok  ${name}`);
    } catch (error) {
        failures.push(name);
        console.error(`  FAIL ${name}\n       ${error.message}`);
        process.exitCode = 1;
    }
}

const realFetch = globalThis.fetch;
const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
function stubFetch(handler) {
    globalThis.fetch = async (url, init) => handler(url, init);
}

await check("拿到上游报文本身：绝不能把 {deferred,data} 交出去", async () => {
    const upstream = { id: "x", object: "chat.completion", choices: [{ index: 0, message: { role: "assistant", content: "收到" } }] };
    stubFetch(() => jsonResponse(upstream));
    const payload = await proxyFetch({ url: "https://api.deepseek.com/v1/chat/completions", method: "POST", body: { model: "deepseek-flash" } });
    assert.deepStrictEqual(payload, upstream, "调用方必须直接拿到上游报文");
    assert.strictEqual(payload.deferred, undefined, "报文里不该多出 deferred");
    assert.strictEqual(payload.choices[0].message.content, "收到", "choices 必须读得到（线上就是这么读空的）");
});

await check("信封里的错误照旧抛出来，不因为解包而丢掉", async () => {
    stubFetch(() => jsonResponse({ error: { message: "boom" } }, 400));
    await assert.rejects(() => proxyFetch({ url: "https://x/y", method: "POST" }), /boom/);
});

await check("413 仍然翻译成人话（体积超限）", async () => {
    stubFetch(() => jsonResponse({}, 413));
    await assert.rejects(() => proxyFetch({ url: "https://x/y", method: "POST" }), /过大|超过/);
});

await check("没声明可延后时，服务端不该把这次调用接管掉", async () => {
    stubFetch(() => jsonResponse({ deferred: true, jobId: "j1" }, 202));
    await assert.rejects(() => proxyFetch({ url: "https://x/y", method: "POST" }), /接管/);
});

await check("可延后的调用：202 给任务号，同步返回给报文（两种结局都要能读出字段）", async () => {
    stubFetch(() => jsonResponse({ deferred: true, jobId: "job-42" }, 202));
    const deferred = await proxyFetchDeferrable({ url: "https://x/y", method: "POST", deferrable: true });
    assert.deepStrictEqual(deferred, { deferred: true, jobId: "job-42" });

    const upstream = { data: [{ url: "https://x/y.png" }] };
    stubFetch(() => jsonResponse(upstream));
    const sync = await proxyFetchDeferrable({ url: "https://x/y", method: "POST", deferrable: true });
    assert.strictEqual(sync.deferred, false);
    assert.deepStrictEqual(sync.data, upstream, "同步分支要把上游报文放进 data");
});

await check("readProxyOutcome 直接吃 Response 时同样解包", async () => {
    const upstream = { code: 200, data: [{ status: "submitted", task_id: "task_1" }] };
    const outcome = await readProxyOutcome(jsonResponse(upstream));
    assert.strictEqual(outcome.deferred, false);
    assert.deepStrictEqual(outcome.data, upstream);
});

await check("blob 通道不受影响", async () => {
    stubFetch(() => new Response("binary", { status: 200 }));
    const blob = await proxyFetch({ url: "https://x/y.mp4", method: "GET", responseType: "blob" });
    assert.ok(blob instanceof Blob, "应拿到 Blob");
});

globalThis.fetch = realFetch;

console.log(`\n代理客户端解包单测：${passed} 通过 / ${failures.length} 失败`);
if (failures.length) {
    console.error(`失败用例：${failures.join("、")}`);
    process.exitCode = 1;
}
