import { NextRequest, NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/auth";
import { requireCurrentUser } from "@/lib/current-user";
import { recordGenerationUpstream } from "@/lib/generation/generation-jobs.server";
import { prisma } from "@/lib/ic-prisma";

export const runtime = "nodejs";

/**
 * 记录上游任务号（图片等「客户端提交、客户端取件」的通道用）。
 * 只写 running 且还没绑定过外部的任务，重复调用无副作用。
 */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await requireCurrentUser(req);
    if (!user || !prisma) return NextResponse.json({ error: "未授权" }, { status: 401 });
    if (!isSameOriginRequest(req)) return NextResponse.json({ error: "请求来源不合法" }, { status: 403 });

    const { id } = await context.params;
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const provider = typeof body.provider === "string" ? body.provider.trim().slice(0, 120) : "";
    const model = typeof body.model === "string" ? body.model.trim().slice(0, 120) : "";
    const externalId = typeof body.externalId === "string" ? body.externalId.trim().slice(0, 200) : "";
    const rawGetUrl = typeof body.externalGetUrl === "string" ? body.externalGetUrl.trim() : "";
    if (!provider || !externalId) return NextResponse.json({ error: "缺少上游任务标识" }, { status: 400 });
    const externalGetUrl = /^https?:\/\//i.test(rawGetUrl) ? rawGetUrl.slice(0, 500) : undefined;

    const recorded = await recordGenerationUpstream(user.id, id, { provider, model, externalId, externalGetUrl });
    return NextResponse.json({ ok: true, recorded: recorded.count });
}
