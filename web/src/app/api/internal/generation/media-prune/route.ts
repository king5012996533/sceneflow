import { NextRequest, NextResponse } from "next/server";

import { pruneGenerationMedia } from "@/lib/generation/generation-media-retention.server";

export const runtime = "nodejs";

/**
 * 成品归档清理入口（由服务器 crontab 每天凌晨调用一次，密钥走 GENERATION_WORKER_SECRET）。
 * 可选 body：{ days?: number, dryRun?: boolean }，不传就用默认保留 2 天 / 真删。
 * dryRun=true 只统计不删除，用于上线后先看清会删掉什么。
 */
export async function POST(req: NextRequest) {
    const secret = process.env.GENERATION_WORKER_SECRET;
    if (!secret || req.headers.get("x-generation-worker-secret") !== secret) return NextResponse.json({ error: "未授权" }, { status: 401 });
    const body = (await req.json().catch(() => ({}))) as { days?: unknown; limit?: unknown; dryRun?: unknown };
    const result = await pruneGenerationMedia({ days: body?.days, limit: body?.limit, dryRun: body?.dryRun === true });
    if (result.deleted) {
        const mb = (result.freedBytes / 1024 / 1024).toFixed(1);
        console.log(`[generation-media-prune] 清理 ${result.deleted} 个成品文件（保留 ${result.days} 天），释放 ${mb}MB，涉及 ${result.jobs.length} 个任务`);
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
