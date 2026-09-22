import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/ic-prisma";
import { backupSignature, payloadBytes } from "@/lib/canvas-backup-snapshot";

export const runtime = "nodejs";

/**
 * 云端备份快照的内部入口（服务器脚本用，密钥走 GENERATION_WORKER_SECRET）。
 *
 * 用途：备份是整份覆盖式写入，谁最后推谁赢 —— 本机库为空或过旧的设备一开画布页就会把云端
 * 覆盖成它本地的样子。现在每次「内容真的变了」的覆盖都会先留一份上一版（见 CanvasBackupSnapshot），
 * 这个入口负责把它们列出来、以及把某一版推回去。
 *
 *   GET  ?userId=xxx&type=projects                       → 现有快照清单 + 当前版本
 *   POST { userId, type, snapshotId }                     → 回滚到该快照（回滚前先把当前这份也留一份，
 *                                                          所以回滚本身也是可逆的）
 */
function unauthorized() {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
}

function authorized(req: NextRequest) {
    const secret = process.env.GENERATION_WORKER_SECRET;
    return Boolean(secret) && req.headers.get("x-generation-worker-secret") === secret;
}

const VALID_TYPES = ["projects", "assets", "image-workbench", "video-workbench"];

export async function GET(req: NextRequest) {
    if (!authorized(req)) return unauthorized();
    if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });
    const userId = req.nextUrl.searchParams.get("userId") || "";
    const type = req.nextUrl.searchParams.get("type") || "projects";
    if (!userId || !VALID_TYPES.includes(type)) return NextResponse.json({ error: "缺少 userId 或 type 不合法" }, { status: 400 });
    const [current, snapshots] = await Promise.all([
        prisma.canvasBackup.findUnique({ where: { userId_type: { userId, type } }, select: { version: true, updatedAt: true, data: true } }),
        prisma.canvasBackupSnapshot.findMany({ where: { userId, type }, orderBy: { createdAt: "desc" }, select: { id: true, version: true, bytes: true, createdAt: true } }),
    ]);
    return NextResponse.json({
        current: current ? { version: current.version, updatedAt: current.updatedAt, bytes: payloadBytes(JSON.stringify(current.data) || "null") } : null,
        snapshots,
    });
}

export async function POST(req: NextRequest) {
    if (!authorized(req)) return unauthorized();
    if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });
    const body = (await req.json().catch(() => ({}))) as { userId?: unknown; type?: unknown; snapshotId?: unknown };
    const userId = typeof body.userId === "string" ? body.userId : "";
    const type = typeof body.type === "string" ? body.type : "projects";
    const snapshotId = typeof body.snapshotId === "string" ? body.snapshotId : "";
    if (!userId || !snapshotId || !VALID_TYPES.includes(type)) return NextResponse.json({ error: "缺少 userId / snapshotId 或 type 不合法" }, { status: 400 });

    const snapshot = await prisma.canvasBackupSnapshot.findFirst({ where: { id: snapshotId, userId, type } });
    if (!snapshot) return NextResponse.json({ error: "快照不存在" }, { status: 404 });

    // 回滚前先把「当前这一份」也留一份：回滚做错了还能再回滚回去
    const current = await prisma.canvasBackup.findUnique({ where: { userId_type: { userId, type } }, select: { data: true, version: true, signature: true } });
    if (current && current.data !== null) {
        await prisma.canvasBackupSnapshot.create({ data: { userId, type, data: current.data, version: current.version, bytes: payloadBytes(JSON.stringify(current.data) || "null") } });
    }

    const json = JSON.stringify(snapshot.data ?? null);
    const record = await prisma.canvasBackup.upsert({
        where: { userId_type: { userId, type } },
        update: { data: snapshot.data ?? undefined, version: { increment: 1 }, signature: backupSignature(json) },
        create: { userId, type, data: snapshot.data ?? undefined, signature: backupSignature(json) },
    });
    console.log(`[canvas-backup-restore] 用户 ${userId} 的 ${type} 回滚到快照 ${snapshotId}（第 ${snapshot.version} 版，${snapshot.bytes} 字节）→ 现在第 ${record.version} 版`);
    return NextResponse.json({ ok: true, version: record.version, restoredFrom: { snapshotId, version: snapshot.version, createdAt: snapshot.createdAt } });
}
