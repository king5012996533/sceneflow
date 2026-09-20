import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { assertAllowedProxyUrl, fetchSafely } from "@/lib/url-safety";
import { salvageGenerationArtifacts } from "@/lib/generation/generation-rescue.server";
import { settleDeferredClientFailure } from "@/lib/generation/generation-jobs.server";
import { beginUpstreamCall } from "@/lib/generation/upstream-inflight";
import { authorizeUpstreamRequest, explainUpstreamAuthorizationFailure, stripCredentialHeaders } from "@/lib/generation/upstream-auth.server";
import { recordCredentialUpstreamStatus } from "@/lib/credential-health.server";
import { channelMaintenanceMessage, isCredentialAuthStatus } from "@/lib/credential-health";
import { authorizeProxyUpstreamCall } from "@/lib/generation/proxy-access.server";
import { canRunOnServer, resolveServerRunPolicy, shouldPersistEnvelope, type UpstreamEnvelope } from "@/lib/generation/generation-envelope";
import { findRunnableGenerationJob, startServerRun } from "@/lib/generation/generation-run.server";
import { saveUpstreamEnvelope } from "@/lib/generation/generation-spool.server";
import { buildEditFallback } from "@/lib/generation/edit-fallback";
// 走 npm 的 form-data 包构建 multipart（要它的 getBuffer/getBoundary）。
// 刻意改名：这个包里也有 FormData，会遮蔽浏览器原生的 FormData 类型，
// 而本路由同时要处理 `req.formData()` 返回的原生对象（下方 buildEditFallback 的入参就是它）。
import FormDataPackage from "form-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PROXY_REQUEST_BYTES = 16 * 1024 * 1024;
// 参考图生图（/images/edits）与 OpenAI 视频任务创建都走本路由，是「画布参考图生图」主路径。
// 中转站出图常需 30~120s + 排队，慢中转单次可达 5-15 分钟；曾为 120s，超过即被中止，
// 而中转站收单即扣费 → 「上游已扣费但前端失败」。与主代理 /api/proxy 保持一致取 900s（15 分钟）。
// 部署侧 nginx proxy_read_timeout 必须 > 此值（1200s），确保应用先于 nginx 返回带说明的超时 JSON，
// 而不是 nginx 裸断产生 502/504。
const PROXY_TIMEOUT_MS = 900_000;
const ALLOWED_HEADER_NAMES = new Set(["authorization", "accept", "x-api-key", "x-request-id", "x-sf-provider", "x-sf-model"]);

export async function POST(req: NextRequest) {
    const user = await requireCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_PROXY_REQUEST_BYTES) return NextResponse.json({ error: "请求内容过大：单张或多张参考素材的总上传体积超过代理限制。请压缩图片、减少参考素材，或改用公网素材 URL。" }, { status: 413 });

    // 标记本次是否由我们自己的超时中止（区别于网络错误等），用于给客户端返回可操作的中文说明
    let timedOut = false;
    const startedAt = Date.now();

    try {
        const incoming = await req.formData();
        const target = await assertAllowedProxyUrl(String(incoming.get("_proxy_url") || ""));
        const method = sanitizeMethod(incoming.get("_proxy_method") || "POST");
        const safeHeaders = sanitizeHeaders(parseHeaders(incoming.get("_proxy_headers")));
        const sfProvider = typeof safeHeaders["x-sf-provider"] === "string" ? safeHeaders["x-sf-provider"] : undefined;
        const sfModel = typeof safeHeaders["x-sf-model"] === "string" ? safeHeaders["x-sf-model"] : undefined;
        /** 本次上游调用属于哪条生成任务（参考图生图主路径也走抢救） */
        const jobId = String(incoming.get("_proxy_job") || "");
        /** 调用方声明「我能接受延后取结果」：是否真的延后由服务端按环境开关决定（见 generation-envelope） */
        const deferrable = String(incoming.get("_proxy_defer") || "") === "1";

        // 平台凭证 + 白名单 + 鉴权头注入：与 JSON 代理、信封重放共用同一份实现（含 aigccc 的 apikey 头特例）
        const authorization = await authorizeUpstreamRequest({ headers: safeHeaders, targetUrl: target.toString(), providerHint: sfProvider, modelHint: sfModel });
        // 代理白名单：只放行已注册渠道（目标与凭证同源），无凭证或跨源目标直接拒绝
        if (!authorization) {
            // 与 JSON 代理同一口径：熔断窗口内要说「渠道维护中」，其余才是「不在白名单内」
            const maintenance = await explainUpstreamAuthorizationFailure({ targetUrl: target.toString(), providerHint: sfProvider, modelHint: sfModel });
            if (maintenance) return NextResponse.json({ error: maintenance }, { status: 503 });
            return NextResponse.json({ error: "目标地址不在已注册渠道白名单内" }, { status: 403 });
        }

        // 上游访问门闸（审计 H1）：端点形态白名单 + 用户级限速 + 生成类必须挂本人 running 的任务号。
        // 与 JSON 代理共用同一份实现（proxy-access.server.ts），免得两条吃同一把平台 Key 的路由各写一份、日后漂移。
        const access = await authorizeProxyUpstreamCall({
            userId: user.id,
            method,
            pathname: target.pathname,
            jobId,
            requestModel: String(incoming.get("model") || ""),
        });
        if (!access.ok) {
            console.warn(`[proxy/form-data] 拒绝上游调用：${access.log}`);
            return NextResponse.json({ error: access.error }, { status: access.status });
        }
        console.log(`[proxy/form-data] key-source=platform endpoint=${access.endpoint} target=${target.hostname}${target.pathname}`);

        // 使用 form-data 包构建 multipart body
        const form = new FormDataPackage();
        for (const [key, value] of incoming.entries()) {
            if (key.startsWith("_proxy_")) continue;
            // 字段名/文件名剔除 CRLF，防止 form-data CRLF 注入（GHSA-q6p4-2r3g-8vhj）
            const safeKey = stripCrlf(key);
            if (typeof value === "string") {
                form.append(safeKey, value);
            } else if (value instanceof File || (typeof Blob !== "undefined" && (value as unknown) instanceof Blob)) {
                const buffer = Buffer.from(await (value as File).arrayBuffer());
                form.append(safeKey, buffer, { filename: stripCrlf((value as File).name), contentType: (value as File).type || "application/octet-stream" });
            } else {
                form.append(safeKey, String(value));
            }
        }

        // multipart 缓冲一次性拷贝；收到响应头说明请求体已发完，尽早释放引用缓解长等待期间的内存常驻
        let bodyBuffer = form.getBuffer();
        const multipartType = `multipart/form-data; boundary=${form.getBoundary()}`;

        // —— 阶段 2：把这次调用交给服务端执行，浏览器不再等长连接 ——
        // 参考图生图是画布的主路径，也是「素材只在浏览器里」最要命的一条：
        // 信封（含素材二进制）先落到服务端，之后即使标签页关掉、进程重启，这一单照样能画完并归档。
        const serverRunPolicy = resolveServerRunPolicy();
        const canDefer = deferrable && canRunOnServer({ policy: serverRunPolicy, provider: authorization.provider, url: target.toString(), stream: false, responseType: "json", hasJobId: Boolean(jobId) });
        if (canDefer) {
            const job = await findRunnableGenerationJob(user.id, jobId);
            if (job) {
                const stored = await saveUpstreamEnvelope({
                    userId: user.id,
                    jobId,
                    envelope: {
                        url: target.toString(),
                        method,
                        headers: stripCredentialHeaders(safeHeaders),
                        contentType: multipartType,
                        provider: authorization.provider,
                        model: sfModel,
                        bodyBytes: bodyBuffer.length,
                        origin: "defer",
                    },
                    body: bodyBuffer,
                });
                if (stored) {
                    // 备好改道方案：上游回「编辑端点不吃这个模型」时，服务端自己改走生成端点 + image_urls
                    const fallback = await buildEditFallback({ form: incoming, target: target.toString(), model: String(incoming.get("model") || ""), headers: stripCredentialHeaders(safeHeaders), hasMask: incoming.get("mask") !== null });
                    if (fallback) {
                        await saveUpstreamEnvelope({ userId: user.id, jobId, slot: "fallback", envelope: { ...fallback, provider: authorization.provider, model: sfModel, bodyBytes: Buffer.byteLength(fallback.json) }, body: fallback.json });
                    }
                    startServerRun({ job, envelope: stored });
                    console.log(`[proxy/form-data] 任务 ${jobId} 转由服务端执行（渠道 ${authorization.provider}）：浏览器不再持有这条长连接`);
                    // 后台执行读的是落盘的那份信封，内存里的这份可以立刻放下（素材不再常驻整个等待期）
                    bodyBuffer = Buffer.alloc(0);
                    return NextResponse.json({ deferred: true, jobId, status: "running" }, { status: 202 });
                }
                console.warn(`[proxy/form-data] 任务 ${jobId} 信封落库失败，回落到同步路径`);
            }
        }

        // 留信封（阶段 1）：调用方死在半路时服务端能原样再问一次上游（鉴权头不落库，重放时重新签发）
        if (shouldPersistEnvelope({ hasJobId: Boolean(jobId), bodyBytes: bodyBuffer.length, responseType: "json" })) {
            await saveUpstreamEnvelope({
                userId: user.id,
                jobId,
                envelope: {
                    url: target.toString(),
                    method,
                    headers: stripCredentialHeaders(safeHeaders),
                    contentType: multipartType,
                    provider: authorization.provider,
                    model: sfModel,
                    bodyBytes: bodyBuffer.length,
                    origin: "live",
                },
                body: bodyBuffer,
            });
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, PROXY_TIMEOUT_MS);

        // 登记「我们发往上游的这一次调用还在飞」：浏览器那条长连接断了之后，
        // 客户端会立刻报失败结账，可上游其实还在跑、还在收我们的钱。
        // 结算侧据此先不结账（见 generation-jobs.server.ts），等这里真正看见上游结果再定论。
        const releaseUpstreamCall = beginUpstreamCall(jobId);

        try {
            const response = await fetchSafely(target.toString(), {
                method,
                headers: {
                    ...safeHeaders,
                    "content-type": multipartType,
                    "content-length": String(bodyBuffer.length),
                },
                body: bodyBuffer as unknown as BodyInit,
                signal: controller.signal,
            });
            // 请求体已发出（收到响应头即已写完），尽早解除引用：慢中转单次生成最长等 15 分钟
            bodyBuffer = Buffer.alloc(0);
            // 渠道健康：401/403 记一次凭证类失败、2xx 记成功（其余状态码不参与判定，见 credential-health.ts）
            void recordCredentialUpstreamStatus(authorization.credential?.id, response.status, sfModel);
            const data = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }));
            // 与 JSON 代理的「[proxy] 上游 <status>」对齐。本路由是参考图生图（/images/edits）主路径，
            // 原先只记目标 host、不记上游状态码，4xx/5xx 完全不留痕：2026-09-18 那三次图生图秒失败
            // （apimart 回「/v1/images/edits only supports Grok image models」）就是因此只能靠数据库翻出来。
            if (response.status >= 400) {
                const snippet = typeof data === "object" && data !== null ? JSON.stringify(data).slice(0, 400) : String(data).slice(0, 400);
                const bearer = typeof safeHeaders.authorization === "string" ? safeHeaders.authorization.replace(/^Bearer\s+/i, "") : "";
                const raw = bearer || (typeof safeHeaders.apikey === "string" ? safeHeaders.apikey : "");
                const masked = raw ? raw.replace(/^(.{6}).*(.{4})$/, "$1****$2") : "none";
                console.error(`[proxy/form-data] 上游 ${response.status} ${method} ${target} key=${masked}: ${snippet}`);
            }
            // 平台 Key 被上游判 401/403：与 JSON 代理同一口径 —— 客户端拿到 401/403 会翻成
            // 「鉴权失败，请检查 API Key 或模型权限」，而用户既看不到这把钥匙也改不了它
            // （参考图生图是画布主路径，这条以前正是线上反馈里最刺眼的一处）。换成面向用户的话术，
            // 上游原话留在上面那行日志里。状态码 503：与「熔断拒绝」同口径，401/403 会被当成登录过期。
            if (isCredentialAuthStatus(response.status)) {
                const maintenance = channelMaintenanceMessage(String(incoming.get("model") || "") || undefined);
                const snippet = typeof data === "object" && data !== null ? JSON.stringify(data).slice(0, 400) : String(data).slice(0, 400);
                console.error(`[proxy/form-data] 上游 ${response.status} 鉴权失败，改用渠道维护话术 ${method} ${target}：${snippet}`);
                // 三个键都带上：客户端不同链路取的字段不同（信封链路认 error、axios 链路认 msg），
                // 少带一个就会出现「同一件事在不同入口说不同的话」。
                return NextResponse.json({ error: maintenance, message: maintenance, msg: maintenance }, { status: 503 });
            }
            // 上游产出即抢救（与 JSON 代理同一套）：图生图的成品也在这里就地留给服务端
            if (response.ok && jobId) {
                try {
                    await salvageGenerationArtifacts({ userId: user.id, jobId, payload: data, source: `proxy/form-data ${method} ${target.pathname}` });
                } catch (error) {
                    console.error("[generation-rescue] 抢救异常", error instanceof Error ? error.message : error);
                }
            }
            return NextResponse.json(data, { status: response.status });
        } finally {
            clearTimeout(timeout);
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
            console.error(`[proxy/form-data] 上游超时中止 elapsed=${Math.round((Date.now() - startedAt) / 1000)}s`);
            return NextResponse.json({ error: `上游处理超时（超过 ${PROXY_TIMEOUT_MS / 60000} 分钟），请求已中止。任务可能仍在上游运行并已计费，请稍后到中转站后台确认任务状态；如已出图/出片，把上游任务 ID 反馈给我们以便找回结果。` }, { status: 504 });
        }
        const message = err instanceof Error ? err.message : "代理请求失败";
        const cause = err instanceof Error && err.cause instanceof Error && err.cause.message && err.cause.message !== message ? `: ${err.cause.message}` : "";
        console.error("[proxy/form-data]", message + cause);
        const status = message.includes("不允许") || message.includes("非法") || message.includes("重定向") ? 400 : message.includes("超时") || message.includes("aborted") ? 504 : 502;
        return NextResponse.json({ error: message + cause }, { status });
    }
}

function stripCrlf(value: string) {
    return value.replace(/[\r\n]/g, " ").trim();
}

function parseHeaders(value: FormDataEntryValue | null) {
    if (typeof value !== "string" || !value.trim()) return {};
    try {
        const parsed = JSON.parse(value) as unknown;
        return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
        return {};
    }
}

function sanitizeMethod(method: unknown) {
    const normalized = String(method || "POST").toUpperCase();
    if (!["POST", "PUT", "PATCH"].includes(normalized)) throw new Error("非法请求方法");
    return normalized;
}

function sanitizeHeaders(headers: Record<string, unknown>) {
    const safe: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
        const normalized = key.toLowerCase();
        if (!ALLOWED_HEADER_NAMES.has(normalized) && !normalized.startsWith("x-")) continue;
        if (value === undefined || value === null) continue;
        safe[key] = String(value);
    }
    return safe;
}
