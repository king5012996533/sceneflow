import { NextRequest, NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { invalidateOperationConfigCache } from "@/lib/operation-config";

// 运营配置（OperationConfig）：读写 daily_credit_grant 等
export const dynamic = "force-dynamic";

const KNOWN_KEYS: Record<string, { description: string }> = {
    daily_credit_grant: { description: "免费用户每日赠送积分（0 = 不赠送）" },
    signup_credit_grant: { description: "新用户一次性赠送积分（0 = 不赠送）" },
    image_credit: { description: "图片生成全局默认积分（每张；未逐模型定价时按此扣费）" },
    video_credit: { description: "视频生成全局默认积分（每条，与时长无关；未逐模型定价时按此扣费）" },
    audio_credit: { description: "音频生成全局默认积分（每次；未逐模型定价时按此扣费）" },
    text_credit: { description: "文本/工具全局默认积分（每次；未逐模型定价时按此扣费）" },
};

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const rows = await prisma.operationConfig.findMany({ orderBy: { key: "asc" } });
        const configs = rows.map((row) => ({
            key: row.key,
            value: row.value,
            description: row.description || KNOWN_KEYS[row.key]?.description || "",
        }));

        return NextResponse.json({ configs });
    } catch (error) {
        console.error("[admin/operation-config:get]", error);
        return NextResponse.json({ error: "获取运营配置失败" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const body = await req.json();
        const key = String(body.key || "");
        const value = body.value as unknown;

        if (!KNOWN_KEYS[key]) return NextResponse.json({ error: `未知的运营配置键：${key}` }, { status: 400 });

        const row = await prisma.operationConfig.upsert({
            where: { key },
            update: { value: value as never },
            create: { key, value: value as never, description: KNOWN_KEYS[key].description },
        });

        invalidateOperationConfigCache(key);

        await prisma.adminAuditLog.create({
            data: {
                actorId: admin.id,
                action: "operation_config.update",
                target: "operation_config",
                targetId: key,
                metadata: { value: value as never },
            },
        });

        return NextResponse.json({ config: row });
    } catch (error) {
        console.error("[admin/operation-config:patch]", error);
        return NextResponse.json({ error: "更新运营配置失败" }, { status: 500 });
    }
}
