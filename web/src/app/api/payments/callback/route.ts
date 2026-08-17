import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { activateSubscription, type BillingCycle, type PaymentProvider } from "@/lib/billing";
import { prisma } from "@/lib/ic-prisma";
import { grantCredits } from "@/lib/credit-ledger";

export async function POST(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const callbackSecret = process.env.PAYMENT_CALLBACK_SECRET;
        if (!callbackSecret) return NextResponse.json({ error: "支付回调尚未启用" }, { status: 403 });

        // 恒时比较，避免时序侧信道
        const received = Buffer.from(req.headers.get("x-payment-callback-secret") || "", "utf8");
        const expected = Buffer.from(callbackSecret, "utf8");
        if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
            return NextResponse.json({ error: "回调签名无效" }, { status: 401 });
        }

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

        // 幂等领取：只有订单还不是「已支付」时才置为已支付并激活订阅。
        // 重复回调（重放/支付平台重试）会在这里被拦截，不会重复延长订阅期。
        const claimed = await prisma.order.updateMany({
            where: { id: order.id, status: { not: "paid" } },
            data: { status: "paid", paidAt: new Date(), providerOrderNo },
        });

        if (!claimed.count) {
            // 已处理过的订单（重复回调）：直接返回当前状态，不重复激活订阅
            const existing = await prisma.order.findUnique({ where: { id: order.id } });
            return NextResponse.json({ order: existing });
        }

        const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });

        if (updatedOrder.packageId) {
            // 积分包订单：入账积分（幂等由上面的 updateMany 领取保证，不会重复到账）
            const pkg = updatedOrder.packageId ? await prisma.creditPackage.findUnique({ where: { id: updatedOrder.packageId } }) : null;
            if (!pkg) return NextResponse.json({ error: "积分包不存在" }, { status: 404 });
            const credits = pkg.credits + pkg.bonusCredits;
            const balance = await grantCredits(prisma as never, order.userId, credits, "purchase", "order", order.id, `积分包「${pkg.name}」到账 ${credits} 积分`);
            return NextResponse.json({ order: updatedOrder, credits, balance });
        }

        const subscription = await activateSubscription({
            userId: order.userId,
            planId: order.planId as string,
            cycle: order.billingCycle as BillingCycle,
            provider,
        });

        return NextResponse.json({ order: updatedOrder, subscription });
    } catch (error) {
        console.error("[payments/callback]", error);
        return NextResponse.json({ error: "处理支付回调失败" }, { status: 500 });
    }
}
