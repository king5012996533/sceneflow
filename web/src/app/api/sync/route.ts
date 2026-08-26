// POST /api/sync — 保存画布数据到服务器
// GET /api/sync?type=projects — 从服务器加载画布数据
import { NextRequest, NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/current-user";
import { isSameOriginRequest } from "@/lib/auth";
import { prisma } from "@/lib/ic-prisma";

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
        if (contentLength > 10 * 1024 * 1024) return privateJson({ error: "同步数据过大" }, { status: 413 });
        const { type, data } = await req.json();
        if (!type || data === undefined) return privateJson({ error: "缺少 type 或 data" }, { status: 400 });
        const validTypes = ["projects", "assets", "image-workbench", "video-workbench"];
        if (!validTypes.includes(type)) return privateJson({ error: "无效的同步类型" }, { status: 400 });
        const json = JSON.stringify(data);
        if (json.length > 10 * 1024 * 1024 || !validateSyncShape(data)) return privateJson({ error: "同步数据结构超出配额" }, { status: 413 });
        const record = await prisma.canvasBackup.upsert({ where: { userId_type: { userId: user.id, type } }, update: { data, version: { increment: 1 } }, create: { userId: user.id, type, data } });
        return privateJson({ ok: true, version: record.version });
    } catch (err: any) {
        console.error("[sync:post]", err?.message);
        return privateJson({ error: "保存失败" }, { status: 500 });
    }
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

function validateSyncShape(value: unknown, limits = { maxNodes: 5000, maxConnections: 10000, maxStringLength: 200000 }) {
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
