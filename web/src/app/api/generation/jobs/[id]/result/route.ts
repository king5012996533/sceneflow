import { NextRequest, NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/auth";
import { requireCurrentUser } from "@/lib/current-user";
import { isArchivedResultItem, mergeResultItems, normalizeResultUrls, resultMediaPath, type ResultItem } from "@/lib/generation/generation-result";
import { archiveGenerationResults } from "@/lib/generation/generation-result.server";
import { prisma } from "@/lib/ic-prisma";

export const runtime = "nodejs";

/**
 * 上报成品地址 → 服务端立刻归档 → 任务直接判成功。
 *
 * 这是「交付不再依赖浏览器」的关键一步：客户端一旦从上游拿到成品地址就报过来，
 * 服务端自己取一份存本地，任务状态只依据「上游是否产出」来定。
 * 之后浏览器那边下载/入库失败、甚至标签页直接关掉，成品都还在，用户从历史里能拿到。
 *
 * 顺序很关键：**先认领、后归档**。认领是一次很快的写库，必须抢在客户端因为
 * 「浏览器下载失败」把任务关成 failed 之前落地——一旦先关了，退款就出手了，
 * 上游已经收走的钱只能我们认。归档再慢也只影响本地键，不影响这次结算。
 */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const user = await requireCurrentUser(req);
    if (!user || !prisma) return NextResponse.json({ error: "未授权" }, { status: 401 });
    if (!isSameOriginRequest(req)) return NextResponse.json({ error: "请求来源不合法" }, { status: 403 });

    const { id } = await context.params;
    const body = (await req.json().catch(() => ({}))) as { urls?: unknown };
    const urls = normalizeResultUrls(body.urls);
    if (!urls.length) return NextResponse.json({ error: "缺少成品地址" }, { status: 400 });

    const job = await prisma.generationJob.findFirst({ where: { id, userId: user.id }, select: { id: true, status: true, resultData: true } });
    if (!job) return NextResponse.json({ ok: false, archived: 0, reason: "任务不存在" });
    // 已经关成失败/取消的任务不翻案：退款已经出手，再改状态只会让账目更乱（上游没产出的情形归清扫兜底）
    if (job.status !== "running" && job.status !== "succeeded") {
        console.log(`[generation-result] 任务 ${job.id} 已是 ${job.status}，忽略上报`);
        return NextResponse.json({ ok: false, archived: 0, reason: "任务已结算" });
    }

    let existingData: unknown = job.resultData;
    if (job.status === "running") {
        const claimed = await prisma.generationJob.updateMany({
            where: { id: job.id, status: "running" },
            data: {
                status: "succeeded",
                resultData: { items: urls.map((url) => ({ url })) satisfies ResultItem[] },
                resultUrl: urls[0],
                finishedAt: new Date(),
                quotaRefunded: false,
            },
        });
        if (!claimed.count) {
            // 并发结算抢在前面：它若把任务关成失败/取消，退款已经出手，这里不再翻案
            const current = await prisma.generationJob.findFirst({ where: { id: job.id, userId: user.id }, select: { status: true, resultData: true } });
            if (current?.status !== "succeeded") return NextResponse.json({ ok: false, archived: 0, reason: "任务已结算" });
            existingData = current.resultData;
        }
    }

    try {
        const items = await archiveGenerationResults(job.id, urls);
        const merged = mergeResultItems(existingData, items);
        const archived = merged.filter(isArchivedResultItem).length;
        await prisma.generationJob.updateMany({
            where: { id: job.id, userId: user.id, status: "succeeded" },
            data: { resultData: { items: merged }, resultUrl: isArchivedResultItem(merged[0]) ? resultMediaPath(job.id, 0) : urls[0] },
        });
        console.log(`[generation-result] 任务 ${job.id} 成品已归档 ${archived}/${urls.length}`);
        return NextResponse.json({ ok: true, archived, total: urls.length });
    } catch (error) {
        // 认领已经落地（任务算成功），归档只是没拿到本地副本：保留上游地址，不算这次生成失败
        console.error("[generation-result] 归档异常", id, error instanceof Error ? error.message : error);
        return NextResponse.json({ ok: false, archived: 0, total: urls.length, reason: "成品归档失败" });
    }
}
