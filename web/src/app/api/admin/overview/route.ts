import { NextRequest, NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const [users, activeSubscriptions, paidOrders, pendingOrders, revenue] = await Promise.all([
            prisma.user.count(),
            prisma.subscription.count({ where: { status: "active" } }),
            prisma.order.count({ where: { status: "paid" } }),
            prisma.order.count({ where: { status: "pending" } }),
            prisma.order.aggregate({ where: { status: "paid" }, _sum: { amount: true } }),
        ]);

        return NextResponse.json({
            metrics: {
                users,
                activeSubscriptions,
                paidOrders,
                pendingOrders,
                revenue: revenue._sum.amount || 0,
            },
        });
    } catch (error) {
        console.error("[admin/overview]", error);
        return NextResponse.json({ error: "获取后台概览失败" }, { status: 500 });
    }
}
