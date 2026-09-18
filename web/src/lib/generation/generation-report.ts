/**
 * 生成链路每日对账（纯逻辑：只做归账与排版，不碰数据库、不触网，便于在 Node 下直接单测）。
 *
 * 起因（2026-09-18）：上游几乎每次都出图，我们的前端却常报失败，钱花出去了用户什么都没拿到，
 * 而且账目对不上 —— 到底有多少次是「上游给了成品、我们没收费」，谁也说不清。
 * 这里把一天的任务归成四本账，让「对不上」的部分变成可数的数字：
 *
 *   上游出图 · 已收费        正常生意
 *   上游出图 · 未收费        用户取消（保图不保账）＋ 我们故障后补认领（图给了，钱退了）
 *   上游失败 · 已退款        正常
 *   有成品却没留下            目标 0：每出现一次都是我们又把钱烧了（externalStatus='dropped' 标记）
 */

export type DailyReportStats = {
    /** 统计日期（北京时间 YYYY-MM-DD） */
    date: string;
    /** 覆盖时长（小时），默认 24 */
    windowHours: number;
    total: number;
    succeeded: number;
    failed: number;
    cancelled: number;
    running: number;
    /** 上游出图且照常收费 */
    upstreamOkCharged: number;
    /** 上游出图但我们没收钱（取消保图 + 故障后补认领） */
    upstreamOkNotCharged: number;
    /** 上面这一类里，属于「我们故障、事后认领」的部分（补认领） */
    upstreamOkNotChargedByOurFault: number;
    /** 上游真失败、已退款 */
    upstreamFailedRefunded: number;
    /** 有成品却没能留下（目标 0） */
    artifactDropped: number;
    /** 收了费但本地没有成品（外部直链通道，或文本类），供核对，不是告警 */
    chargedWithoutLocalArtifact: number;
    topFailures: { reason: string; count: number }[];
};

/** 生成日报的标题与正文（Markdown：既能进邮件，也能直接落到文件里） */
export function buildDailyReport(stats: DailyReportStats): { subject: string; markdown: string } {
    const subject = `SceneFlow 生成对账 ${stats.date}：出图 ${stats.upstreamOkCharged + stats.upstreamOkNotCharged} 次｜未收费 ${stats.upstreamOkNotCharged} 次｜丢图 ${stats.artifactDropped} 次`;
    const lines: string[] = [];
    lines.push(`# 生成链路对账 · ${stats.date}`);
    lines.push("");
    lines.push(`统计范围：最近 ${stats.windowHours} 小时（图片/视频任务），共 ${stats.total} 条。`);
    lines.push("");
    lines.push("## 四本账");
    lines.push("");
    lines.push("| 口径 | 条数 | 说明 |");
    lines.push("| --- | --- | --- |");
    lines.push(`| 上游出图 · 已收费 | ${stats.upstreamOkCharged} | 正常生意 |`);
    lines.push(`| 上游出图 · 未收费 | ${stats.upstreamOkNotCharged} | 用户取消保图 ${stats.upstreamOkNotCharged - stats.upstreamOkNotChargedByOurFault} ＋ 我们故障补认领 ${stats.upstreamOkNotChargedByOurFault} |`);
    lines.push(`| 上游失败 · 已退款 | ${stats.upstreamFailedRefunded} | 正常 |`);
    const droppedNote = stats.artifactDropped ? `**告警：又白烧了 ${stats.artifactDropped} 次**` : "目标值 0";
    lines.push(`| 有成品却没留下 | ${stats.artifactDropped} | ${droppedNote} |`);
    lines.push("");
    lines.push("## 任务状态");
    lines.push("");
    lines.push(`成功 ${stats.succeeded}｜失败 ${stats.failed}｜取消 ${stats.cancelled}｜仍在跑 ${stats.running}`);
    lines.push("");
    if (stats.chargedWithoutLocalArtifact) {
        lines.push(`> 另有 ${stats.chargedWithoutLocalArtifact} 条已收费任务本地没有成品副本（走外部直链的通道，或成品不落盘的种类），属预期，供核对。`);
        lines.push("");
    }
    if (stats.topFailures.length) {
        lines.push("## 失败原因（前五）");
        lines.push("");
        // 只出前五：日报是给人扫一眼的，别把整张原因表倒进来（调用方多传了也只取五条）
        for (const item of stats.topFailures.slice(0, 5)) lines.push(`- ${item.count} × ${item.reason}`);
        lines.push("");
    }
    lines.push("---");
    lines.push("");
    lines.push("数字来自 GenerationJob：「有成品」＝ resultData.items 里带归档键；「有成品却没留下」＝ externalStatus='dropped'（抢救时保不住的分支会打标记，不再静默丢弃）。");
    return { subject, markdown: lines.join("\n") };
}
