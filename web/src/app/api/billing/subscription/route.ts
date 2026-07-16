import { NextRequest, NextResponse } from "next/server";

import { activateSubscription, ensureDefaultPlans, sortPlanEntitlements } from "@/lib/billing";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const user = await requireCurrentUser(req);
        if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

        await ensureDefaultPlans();

        let subscription = await prisma.subscription.findFirst({
            where: { userId: user.id, status: "active" },
            include: { plan: { include: { entitlements: { orderBy: { key: "asc" } } } } },
            orderBy: { createdAt: "desc" },
        });

        if (!subscription) {
            subscription = await activateSubscription({
                userId: user.id,
                planId: "free",
                cycle: "monthly",
                provider: "manual",
            });
        }

        const usage = await prisma.usageRecord.findMany({
            where: { userId: user.id },
            orderBy: { metric: "asc" },
        });

        const orders = await prisma.order.findMany({
            where: { userId: user.id },
            include: { plan: true },
            orderBy: { createdAt: "desc" },
            take: 10,
        });

        return NextResponse.json({
            user: { id: user.id, role: user.role },
            subscription: subscription
                ? {
                      ...subscription,
                      plan: subscription.plan ? { ...subscription.plan, entitlements: sortPlanEntitlements(subscription.plan.entitlements) } : subscription.plan,
                  }
                : subscription,
            usage,
            orders,
        });
    } catch (error) {
        console.error("[billing/subscription:get]", error);
        return NextResponse.json({ error: "获取订阅失败" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const user = await requireCurrentUser(req);
        if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

        const body = await req.json();
        const cancelAtPeriodEnd = Boolean(body.cancelAtPeriodEnd);

        const subscription = await prisma.subscription.findFirst({
            where: { userId: user.id, status: "active" },
            orderBy: { createdAt: "desc" },
        });

        if (!subscription) return NextResponse.json({ error: "没有可修改的订阅" }, { status: 404 });

        const updated = await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                cancelAtPeriodEnd,
                autoRenew: cancelAtPeriodEnd ? false : subscription.autoRenew,
            },
            include: { plan: { include: { entitlements: true } } },
        });

        return NextResponse.json({
            subscription: {
                ...updated,
                plan: updated.plan ? { ...updated.plan, entitlements: sortPlanEntitlements(updated.plan.entitlements) } : updated.plan,
            },
        });
    } catch (error) {
        console.error("[billing/subscription:patch]", error);
        return NextResponse.json({ error: "更新订阅失败" }, { status: 500 });
    }
}
