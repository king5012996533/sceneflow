import { NextRequest } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await requireCurrentUser(req);
    if (!user || !prisma) return new Response("unauthorized", { status: 401 });
    const { id } = await context.params;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for (let attempt = 0; attempt < 300; attempt += 1) {
                    const job = await (prisma!.generationJob as any).findFirst({ where: { id, userId: user.id }, select: { id: true, status: true, error: true, externalStatus: true, progress: true, resultData: true, resultUrl: true } });
                    if (!job) { controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: "任务不存在" })}\n\n`)); break; }
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(job)}\n\n`));
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
