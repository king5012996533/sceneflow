import { NextRequest, NextResponse } from "next/server";

import { activateSubscription, type BillingCycle, type PaymentProvider } from "@/lib/billing";
import { prisma } from "@/lib/ic-prisma";

export async function POST(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const body = await req.json();
        const orderNo = String(body.orderNo || "");
        const provider = String(body.provider || "manual") as PaymentProvider;
        const providerOrderNo = body.providerOrderNo ? String(body.providerOrderNo) : undefined;
        const eventType = String(body.eventType || "payment.succeeded");
        const paid = body.paid !== false;

        if (!orderNo) return NextResponse.json({ error: "缺少订单号" }, { status: 400 });

        const order = await prisma.order.findUnique({ where: { orderNo }, include: { plan: true } });
        if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });

        await prisma.paymentEvent.create({
            data: {
                orderId: order.id,
                provider,
                eventType,
                providerEventId: body.providerEventId ? String(body.providerEventId) : undefined,
                payload: body,
            },
        });

        if (!paid) {
            const failed = await prisma.order.update({
                where: { id: order.id },
                data: { status: "failed", providerOrderNo },
            });
            return NextResponse.json({ order: failed });
        }

        const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: {
                status: "paid",
                paidAt: new Date(),
                providerOrderNo,
            },
        });

        const subscription = await activateSubscription({
            userId: order.userId,
            planId: order.planId,
            cycle: order.billingCycle as BillingCycle,
            provider,
        });

        return NextResponse.json({ order: updatedOrder, subscription });
    } catch (error) {
        console.error("[payments/callback]", error);
        return NextResponse.json({ error: "处理支付回调失败" }, { status: 500 });
    }
}
