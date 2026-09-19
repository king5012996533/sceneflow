import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { isSameOriginRequest } from "@/lib/auth";
import { isCredentialTargetAllowed, resolvePlatformCredential } from "@/lib/credential-store.server";
import { prisma } from "@/lib/ic-prisma";
import { bindExternalGenerationJob } from "@/lib/generation/generation-jobs.server";
import { composeUpstreamFailure, describeHttpStatus, describeNetworkFailure, upstreamErrorMessage } from "@/lib/generation/upstream-error";
import { fetchSafely } from "@/lib/url-safety";

export const runtime = "nodejs";

/**
 * 请求体上限。参考图在这条路上是 JSON + base64（体积 ×1.33），16MB 相当于 ~12MB 原图，
 * 够 2-6 张参考图；跟其它通道同量级（/api/proxy/form-data 收 16MB 素材、/api/proxy 收 32MB），
 * nginx 那边是 50m、读超时 1200s，都不是瓶颈。出网隧道实测上行约 0.5MB/s，8MB 约 16s，可接受。
 *
 * 2026-09-19：这里原先是写死的 2MB。两张普通照片经 base64 就超，被我们自己的闸拒成 413，
 * 任务只留一句「Replicate 输入过大」就失败——而同样两张图走别的通道是能出图的。
 */
const MAX_REPLICATE_INPUT_BYTES = 16 * 1024 * 1024;

function describeTooLarge(bytes: number) {
    const mb = (value: number) => `${(value / 1024 / 1024).toFixed(1)}MB`;
    return `参考素材过大：本次请求体 ${mb(bytes)}，超过 ${mb(MAX_REPLICATE_INPUT_BYTES)} 上限。请减少参考图张数，或换更小的图重试（单张建议 3MB 以内）。`;
}

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await requireCurrentUser(req);
    if (!user || !prisma) return NextResponse.json({ error: "未授权" }, { status: 401 });
    if (!isSameOriginRequest(req)) return NextResponse.json({ error: "请求来源不合法" }, { status: 403 });
    const contentLength = Number(req.headers.get("content-length") || 0);
    const { id } = await context.params;
    if (contentLength > MAX_REPLICATE_INPUT_BYTES) {
        // 记下体积与任务号：这条以前只回一句「输入过大」，排查时既不知道超多少、也不知道是哪个任务
        console.error("[generation/replicate] 输入过大", id, `${(contentLength / 1024 / 1024).toFixed(1)}MB`);
        return NextResponse.json({ error: describeTooLarge(contentLength) }, { status: 413 });
    }
    const job = await (prisma.generationJob as any).findFirst({ where: { id, userId: user.id, status: "running", externalId: null }, select: { id: true, kind: true, metadata: true } });
    if (!job) return NextResponse.json({ error: "任务不存在或已启动" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const model = typeof body.model === "string" ? body.model.trim().replace(/^replicate:/i, "") : "";
    const input = body.input;
    if (!model || !/^[^/]+\/[^/]+$/.test(model) || !input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ error: "Replicate 模型或输入无效" }, { status: 400 });
    const payload = JSON.stringify({ input });
    // 按字节算：中文字符串按 .length 是少算的，prompt 一长就会漏过上面的 header 闸
    const payloadBytes = Buffer.byteLength(payload, "utf8");
    if (payloadBytes > MAX_REPLICATE_INPUT_BYTES) {
        console.error("[generation/replicate] 输入过大", job.id, `${(payloadBytes / 1024 / 1024).toFixed(1)}MB`);
        return NextResponse.json({ error: describeTooLarge(payloadBytes) }, { status: 413 });
    }
    const credential = await resolvePlatformCredential({ provider: "replicate", model });
    if (!credential) return NextResponse.json({ error: "Replicate 平台凭证不可用" }, { status: 503 });
    const target = `${credential.baseUrl.replace(/\/+$/, "")}/models/${encodeURIComponent(model.split("/")[0])}/${encodeURIComponent(model.split("/")[1])}/predictions`;
    if (!isCredentialTargetAllowed(credential.baseUrl, target)) return NextResponse.json({ error: "Replicate 渠道地址不在白名单内" }, { status: 403 });
    let response: Response;
    try {
        response = await fetchSafely(target, { method: "POST", headers: { Authorization: `Bearer ${credential.apiKey}`, "Content-Type": "application/json", Prefer: "wait=1" }, body: payload });
    } catch (error) {
        // 出网代理（OUTBOUND_PROXY_URL）不通时 fetch 直接抛（ECONNREFUSED 127.0.0.1:18080 这种）。
        // 2026-09-19：这一抛以前冒成裸 500，前端只拿到「Replicate 任务创建失败」，任务号也没进日志——
        // 隧道断了和上游拒绝长得一模一样。这里把它们分开，并把任务号写进服务端日志。
        const reason = describeNetworkFailure(error) || (error instanceof Error ? error.message : String(error));
        console.error("[generation/replicate] 出网通道不可用", job.id, target, reason);
        return NextResponse.json({ error: composeUpstreamFailure([`连不上 Replicate（${reason}）`, "出网通道可能不通，请稍后重试"], "Replicate 连接失败") }, { status: 502 });
    }
    const prediction = (await response.json().catch(() => null)) as { id?: string; status?: string; urls?: { get?: string }; error?: unknown } | null;
    if (!response.ok || !prediction?.id || !prediction.urls?.get) {
        // 上游的 401/403 不能照抄成我们的 401：前端会把它当成「登录过期」。
        // 失败原因走 upstream-error 的口径，把状态码与上游原话一并带上。
        const upstream = upstreamErrorMessage(prediction);
        const message = composeUpstreamFailure([upstream ? `Replicate 拒绝本次任务：${upstream}` : "", response.ok ? "上游没有返回任务号" : describeHttpStatus(response.status, "Replicate 任务创建失败")], "Replicate 任务创建失败");
        console.error("[generation/replicate] 启动失败", job.id, response.status, message);
        return NextResponse.json({ error: message }, { status: 502 });
    }
    if (!isCredentialTargetAllowed(credential.baseUrl, prediction.urls.get)) return NextResponse.json({ error: "Replicate 轮询地址不在白名单内" }, { status: 502 });
    const claimed = await bindExternalGenerationJob(user.id, job.id, { provider: "replicate", model, externalId: prediction.id, externalGetUrl: prediction.urls.get, externalStatus: prediction.status });
    if (!claimed.count) return NextResponse.json({ error: "任务已被其他请求启动" }, { status: 409 });
    return NextResponse.json({ jobId: job.id, externalId: prediction.id, status: prediction.status || "starting" });
}
