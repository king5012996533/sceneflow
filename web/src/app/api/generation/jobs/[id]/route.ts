import { NextRequest, NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/current-user";
import { finishGenerationJob, GenerationPolicyError } from "@/lib/generation/generation-jobs.server";

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireCurrentUser(req);
        if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

        const { id } = await context.params;
        const body = await req.json().catch(() => ({}));
        const status = String(body.status || "");
        if (!["succeeded", "failed", "cancelled"].includes(status)) {
            return NextResponse.json({ error: "无效的任务状态" }, { status: 400 });
        }
        const job = await finishGenerationJob(user.id, id, status as "succeeded" | "failed" | "cancelled", typeof body.error === "string" ? body.error : undefined);
        return NextResponse.json({ job });
    } catch (error) {
        const status = error instanceof GenerationPolicyError ? error.status : 500;
        const message = error instanceof Error ? error.message : "生成任务结算失败";
        console.error("[generation/jobs] finish", message);
        return NextResponse.json({ error: message }, { status });
    }
}
