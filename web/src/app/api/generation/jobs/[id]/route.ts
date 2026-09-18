import { NextRequest, NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/current-user";
import { isSameOriginRequest } from "@/lib/auth";
import { finishGenerationJob, getGenerationJob, GenerationPolicyError } from "@/lib/generation/generation-jobs.server";

/**
 * 读一条任务的状态。
 *
 * 客户端在被「暂缓结账」之后靠它轮询：浏览器那条长连接断了、任务还在服务端跑着的时候，
 * 用户不该只收到一句「请求失败」—— 成品一进归档就照常出图（见 generation-guard.ts）。
 */
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireCurrentUser(req);
        if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

        const { id } = await context.params;
        const job = await getGenerationJob(user.id, id);
        return NextResponse.json({ job });
    } catch (error) {
        const status = error instanceof GenerationPolicyError ? error.status : 500;
        const message = error instanceof Error ? error.message : "读取生成任务失败";
        return NextResponse.json({ error: message }, { status });
    }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireCurrentUser(req);
        if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
        if (!isSameOriginRequest(req)) return NextResponse.json({ error: "请求来源不合法" }, { status: 403 });

        const { id } = await context.params;
        const body = await req.json().catch(() => ({}));
        const status = String(body.status || "");
        if (!["succeeded", "failed", "cancelled"].includes(status)) {
            return NextResponse.json({ error: "无效的任务状态" }, { status: 400 });
        }
        // holdForResend：这是**浏览器**上报的失败。浏览器说自己失败了，不代表成品没在下游产生
        // —— 服务端可能还留着一份能补发的信封（阶段 1）。让结账侧先把这一单留着，
        // 由补发把成品带回来（或者补发也拿不到时再结账退款），客户端会通过轮询看到最终结论。
        const job = await finishGenerationJob(user.id, id, status as "succeeded" | "failed" | "cancelled", typeof body.error === "string" ? body.error : undefined, typeof body.resultUrl === "string" ? body.resultUrl : undefined, {
            holdForResend: status === "failed",
        });
        return NextResponse.json({ job });
    } catch (error) {
        const status = error instanceof GenerationPolicyError ? error.status : 500;
        const message = error instanceof Error ? error.message : "生成任务结算失败";
        console.error("[generation/jobs] finish", message);
        return NextResponse.json({ error: message }, { status });
    }
}
