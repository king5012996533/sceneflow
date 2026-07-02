// POST /api/sync — 保存画布数据到服务器
// GET /api/sync?type=projects — 从服务器加载画布数据
import { NextRequest, NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";

export async function POST(req: NextRequest) {
  try {
    if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

    const user = await requireCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const { type, data } = await req.json();
    if (!type || data === undefined) {
      return NextResponse.json({ error: "缺少 type 或 data" }, { status: 400 });
    }

    const validTypes = ["projects", "assets", "image-workbench", "video-workbench"];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "无效的同步类型" }, { status: 400 });
    }

    const record = await prisma.canvasBackup.upsert({
      where: { userId_type: { userId: user.id, type } },
      update: { data, version: { increment: 1 } },
      create: { userId: user.id, type, data },
    });

    return NextResponse.json({ ok: true, version: record.version });
  } catch (err: any) {
    console.error("[sync:post]", err?.message);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

    const user = await requireCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const type = req.nextUrl.searchParams.get("type") || "projects";
    const record = await prisma.canvasBackup.findUnique({
      where: { userId_type: { userId: user.id, type } },
    });

    return NextResponse.json({ data: record?.data || null, version: record?.version || 0 });
  } catch (err: any) {
    console.error("[sync:get]", err?.message);
    return NextResponse.json({ error: "读取失败" }, { status: 500 });
  }
}
