// POST /api/sync — 保存画布数据到服务器
// GET /api/sync?type=projects — 从服务器加载画布数据
import { NextRequest, NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/current-user";
import { isSameOriginRequest } from "@/lib/auth";
import { prisma } from "@/lib/ic-prisma";
import { SNAPSHOT_MAX_AGE_DAYS, SNAPSHOT_MAX_KEEP, backupSignature, payloadBytes, snapshotPrunePlan } from "@/lib/canvas-backup-snapshot";

// 同步体积上限（2026-09-21 调大）。
//
// 原来是「整体 10MB + 单个字符串 20 万字符」，而画布里的图片/视频在没有上传成功前是以
// data URL 形式整段存在节点 metadata 里的（canvas-media-utils 的 hydrateCanvasImages
// 就是专门把它们补传上服务器用的，说明这个状态是应用自己会产生、且合法存在的）。
// 一张普通图片转成 base64 就是几十万到几百万字符 —— 于是只要有这么一张图，整份画布库
// 就被我们自己的配额闸拦下 413，而客户端是静默失败的：用户看到的是「画布明明有东西，
// 云端恢复出来却是空的」。上限改成贴着 nginx 的 client_max_body_size 50m 留一点余量。
const SYNC_MAX_BYTES = 48 * 1024 * 1024;
const SYNC_MAX_STRING_LENGTH = 12 * 1024 * 1024;

function privateJson(body: unknown, init?: ResponseInit) {
    const response = NextResponse.json(body, init);
    response.headers.set("Cache-Control", "no-store, private, max-age=0");
    response.headers.set("Vary", "Cookie");
    return response;
}

export async function POST(req: NextRequest) {
    try {
        if (!prisma) return privateJson({ error: "数据库不可用" }, { status: 503 });
        const user = await requireCurrentUser(req);
        if (!user) return privateJson({ error: "请先登录" }, { status: 401 });
        if (!isSameOriginRequest(req)) return privateJson({ error: "请求来源不合法" }, { status: 403 });
        const contentLength = Number(req.headers.get("content-length") || 0);
        if (contentLength > SYNC_MAX_BYTES) {
            // 这一档是硬上限（贴着 nginx 的 50m），同样要留痕：真被拦住说明备份已经大到不该塞进一行 jsonb 了
            console.error(`[sync:post] 拒绝同步（超过硬上限）type=${req.nextUrl.searchParams.get("type") || "?"} userId=${user.id} content-length=${contentLength}`);
            return privateJson({ error: "同步数据过大" }, { status: 413 });
        }
        const { type, data } = await req.json();
        if (!type || data === undefined) return privateJson({ error: "缺少 type 或 data" }, { status: 400 });
        const validTypes = ["projects", "assets", "image-workbench", "video-workbench"];
        if (!validTypes.includes(type)) return privateJson({ error: "无效的同步类型" }, { status: 400 });
        const json = JSON.stringify(data);
        const bytes = Buffer.byteLength(json);
        // 按字节而不是 JS 字符数算：中文一个字三字节，用 length 算会低估三倍
        if (bytes > SYNC_MAX_BYTES || !validateSyncShape(data)) {
            // 被拦下来这件事必须留下可查的痕迹：客户端是静默失败的，不记日志就只能靠用户报「备份没上去」
            const shape = describeSyncShape(data);
            console.error(`[sync:post] 拒绝同步 type=${type} userId=${user.id} 字节=${bytes} 最长字符串=${shape.maxStringLength} 画布数=${shape.projects} 节点数=${shape.nodes} 连线数=${shape.connections}`);
            return privateJson({ error: "同步数据结构超出配额" }, { status: 413 });
        }
        const signature = backupSignature(json);
        // 覆盖之前先留一份上一版（见 lib/canvas-backup-snapshot.ts 的注释：备份是整份覆盖式的，
        // 本机库为空/过旧的设备一开画布页就会把云端覆盖掉，用户删错画布也一样）。
        // 只有「内容真的变了」才留：签名相同说明这次写入不改动任何东西，留了只是白占空间。
        const previous = await prisma.canvasBackup.findUnique({ where: { userId_type: { userId: user.id, type } }, select: { data: true, version: true, signature: true } });
        if (previous && previous.data !== null && previous.signature !== signature) {
            await prisma.canvasBackupSnapshot.create({ data: { userId: user.id, type, data: previous.data, version: previous.version, bytes: payloadBytes(JSON.stringify(previous.data) ?? "null") } });
        }
        const record = await prisma.canvasBackup.upsert({
            where: { userId_type: { userId: user.id, type } },
            update: { data, version: { increment: 1 }, signature },
            create: { userId: user.id, type, data, signature },
        });
        // 清理旧快照（按份数 + 按天数），失败不影响这次保存
        void pruneSnapshots(user.id, type).catch((error) => console.error("[sync:post] 快照清理失败", user.id, error instanceof Error ? error.message : error));
        return privateJson({ ok: true, version: record.version });
    } catch (err: any) {
        console.error("[sync:post]", err?.message);
        return privateJson({ error: "保存失败" }, { status: 500 });
    }
}

/** 只保留最近几份、且不过期的快照。列表按时间倒序，交给纯函数决定删哪些。 */
async function pruneSnapshots(userId: string, type: string) {
    if (!prisma) return;
    const rows = await prisma.canvasBackupSnapshot.findMany({ where: { userId, type }, orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true } });
    const doomed = snapshotPrunePlan(rows, new Date(), { maxKeep: SNAPSHOT_MAX_KEEP, maxAgeDays: SNAPSHOT_MAX_AGE_DAYS });
    if (doomed.length) await prisma.canvasBackupSnapshot.deleteMany({ where: { id: { in: doomed }, userId, type } });
}

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return privateJson({ error: "数据库不可用" }, { status: 503 });
        const user = await requireCurrentUser(req);
        if (!user) return privateJson({ error: "请先登录" }, { status: 401 });
        const type = req.nextUrl.searchParams.get("type") || "projects";
        if (!["projects", "assets", "image-workbench", "video-workbench"].includes(type)) return privateJson({ error: "无效的同步类型" }, { status: 400 });
        const record = await prisma.canvasBackup.findUnique({ where: { userId_type: { userId: user.id, type } } });
        return privateJson({ data: record?.data || null, version: record?.version || 0 });
    } catch (err: any) {
        console.error("[sync:get]", err?.message);
        return privateJson({ error: "读取失败" }, { status: 500 });
    }
}

// 只在上面的拒绝分支里调用：把「到底哪一项超标」写进日志，而不是只留一句「超出配额」
function describeSyncShape(value: unknown) {
    let projects = 0;
    let nodes = 0;
    let connections = 0;
    let maxStringLength = 0;
    const seen = new Set<object>();
    const visit = (item: unknown, depth: number) => {
        if (depth > 20) return;
        if (typeof item === "string") { if (item.length > maxStringLength) maxStringLength = item.length; return; }
        if (!item || typeof item !== "object") return;
        if (seen.has(item)) return;
        seen.add(item);
        if (Array.isArray(item)) { item.forEach((child) => visit(child, depth + 1)); return; }
        const record = item as Record<string, unknown>;
        if (Array.isArray(record.projects)) projects += record.projects.length;
        if (Array.isArray(record.nodes)) nodes += record.nodes.length;
        if (Array.isArray(record.connections)) connections += record.connections.length;
        Object.values(record).forEach((child) => visit(child, depth + 1));
    };
    visit(value, 0);
    return { projects, nodes, connections, maxStringLength };
}

function validateSyncShape(value: unknown, limits = { maxNodes: 5000, maxConnections: 10000, maxStringLength: SYNC_MAX_STRING_LENGTH }) {
    let nodes = 0;
    let connections = 0;
    let valid = true;
    const seen = new Set<object>();
    const visit = (item: unknown, depth: number) => {
        if (!valid || depth > 20) { valid = false; return; }
        if (typeof item === "string") { if (item.length > limits.maxStringLength) valid = false; return; }
        if (!item || typeof item !== "object") return;
        if (seen.has(item)) { valid = false; return; }
        seen.add(item);
        if (Array.isArray(item)) { item.forEach((child) => visit(child, depth + 1)); return; }
        const record = item as Record<string, unknown>;
        if (Array.isArray(record.nodes)) nodes += record.nodes.length;
        if (Array.isArray(record.connections)) connections += record.connections.length;
        if (nodes > limits.maxNodes || connections > limits.maxConnections) { valid = false; return; }
        Object.values(record).forEach((child) => visit(child, depth + 1));
    };
    visit(value, 0);
    return valid;
}
