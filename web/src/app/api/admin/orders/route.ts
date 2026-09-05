import { NextRequest, NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import { grantCredits } from "@/lib/credit-ledger";
import { settleReferralForOrder } from "@/lib/referral";

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const url = new URL(req.url);
        const status = url.searchParams.get("status") || undefined;

        const orders = await prisma.order.findMany({
            where: status ? { status } : undefined,
            include: { user: { select: { id: true, email: true, name: true } }, package: true },
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

        const result = await prisma.$transaction(async (tx) => {
            const existing = await tx.order.findUnique({ where: { id: orderId } });
            if (!existing) return { order: null, credited: false };
            if (existing.status === "paid" && status !== "paid") throw new Error("已支付订单不能直接改为其他状态");
            if (status === "paid" && existing.status !== "pending") throw new Error("只有待支付订单可以确认支付");

            const claimed = status === "paid" ? await tx.order.updateMany({ where: { id: orderId, status: "pending" }, data: { status, paidAt: new Date() } }) : await tx.order.updateMany({ where: { id: orderId }, data: { status } });
            if (!claimed.count) return { order: await tx.order.findUnique({ where: { id: orderId }, include: { user: { select: { id: true, email: true, name: true } }, package: true } }), credited: false };

            const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { user: { select: { id: true, email: true, name: true } }, package: true } });
            if (status === "paid" && order.package) {
                const credits = order.package.credits + order.package.bonusCredits;
                await grantCredits(tx, order.userId, credits, "purchase", "order", orderId, `积分包「${order.package.name}」到账 ${credits} 积分`);
                // 老带新邀请返利：与积分入账同一事务，幂等（refType=referral_*）
                await settleReferralForOrder(tx, orderId, credits);
            }
            await tx.adminAuditLog.create({ data: { actorId: admin.id, action: "order.status", target: "order", targetId: orderId, metadata: body } });
            return { order, credited: status === "paid" };
        });
        if (!result.order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });
        return NextResponse.json({ order: result.order });
    } catch (error) {
        console.error("[admin/orders:patch]", error);
        return NextResponse.json({ error: "更新订单失败" }, { status: 500 });
    }
}
