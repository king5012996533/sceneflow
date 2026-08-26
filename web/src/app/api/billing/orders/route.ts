import { NextRequest, NextResponse } from "next/server";

import { createOrderNo, type PaymentProvider } from "@/lib/billing";
import { requireCurrentUser } from "@/lib/current-user";
import { isSameOriginRequest } from "@/lib/auth";
import { prisma } from "@/lib/ic-prisma";

const providers = new Set(["wechat", "alipay", "stripe", "manual"]);

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const user = await requireCurrentUser(req);
        if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

        const orders = await prisma.order.findMany({
            where: { userId: user.id },
            include: { package: true },
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
        if (!isSameOriginRequest(req)) return NextResponse.json({ error: "请求来源不合法" }, { status: 403 });

        const body = await req.json();
        const packageId = String(body.packageId || "");
        const provider = String(body.provider || "manual") as PaymentProvider;
        const intent = String(body.intent || (provider === "manual" ? "beta_application" : "checkout"));

        if (!packageId) return NextResponse.json({ error: "缺少积分包" }, { status: 400 });
        if (!providers.has(provider)) return NextResponse.json({ error: "支付渠道无效" }, { status: 400 });

        // —— 积分包订单 ——
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
    } catch (error) {
        console.error("[billing/orders:post]", error);
        return NextResponse.json({ error: "创建积分包订单失败" }, { status: 500 });
    }
}
