// POST /api/sync — 保存画布数据到服务器
// GET /api/sync?type=projects — 从服务器加载画布数据
import { NextRequest, NextResponse } from "next/server";

import { activateSubscription, ensureDefaultPlans } from "@/lib/billing";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";

function privateJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store, private, max-age=0");
  response.headers.set("Vary", "Cookie");
  return response;
}

function parseLimit(value?: string | null) {
  if (!value || value === "custom" || value === "unlimited") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function getProjectLimit(userId: string) {
  await ensureDefaultPlans();
  let subscription = await prisma?.subscription.findFirst({
    where: { userId, status: "active" },
    include: { plan: { include: { entitlements: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    subscription = await activateSubscription({
      userId,
      planId: "free",
      cycle: "monthly",
      provider: "manual",
    });
  }

  const entitlement = subscription.plan?.entitlements.find((item) => item.key === "projects");
  return parseLimit(entitlement?.value);
}

export async function POST(req: NextRequest) {
  try {
    if (!prisma) return privateJson({ error: "数据库不可用" }, { status: 503 });

    const user = await requireCurrentUser(req);
    if (!user) return privateJson({ error: "请先登录" }, { status: 401 });

    const { type, data } = await req.json();
    if (!type || data === undefined) {
      return privateJson({ error: "缺少 type 或 data" }, { status: 400 });
    }

    const validTypes = ["projects", "assets", "image-workbench", "video-workbench"];
    if (!validTypes.includes(type)) {
      return privateJson({ error: "无效的同步类型" }, { status: 400 });
    }

    if (type === "projects" && Array.isArray(data)) {
      const projectLimit = await getProjectLimit(user.id);
      if (projectLimit !== null && data.length > projectLimit) {
        return privateJson({ error: `当前套餐最多保存 ${projectLimit} 个画布项目` }, { status: 403 });
      }
    }

    const record = await prisma.canvasBackup.upsert({
      where: { userId_type: { userId: user.id, type } },
      update: { data, version: { increment: 1 } },
      create: { userId: user.id, type, data },
    });

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
    const record = await prisma.canvasBackup.findUnique({
      where: { userId_type: { userId: user.id, type } },
    });

    return privateJson({ data: record?.data || null, version: record?.version || 0 });
  } catch (err: any) {
    console.error("[sync:get]", err?.message);
    return privateJson({ error: "读取失败" }, { status: 500 });
  }
}
