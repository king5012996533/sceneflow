import { NextRequest, NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { isArchivedResultItem, resultMediaPath } from "@/lib/generation/generation-result";
import { hasGenerationMedia } from "@/lib/generation/server-media-storage.server";
import { resolveRetentionDays } from "@/lib/generation/generation-media-retention";

export const runtime = "nodejs";

/**
 * 我的生成记录（当前登录用户自己的任务，带成品可取地址）。
 *
 * 为什么要这个页面：2026-09-18 之前成品只活在用户的标签页里，浏览器一半路断掉/关掉，
 * 上游的钱已经花了、图也已经出了，用户却什么都没拿到，我们也就没法收这笔额度——
 * 就是个黑洞。现在服务端自己把成品归档了一份（产出即归档 + 超时任务补取件），
 * 这个接口把「我到底生成了什么、哪些还能下载」摆到用户面前，让这份钱收得讲得通。
 *
 * 只回自己名下的任务；上游任务号与取件地址这类内部凭据一律不出网（见 regression-guards 的同名断言）。
 */

const KINDS = new Set(["image", "video", "audio", "text", "tool"]);
const DEFAULT_TAKE = 20;
const MAX_TAKE = 60;

export async function GET(req: NextRequest) {
    const user = await requireCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

    const url = new URL(req.url);
    const rawTake = Number(url.searchParams.get("take"));
    const rawSkip = Number(url.searchParams.get("skip"));
    const take = Number.isFinite(rawTake) && rawTake > 0 ? Math.min(MAX_TAKE, Math.floor(rawTake)) : DEFAULT_TAKE;
    const skip = Number.isFinite(rawSkip) && rawSkip > 0 ? Math.floor(rawSkip) : 0;
    const kind = url.searchParams.get("kind") || "";
    const where = { userId: user.id, ...(KINDS.has(kind) ? { kind } : {}) };

    const [jobs, total] = await Promise.all([
        prisma.generationJob.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take,
            select: { id: true, kind: true, status: true, creditsCost: true, quotaRefunded: true, error: true, createdAt: true, finishedAt: true, externalStatus: true, resultData: true, metadata: true },
        }),
        prisma.generationJob.count({ where }),
    ]);

    const records = await Promise.all(jobs.map(toRecord));
    return NextResponse.json({ records, total, skip, take, retentionDays: resolveRetentionDays(process.env.GENERATION_MEDIA_RETENTION_DAYS) }, { headers: { "Cache-Control": "no-store" } });
}

type JobRow = {
    id: string;
    kind: string;
    status: string;
    creditsCost: number;
    quotaRefunded: boolean;
    error: string | null;
    createdAt: Date;
    finishedAt: Date | null;
    externalStatus: string | null;
    resultData: unknown;
    metadata: unknown;
};

/** 一条任务 → 前端可渲染的记录（成品的可取性在这里判定，页面不用再去猜） */
async function toRecord(job: JobRow) {
    const items = Array.isArray((job.resultData as { items?: unknown[] } | null)?.items) ? ((job.resultData as { items: unknown[] }).items as unknown[]) : [];
    const media = await Promise.all(
        items.map(async (item, index) => {
            if (isArchivedResultItem(item)) {
                const available = await hasGenerationMedia(item.archiveKey);
                const path = resultMediaPath(job.id, index);
                return {
                    index,
                    archived: true,
                    available,
                    url: available ? path : "",
                    downloadUrl: available ? `${path}?download=1` : "",
                    mimeType: item.mimeType || "",
                    bytes: item.bytes || 0,
                };
            }
            const sourceUrl = typeof (item as { url?: unknown })?.url === "string" ? (item as { url: string }).url : "";
            // 没归档成功的只有上游直链，多半已经过期，页面提示「未取回」而不是显示成破图
            return { index, archived: false, available: false, url: sourceUrl, downloadUrl: "", mimeType: "", bytes: 0 };
        }),
    );
    const metadata = (job.metadata || {}) as Record<string, unknown>;
    return {
        id: job.id,
        kind: job.kind,
        status: job.status,
        creditsCost: job.creditsCost,
        quotaRefunded: job.quotaRefunded,
        error: job.error,
        createdAt: job.createdAt,
        finishedAt: job.finishedAt,
        /** 服务端补取件找回的成品：用户当时多半没拿到，这里标出来 */
        recovered: job.externalStatus === "recovered",
        model: String(metadata.imageModel || metadata.videoModel || metadata.model || ""),
        size: String(metadata.size || ""),
        media,
    };
}
