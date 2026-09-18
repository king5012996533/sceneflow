import { readdir, rmdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

import { resolveGenerationMediaDir } from "./server-media-storage.server";
import { parseArchiveKey, resolvePruneLimit, resolveRetentionWindow, shouldPurgeArchiveFile } from "./generation-media-retention";

/**
 * 生成成品归档目录的定期清理（服务端）。
 *
 * 与 `media-store` 那条「上传时顺手删过期文件」的懒清理不同，这里必须有一个不依赖用户行为的
 * 定时入口：没人上传就不会有任何懒清理发生，而归档目录只增不减。crontab 每天凌晨调一次
 * `/api/internal/generation/media-prune`，把「更早的成品」收掉。
 *
 * 几条安全约束（删文件是不可逆的，宁可少删不能删错）：
 *   - 只在归档根目录内操作，只认 `<jobId>/<index>` 形态的文件，别的形态一律跳过；
 *   - 时间读不出来、或修改时间在未来的一律不删（判定写在纯模块里）；
 *   - 目录里的文件都清空了才删目录本身；没清空就留着（同一次任务的多份成品可能跨日写入）；
 *   - 任何一步出错只记日志，不抛给调用方——清理失败不能影响别的任何东西。
 */

export type PruneMediaResult = {
    root: string;
    days: number;
    cutoff: string;
    dryRun: boolean;
    /** 扫到的归档文件数 */
    scanned: number;
    /** 真正删掉的文件数 */
    deleted: number;
    /** 释放的字节数 */
    freedBytes: number;
    /** 没到期、继续留着的文件数 */
    kept: number;
    /** 形态不认识而跳过的文件数（正常应为 0，不为 0 说明目录里混了别的东西） */
    skipped: number;
    /** 被删掉文件的所属任务 id（去重，便于日志追责与人工核对） */
    jobs: string[];
    /** 因为单次上限没删完 */
    truncated: boolean;
};

export async function pruneGenerationMedia(input: { days?: unknown; limit?: unknown; now?: number; dryRun?: boolean; root?: string } = {}): Promise<PruneMediaResult> {
    const root = input.root || resolveGenerationMediaDir(process.env.GENERATION_MEDIA_DIR);
    const window = resolveRetentionWindow({ now: input.now, days: input.days });
    const limit = resolvePruneLimit(input.limit);
    const dryRun = input.dryRun === true;
    const result: PruneMediaResult = {
        root,
        days: window.days,
        cutoff: new Date(window.cutoffMs).toISOString(),
        dryRun,
        scanned: 0,
        deleted: 0,
        freedBytes: 0,
        kept: 0,
        skipped: 0,
        jobs: [],
        truncated: false,
    };
    const jobs = new Set<string>();

    let jobDirs: string[];
    try {
        jobDirs = (await readdir(root, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch (error) {
        // 目录还不存在（还没人生成过）= 没什么可清理的，不是错误
        if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") console.error("[generation-media-prune] 读取归档目录失败", root, error instanceof Error ? error.message : error);
        return result;
    }

    for (const jobDir of jobDirs) {
        if (result.deleted >= limit) {
            result.truncated = true;
            break;
        }
        let entries: string[];
        try {
            entries = await readdir(join(root, jobDir));
        } catch (error) {
            console.error("[generation-media-prune] 读取任务目录失败", jobDir, error instanceof Error ? error.message : error);
            continue;
        }
        let remaining = 0;
        let deletedHere = 0;
        for (const entry of entries) {
            const key = `${jobDir}/${entry}`;
            if (!parseArchiveKey(key)) {
                // 不认识的形态一律不碰（包括子目录）
                result.skipped += 1;
                remaining += 1;
                continue;
            }
            result.scanned += 1;
            let info;
            try {
                info = await stat(join(root, key));
            } catch {
                continue;
            }
            if (!info.isFile() || !shouldPurgeArchiveFile({ mtimeMs: info.mtimeMs, cutoffMs: window.cutoffMs, nowMs: window.nowMs })) {
                result.kept += 1;
                remaining += 1;
                continue;
            }
            if (result.deleted >= limit) {
                result.truncated = true;
                result.kept += 1;
                remaining += 1;
                continue;
            }
            if (!dryRun) {
                try {
                    await rm(join(root, key), { force: true });
                } catch (error) {
                    console.error("[generation-media-prune] 删除成品失败", key, error instanceof Error ? error.message : error);
                    result.kept += 1;
                    remaining += 1;
                    continue;
                }
            }
            result.deleted += 1;
            deletedHere += 1;
            result.freedBytes += info.size;
            jobs.add(jobDir);
        }
        // 目录空了才收掉目录本身；dryRun 下不动
        if (!dryRun && deletedHere > 0 && remaining === 0) {
            try {
                await rmdir(join(root, jobDir));
            } catch {
                /* 目录非空/已被别处删掉：无所谓 */
            }
        }
    }

    result.jobs = Array.from(jobs);
    return result;
}
