import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { isSameOriginRequest } from "@/lib/auth";
import { isCredentialTargetAllowed, resolvePlatformCredential } from "@/lib/credential-store.server";
import { prisma } from "@/lib/ic-prisma";
import { bindExternalGenerationJob } from "@/lib/generation/generation-jobs.server";
import { fetchSafely } from "@/lib/url-safety";

export const runtime = "nodejs";

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await requireCurrentUser(req);
    if (!user || !prisma) return NextResponse.json({ error: "未授权" }, { status: 401 });
    if (!isSameOriginRequest(req)) return NextResponse.json({ error: "请求来源不合法" }, { status: 403 });
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 2 * 1024 * 1024) return NextResponse.json({ error: "Replicate 输入过大" }, { status: 413 });
    const { id } = await context.params;
    const job = await (prisma.generationJob as any).findFirst({ where: { id, userId: user.id, status: "running", externalId: null }, select: { id: true, kind: true, metadata: true } });
    if (!job) return NextResponse.json({ error: "任务不存在或已启动" }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const model = typeof body.model === "string" ? body.model.trim().replace(/^replicate:/i, "") : "";
    const input = body.input;
    if (!model || !/^[^/]+\/[^/]+$/.test(model) || !input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ error: "Replicate 模型或输入无效" }, { status: 400 });
    if (JSON.stringify(input).length > 2 * 1024 * 1024) return NextResponse.json({ error: "Replicate 输入过大" }, { status: 413 });
    const credential = await resolvePlatformCredential({ provider: "replicate", model });
    if (!credential) return NextResponse.json({ error: "Replicate 平台凭证不可用" }, { status: 503 });
    const target = `${credential.baseUrl.replace(/\/+$/, "")}/models/${encodeURIComponent(model.split("/")[0])}/${encodeURIComponent(model.split("/")[1])}/predictions`;
    if (!isCredentialTargetAllowed(credential.baseUrl, target)) return NextResponse.json({ error: "Replicate 渠道地址不在白名单内" }, { status: 403 });
    const response = await fetchSafely(target, { method: "POST", headers: { Authorization: `Bearer ${credential.apiKey}`, "Content-Type": "application/json", Prefer: "wait=1" }, body: JSON.stringify({ input }) });
    const prediction = await response.json().catch(() => null) as { id?: string; status?: string; urls?: { get?: string }; error?: unknown } | null;
    if (!response.ok || !prediction?.id || !prediction.urls?.get) return NextResponse.json({ error: prediction?.error || "Replicate 任务创建失败" }, { status: response.status || 502 });
    if (!isCredentialTargetAllowed(credential.baseUrl, prediction.urls.get)) return NextResponse.json({ error: "Replicate 轮询地址不在白名单内" }, { status: 502 });
    const claimed = await bindExternalGenerationJob(user.id, job.id, { provider: "replicate", model, externalId: prediction.id, externalGetUrl: prediction.urls.get, externalStatus: prediction.status });
    if (!claimed.count) return NextResponse.json({ error: "任务已被其他请求启动" }, { status: 409 });
    return NextResponse.json({ jobId: job.id, externalId: prediction.id, status: prediction.status || "starting" });
}
