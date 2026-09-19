import { NextRequest, NextResponse } from "next/server";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { readGenerationMedia } from "@/lib/generation/server-media-storage.server";
import { mimeTypeExtension, purgedMediaMessage, resolveRetentionDays } from "@/lib/generation/generation-media-retention";

export const runtime = "nodejs";

/** 保留天数与清理任务共用同一份配置（默认 2 天） */
const RETENTION_DAYS = resolveRetentionDays(process.env.GENERATION_MEDIA_RETENTION_DAYS);

export async function GET(req: NextRequest, context: { params: Promise<{ id: string; index: string }> }) {
    const user = await requireCurrentUser(req);
    if (!user || !prisma) return NextResponse.json({ error: "未授权" }, { status: 401 });
    const { id, index } = await context.params;
    // 管理员要能核对「用户生成的图」：这里原先是死认 userId 的，管理员点开别人的任务一律 404。
    // 2026-09-18 起成品改由本路由交付（任务表里的 resultUrl 就是这条地址），于是后台的预览列
    // 整列变成破图（2026-09-19 反馈）。后台的生成记录本就对管理员全量可见，这里同样放行管理员；
    // 普通用户照旧只能取自己名下的成品。
    const isAdmin = user.role === "admin";
    const job = await (prisma.generationJob as any).findFirst({ where: isAdmin ? { id } : { id, userId: user.id }, select: { resultData: true } });
    if (!job?.resultData || !Number.isInteger(Number(index))) return NextResponse.json({ error: "媒体不存在" }, { status: 404 });
    const items = Array.isArray((job.resultData as { items?: unknown[] }).items) ? (job.resultData as { items: Array<{ archiveKey?: string; mimeType?: string }> }).items : [];
    const item = items[Number(index)];
    if (!item?.archiveKey) return NextResponse.json({ error: "媒体尚未归档" }, { status: 404 });
    const mimeType = item.mimeType || "application/octet-stream";
    try {
        const body = await readGenerationMedia(item.archiveKey);
        const headers: Record<string, string> = { "Content-Type": mimeType, "Cache-Control": "private, max-age=3600" };
        // ?download=1：生成记录页的「下载」按钮，给个像样的文件名（同源 + 已鉴权，直接 attachment 即可）
        if (new URL(req.url).searchParams.get("download") === "1") {
            headers["Content-Disposition"] = `attachment; filename="sceneflow-${id}-${index}.${mimeTypeExtension(mimeType)}"`;
        }
        return new NextResponse(body as unknown as BodyInit, { headers });
    } catch (error) {
        // 文件不在有两种可能：从没归档成功，或已过保留期被定时清理——对用户要说清是哪一种
        if ((error as NodeJS.ErrnoException)?.code === "ENOENT") return NextResponse.json({ error: purgedMediaMessage(RETENTION_DAYS) }, { status: 404 });
        return NextResponse.json({ error: "媒体读取失败" }, { status: 404 });
    }
}
