import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { assertAllowedProxyUrl, fetchSafely, isHostOrSubdomain } from "@/lib/url-safety";
import { isCredentialTargetAllowed, resolvePlatformCredential } from "@/lib/credential-store.server";
import { salvageGenerationArtifacts } from "@/lib/generation/generation-rescue.server";
import { settleDeferredClientFailure } from "@/lib/generation/generation-jobs.server";
import { beginUpstreamCall } from "@/lib/generation/upstream-inflight";
import FormData from "form-data";

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
        /** 本次上游调用属于哪条生成任务（参考图生图主路径也走抢救） */
        const jobId = String(incoming.get("_proxy_job") || "");

        // 平台凭证（按目标 host + 可选 provider/model 匹配）；无平台凭证 → 无 Key（BYOK 已彻底移除）
        const sfProvider = typeof safeHeaders["x-sf-provider"] === "string" ? safeHeaders["x-sf-provider"] : undefined;
        const sfModel = typeof safeHeaders["x-sf-model"] === "string" ? safeHeaders["x-sf-model"] : undefined;
        const platformCred = await resolvePlatformCredential({ targetUrl: target.toString(), provider: sfProvider, model: sfModel });

        // 代理白名单：只放行已注册渠道（目标与凭证同源），无凭证或跨源目标直接拒绝
        if (!platformCred || !isCredentialTargetAllowed(platformCred.baseUrl, target.toString())) {
            return NextResponse.json({ error: "目标地址不在已注册渠道白名单内" }, { status: 403 });
        }

        if (platformCred) {
            if (platformCred.provider === "aigccc" || isHostOrSubdomain(target.hostname, "aigccc666.com")) {
                // aigccc 网关用 ApiKey 头（非 Bearer）：按目标 host 判断，避免供应商标签漏配时误发 Bearer
                safeHeaders["apikey"] = platformCred.apiKey;
            } else {
                safeHeaders["authorization"] = `Bearer ${platformCred.apiKey}`;
            }
            console.log(`[proxy/form-data] key-source=platform target=${target.hostname}`);
        }

        // 使用 form-data 包构建 multipart body
        const form = new FormData();
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
            // multipart 缓冲一次性拷贝；收到响应头说明请求体已发完，尽早释放引用缓解长等待期间的内存常驻
            let bodyBuffer = form.getBuffer();
            const response = await fetchSafely(target.toString(), {
                method,
                headers: {
                    ...safeHeaders,
                    "content-type": `multipart/form-data; boundary=${form.getBoundary()}`,
                    "content-length": String(bodyBuffer.length),
                },
                body: bodyBuffer as unknown as BodyInit,
                signal: controller.signal,
            });
            bodyBuffer = Buffer.alloc(0);
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
