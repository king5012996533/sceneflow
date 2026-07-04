import { NextRequest, NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { reserveGenerationUsage } from "@/lib/server-entitlements";

export async function POST(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

        const user = await requireCurrentUser(req);
        if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

        const body = await req.json().catch(() => ({}));
        const count = Math.max(1, Math.min(50, Math.floor(Number(body.count) || 1)));
        const result = await reserveGenerationUsage(user.id, count);

        if (!result.allowed) {
            return NextResponse.json(
                {
                    error: `本月免费生成次数已用完（${result.limit} 次/月），请联系管理员开通套餐权益。`,
                    usage: result,
                },
                { status: 403 },
            );
        }

        return NextResponse.json({ usage: result });
    } catch (error) {
        console.error("[billing/usage/generation]", error);
        return NextResponse.json({ error: "生成额度检查失败" }, { status: 500 });
    }
}
