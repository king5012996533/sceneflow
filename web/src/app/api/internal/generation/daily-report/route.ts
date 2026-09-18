import { NextRequest, NextResponse } from "next/server";

import { generateDailyReport } from "@/lib/generation/generation-report.server";

export const runtime = "nodejs";

/**
 * 生成链路每日对账（由服务器 crontab 每天 09:00 调用一次，密钥走 GENERATION_WORKER_SECRET）。
 * 可选 body：{ hours?: number }，不传就按最近 24 小时统计。
 * 结果：落盘到 ~/.sceneflow/reports/、打进 PM2 日志、并尽力发一封邮件给管理员。
 */
export async function POST(req: NextRequest) {
    const secret = process.env.GENERATION_WORKER_SECRET;
    if (!secret || req.headers.get("x-generation-worker-secret") !== secret) return NextResponse.json({ error: "未授权" }, { status: 401 });
    const body = (await req.json().catch(() => ({}))) as { hours?: unknown };
    const report = await generateDailyReport({ hours: typeof body?.hours === "number" ? body.hours : undefined });
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
}
