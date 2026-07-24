import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { dailyPeriod, getServerEntitlements } from "@/lib/server-entitlements";

const FREE_DAILY_LIMIT = 3;

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ allowed: true, remaining: -1, limit: null });

        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ allowed: true, remaining: -1, limit: null });

        if (user.role === "admin") return NextResponse.json({ allowed: true, remaining: -1, limit: null });

        const entitlements = await getServerEntitlements(user.id);
        const generationLimit = entitlements.projects !== null && entitlements.projects <= 3 ? FREE_DAILY_LIMIT : null;

        if (generationLimit === null) return NextResponse.json({ allowed: true, remaining: -1, limit: null });

        const period = dailyPeriod();
        const usage = await prisma.usageRecord.findUnique({
            where: { userId_metric_period: { userId: user.id, metric: "generations", period } },
        });

        const used = usage?.used || 0;
        const remaining = Math.max(0, generationLimit - used);

        return NextResponse.json({
            allowed: remaining > 0,
            remaining,
            limit: generationLimit,
            used,
        });
    } catch (error) {
        console.error("[generation/quota]", error);
        return NextResponse.json({ allowed: true, remaining: -1, limit: null });
    }
}
