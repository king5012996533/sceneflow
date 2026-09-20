/**
 * 上游端点形态白名单的单测（纯逻辑，无数据库、无网络）。
 *
 * 钉住的是安全审计 H1 的修复不变式：
 *   1) 产品实际用到的每种上游端点都在白名单里，分类与预期一致（少一条 = 线上整条链路 403）
 *   2) 白名单外的形态一律拒绝（多放一条 = 平台 Key 被拿去打别的端点）
 *   3) 生成类的模型绑定容错但有效（渠道编码名与解码名必须判成同一个模型，否则误伤付费用户）
 *
 * 第二个列表是**独立于白名单**写出来的：路径与出处直接照着客户端源码抄（注释里带文件名行号），
 * 所以它不是「表自己跟自己对齐」，而是「表跟客户端对齐」—— 客户端改了调用形态而白名单没跟上，
 * 这条用例会先失败。
 *
 * 运行：npm run test:endpointpolicy
 */
import assert from "node:assert";

import {
    describeUpstreamEndpoint,
    isModelBoundToJob,
    listUpstreamEndpointFixtures,
    readModelFromBody,
    readModelFromPathname,
    resolveJobCallBudget,
    resolveProxyJobGate,
    resolveUpstreamEndpointClass,
} from "../src/lib/generation/upstream-endpoint-policy.ts";

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

// —— 1) 白名单自洽：每条规则自带的样例必须命中它自己，且分类一致 ——
check("端点表自洽：每条规则的样例都命中本规则、分类与标注一致", () => {
    const fixtures = listUpstreamEndpointFixtures();
    assert.ok(fixtures.length >= 15, `fixtures 数量异常：${fixtures.length}`);
    for (const fixture of fixtures) {
        assert.strictEqual(resolveUpstreamEndpointClass(fixture.method, fixture.path), fixture.kind, `${fixture.method} ${fixture.path} 分类不符（应为 ${fixture.kind}）`);
        assert.strictEqual(describeUpstreamEndpoint(fixture.method, fixture.path), fixture.label, `${fixture.method} ${fixture.path} 中文名不符`);
    }
});

// —— 2) 客户端真实调用形态（照着源码抄的独立列表）——
const CLIENT_CALLS = [
    // [method, pathname, 期望分类, 出处]
    ["POST", "/v1/chat/completions", "generate", "image.ts 882/1070/1096 文本与工具轮次"],
    ["POST", "/v1/images/generations", "generate", "image.ts 1269 出图（JSON）"],
    ["POST", "/v1/images/edits", "generate", "image.ts 1380 参考图生图（form-data）"],
    ["POST", "/v1/audio/speech", "generate", "audio.ts 42 语音合成"],
    ["POST", "/v1/videos", "generate", "video.ts 247 OpenAI 视频任务创建（form-data）"],
    ["POST", "/v1/videos/generations", "generate", "video.ts 522 GenVideo 任务创建"],
    ["POST", "/v2/video_generation", "generate", "video.ts 418 MiniMax 任务创建"],
    ["POST", "/api/v3/contents/generations/tasks", "generate", "video.ts 299 Seedance 任务创建"],
    ["POST", "/api/external/v1/video/task/create", "generate", "video.ts 642 Aigccc 任务创建"],
    ["POST", "/v1/models/black-forest-labs/flux-1.1-pro/predictions", "generate", "image.ts 579 / video.ts 738 Replicate 预测"],
    ["POST", "/v1beta/models/gemini-3-pro-image:generateContent", "generate", "image.ts 1186 Gemini 出图"],
    ["POST", "/v1beta/models/gemini-3-pro-image:streamGenerateContent", "generate", "image.ts 1094 Gemini 流式"],
    ["POST", "/api/external/v1/video/task/status", "read", "video.ts 659 Aigccc 状态轮询（POST 但只读）"],
    ["POST", "/api/external/v1/image/upload/batch", "read", "video.ts 697 Aigccc 素材上传"],
    ["POST", "/v1/files", "read", "video.ts 850 Replicate 素材上传"],
    ["GET", "/v1/tasks/abc123", "read", "image.ts 421 图片任务取件"],
    ["GET", "/v1/videos/vid_1", "read", "video.ts 267 视频任务查询"],
    ["GET", "/v1/videos/vid_1/content", "read", "video.ts 269 成品下载"],
    ["GET", "/v2/query/video_generation/abc123", "read", "video.ts 434 MiniMax 查询"],
    ["GET", "/v1/predictions/xyz", "read", "image.ts 596 Replicate 轮询"],
    ["GET", "/v1beta/models/gemini-3-pro-image", "read", "image.ts 1496 Gemini 取模型"],
    ["GET", "/v1/models", "read", "image.ts 1507 拉模型列表"],
];

check("客户端真实调用形态全部命中，且分类正确", () => {
    for (const [method, path, expected, origin] of CLIENT_CALLS) {
        const actual = resolveUpstreamEndpointClass(method, path);
        assert.strictEqual(actual, expected, `${method} ${path}（${origin}）分类应为 ${expected}，实际 ${actual}`);
    }
});

check("生成类与读取类的数量与预期一致（防止有人整段删掉规则）", () => {
    const generated = CLIENT_CALLS.filter(([, , kind]) => kind === "generate");
    assert.strictEqual(generated.length, 12, "生成类端点数量变了：多一条要确认是否真要计费，少一条说明白名单被削");
});

// —— 3) 白名单外的形态一律拒绝 ——
const DENIED = [
    ["POST", "/v1/embeddings", "向量接口（产品不用）"],
    ["POST", "/v1/models", "模型列表的 POST 变体"],
    ["POST", "/v1/fine_tuning/jobs", "微调（贵且产品不用）"],
    ["POST", "/v1/audio/transcriptions", "语音转写（产品不用）"],
    ["POST", "/v1/batches", "批处理"],
    ["POST", "/v1/images/generations/extra", "在已知端点后加尾巴（不得被后缀匹配放行）"],
    ["POST", "/v1/chat/completions/../embeddings", "借已知端点伪装的路径"],
    ["PUT", "/v1/images/generations", "PUT 不在白名单"],
    ["PATCH", "/v1/chat/completions", "PATCH 不在白名单"],
    ["DELETE", "/v1/files/abc", "DELETE 不在白名单"],
    ["POST", "/api/external/v1/image/upload", "Aigccc 上传的另一种写法（未登记）"],
];

check("白名单外的形态一律判为拒绝（null）", () => {
    for (const [method, path, why] of DENIED) {
        assert.strictEqual(resolveUpstreamEndpointClass(method, path), null, `${method} ${path} 应被拒绝（${why}）`);
        assert.strictEqual(describeUpstreamEndpoint(method, path), "", `${method} ${path} 未命中时不应有中文名`);
    }
});

// —— 4) 模型绑定 ——
check("渠道编码模型名与解码后的名字判为同一模型（否则全部渠道出图会被 403）", () => {
    assert.strictEqual(isModelBoundToJob("ch1::seedream-4.0", "seedream-4.0"), true);
    assert.strictEqual(isModelBoundToJob("ch1::Seedream-4.0 ", "seedream-4.0"), true, "大小写与空白应被归一");
    assert.strictEqual(isModelBoundToJob("ch2::black-forest-labs/flux-1.1-pro", "black-forest-labs/flux-1.1-pro"), true);
    assert.strictEqual(isModelBoundToJob("ch1::gemini-3-pro-image", "gemini-3-pro-image"), true);
});

check("Replicate / Gemini 的路径模型与任务模型同族判定", () => {
    // Replicate：任务里记 owner/name，路径也是 owner/name
    assert.strictEqual(isModelBoundToJob("ch2::black-forest-labs/flux-1.1-pro", "black-forest-labs/flux-1.1-pro"), true);
    // Gemini：路径里可能带 models/ 前缀
    assert.strictEqual(isModelBoundToJob("ch1::gemini-3-pro-image", "models/gemini-3-pro-image"), true);
});

check("上游改写过的模型名仍判为同族（2026-09-20 线上回归：MiniMax 视频被误 403）", () => {
    // MiniMax 渠道允许把模型名设成 `H3`，发往上游时被 minimaxModelName 改写成 `MiniMax-H3`；
    // 任务元数据记的是 `H3`。按字面比较会把这条链路整条 403（上线当天真发生了）。
    assert.strictEqual(isModelBoundToJob("H3", "MiniMax-H3"), true);
    assert.strictEqual(isModelBoundToJob("MiniMax-H3", "H3"), true);
    assert.strictEqual(isModelBoundToJob("ch1::H3", "MiniMax-H3"), true);
    // 大小写与分隔符差异同样不该判成不匹配
    assert.strictEqual(isModelBoundToJob("ch1::hailuo-02", "Hailuo02"), true);
    assert.strictEqual(isModelBoundToJob("ch1::seedream-4.0", "seedream4.0"), true);
});

check("模型确实不同时判为不匹配", () => {
    assert.strictEqual(isModelBoundToJob("ch1::seedream-4.0", "gpt-5.6-terra"), false);
    assert.strictEqual(isModelBoundToJob("ch1::seedream-4.0::pro", "seedream-4.0::lite"), false, "同模型的选项不同也算不匹配（不同档位是不同价钱）");
    assert.strictEqual(isModelBoundToJob("ch1::MiniMax-H3", "MiniMax-H3-HD"), false, "只是前缀相同、帧率档位不同，不算同族");
    assert.strictEqual(isModelBoundToJob("ch1::flux-1.1-pro", "flux-1.1"), false, "同一个模型名被截断不算同族");
});

check("任一侧取不到模型名时放行（绑定只管模型，任务门闸另算）", () => {
    assert.strictEqual(isModelBoundToJob("", "seedream-4.0"), true);
    assert.strictEqual(isModelBoundToJob(undefined, "seedream-4.0"), true);
    assert.strictEqual(isModelBoundToJob("ch1::seedream-4.0", ""), true);
});

// —— 5) 模型名的两个来源 ——
check("请求体取模型名；取不到时返回空串（不抛错）", () => {
    assert.strictEqual(readModelFromBody({ model: "seedream-4.0" }), "seedream-4.0");
    assert.strictEqual(readModelFromBody({ model: "  seedream-4.0  " }), "seedream-4.0");
    assert.strictEqual(readModelFromBody({}), "");
    assert.strictEqual(readModelFromBody(null), "");
    assert.strictEqual(readModelFromBody({ model: 42 }), "");
});

check("路径取模型名：Gemini 与 Replicate 两条链路", () => {
    assert.strictEqual(readModelFromPathname("/v1beta/models/gemini-3-pro-image:generateContent"), "gemini-3-pro-image");
    assert.strictEqual(readModelFromPathname("/v1beta/models/gemini-3-pro-image:streamGenerateContent"), "gemini-3-pro-image");
    assert.strictEqual(readModelFromPathname("/v1/models/black-forest-labs/flux-1.1-pro/predictions"), "black-forest-labs/flux-1.1-pro");
    assert.strictEqual(readModelFromPathname("/v1/images/generations"), "", "模型写在请求体里的链路，路径取不到名字");
});

// —— 6) 单任务调用预算 ——
check("调用预算跟着任务类型与张数走", () => {
    assert.strictEqual(resolveJobCallBudget("image", 1), 3, "一张图留一次画幅重投 + 一次编辑改道的余量");
    assert.strictEqual(resolveJobCallBudget("image", 15), 17, "Gemini 出图是一张一次调用");
    assert.strictEqual(resolveJobCallBudget("image", undefined), 3, "张数缺失按 1 张算");
    assert.strictEqual(resolveJobCallBudget("image", 999), 52, "张数上限 50");
    assert.strictEqual(resolveJobCallBudget("video", 1), 3);
    assert.strictEqual(resolveJobCallBudget("text", 1), 3);
    assert.strictEqual(resolveJobCallBudget("audio", 1), 3);
    assert.strictEqual(resolveJobCallBudget(undefined, 1), 3);
});

// —— 7) 门闸开关：默认开，只有显式关闭词才关 ——
check("门闸默认开着；off/0/false/no 才关", () => {
    assert.strictEqual(resolveProxyJobGate({}).enabled, true, "默认必须开着，否则这次修复等于没上线");
    assert.strictEqual(resolveProxyJobGate({ PROXY_JOB_GATE: "" }).enabled, true);
    assert.strictEqual(resolveProxyJobGate({ PROXY_JOB_GATE: "on" }).enabled, true);
    assert.strictEqual(resolveProxyJobGate({ PROXY_JOB_GATE: "OFF" }).enabled, false);
    assert.strictEqual(resolveProxyJobGate({ PROXY_JOB_GATE: "off" }).enabled, false);
    assert.strictEqual(resolveProxyJobGate({ PROXY_JOB_GATE: "0" }).enabled, false);
    assert.strictEqual(resolveProxyJobGate({ PROXY_JOB_GATE: "false" }).enabled, false);
    assert.strictEqual(resolveProxyJobGate({ PROXY_JOB_GATE: "no" }).enabled, false);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
