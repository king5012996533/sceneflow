import { NextRequest, NextResponse } from "next/server";

import { resendStaleGenerationJobs } from "@/lib/generation/generation-run.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 补发入口（内部，由服务器 crontab 每分钟调用一次）。
 *
 * 为什么要有这个路由，而不是把补发写在别处：补发要重新解析凭证、重新签发鉴权头、
 * 走与代理完全相同的那套抢救与结账逻辑，这些都在应用进程里（TypeScript 的单一实现）。
 * 外部驱动只做「敲门」，真正的判定与执行留在应用内 —— 这样补发用的永远是同一份规则，
 * 不会出现「cron 脚本里另写一套，某天改了网关头规则只有一边跟着改」。
 *
 * 为什么要外部驱动：部署重启 web 进程会掐断进程内的一切计时器。
 * 进程外的每分钟敲门不受重启影响：web 一回来，下一分钟就把死在半路的任务接着发出去。
 *
 * 并发保护：同一进程内同时只允许一轮补发（下面这个 in-process 互斥），
 * 因为补发要等上游（最长 900s），而 cron 每分钟都会来敲一次。
 */
let running = false;

export async function POST(req: NextRequest) {
    const secret = process.env.GENERATION_WORKER_SECRET;
    if (!secret || req.headers.get("x-generation-worker-secret") !== secret) return NextResponse.json({ error: "未授权" }, { status: 401 });

    if (running) return NextResponse.json({ skipped: "busy" }, { headers: { "Cache-Control": "no-store" } });
    running = true;
    try {
        const body = (await req.json().catch(() => ({}))) as { limit?: unknown; resendAfterMs?: unknown };
        const result = await resendStaleGenerationJobs({ limit: Number(body?.limit) || undefined, resendAfterMs: Number(body?.resendAfterMs) || undefined });
        return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("[generation-resend] 补发失败", error instanceof Error ? error.message : error);
        return NextResponse.json({ error: error instanceof Error ? error.message : "补发失败" }, { status: 500 });
    } finally {
        running = false;
    }
}
