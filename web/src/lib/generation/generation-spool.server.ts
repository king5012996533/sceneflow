import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { join, normalize, isAbsolute } from "node:path";
import os from "node:os";

import { prisma } from "@/lib/ic-prisma";

import { envelopeKey, readEnvelope, shouldSpoolBody, type EnvelopeSlot, type ResendState, type UpstreamEnvelope } from "./generation-envelope";

/**
 * 上游请求信封的落盘与回读（服务端专用）。
 *
 * 与成品归档同一条规矩：目录只由用户主目录推导，绝不放在 cwd 下 ——
 * 生产 PM2 进程的 cwd 是 `.next/standalone`，而 Next 构建默认清空 `.next`，
 * 用 cwd 等于每部署一次就把所有信封删光（那正是补发最需要的时刻）。
 *
 * 目录形状：`~/.sceneflow/generation-spool/<jobId>/request.bin`
 * 同一个任务的后续调用覆盖同一个文件：要重放的是**最后一次**调用
 * （提交还是轮询，取决于哪一次死在半路），留下更老的那份只会放错枪。
 */

export function resolveGenerationSpoolDir(configured?: string | null, home: string = os.homedir()) {
    const raw = (configured || "").trim();
    if (!raw) return join(home, ".sceneflow", "generation-spool");
    return isAbsolute(raw) ? normalize(raw) : join(home, raw);
}

const root = resolveGenerationSpoolDir(process.env.GENERATION_SPOOL_DIR);

/** 信封保留多久（比成品归档短：它的价值只在任务还活着的那段时间里） */
const SPOOL_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;
/** 惰性清理的最小间隔，避免每次保存都去 readdir 整个目录 */
const SPOOL_SWEEP_INTERVAL_MS = 10 * 60 * 1000;

let lastSweepAt = 0;

function safeJobId(jobId: string) {
    if (!/^[a-zA-Z0-9_-]+$/.test(jobId)) throw new Error("非法任务标识");
    return jobId;
}

/**
 * 把这次调用的信封写进任务记录（请求体落盘）。
 *
 * 只在调用方给出任务号时调用（文本/工具调用没有成品归属，留它没有意义）。
 * 整体是尽力而为：**信封写失败绝不能让这次生成失败** —— 它保的是「万一这也挂了」，
 * 不能反过来成为新的失败点。
 *
 * 返回值就是「存下来的那一份信封」（含 spoolKey），调用方必须拿它去执行：
 * 请求体落在磁盘上，执行时靠 spoolKey 去读（2026-09-19 线上踩到：拿了内存里那份没 spoolKey 的
 * 信封去重放，等于发了个空请求体，上游直接回 400 invalid JSON request body）。
 */
export async function saveUpstreamEnvelope(input: { userId: string; jobId: string; envelope: Omit<UpstreamEnvelope, "savedAt"> & { savedAt?: number }; body?: Buffer | string | null; slot?: EnvelopeSlot }): Promise<UpstreamEnvelope | null> {
    if (!prisma) return null;
    try {
        const jobId = safeJobId(input.jobId);
        const slot: EnvelopeSlot = input.slot === "fallback" ? "fallback" : "primary";
        const body = input.body === undefined || input.body === null ? null : Buffer.isBuffer(input.body) ? input.body : Buffer.from(input.body);
        const bodyBytes = body?.byteLength ?? 0;
        let spoolKey: string | undefined;

        if (body && shouldSpoolBody(bodyBytes)) {
            // 两个槽位各存各的请求体：改道方案与主请求的 body 形态完全不同，共用一个文件会互相覆盖
            spoolKey = `${jobId}/${slot === "fallback" ? "fallback" : "request"}.bin`;
            const file = join(root, spoolKey);
            await mkdir(join(root, jobId), { recursive: true });
            await writeFile(file, body);
        }

        const envelope: UpstreamEnvelope = { ...input.envelope, spoolKey, bodyBytes, savedAt: Date.now() };
        // 只合并 metadata 里的这一个键：metadata 还装着计费口径字段，整体覆盖会把它们抹掉
        // 键必须显式 ::text：jsonb_build_object 是 variadic "any"，不给类型 Postgres 直接
        // 报 42P18 "could not determine data type of parameter $1"（线上真踩过：信封落库全失败）
        await prisma.$executeRaw`
            UPDATE "GenerationJob"
            SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(${envelopeKey(slot)}::text, ${JSON.stringify(envelope)}::jsonb)
            WHERE id = ${jobId} AND "userId" = ${input.userId}
        `;
        void maybeSweepSpool();
        return envelope;
    } catch (error) {
        console.error("[generation-envelope] 信封落库失败（不影响本次生成）", input.jobId, error instanceof Error ? error.message : error);
        return null;
    }
}

/** 取出信封对应的请求体；没有请求体（GET 等）返回 undefined */
export async function readEnvelopeBody(jobId: string, envelope: UpstreamEnvelope): Promise<Buffer | undefined> {
    if (!envelope.spoolKey) return undefined;
    const key = envelope.spoolKey.replace(/\\/g, "/");
    if (!key.startsWith(safeJobId(jobId) + "/") || key.includes("..")) throw new Error("非法信封键");
    return readFile(join(root, key));
}

/** 记一次补发（次数与结果）——预算就靠这个字段兜住 */
export async function recordResendAttempt(jobId: string, userId: string, state: ResendState): Promise<void> {
    if (!prisma) return;
    await prisma.$executeRaw`
        UPDATE "GenerationJob"
        SET metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('resend', ${JSON.stringify(state)}::jsonb)
        WHERE id = ${jobId} AND "userId" = ${userId}
    `;
}

/** 从任务记录里读信封（读不出来就当作没有） */
export async function loadUpstreamEnvelope(jobId: string, userId: string, slot: EnvelopeSlot = "primary"): Promise<UpstreamEnvelope | null> {
    if (!prisma) return null;
    const job = await prisma.generationJob.findFirst({ where: { id: jobId, userId }, select: { metadata: true } });
    return readEnvelope(job?.metadata, slot);
}

/** 丢掉信封与请求体（任务已经有结论、或信封不再可用时调用） */
export async function dropUpstreamEnvelope(jobId: string): Promise<void> {
    try {
        await rm(join(root, safeJobId(jobId)), { recursive: true, force: true });
    } catch {
        /* 删不掉不影响任何事：懒清理迟早会收掉 */
    }
}

/** 惰性清理：隔一段时间扫一次，收掉过期任务目录（不依赖 crontab 也能自清） */
async function maybeSweepSpool() {
    const now = Date.now();
    if (now - lastSweepAt < SPOOL_SWEEP_INTERVAL_MS) return;
    lastSweepAt = now;
    try {
        const entries = await readdir(root, { withFileTypes: true });
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const target = join(root, entry.name);
            try {
                const info = await stat(target);
                if (now - info.mtimeMs > SPOOL_RETENTION_MS) await rm(target, { recursive: true, force: true });
            } catch {
                /* 单个目录出错跳过，不影响其他目录 */
            }
        }
    } catch {
        /* 目录还不存在：没什么可清的 */
    }
}

/** 当前 spool 目录（诊断用） */
export function generationSpoolRoot() {
    return root;
}
