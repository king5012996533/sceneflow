import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { sendPlainEmail } from "@/lib/email";
import { prisma } from "@/lib/ic-prisma";

import { buildDailyReport, type DailyReportStats } from "./generation-report";

/** 生成端日报落在服务器上的位置（保留给人工核对，邮件是同一份内容） */
const REPORT_DIR = path.join(os.homedir(), ".sceneflow", "reports");

type AggregateRow = {
    total: number;
    succeeded: number;
    failed: number;
    cancelled: number;
    running: number;
    upstream_ok_charged: number;
    upstream_ok_not_charged: number;
    upstream_ok_not_charged_by_our_fault: number;
    upstream_failed_refunded: number;
    artifact_dropped: number;
    charged_without_local_artifact: number;
};

const num = (value: unknown): number => (typeof value === "number" ? value : Number(value ?? 0) || 0);

/**
 * 出一天的生成对账，落盘 + 尽力发一封邮件给管理员。
 *
 * 「有成品」= resultData.items 里有归档键；「有成品却没留下」= externalStatus='dropped'
 * （抢救保住不下的分支会打这个标记，见 generation-rescue）。
 */
export async function generateDailyReport(options: { hours?: number; now?: Date } = {}) {
    const hours = Math.min(Math.max(Number(options.hours ?? 24) || 24, 1), 24 * 30);
    const now = options.now ?? new Date();
    const since = new Date(now.getTime() - hours * 60 * 60 * 1000);
    if (!prisma) throw new Error("Database unavailable");

    const withArtifact = `exists (select 1 from jsonb_array_elements(coalesce("resultData"->'items','[]'::jsonb)) e where e ? 'archiveKey')`;

    const rows = (await prisma.$queryRawUnsafe(
        `with j as (
            select *, ${withArtifact} as has_artifact
            from "GenerationJob"
            where kind in ('image','video') and "createdAt" >= $1 and "createdAt" < $2
         )
         select count(*)::int as total,
                count(*) filter (where status = 'succeeded')::int as succeeded,
                count(*) filter (where status = 'failed')::int as failed,
                count(*) filter (where status = 'cancelled')::int as cancelled,
                count(*) filter (where status = 'running')::int as running,
                count(*) filter (where has_artifact and status = 'succeeded' and "quotaRefunded" = false)::int as upstream_ok_charged,
                count(*) filter (where has_artifact and (status = 'cancelled' or "quotaRefunded"))::int as upstream_ok_not_charged,
                count(*) filter (where has_artifact and status = 'succeeded' and "quotaRefunded")::int as upstream_ok_not_charged_by_our_fault,
                count(*) filter (where status = 'failed' and "quotaRefunded" and not has_artifact)::int as upstream_failed_refunded,
                count(*) filter (where "externalStatus" = 'dropped')::int as artifact_dropped,
                count(*) filter (where status = 'succeeded' and "quotaRefunded" = false and not has_artifact)::int as charged_without_local_artifact
         from j`,
        since,
        now,
    )) as AggregateRow[];

    const failureRows = (await prisma.$queryRawUnsafe(
        `select left(coalesce(nullif(error, ''), '(无说明)'), 40) as reason, count(*)::int as n
         from "GenerationJob"
         where kind in ('image','video') and status = 'failed' and "createdAt" >= $1 and "createdAt" < $2
         group by 1 order by 2 desc limit 5`,
        since,
        now,
    )) as { reason: string; n: number }[];

    const row = rows[0];
    const stats: DailyReportStats = {
        date: formatShanghaiDate(now),
        windowHours: hours,
        total: num(row?.total),
        succeeded: num(row?.succeeded),
        failed: num(row?.failed),
        cancelled: num(row?.cancelled),
        running: num(row?.running),
        upstreamOkCharged: num(row?.upstream_ok_charged),
        upstreamOkNotCharged: num(row?.upstream_ok_not_charged),
        upstreamOkNotChargedByOurFault: num(row?.upstream_ok_not_charged_by_our_fault),
        upstreamFailedRefunded: num(row?.upstream_failed_refunded),
        artifactDropped: num(row?.artifact_dropped),
        chargedWithoutLocalArtifact: num(row?.charged_without_local_artifact),
        topFailures: (failureRows ?? []).map((item) => ({ reason: item.reason, count: num(item.n) })),
    };

    const report = buildDailyReport(stats);
    let filePath: string | undefined;
    try {
        await fs.mkdir(REPORT_DIR, { recursive: true });
        filePath = path.join(REPORT_DIR, `generation-daily-${stats.date}.md`);
        await fs.writeFile(filePath, report.markdown, "utf8");
    } catch (error) {
        console.error("[generation-report] 日报落盘失败", error instanceof Error ? error.message : error);
    }

    const recipients = await listAdminEmails();
    const mailed = await mailReport(recipients, report.subject, report.markdown);

    console.log(`[generation-report] ${stats.date} 对账：上游出图 ${stats.upstreamOkCharged + stats.upstreamOkNotCharged} 次（未收费 ${stats.upstreamOkNotCharged}）｜上游失败退款 ${stats.upstreamFailedRefunded}｜丢图 ${stats.artifactDropped}｜文件 ${filePath ?? "未落盘"}｜邮件 ${mailed}${recipients.length ? `（${recipients.join(",")}）` : "（无管理员收件人）"}`);
    return { stats, filePath, recipients, mailed };
}

async function listAdminEmails(): Promise<string[]> {
    if (!prisma) return [];
    const admins = (await prisma.user.findMany({ where: { role: "admin" }, select: { email: true }, take: 10 })) as { email: string | null }[];
    return admins.map((admin) => (admin.email || "").trim()).filter((email) => email.includes("@"));
}

async function mailReport(recipients: string[], subject: string, markdown: string): Promise<number> {
    if (!recipients.length || !process.env.RESEND_API_KEY) return 0;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f6f4f1;padding:24px"><div style="max-width:720px;margin:0 auto;background:#fff;border-radius:12px;padding:24px"><pre style="white-space:pre-wrap;font-size:13px;line-height:1.6;color:#332f2a;margin:0">${escapeHtml(markdown)}</pre></div></body></html>`;
    let sent = 0;
    for (const to of recipients) {
        const result = await sendPlainEmail(to, subject, html);
        if (result.ok) sent++;
        else console.error("[generation-report] 邮件发送失败", to, result.error);
    }
    return sent;
}

function escapeHtml(text: string) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 北京时间日期（用户与账单都在东八区，日报按本地日切分） */
function formatShanghaiDate(date: Date) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
    return parts;
}
