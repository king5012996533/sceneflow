import { NextRequest, NextResponse } from "next/server";

import { sweepStaleGenerationJobs } from "@/lib/generation/generation-sweep.server";

export const runtime = "nodejs";

/**
 * 内部清扫入口（由服务器 crontab 定时调用，密钥走 GENERATION_WORKER_SECRET）。
 * 可选 body：{ olderThanMinutes?: number, limit?: number }，不传就用默认 30 分钟 / 50 条。
 */
export async function POST(req: NextRequest) {
    const secret = process.env.GENERATION_WORKER_SECRET;
    if (!secret || req.headers.get("x-generation-worker-secret") !== secret) return NextResponse.json({ error: "未授权" }, { status: 401 });
    const body = (await req.json().catch(() => ({}))) as { olderThanMinutes?: unknown; limit?: unknown };
    const olderThanMinutes = Number(body?.olderThanMinutes);
    const limit = Number(body?.limit);
    const result = await sweepStaleGenerationJobs({
        olderThanMs: Number.isFinite(olderThanMinutes) && olderThanMinutes > 0 ? olderThanMinutes * 60_000 : null,
        limit: Number.isFinite(limit) && limit > 0 ? limit : null,
    });
    if (result.closed) {
        console.log(`[generation-sweep] 关闭 ${result.closed} 条超时任务，退回 ${result.refundedCredits} 积分：${result.jobs.map((job) => job.id).join(", ")}`);
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
