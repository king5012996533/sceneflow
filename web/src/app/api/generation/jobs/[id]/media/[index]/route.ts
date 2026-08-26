import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { readGenerationMedia } from "@/lib/generation/server-media-storage.server";

export const runtime = "nodejs";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string; index: string }> }) {
    const user = await requireCurrentUser(req);
    if (!user || !prisma) return NextResponse.json({ error: "未授权" }, { status: 401 });
    const { id, index } = await context.params;
    const job = await (prisma.generationJob as any).findFirst({ where: { id, userId: user.id }, select: { resultData: true } });
    if (!job?.resultData || !Number.isInteger(Number(index))) return NextResponse.json({ error: "媒体不存在" }, { status: 404 });
    const items = Array.isArray((job.resultData as { items?: unknown[] }).items) ? (job.resultData as { items: Array<{ archiveKey?: string; mimeType?: string }> }).items : [];
    const item = items[Number(index)];
    if (!item?.archiveKey) return NextResponse.json({ error: "媒体尚未归档" }, { status: 404 });
    try {
        const body = await readGenerationMedia(item.archiveKey);
        return new NextResponse(body as unknown as BodyInit, { headers: { "Content-Type": item.mimeType || "application/octet-stream", "Cache-Control": "private, max-age=3600" } });
    } catch {
        return NextResponse.json({ error: "媒体读取失败" }, { status: 404 });
    }
}
