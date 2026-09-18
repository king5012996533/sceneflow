import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { assertAllowedProxyUrl, fetchSafely } from "@/lib/url-safety";
import { salvageGenerationArtifacts } from "@/lib/generation/generation-rescue.server";
import { settleDeferredClientFailure } from "@/lib/generation/generation-jobs.server";
import { beginUpstreamCall } from "@/lib/generation/upstream-inflight";
import { authorizeUpstreamRequest, pickContentType, stripCredentialHeaders } from "@/lib/generation/upstream-auth.server";
import { canRunOnServer, resolveServerRunPolicy, shouldPersistEnvelope, type UpstreamEnvelope } from "@/lib/generation/generation-envelope";
import { findRunnableGenerationJob, startServerRun } from "@/lib/generation/generation-run.server";
import { saveUpstreamEnvelope } from "@/lib/generation/generation-spool.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROXY_REQUEST_BYTES = 32 * 1024 * 1024;
// 原始文件上传（Replicate Files API 等）：base64 包一层后约 40MB，兼容服务器 nginx 50m 限制
const MAX_PROXY_RAW_BYTES = 30 * 1024 * 1024;
const MAX_PROXY_ENVELOPE_BYTES = 41 * 1024 * 1024;
// 图片/视频中转模型（ggwk/中转站）出图常需 30~120s + 排队，120s 偏紧。
// nginx proxy_read_timeout 已配 300s；此值取 240s，让应用先于 nginx 返回带说明的超时 JSON，
// 避免 nginx 掐断产生裸 504。
// 非流式请求超时上限：慢中转（排队 + 慢模型）单次出图可达 5-15 分钟。
// 曾为 240s，ggwk 等中转站收单即扣费、出图超过 240s 时会被这里中止导致「扣费无结果」。
// 600s 时发现与 nginx proxy_read_timeout 600s 完全相等形成竞态：响应接近 600s 时 nginx 先掐断，
// 浏览器报「请求没有成功到达模型服务」（Failed to fetch），而中转站已扣费。
// 现取 900s（15 分钟）；部署侧 nginx proxy_read_timeout 必须 > 此值（1200s），
// 确保应用先于 nginx 返回带说明的超时 JSON，而不是 nginx 裸断产生 Failed to fetch。
// form-data 代理（参考图生图 /images/edits 主路径）已同步 900s，勿只改这里。
const PROXY_TIMEOUT_MS = 900_000;
// blob 透传（视频 /videos/{id}/content 等成品下载）的体积护栏：仅在有 Content-Length 时校验
const MAX_PROXY_BLOB_BYTES = 200 * 1024 * 1024;
const ALLOWED_HEADER_NAMES = new Set(["authorization", "content-type", "accept", "prefer", "x-api-key", "x-request-id", "x-sf-provider", "x-sf-model"]);

type KeySource = "platform" | "none";

export async function POST(req: NextRequest) {
    const user = await requireCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_PROXY_ENVELOPE_BYTES) {
        return NextResponse.json({ error: "请求内容过大：素材总请求体超过代理限制。请压缩素材、减少参考素材数量，或改用公网素材 URL。" }, { status: 413 });
    }

    // 标记本次是否由我们自己的超时中止（区别于网络错误等），用于给客户端返回可操作的中文说明
    let timedOut = false;
    const startedAt = Date.now();

    try {
        const envelope = (await req.json()) as {
            url?: unknown;
            method?: unknown;
            headers?: unknown;
            body?: unknown;
            bodyBase64?: unknown;
            responseType?: unknown;
            stream?: unknown;
            /** 本次上游调用属于哪条生成任务：有值且上游确实产出了成品时，服务端就地抢救归档 */
            jobId?: unknown;
            /** 调用方声明「我能接受延后取结果」：是否真的延后由服务端按环境开关决定（阶段 2） */
            deferrable?: unknown;
        };

        const target = await assertAllowedProxyUrl(String(envelope.url || ""));
        const safeHeaders = sanitizeHeaders(envelope.headers);

        // —— API Key 解析（平台 Key 化） ——
        // 平台统一配置的凭证（按目标 host + 可选 provider/model 匹配，admin 在后台管理）；
        // 无平台凭证 → 无 Key（BYOK 已彻底移除，不回落用户自带 Key）
        const sfProvider = typeof safeHeaders["x-sf-provider"] === "string" ? safeHeaders["x-sf-provider"] : undefined;
        const sfModel = typeof safeHeaders["x-sf-model"] === "string" ? safeHeaders["x-sf-model"] : undefined;

        // 鉴权与白名单：与其他两条上游路径（form-data 代理、信封重放）共用同一份实现
        const authorization = await authorizeUpstreamRequest({ headers: safeHeaders, targetUrl: target.toString(), providerHint: sfProvider, modelHint: sfModel });
        // 代理白名单：只放行已注册渠道（目标必须与凭证同源）。
        // 只做同源校验、不做路径前缀限制（各渠道端点拼接规则不同，见 isCredentialTargetAllowed）。
        // 无凭证（未注册 host）或跨源目标直接拒绝，避免把请求发往任意地址。
        if (!authorization) {
            return NextResponse.json({ error: "目标地址不在已注册渠道白名单内" }, { status: 403 });
        }
        const keySource: KeySource = "platform";
        console.log(`[proxy] key-source=${keySource} target=${target.hostname}${target.pathname}`);

        const upstreamBody = buildUpstreamBody(envelope.body, envelope.bodyBase64, safeHeaders);
        const isRawUpload = typeof envelope.bodyBase64 === "string" && (envelope.bodyBase64 as string).length > 0;
        // 大字段（base64 素材信封 / dataUrl 数组）转成上游请求体后立即解除引用：
        // 慢中转单次生成最长等 15 分钟，别让 30-40MB 的请求体常驻内存推高 RSS（PM2 会按 900M 重启进程，
        // 一旦重启 nginx 对所有在途请求裸断 502，而中转站已扣费）
        envelope.body = undefined;
        envelope.bodyBase64 = undefined;
        if (upstreamBody.byteLength > (isRawUpload ? MAX_PROXY_RAW_BYTES : MAX_PROXY_REQUEST_BYTES)) {
            return NextResponse.json(
                { error: isRawUpload ? "素材文件过大：单个参考素材超过 30MB，请压缩后重试或改用公网素材 URL。" : "请求内容过大：单张或多张参考素材的总请求体超过代理限制。请压缩图片、减少参考素材，或改用公网素材 URL。" },
                { status: 413 },
            );
        }

        const controller = new AbortController();
        // 流式请求（SSE/文本流）不设超时：长对话可能持续数分钟，由客户端自行中止；
        // 非流式请求保持 900s 上限防止上游挂起（慢中转出图/出片可达 5-15 分钟，见 PROXY_TIMEOUT_MS 注释）。
        const timeout =
            envelope.stream === true
                ? null
                : setTimeout(() => {
                      timedOut = true;
                      controller.abort();
                  }, PROXY_TIMEOUT_MS);

        const method = sanitizeMethod(envelope.method);
        const jobId = typeof envelope.jobId === "string" && envelope.jobId ? envelope.jobId : "";

        // —— 阶段 2：把这次调用交给服务端执行，浏览器不再等长连接 ——
        // 客户端在信封里声明「我能接受延后取结果」（deferrable），是否真的延后由服务端按环境开关决定：
        // 开关关着时这里整个跳过，走的还是原来的同步路径（回滚不需要改客户端、也不需要重新构建前端）。
        const serverRunPolicy = resolveServerRunPolicy();
        const canDefer = envelope.deferrable === true && canRunOnServer({ policy: serverRunPolicy, provider: authorization.provider, url: target.toString(), stream: envelope.stream, responseType: envelope.responseType, hasJobId: Boolean(jobId) });
        if (canDefer) {
            const job = await findRunnableGenerationJob(user.id, jobId);
            if (job) {
                const deferredEnvelope: Omit<UpstreamEnvelope, "savedAt"> = {
                    url: target.toString(),
                    method,
                    headers: stripCredentialHeaders(safeHeaders),
                    contentType: pickContentType(safeHeaders),
                    provider: authorization.provider,
                    model: sfModel,
                    bodyBytes: upstreamBody.byteLength,
                    origin: "defer",
                };
                // 信封先落盘再交给后台执行：进程若在落盘前死掉，这一单既没有成品也没有信封
                const stored = await saveUpstreamEnvelope({ userId: user.id, jobId, envelope: deferredEnvelope, body: upstreamBody.value as Buffer | string | undefined });
                if (stored) {
                    // 必须把**存下来的那一份**交给执行器：请求体在磁盘上，执行时靠 spoolKey 去读。
                    // 拿内存里这份（没有 spoolKey）去跑，等于发空请求体，上游回 400（线上真踩过）。
                    startServerRun({ job, envelope: stored });
                    console.log(`[proxy] 任务 ${jobId} 转由服务端执行（渠道 ${authorization.provider}）：浏览器不再持有这条长连接`);
                    return NextResponse.json({ deferred: true, jobId, status: "running" }, { status: 202 });
                }
                // 信封存不下来就别逞强：这类请求正是最需要「活下来的凭据」的，落回同步路径用户才拿得到图
                console.warn(`[proxy] 任务 ${jobId} 信封落库失败，回落到同步路径`);
            }
        }

        // 留信封（阶段 1）：把「怎么问上游」记在任务上，调用方死在半路时服务端能原样再问一次。
        // 鉴权头不落库（Key 只在发送那一刻注入），重放时重新解析。
        if (shouldPersistEnvelope({ stream: envelope.stream === true, hasJobId: Boolean(jobId), bodyBytes: upstreamBody.byteLength, responseType: envelope.responseType })) {
            await saveUpstreamEnvelope({
                userId: user.id,
                jobId,
                envelope: {
                    url: target.toString(),
                    method,
                    headers: stripCredentialHeaders(safeHeaders),
                    contentType: pickContentType(safeHeaders),
                    provider: authorization.provider,
                    model: sfModel,
                    bodyBytes: upstreamBody.byteLength,
                    origin: "live",
                },
                body: upstreamBody.value as Buffer | string | undefined,
            });
        }

        // 登记「我们发往上游的这一次调用还在飞」：浏览器那条长连接断了之后，
        // 客户端会立刻报失败结账，可上游其实还在跑、还在收我们的钱。
        // 结算侧据此先不结账（见 generation-jobs.server.ts），等这里真正看见上游结果再定论。
        const releaseUpstreamCall = beginUpstreamCall(jobId);
        try {
            const response = await fetchSafely(target.toString(), {
                method,
                headers: safeHeaders,
                body: upstreamBody.value as BodyInit | undefined,
                signal: controller.signal,
            });
            // 请求体已发出（收到响应头即已写完），上游请求体缓冲可以释放
            upstreamBody.value = undefined;

            // 流式透传（SSE / 文本流）：把上游 body 流原样转给客户端
            if (envelope.stream === true) {
                return new NextResponse(response.body, {
                    status: response.status,
                    headers: {
                        "Content-Type": response.headers.get("Content-Type") || "text/event-stream; charset=utf-8",
                        "Cache-Control": "no-cache, no-transform",
                        "X-Accel-Buffering": "no",
                    },
                });
            }

            if (envelope.responseType === "blob") {
                // 成品素材（视频/图片）下载：直接把上游流透传给客户端，不在服务端整段缓冲。
                // 视频可达几十上百 MB，曾用 arrayBuffer() 整段读入内存，多个视频并发完成时
                // RSS 冲破 PM2 上限触发进程重启 → nginx 对所有在途请求裸断 502（中转站已扣费）。
                const contentLength = response.headers.get("Content-Length");
                if (contentLength && Number(contentLength) > MAX_PROXY_BLOB_BYTES) {
                    return NextResponse.json({ error: "素材体积超过代理限制（200MB）" }, { status: 413 });
                }
                return new NextResponse(response.body, {
                    status: response.status,
                    headers: {
                        "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
                        ...(contentLength ? { "Content-Length": contentLength } : {}),
                        "X-Accel-Buffering": "no",
                    },
                });
            }

            const data = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }));
            if (response.status >= 400) {
                const snippet = typeof data === "object" && data !== null ? JSON.stringify(data).slice(0, 400) : String(data).slice(0, 400);
                const masked = safeHeaders.authorization ? safeHeaders.authorization.replace(/^Bearer\s+/i, "").replace(/^(.{6}).*(.{4})$/, "$1****$2") : "none";
                console.error(`[proxy] 上游 ${response.status} ${method} ${target} key=${masked}: ${snippet}`);
            }
            // 上游产出即抢救：成品每个字节都经过这里，就地留给服务端，
            // 之后用户标签页死没死、上游直链过没过期，都不再影响交付（见 generation-rescue.server.ts）
            if (response.ok && jobId) {
                try {
                    await salvageGenerationArtifacts({ userId: user.id, jobId, payload: data, source: `proxy ${method} ${target.pathname}` });
                } catch (error) {
                    console.error("[generation-rescue] 抢救异常", error instanceof Error ? error.message : error);
                }
            }
            return NextResponse.json(data, { status: response.status });
        } finally {
            if (timeout) clearTimeout(timeout);
            releaseUpstreamCall();
            // 上游结果已经落地（要不要抢救也已经有结论）：这时候若客户端早已放弃且没被抢救认领，
            // 才轮到我们代为结账退款 —— 拿不准的情形一律留着，见 settleDeferredClientFailure
            if (jobId) {
                void settleDeferredClientFailure(user.id, jobId).catch((error) => console.error("[generation-settle] 代为结账异常", error instanceof Error ? error.message : error));
            }
        }
    } catch (err: unknown) {
        // 我们自己的超时中止：上游（通常是中转站）可能已收单并扣费、仍在生成，只是响应超过了时限
        if (timedOut) {
            console.error(`[proxy] 上游超时中止 elapsed=${Math.round((Date.now() - startedAt) / 1000)}s`);
            return NextResponse.json({ error: `上游处理超时（超过 ${PROXY_TIMEOUT_MS / 60000} 分钟），请求已中止。任务可能仍在上游运行并已计费，请稍后到中转站后台确认任务状态；如已出图/出片，把上游任务 ID 反馈给我们以便找回结果。` }, { status: 504 });
        }
        const message = err instanceof Error ? err.message : "代理请求失败";
        const cause = err instanceof Error && err.cause instanceof Error && err.cause.message && err.cause.message !== message ? `: ${err.cause.message}` : "";
        console.error("[proxy]", message + cause);
        if (message.includes("不允许") || message.includes("非法") || message.includes("重定向")) {
            return NextResponse.json({ error: message + cause }, { status: 400 });
        }
        // 生成途中连接被掐断（socket hang up / ECONNRESET 等）：上游往往已收单扣费、任务仍在跑。
        // 归为 504 并给出可操作说明，不再裸报 502 让用户误以为是「上游接口异常」。
        if (/socket hang up|econnreset|econnrefused|epipe|fetch failed|terminated|network error|getaddrinfo/i.test(message + cause)) {
            return NextResponse.json({ error: `上游连接中断（${message + cause}）。任务可能仍在上游运行并已计费，请稍后到中转站后台确认任务状态；如已出图/出片，把上游任务 ID 反馈给我们以便找回结果。` }, { status: 504 });
        }
        const status = message.includes("超时") || message.includes("aborted") ? 504 : 502;
        return NextResponse.json({ error: message + cause }, { status });
    }
}

function sanitizeMethod(method: unknown) {
    const normalized = String(method || "POST").toUpperCase();
    if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(normalized)) throw new Error("非法请求方法");
    return normalized;
}

function sanitizeHeaders(headers: unknown) {
    const safe: Record<string, string> = {};
    if (!headers || typeof headers !== "object") return safe;

    for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
        const normalized = key.toLowerCase();
        if (!ALLOWED_HEADER_NAMES.has(normalized) && !normalized.startsWith("x-")) continue;
        if (value === undefined || value === null) continue;
        safe[key] = String(value);
    }

    return safe;
}

// bodyBase64：客户端把本地文件 base64 后放进 JSON 信封，这里解码成二进制再转发（用于 Replicate Files API 等原始上传）
function buildUpstreamBody(body: unknown, bodyBase64: unknown, headers: Record<string, string>): { value: Buffer | string | undefined; byteLength: number } {
    if (typeof bodyBase64 === "string" && bodyBase64.length > 0) {
        const buffer = Buffer.from(bodyBase64, "base64");
        return { value: buffer, byteLength: buffer.byteLength };
    }
    return buildBody(body, headers);
}

function buildBody(body: unknown, headers: Record<string, string>): { value: Buffer | string | undefined; byteLength: number } {
    if (body === undefined || body === null) return { value: undefined, byteLength: 0 };
    if (typeof body === "string") return { value: body, byteLength: new TextEncoder().encode(body).byteLength };

    const value = JSON.stringify(body);
    if (!Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
        headers["Content-Type"] = "application/json";
    }
    return { value, byteLength: new TextEncoder().encode(value).byteLength };
}
