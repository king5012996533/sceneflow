import { NextRequest, NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/current-user";
import { beginGenerationJob, GenerationPolicyError, type GenerationKind } from "@/lib/generation/generation-jobs.server";

const KINDS = new Set<GenerationKind>(["image", "video", "audio", "text", "tool"]);

export async function POST(req: NextRequest) {
    try {
        const user = await requireCurrentUser(req);
        if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const kind = String(body.kind || "") as GenerationKind;
        if (!KINDS.has(kind)) return NextResponse.json({ error: "无效的生成类型" }, { status: 400 });
        const requestKey = String(body.requestKey || "").trim();
        if (!requestKey || requestKey.length > 160) return NextResponse.json({ error: "无效的请求标识" }, { status: 400 });

        const result = await beginGenerationJob(user.id, {
            requestKey,
            kind,
            count: body.count,
            metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : undefined,
        });
        return NextResponse.json({ job: result.job, reused: result.reused });
    } catch (error) {
        const status = error instanceof GenerationPolicyError ? error.status : 500;
        const message = error instanceof Error ? error.message : "生成任务创建失败";
        console.error("[generation/jobs] begin", message);
        return NextResponse.json({ error: message }, { status });
    }
}
