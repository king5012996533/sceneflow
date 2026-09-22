import { createHash } from "node:crypto";

/**
 * 云端备份的历史快照：留哪几份、清哪几份（纯逻辑，便于单测）。
 *
 * 为什么要快照：备份是「整份覆盖式」写入 —— 谁最后推谁赢。本机库为空或过旧的设备
 * （换电脑、清缓存、新装的浏览器）一开画布页，5 秒后就会把云端那份真实备份覆盖成它本地的样子；
 * 用户删错画布也一样。线上真出过事（测试画布覆盖掉 11 块画布，靠手工拍的快照才救回来）。
 *
 * 保留策略刻意保守：**按份数留、按天数淘汰**，两条都设。
 *   - 只按份数：用户三年不登录，三年前的旧版一直躺在库里；
 *   - 只按天数：用户一天推 200 次，库里就存 200 份几 MB 的 jsonb。
 */

/** 每个 (用户, 类型) 最多留几份快照 */
export const SNAPSHOT_MAX_KEEP = 3;
/** 超过这个天数的快照一律清掉 */
export const SNAPSHOT_MAX_AGE_DAYS = 30;

export type SnapshotRow = { id: string; createdAt: Date | string };

/**
 * 给出该删哪些快照 id。
 *
 * rows 传**按时间倒序**（最新在前）的现有快照；返回需要删除的 id 列表（按份数超出的 + 过期的，去重）。
 */
export function snapshotPrunePlan(rows: SnapshotRow[], now: Date = new Date(), options: { maxKeep?: number; maxAgeDays?: number } = {}): string[] {
    const maxKeep = Math.max(1, options.maxKeep ?? SNAPSHOT_MAX_KEEP);
    const maxAgeDays = Math.max(1, options.maxAgeDays ?? SNAPSHOT_MAX_AGE_DAYS);
    const cutoff = now.getTime() - maxAgeDays * 24 * 60 * 60 * 1000;
    const doomed = new Set<string>();
    rows.forEach((row, index) => {
        if (index >= maxKeep) doomed.add(row.id);
        const at = typeof row.createdAt === "string" ? Date.parse(row.createdAt) : row.createdAt.getTime();
        // 时间解析不出来时按「不过期」处理：宁可多留一份，也不要因为一个坏时间戳把用户的历史删了
        if (Number.isFinite(at) && at < cutoff) doomed.add(row.id);
    });
    return Array.from(doomed);
}

/** 内容指纹：用来判断这次写入是不是真的换了内容（没换就不必留快照，换了才留） */
export function backupSignature(payload: string): string {
    return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

/** jsonb 里那份数据算出来有多大：列表与清理都用它，避免把 data 整个读出来 */
export function payloadBytes(payload: string): number {
    return Buffer.byteLength(payload, "utf8");
}
