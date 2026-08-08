import { NextRequest, NextResponse } from "next/server";

import { activateSubscription, type BillingCycle, type PaymentProvider } from "@/lib/billing";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const url = new URL(req.url);
        const status = url.searchParams.get("status") || undefined;

        const orders = await prisma.order.findMany({
            where: status ? { status } : undefined,
            include: { user: { select: { id: true, email: true, name: true } }, plan: true },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        return NextResponse.json({ orders });
    } catch (error) {
        console.error("[admin/orders:get]", error);
        return NextResponse.json({ error: "获取订单失败" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const body = await req.json();
        const orderId = String(body.orderId || "");
        const status = String(body.status || "");

        if (!orderId) return NextResponse.json({ error: "缺少订单 ID" }, { status: 400 });
        if (!["pending", "paid", "cancelled", "failed", "refunded"].includes(status)) {
            return NextResponse.json({ error: "订单状态无效" }, { status: 400 });
        }

        const order = await prisma.order.update({
            where: { id: orderId },
            data: status === "paid" ? { status, paidAt: new Date() } : { status },
            include: { user: { select: { id: true, email: true, name: true } }, plan: true },
        });

        // 手动开通：订单置为「已开通」时同步激活订阅，与支付回调逻辑一致
        // （此前只改订单状态不建订阅，导致后台开通权限不生效）
        if (status === "paid") {
            await activateSubscription({
                userId: order.userId,
                planId: order.planId,
                cycle: order.billingCycle as BillingCycle,
                provider: (order.provider || "manual") as PaymentProvider,
            });
        }

        await prisma.adminAuditLog.create({
            data: {
                actorId: admin.id,
                action: "order.status",
                target: "order",
                targetId: orderId,
                metadata: body,
            },
        });

        return NextResponse.json({ order });
    } catch (error) {
        console.error("[admin/orders:patch]", error);
        return NextResponse.json({ error: "更新订单失败" }, { status: 500 });
    }
}
