/**
 * 逐 token 计费的单测（纯逻辑，无数据库、无网络）。
 *
 * 起因（2026-09-20，Phase 0 计费地基）：画布 Agent 一上线，文本就是最大的一块变动成本。
 * 过去文本是「按次、默认 0 积分」，等于免费；改成按 token 计价之后，
 * **单价 × 用量 = 钱**，任何一处算错都是直接漏钱或多收，而且错得很安静
 * （差额进不了任何报错，只进流水）。所以把这条链路上每一段纯逻辑都钉住：
 *
 *   1) 单价与倍率 → 积分（含取整规则、缓存折扣、0 成本的空扣费防线）；
 *   2) 上游报文 → 用量（四家字段名不同，认错就等于按错数收费）；
 *   3) SSE 流 → 用量（半行、跨分片、多字节切分 —— 漏一个 usage chunk 就是整轮免费）；
 *   4) 既有图片/视频/音频计价**不受影响**（Phase 0 的全部安全感来自这一条）。
 *
 * 运行：npm run test:textpricing
 */
import assert from "node:assert";

import {
    CREDIT_VALUE_CENTS,
    estimateGenerationCostCents,
    getGenerationCreditsCost,
    hasTextTokenPricing,
    readTokenUsage,
    textTurnCostCents,
    textTurnCredits,
    yuanToCredits,
} from "../src/lib/credit-pricing.ts";
import { createUsageScanner, readUsageFromPayload, teeStreamForUsage } from "../src/lib/generation/upstream-usage.ts";
import { sanitizePricing } from "../src/lib/model-capability-spec.ts";

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

/** DeepSeek 口径的一组后台配置价（元/百万 token） */
const DEEPSEEK = { textInputCostYuanPerMillion: 2, textOutputCostYuanPerMillion: 8, textCachedInputCostYuanPerMillion: 0.5 };

// —— 1. 积分面值：唯一一处换算常数 ——

check("积分面值常数 = 10 分（改它等于改所有历史流水口径）", () => {
    assert.strictEqual(CREDIT_VALUE_CENTS, 10);
    assert.strictEqual(yuanToCredits(0.1), 1);
    assert.strictEqual(yuanToCredits(1), 10);
    assert.strictEqual(yuanToCredits(10), 100);
});

check("元 → 积分：0 与脏值一律 0，不产生负积分", () => {
    assert.strictEqual(yuanToCredits(0), 0);
    assert.strictEqual(yuanToCredits(-3), 0);
    assert.strictEqual(yuanToCredits(Number.NaN), 0);
});

// —— 2. 成本（分）：缓存不许重复计，也不许当折扣乱扣 ——

check("成本 = 输入×输入价 + 输出×输出价（缓存为 0 时）", () => {
    const cents = textTurnCostCents(DEEPSEEK, { inputTokens: 1_000_000, outputTokens: 1_000_000 });
    assert.strictEqual(cents, 1000, "2 元输入 + 8 元输出 = 10 元 = 1000 分");
});

check("缓存命中的部分走缓存价，不重复按输入价计", () => {
    // 输入 100 万其中 40 万命中：60 万×2 + 40 万×0.5 + 100 万×8
    const cents = textTurnCostCents(DEEPSEEK, { inputTokens: 1_000_000, outputTokens: 1_000_000, cachedInputTokens: 400_000 });
    assert.strictEqual(cents, 940, "1.2 + 0.2 + 8 = 9.4 元 = 940 分");
});

check("没配缓存价时命中部分按输入价计（高估成本，方向安全）", () => {
    const withoutCachePrice = { textInputCostYuanPerMillion: 2, textOutputCostYuanPerMillion: 8 };
    const cents = textTurnCostCents(withoutCachePrice, { inputTokens: 1_000_000, outputTokens: 0, cachedInputTokens: 1_000_000 });
    assert.strictEqual(cents, 200, "全部命中也按输入价 2 元收，不给未经配置的折扣");
});

check("缓存命中数超过输入总数时按输入总数截断（不按缓存价多收）", () => {
    const cents = textTurnCostCents(DEEPSEEK, { inputTokens: 1_000_000, outputTokens: 0, cachedInputTokens: 2_000_000 });
    assert.strictEqual(cents, 50, "截断到 100 万 → 0.5 元；不截断会算成 100 分");
});

check("没配任何价时用内置草案（¥2/¥8/¥0.5），不是 0 也不是拍脑袋", () => {
    assert.strictEqual(textTurnCostCents(undefined, { inputTokens: 1_000_000, outputTokens: 0 }), 200);
    assert.strictEqual(textTurnCostCents(undefined, { inputTokens: 0, outputTokens: 1_000_000 }), 800);
    assert.strictEqual(textTurnCostCents(undefined, { inputTokens: 1_000_000, outputTokens: 0, cachedInputTokens: 1_000_000 }), 50);
});

check("成本四舍五入到分（一轮 3000/600 的草案估算 = 1 分）", () => {
    // 3000×2/1e6 = 0.006 元；600×8/1e6 = 0.0048 元 → 0.0108 元 → 1.08 分 → 1 分
    assert.strictEqual(textTurnCostCents(undefined, { inputTokens: 3000, outputTokens: 600 }), 1);
});

check("负值/脏用量算出 0 分，不会变成负成本", () => {
    assert.strictEqual(textTurnCostCents(DEEPSEEK, { inputTokens: -5, outputTokens: 0 }), 0);
    assert.strictEqual(textTurnCostCents(DEEPSEEK, { inputTokens: Number.NaN, outputTokens: Number.NaN }), 0);
});

// —— 3. 积分：倍率 × 成本，向上取整且不白送 ——

check("积分 = 成本 × 倍率（按面值换算）", () => {
    const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000 };
    assert.strictEqual(textTurnCredits(DEEPSEEK, usage, 2), 200, "10 元成本 ×2 = 20 元 = 200 积分");
    assert.strictEqual(textTurnCredits(DEEPSEEK, usage, 1), 100);
    assert.strictEqual(textTurnCredits(DEEPSEEK, usage, 3), 300);
});

check("不足 1 积分的轮次按 1 积分收（否则长会话会变成免费）", () => {
    assert.strictEqual(textTurnCredits(undefined, { inputTokens: 3000, outputTokens: 600 }, 2), 1);
});

check("积分向上取整：2.1 积分收 3（不是四舍五入成 2）", () => {
    // 105,000 输入 × ¥2/百万 = 0.21 元 = 21 分 → 2.1 积分 × 倍率 1
    assert.strictEqual(textTurnCredits(DEEPSEEK, { inputTokens: 105_000, outputTokens: 0 }, 1), 3);
});

check("零用量不产生空扣费流水（返回 0，调用方不会写流水）", () => {
    assert.strictEqual(textTurnCredits(DEEPSEEK, { inputTokens: 0, outputTokens: 0 }, 2), 0);
    assert.strictEqual(textTurnCredits(DEEPSEEK, { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 }, 2), 0);
});

check("倍率脏值（0/负数/NaN）当 1 用，不会算成免费或负积分", () => {
    const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000 };
    assert.strictEqual(textTurnCredits(DEEPSEEK, usage, 0), 100);
    assert.strictEqual(textTurnCredits(DEEPSEEK, usage, Number.NaN), 100);
    assert.strictEqual(textTurnCredits(DEEPSEEK, usage, -3), 100);
});

// —— 4. 「这个模型走 token 计费吗」的判定 ——

check("只有配了 token 单价才算走 token 计费（按次 textCredits 不算）", () => {
    assert.strictEqual(hasTextTokenPricing(undefined), false);
    assert.strictEqual(hasTextTokenPricing({}), false);
    assert.strictEqual(hasTextTokenPricing({ textCredits: 5 }), false);
    assert.strictEqual(hasTextTokenPricing({ textInputCostYuanPerMillion: 2 }), true);
    assert.strictEqual(hasTextTokenPricing({ textOutputCostYuanPerMillion: 8 }), true);
    assert.strictEqual(hasTextTokenPricing({ textCachedInputCostYuanPerMillion: 0.5 }), false, "只配缓存价不足以进入 token 计价");
});

// —— 5. 建任务那一刻：配了 token 价就不预扣（数量未知，预扣只能拍脑袋） ——

check("文本/工具类：配了 token 价 → 预扣 0，等用量回来再结", () => {
    assert.strictEqual(getGenerationCreditsCost("text", { model: "deepseek-chat" }, DEEPSEEK, undefined), 0);
    assert.strictEqual(getGenerationCreditsCost("tool", { model: "deepseek-chat" }, DEEPSEEK, undefined), 0);
});

check("文本/工具类：没配 token 价 → 完全沿用过去的行为（逐模型 > 全局 > 默认 0）", () => {
    assert.strictEqual(getGenerationCreditsCost("text", { model: "deepseek-chat" }, undefined, undefined), 0);
    assert.strictEqual(getGenerationCreditsCost("text", { model: "deepseek-chat" }, { textCredits: 3 }, undefined), 3);
    assert.strictEqual(getGenerationCreditsCost("tool", { model: "deepseek-chat" }, undefined, { textCredits: 4 }), 4);
    assert.strictEqual(getGenerationCreditsCost("text", { model: "deepseek-chat" }, { textCredits: 3 }, { textCredits: 4 }), 3, "逐模型优先于全局");
});

check("图片/视频/音频计价不受本次改动影响", () => {
    assert.strictEqual(getGenerationCreditsCost("image", { model: "gpt-image-1" }, undefined, undefined), 10);
    assert.strictEqual(getGenerationCreditsCost("image", { model: "gpt-image-1" }, undefined, { imageCredits: 7 }), 7);
    assert.strictEqual(getGenerationCreditsCost("video", { model: "MiniMax-H3", vquality: "768P" }, undefined, undefined), 20);
    assert.strictEqual(getGenerationCreditsCost("video", { model: "MiniMax-H3", vquality: "2K" }, undefined, undefined), 40);
    assert.strictEqual(getGenerationCreditsCost("video", { model: "MiniMax-H3", vquality: "2K" }, { videoCreditsHigh: 55 }, undefined), 55);
    assert.strictEqual(getGenerationCreditsCost("audio", { model: "minimax-tts" }, undefined, undefined), 1);
    assert.strictEqual(getGenerationCreditsCost("audio", { model: "minimax-tts" }, { audioCredits: 2 }, undefined), 2);
});

check("画质档位轴模型仍走逐档价，未填的档位回落基础价", () => {
    const configured = { imageCredits: 10, imageQualityCredits: { high: 40 } };
    assert.strictEqual(getGenerationCreditsCost("image", { model: "gpt-image-2.5-flare", quality: "high" }, configured, undefined), 40);
    assert.strictEqual(getGenerationCreditsCost("image", { model: "gpt-image-2.5-flare", quality: "medium" }, configured, undefined), 10);
});

// —— 6. 成本估算：文本类不再返回 null（null 会让毛利页静默漏掉整块文本花费） ——

check("文本成本估算永远有数：有 usage 用实价，没 usage 按假定用量估", () => {
    const withUsage = estimateGenerationCostCents("text", { model: "deepseek-chat", usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 } }, DEEPSEEK);
    assert.strictEqual(withUsage, 1000, "有 usage 就是实价");
    assert.strictEqual(withUsage, textTurnCostCents(DEEPSEEK, { inputTokens: 1_000_000, outputTokens: 1_000_000 }), "与结算同一口径");
    assert.strictEqual(estimateGenerationCostCents("text", { model: "deepseek-chat" }, undefined), 1, "没 usage 按草案用量估，不是 null");
    assert.strictEqual(estimateGenerationCostCents("tool", { model: "deepseek-chat" }, undefined), 1);
});

check("成本估算用得上后台配的单价（不是永远用草案）", () => {
    // 3000 输入×¥10/百万 = 3 分；600 输出×¥40/百万 = 2.4 分 → 5.4 → 5 分
    const configured = { textInputCostYuanPerMillion: 10, textOutputCostYuanPerMillion: 40 };
    assert.strictEqual(estimateGenerationCostCents("text", { model: "deepseek-chat" }, configured), 5);
});

check("图片/视频成本估算保持不变（本次没碰）", () => {
    assert.strictEqual(estimateGenerationCostCents("image", { model: "seedream-5-0-pro", size: "1024x1024" }), 30);
    assert.strictEqual(estimateGenerationCostCents("image", { model: "seedream-5-0-lite" }), 22);
    assert.strictEqual(estimateGenerationCostCents("video", { model: "MiniMax-H3", vquality: "768P" }), 40);
    assert.strictEqual(estimateGenerationCostCents("video", { model: "MiniMax-H3", vquality: "2K" }), 70);
    assert.strictEqual(estimateGenerationCostCents("audio", { model: "minimax-tts" }), 1);
});

// —— 7. 任务元数据里的 usage 读回来（结算与成本重算共用） ——

check("readTokenUsage：脏形状一律 null，好形状返回整数", () => {
    assert.strictEqual(readTokenUsage(undefined), null);
    assert.strictEqual(readTokenUsage({}), null);
    assert.strictEqual(readTokenUsage({ usage: null }), null);
    assert.strictEqual(readTokenUsage({ usage: [1, 2] }), null);
    assert.strictEqual(readTokenUsage({ usage: "1,2" }), null);
    assert.strictEqual(readTokenUsage({ usage: { inputTokens: 0, outputTokens: 0 } }), null, "全 0 不算有效用量");
    assert.deepStrictEqual(readTokenUsage({ usage: { inputTokens: 1200.7, outputTokens: "340", cachedInputTokens: 100 } }), {
        inputTokens: 1200,
        outputTokens: 340,
        cachedInputTokens: 100,
    });
});

// —— 8. 上游报文 → 用量：四家字段名收在一处 ——

check("OpenAI 兼容（含缓存明细）", () => {
    assert.deepStrictEqual(readUsageFromPayload({ usage: { prompt_tokens: 1200, completion_tokens: 340 } }), {
        inputTokens: 1200,
        outputTokens: 340,
        cachedInputTokens: 0,
    });
    assert.deepStrictEqual(readUsageFromPayload({ usage: { prompt_tokens: 1200, completion_tokens: 340, prompt_tokens_details: { cached_tokens: 900 } } }), {
        inputTokens: 1200,
        outputTokens: 340,
        cachedInputTokens: 900,
    });
});

check("DeepSeek 的缓存命中字段名（prompt_cache_hit_tokens）", () => {
    assert.deepStrictEqual(readUsageFromPayload({ usage: { prompt_tokens: 800, completion_tokens: 100, prompt_cache_hit_tokens: 600 } }), {
        inputTokens: 800,
        outputTokens: 100,
        cachedInputTokens: 600,
    });
});

check("Anthropic（input_tokens / output_tokens / cache_read_input_tokens）", () => {
    assert.deepStrictEqual(readUsageFromPayload({ usage: { input_tokens: 1500, output_tokens: 200, cache_read_input_tokens: 1200 } }), {
        inputTokens: 1500,
        outputTokens: 200,
        cachedInputTokens: 1200,
    });
});

check("Gemini（usageMetadata）", () => {
    assert.deepStrictEqual(readUsageFromPayload({ usageMetadata: { promptTokenCount: 700, candidatesTokenCount: 90, cachedContentTokenCount: 300 } }), {
        inputTokens: 700,
        outputTokens: 90,
        cachedInputTokens: 300,
    });
});

check("缓存数超过输入数按输入截断（不改价、只防多收）", () => {
    assert.deepStrictEqual(readUsageFromPayload({ usage: { prompt_tokens: 100, completion_tokens: 10, prompt_cache_hit_tokens: 400 } }), {
        inputTokens: 100,
        outputTokens: 10,
        cachedInputTokens: 100,
    });
});

check("认不出的报文返回 null，不会瞎报一个用量", () => {
    assert.strictEqual(readUsageFromPayload(null), null);
    assert.strictEqual(readUsageFromPayload("usage: 1200"), null);
    assert.strictEqual(readUsageFromPayload([{ prompt_tokens: 1 }]), null);
    assert.strictEqual(readUsageFromPayload({}), null);
    assert.strictEqual(readUsageFromPayload({ usage: {} }), null);
    assert.strictEqual(readUsageFromPayload({ usage: { prompt_tokens: 0, completion_tokens: 0 } }), null);
    assert.strictEqual(readUsageFromPayload({ choices: [{ text: "hi" }] }), null, "正常回复体不含用量");
});

// —— 9. SSE 流：原样透传 + 顺手扫用量 ——

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function sseChunk(payload) {
    return `data: ${JSON.stringify(payload)}\n\n`;
}

async function runTee(chunks) {
    const source = new ReadableStream({
        start(controller) {
            for (const chunk of chunks) controller.enqueue(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
            controller.close();
        },
    });
    const seen = [];
    const stream = teeStreamForUsage(source, (usage) => seen.push(usage));
    const out = [];
    const reader = stream.getReader();
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        out.push(value);
    }
    const bytes = new Uint8Array(out.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of out) {
        bytes.set(part, offset);
        offset += part.length;
    }
    return { bytes, seen };
}

const teeCases = [];

teeCases.push([
    "透传字节与上游完全一致（一个字节都不许改）",
    async () => {
        const body = `${sseChunk({ choices: [{ delta: { content: "你好" } }] })}${sseChunk({ choices: [{ delta: { content: "世界" } }] })}data: [DONE]\n\n`;
        const { bytes } = await runTee([body]);
        assert.strictEqual(decoder.decode(bytes), body);
    },
]);

teeCases.push([
    "整条流扫出最后一个 chunk 里的 usage",
    async () => {
        const body = `${sseChunk({ choices: [{ delta: { content: "hi" } }] })}${sseChunk({ choices: [{ delta: {} }], usage: { prompt_tokens: 1200, completion_tokens: 340 } })}data: [DONE]\n\n`;
        const { seen } = await runTee([body]);
        assert.deepStrictEqual(seen, [{ inputTokens: 1200, outputTokens: 340, cachedInputTokens: 0 }]);
    },
]);

teeCases.push([
    "usage chunk 被 TCP 从中间切开也照样认出来（漏它 = 整轮免费）",
    async () => {
        const body = `${sseChunk({ choices: [{ delta: { content: "hi" } }] })}${sseChunk({ usage: { prompt_tokens: 900, completion_tokens: 120 } })}data: [DONE]\n\n`;
        const cut = body.indexOf('{"usage"') + 12;
        const { seen, bytes } = await runTee([body.slice(0, cut), body.slice(cut)]);
        assert.deepStrictEqual(seen, [{ inputTokens: 900, outputTokens: 120, cachedInputTokens: 0 }]);
        assert.strictEqual(decoder.decode(bytes), body);
    },
]);

teeCases.push([
    "多字节字符被切在两片之间：不产生乱码、不丢用量（按 stream 解码）",
    async () => {
        const body = `${sseChunk({ choices: [{ delta: { content: "中文内容" } }] })}${sseChunk({ usage: { prompt_tokens: 10, completion_tokens: 5 } })}`;
        const raw = encoder.encode(body);
        const cut = body.indexOf("中") + 1; // 落在「中」这个字中间
        const { seen, bytes } = await runTee([raw.slice(0, cut), raw.slice(cut)]);
        assert.deepStrictEqual(seen, [{ inputTokens: 10, outputTokens: 5, cachedInputTokens: 0 }]);
        assert.deepStrictEqual(bytes, raw);
    },
]);

teeCases.push([
    "Anthropic 的两段式用量：message_start 给输入、message_delta 给输出，都不许丢",
    async () => {
        const body = `event: message_start\ndata: ${JSON.stringify({ type: "message_start", message: { usage: { input_tokens: 1500, output_tokens: 1 } } })}\n\n` + `event: message_delta\ndata: ${JSON.stringify({ type: "message_delta", usage: { output_tokens: 220 } })}\n\n`;
        const { seen } = await runTee([body]);
        assert.deepStrictEqual(seen, [{ inputTokens: 1500, outputTokens: 220, cachedInputTokens: 0 }]);
    },
]);

teeCases.push([
    "最后一行的 usage 没有换行符结尾也不放过（flush 补扫）",
    async () => {
        const { seen } = await runTee([`data: ${JSON.stringify({ usage: { prompt_tokens: 50, completion_tokens: 7 } })}`]);
        assert.deepStrictEqual(seen, [{ inputTokens: 50, outputTokens: 7, cachedInputTokens: 0 }]);
    },
]);

teeCases.push([
    "心跳/注释/DONE 这类非 JSON 行跳过，不影响透传也不报错",
    async () => {
        const body = `: ping\n\ndata: [DONE]\n\nnot-json-at-all\ndata: {oops\n\n`;
        const { seen, bytes } = await runTee([body]);
        assert.deepStrictEqual(seen, [], "没有用量就不该回调（否则会写出 0 积分的空流水）");
        assert.strictEqual(decoder.decode(bytes), body);
    },
]);

teeCases.push([
    "没有 usage 的流不产生结算回调",
    async () => {
        const { seen } = await runTee([sseChunk({ choices: [{ delta: { content: "hi" } }] }), "data: [DONE]\n\n"]);
        assert.strictEqual(seen.length, 0);
    },
]);

teeCases.push([
    "乱码/二进制分片不让扫描器抛错（透传优先）",
    async () => {
        const junk = new Uint8Array([0xff, 0xfe, 0x00, 0x80, 0x81, 0x0a, 0x0a]);
        const body = sseChunk({ usage: { prompt_tokens: 5, completion_tokens: 2 } });
        const { seen, bytes } = await runTee([junk, body]);
        assert.deepStrictEqual(seen, [{ inputTokens: 5, outputTokens: 2, cachedInputTokens: 0 }]);
        assert.strictEqual(bytes.length, junk.length + encoder.encode(body).length, "乱码分片照样原样透传");
    },
]);

teeCases.push([
    "结算回调抛错也不影响已经发完的响应",
    async () => {
        const body = sseChunk({ usage: { prompt_tokens: 5, completion_tokens: 2 } });
        const source = new ReadableStream({
            start(controller) {
                controller.enqueue(encoder.encode(body));
                controller.close();
            },
        });
        const stream = teeStreamForUsage(source, () => {
            throw new Error("结算写库失败");
        });
        let total = 0;
        const reader = stream.getReader();
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.length;
        }
        assert.strictEqual(total, encoder.encode(body).length);
    },
]);

teeCases.push([
    "异常上游一直不发换行也不会把内存吃光（缓冲有上界）",
    async () => {
        const scanner = createUsageScanner();
        const junk = "x".repeat(600_000);
        for (let i = 0; i < 4; i += 1) scanner.push(junk);
        // 缓冲被截断后，后续真正的 usage 仍要能扫到
        scanner.push(`\ndata: ${JSON.stringify({ usage: { prompt_tokens: 11, completion_tokens: 3 } })}\n\n`);
        assert.deepStrictEqual(scanner.flush(), { inputTokens: 11, outputTokens: 3, cachedInputTokens: 0 });
    },
]);

(async () => {
    for (const [name, fn] of teeCases) {
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

    // —— 10. 后台配置的清洗：单价必须是能保留小数的正数 ——

    check("sanitizePricing 保留两位小数单价（过去一律向下取整会把 ¥0.5 抹成 0）", () => {
        const pricing = sanitizePricing({ "deepseek-chat": { textInputCostYuanPerMillion: 0.5, textOutputCostYuanPerMillion: 2.35, textCachedInputCostYuanPerMillion: 0.125 } });
        assert.deepStrictEqual(pricing, { "deepseek-chat": { textInputCostYuanPerMillion: 0.5, textOutputCostYuanPerMillion: 2.35, textCachedInputCostYuanPerMillion: 0.13 } });
    });

    check("sanitizePricing 拒绝负单价与离谱单价（宁可不落库，也不留个赔钱价）", () => {
        const pricing = sanitizePricing({ m: { textInputCostYuanPerMillion: -1, textOutputCostYuanPerMillion: 100_000 } });
        assert.deepStrictEqual(pricing, undefined, "两项都非法 → 该模型整条不落库");
        assert.deepStrictEqual(sanitizePricing({ m: { textInputCostYuanPerMillion: "2.5" } }), { m: { textInputCostYuanPerMillion: 2.5 } });
        assert.deepStrictEqual(sanitizePricing({ m: { textInputCostYuanPerMillion: 0 } }), { m: { textInputCostYuanPerMillion: 0 } }, "0 是合法配置（显式免费），不是脏值");
    });

    check("清洗后回读：配了单价即进入 token 计价，且成本按配的价算", () => {
        const pricing = sanitizePricing({ "deepseek-chat": { textInputCostYuanPerMillion: 1, textOutputCostYuanPerMillion: 4 } });
        const configured = pricing["deepseek-chat"];
        assert.strictEqual(hasTextTokenPricing(configured), true);
        // 输入 100 万×¥1 = 100 分；输出 100 万×¥4 = 400 分
        assert.strictEqual(textTurnCostCents(configured, { inputTokens: 1_000_000, outputTokens: 1_000_000 }), 500);
    });

    console.log(`\n${passed} passed, ${failures.length} failed`);
})();
