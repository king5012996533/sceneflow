import { NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { pollReplicateJobById } from "@/lib/generation/replicate-poller.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 事件流对外只吐这几列（provider/externalGetUrl 只用来判断该不该推进轮询，不发给客户端） */
const JOB_SELECT = {
    id: true,
    status: true,
    error: true,
    externalStatus: true,
    progress: true,
    resultData: true,
    resultUrl: true,
    provider: true,
    externalGetUrl: true,
} as const;

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await requireCurrentUser(req);
    if (!user || !prisma) return new Response("unauthorized", { status: 401 });
    const { id } = await context.params;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for (let attempt = 0; attempt < 300; attempt += 1) {
                    const readJob = () => (prisma!.generationJob as any).findFirst({ where: { id, userId: user.id }, select: JOB_SELECT });
                    let job = await readJob();
                    if (!job) {
                        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "任务不存在" })}\n\n`));
                        break;
                    }
                    // Replicate 的结果得由服务端回源取件（拿图 + 归档到本地，见 replicate-poller.server.ts）。
                    // 客户端正挂着这条流等结果，就让这条流把轮询推一步：只靠 cron 兜底最快也要一分钟一轮，
                    // 而上游生成本身只要十秒 —— 用户等的是十秒，不是一分钟。
                    // 认领带乐观锁，多个页面同时看同一条任务也不会重复取件。
                    if (job.status === "running" && job.provider === "replicate" && job.externalGetUrl) {
                        await pollReplicateJobById(id).catch(() => false);
                        job = (await readJob()) || job;
                    }
                    const { provider: _provider, externalGetUrl: _externalGetUrl, ...snapshot } = job;
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`));
                    if (job.status !== "running") break;
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }
            } finally {
                controller.close();
            }
        },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
}
