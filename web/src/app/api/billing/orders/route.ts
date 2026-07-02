import { NextRequest, NextResponse } from "next/server";

import { createOrderNo, ensureDefaultPlans, getPlanAmount, type BillingCycle, type PaymentProvider } from "@/lib/billing";
import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";

const providers = new Set(["wechat", "alipay", "stripe", "manual"]);
const cycles = new Set(["monthly", "yearly"]);

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const user = await requireCurrentUser(req);
        if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

        const orders = await prisma.order.findMany({
            where: { userId: user.id },
            include: { plan: true },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        return NextResponse.json({ orders });
    } catch (error) {
        console.error("[billing/orders:get]", error);
        return NextResponse.json({ error: "获取订单失败" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const user = await requireCurrentUser(req);
        if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

        await ensureDefaultPlans();

        const body = await req.json();
        const planId = String(body.planId || "");
        const billingCycle = String(body.billingCycle || "monthly") as BillingCycle;
        const provider = String(body.provider || "wechat") as PaymentProvider;

        if (!cycles.has(billingCycle)) return NextResponse.json({ error: "计费周期无效" }, { status: 400 });
        if (!providers.has(provider)) return NextResponse.json({ error: "支付渠道无效" }, { status: 400 });

        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan || !plan.isActive) return NextResponse.json({ error: "套餐不存在或已下架" }, { status: 404 });
        if (plan.id === "free") return NextResponse.json({ error: "免费版不需要创建订单" }, { status: 400 });

        const amount = getPlanAmount(plan, billingCycle);
        if (amount <= 0) return NextResponse.json({ error: "套餐价格配置异常" }, { status: 400 });

        const order = await prisma.order.create({
            data: {
                orderNo: createOrderNo(),
                userId: user.id,
                planId: plan.id,
                amount,
                currency: plan.currency,
                status: "pending",
                provider,
                billingCycle,
                metadata: {
                    note: "真实微信/支付宝/Stripe 参数需要在支付 provider 层生成。",
                    checkoutMode: "stub",
                },
            },
            include: { plan: true },
        });

        return NextResponse.json({
            order,
            checkout: {
                mode: "stub",
                provider,
                message: "订单已创建。接入真实支付时，这里返回二维码、收银台 URL 或客户端支付参数。",
            },
        });
    } catch (error) {
        console.error("[billing/orders:post]", error);
        return NextResponse.json({ error: "创建订单失败" }, { status: 500 });
    }
}
