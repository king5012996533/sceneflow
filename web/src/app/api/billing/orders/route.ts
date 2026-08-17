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
            include: { plan: true, package: true },
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
        const packageId = String(body.packageId || "");
        const billingCycle = String(body.billingCycle || "monthly") as BillingCycle;
        const provider = String(body.provider || "manual") as PaymentProvider;
        const intent = String(body.intent || (provider === "manual" ? "beta_application" : "checkout"));

        if (!planId && !packageId) return NextResponse.json({ error: "缺少套餐或积分包" }, { status: 400 });
        if (planId && packageId) return NextResponse.json({ error: "套餐与积分包不能同时下单" }, { status: 400 });
        if (!providers.has(provider)) return NextResponse.json({ error: "支付渠道无效" }, { status: 400 });

        // —— 积分包订单 ——
        if (packageId) {
            const pkg = await prisma.creditPackage.findUnique({ where: { id: packageId } });
            if (!pkg || !pkg.isActive) return NextResponse.json({ error: "积分包不存在或已下架" }, { status: 404 });
            if (pkg.priceCents <= 0) return NextResponse.json({ error: "积分包价格配置异常" }, { status: 400 });

            const order = await prisma.order.create({
                data: {
                    orderNo: createOrderNo(),
                    userId: user.id,
                    packageId: pkg.id,
                    amount: pkg.priceCents,
                    currency: pkg.currency,
                    status: "pending",
                    provider,
                    billingCycle: "manual",
                    metadata: {
                        intent: "package",
                        packageName: pkg.name,
                        credits: pkg.credits,
                        bonusCredits: pkg.bonusCredits,
                        checkoutMode: provider === "manual" ? "manual_credit" : "stub",
                        note: provider === "manual" ? "内测阶段暂不接入在线收银台，由管理员确认收款后手动入账。" : "真实支付参数后续在 provider 层生成。",
                    },
                },
                include: { package: true },
            });

            return NextResponse.json({
                order,
                checkout: {
                    mode: provider === "manual" ? "manual_credit" : "stub",
                    provider,
                    message: provider === "manual" ? "已生成积分包订单，扫码付款后联系管理员确认入账。" : "订单已创建。接入真实支付时返回二维码、收银台 URL 或客户端支付参数。",
                },
            });
        }

        if (!cycles.has(billingCycle)) return NextResponse.json({ error: "计费周期无效" }, { status: 400 });

        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan || !plan.isActive) return NextResponse.json({ error: "套餐不存在或已下架" }, { status: 404 });
        if (plan.id === "free") return NextResponse.json({ error: "免费版不需要申请" }, { status: 400 });

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
                    intent,
                    checkoutMode: provider === "manual" ? "beta_application" : "stub",
                    note: provider === "manual" ? "内测阶段暂不接入在线收银台，由管理员确认套餐后人工开通权益。" : "真实支付参数后续在 provider 层生成。",
                },
            },
            include: { plan: true },
        });

        return NextResponse.json({
            order,
            checkout: {
                mode: provider === "manual" ? "beta_application" : "stub",
                provider,
                message: provider === "manual" ? "已申请开通，管理员会联系确认使用场景、套餐周期和开通方式。" : "订单已创建。接入真实支付时返回二维码、收银台 URL 或客户端支付参数。",
            },
        });
    } catch (error) {
        console.error("[billing/orders:post]", error);
        return NextResponse.json({ error: "申请开通失败" }, { status: 500 });
    }
}
