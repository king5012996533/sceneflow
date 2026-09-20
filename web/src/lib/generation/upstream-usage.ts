/**
 * 上游 token 用量的采集（2026-09-20，Phase 0 计费地基）。
 *
 * 为什么采集点放在**服务端代理**而不是客户端上报：用量直接等于钱。
 * 客户端能上报的东西就能伪造 —— 这是 H-6「服务端确权」的同一口径
 * （张数、时长、模型都已经是服务端确权，用量没理由例外）。
 *
 * 这里只做两件纯事，不碰数据库、不碰网络，便于直接单测：
 *   1) 从一份上游报文里认出用量（各家字段名不一样，收在一处）；
 *   2) 把一条 SSE 流转成「原样透传 + 顺手扫用量」。
 *
 * 用法用量在**流结束后**才算完整：OpenAI 兼容接口把 usage 放在最后一个 chunk
 * （且需要请求侧带 stream_options.include_usage:true），Anthropic 把输入用量放在
 * message_start、输出用量放在 message_delta —— 所以扫描器按「逐字段取最后一次出现的值」
 * 累积，而不是整体覆盖：整体覆盖会把 message_start 里的输入 token 丢掉。
 */

import type { TokenUsage } from "@/lib/credit-pricing";

/** 从任意一份上游报文里取用量；认不出返回 null */
export function readUsageFromPayload(payload: unknown): TokenUsage | null {
    if (!payload || typeof payload !== "object") return null;
    const root = payload as Record<string, unknown>;

    // OpenAI 兼容 / DeepSeek / 中转站：{ usage: { prompt_tokens, completion_tokens, prompt_tokens_details.cached_tokens } }
    // Anthropic 流式的 message_start 把用量嵌在 message 里（{ type, message: { usage } }）——
    // 输入 token 只出现在这一个事件里，取不到就等于整轮输入免费。
    const usage = pickObject(root.usage) ?? pickObject(pickObject(root.message)?.usage);
    if (usage) {
        const input = firstNumber(usage.prompt_tokens, usage.input_tokens, usage.inputTokens, usage.promptTokenCount);
        const output = firstNumber(usage.completion_tokens, usage.output_tokens, usage.outputTokens, usage.candidatesTokenCount);
        if (input !== undefined || output !== undefined) {
            const cached = firstNumber(
                pickObject(usage.prompt_tokens_details)?.cached_tokens,
                usage.prompt_cache_hit_tokens,
                usage.cache_read_input_tokens,
                usage.cachedInputTokens,
                usage.cached_tokens,
            );
            return normalize(input, output, cached);
        }
    }

    // Gemini：{ usageMetadata: { promptTokenCount, candidatesTokenCount, cachedContentTokenCount } }
    const gemini = pickObject(root.usageMetadata);
    if (gemini) {
        const result = normalize(firstNumber(gemini.promptTokenCount), firstNumber(gemini.candidatesTokenCount), firstNumber(gemini.cachedContentTokenCount));
        if (result) return result;
    }

    return null;
}

/**
 * SSE 用量扫描器：喂进文本片段，累积出用量。
 *
 * 按行扫描（`data: {...}`），并且**跨 chunk 记住半行** —— 一个 TCP 分片从中间切开一行是常态，
 * 不缓存半行就会漏掉正好被切开的那个 usage chunk（而它往往是唯一的 usage chunk）。
 */
export function createUsageScanner() {
    let buffer = "";
    let usage: TokenUsage | null = null;

    const absorb = (payload: unknown) => {
        const found = readUsageFromPayload(payload);
        if (!found) return;
        usage = {
            inputTokens: found.inputTokens || usage?.inputTokens || 0,
            outputTokens: found.outputTokens || usage?.outputTokens || 0,
            cachedInputTokens: found.cachedInputTokens || usage?.cachedInputTokens || 0,
        };
    };

    return {
        push(text: string) {
            buffer += text;
            let index = buffer.indexOf("\n");
            while (index >= 0) {
                const line = buffer.slice(0, index).trim();
                buffer = buffer.slice(index + 1);
                if (line.startsWith("data:")) {
                    const data = line.slice(5).trim();
                    if (data && data !== "[DONE]") {
                        try {
                            absorb(JSON.parse(data));
                        } catch {
                            // 不是 JSON 的行（注释、心跳）直接跳过，不影响透传
                        }
                    }
                }
                index = buffer.indexOf("\n");
            }
            // 半行留到下一片；但别让它无限增长（异常上游可能一直不发换行）
            if (buffer.length > 1_000_000) buffer = buffer.slice(-1024);
        },
        /** 收尾时还要冲一次：最后一行可能没有换行符结尾 */
        flush() {
            const rest = buffer.trim();
            buffer = "";
            if (rest.startsWith("data:")) {
                const data = rest.slice(5).trim();
                if (data && data !== "[DONE]") {
                    try {
                        absorb(JSON.parse(data));
                    } catch {
                        /* 同上 */
                    }
                }
            }
            return usage;
        },
        usage: () => usage,
    };
}

/**
 * 给流式响应套一层「原样透传 + 顺手扫描」。
 *
 * 两条不变量：
 *   1) **字节原样**：客户端拿到的每一片就是上游发来的那一片（解码只为扫描，绝不参与写出）；
 *   2) 扫描失败绝不影响透传（解码或 JSON 出错都吞掉）。
 * 多字节字符被切开时，用 `{ stream: true }` 的 TextDecoder 续着解，不会解出乱码再去解析、
 * 也不会因为半截字符把 JSON 匹配搞乱。
 */
export function teeStreamForUsage(body: ReadableStream<Uint8Array>, onUsage: (usage: TokenUsage) => void): ReadableStream<Uint8Array> {
    const scanner = createUsageScanner();
    const decoder = new TextDecoder();
    return body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
            transform(chunk, controller) {
                controller.enqueue(chunk);
                try {
                    scanner.push(decoder.decode(chunk, { stream: true }));
                } catch {
                    /* 扫描失败不影响透传 */
                }
            },
            flush() {
                const usage = scanner.flush();
                if (usage) {
                    try {
                        onUsage(usage);
                    } catch {
                        /* 结算失败不该影响已经发完的响应 */
                    }
                }
            },
        }),
    );
}

function pickObject(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function firstNumber(...values: unknown[]): number | undefined {
    for (const value of values) {
        const num = Number(value);
        if (Number.isFinite(num)) return num;
    }
    return undefined;
}

function normalize(input: number | undefined, output: number | undefined, cached: number | undefined): TokenUsage | null {
    const inputTokens = Math.max(0, Math.floor(input || 0));
    const outputTokens = Math.max(0, Math.floor(output || 0));
    const cachedInputTokens = Math.max(0, Math.floor(cached || 0));
    if (inputTokens <= 0 && outputTokens <= 0) return null;
    // 缓存命中数不该超过输入总数（上游口径若给了个更大的数，按输入总数截断，避免算成负数计费）
    return { inputTokens, outputTokens, cachedInputTokens: Math.min(cachedInputTokens, inputTokens) };
}
