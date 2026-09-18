import { NextRequest, NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/auth";
import { requireCurrentUser } from "@/lib/current-user";
import { recordGenerationUpstream } from "@/lib/generation/generation-jobs.server";
import { prisma } from "@/lib/ic-prisma";

export const runtime = "nodejs";

/**
 * 记录上游任务号（图片等「客户端提交、客户端取件」的通道用）。
 * 只写 running 且还没绑定过外部的任务，重复调用无副作用。
 *
 * 这是「尽力而为」的留痕接口：任何异常都必须落到可读答复里，不能裸 500 还没日志
 * —— GenerationJob 上有 @@unique([provider, externalId])，同一上游任务号被第二条
 * 任务记录时会撞唯一约束（实测踩到：裸 500、应用日志里什么都没有）。
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

    try {
        const recorded = await recordGenerationUpstream(user.id, id, { provider, model, externalId, externalGetUrl });
        return NextResponse.json({ ok: true, recorded: recorded.count });
    } catch (error) {
        const code = (error as { code?: unknown })?.code;
        if (code === "P2002") {
            // 同一上游任务号已经有另一条任务记过了：留痕做个去重即可，任务本身不受影响
            console.warn("[generation/upstream] 上游任务号已被记录", provider, externalId);
            return NextResponse.json({ ok: false, recorded: 0, error: "该上游任务号已被记录" }, { status: 409 });
        }
        console.error("[generation/upstream] 留痕失败", id, error instanceof Error ? error.message : error);
        return NextResponse.json({ error: "留痕失败" }, { status: 500 });
    }
}
