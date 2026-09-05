import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

import { type PaymentProvider } from "@/lib/billing";
import { prisma } from "@/lib/ic-prisma";
import { Prisma } from "@/generated/ic-prisma/client";
import { grantCredits } from "@/lib/credit-ledger";
import { settleReferralForOrder } from "@/lib/referral";

const ALLOWED_PROVIDERS: ReadonlySet<string> = new Set(["wechat", "alipay", "stripe", "manual"]);
const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000; // 签名时间戳新鲜度窗口：5 分钟

/**
 * 支付回调（充值到账的信任边界）。
 * - 签名：推荐 x-payment-signature = HMAC-SHA256(secret, `${timestamp}.${nonce}.${rawBody}`)，
 *   配合 x-payment-timestamp / x-payment-nonce 防重放；兼容旧版 x-payment-callback-secret 直传。
 * - 金额：回调体携带的 amount（分）必须与订单金额一致，防篡改。
 * - 原子性：订单置已支付 + 积分入账在同一个数据库事务内完成，杜绝「订单已支付但积分未到账」。
 * - 幂等：只有状态还不是 paid 的订单会被领取并入账，重复回调不重复到账。
 */
export async function POST(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const callbackSecret = process.env.PAYMENT_CALLBACK_SECRET;
        if (!callbackSecret) return NextResponse.json({ error: "支付回调尚未启用" }, { status: 403 });

        const rawBody = await req.text();
        if (!rawBody) return NextResponse.json({ error: "缺少请求体" }, { status: 400 });

        if (!verifySignature(req, rawBody, callbackSecret)) {
            return NextResponse.json({ error: "回调签名无效" }, { status: 401 });
        }

        let body: Record<string, unknown>;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: "请求体不是合法 JSON" }, { status: 400 });
        }

        const orderNo = String(body.orderNo || "");
        const provider = String(body.provider || "manual");
        const providerOrderNo = body.providerOrderNo ? String(body.providerOrderNo) : undefined;
        const eventType = String(body.eventType || "payment.succeeded");
        const paid = body.paid !== false;

        if (!orderNo) return NextResponse.json({ error: "缺少订单号" }, { status: 400 });
        if (!ALLOWED_PROVIDERS.has(provider)) return NextResponse.json({ error: "支付渠道不合法" }, { status: 400 });

        const order = await prisma.order.findUnique({ where: { orderNo } });
        if (!order) return NextResponse.json({ error: "订单不存在" }, { status: 404 });

        // 金额核对：回调体若携带金额（单位分），必须与订单金额一致，防止低额充值蒙混入账
        if (typeof body.amount === "number") {
            if (Math.round(body.amount) !== order.amount) {
                console.error(`[payments/callback] 金额不匹配 order=${orderNo} orderAmount=${order.amount} bodyAmount=${body.amount}`);
                return NextResponse.json({ error: "回调金额与订单不一致" }, { status: 400 });
            }
        }

        // 订单置已支付 + 积分入账，同一事务内原子完成（H-5：统一原子入账）
        const result = await prisma.$transaction(async (tx) => {
            await tx.paymentEvent.create({
                data: {
                    orderId: order.id,
                    provider: provider as PaymentProvider,
                    eventType,
                    providerEventId: body.providerEventId ? String(body.providerEventId) : undefined,
                    payload: body as unknown as Prisma.InputJsonValue,
                },
            });

            if (!paid) {
                const failedClaim = await tx.order.updateMany({
                    where: { id: order.id, status: "pending" },
                    data: { status: "failed", providerOrderNo },
                });
                const failed = await tx.order.findUnique({ where: { id: order.id } });
                if (!failedClaim.count) return { order: failed, credited: false, credits: 0, balance: null };
                return { order: failed, credited: false, credits: 0, balance: null };
            }

            // 幂等领取：只有订单还不是「已支付」时才置为已支付并入账积分
            const claimed = await tx.order.updateMany({
                where: { id: order.id, status: "pending" },
                data: { status: "paid", paidAt: new Date(), providerOrderNo },
            });

            if (!claimed.count) {
                // 已处理过的订单（重复回调）：返回当前状态，不重复入账
                const existing = await tx.order.findUnique({ where: { id: order.id } });
                return { order: existing, credited: false, credits: 0, balance: null };
            }

            // 积分包订单：入账积分（幂等由上面的 updateMany 领取保证，不会重复到账）
            const pkg = order.packageId ? await tx.creditPackage.findUnique({ where: { id: order.packageId } }) : null;
            if (!pkg) throw new Error("积分包不存在");
            const credits = pkg.credits + pkg.bonusCredits;
            const balance = await grantCredits(tx, order.userId, credits, "purchase", "order", order.id, `积分包「${pkg.name}」到账 ${credits} 积分`);
            // 老带新邀请返利：与积分入账同一事务，幂等（refType=referral_*）
            await settleReferralForOrder(tx, order.id, credits);
            const updatedOrder = await tx.order.findUniqueOrThrow({ where: { id: order.id } });
            return { order: updatedOrder, credited: true, credits, balance };
        });

        return NextResponse.json({ order: result.order, credits: result.credits, balance: result.balance });
    } catch (error) {
        console.error("[payments/callback]", error);
        return NextResponse.json({ error: "处理支付回调失败" }, { status: 500 });
    }
}

function constantTimeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a, "utf8");
    const bBuf = Buffer.from(b, "utf8");
    return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

/**
 * 签名校验（恒时比较）：
 * 1. 新协议：x-payment-signature = HMAC-SHA256(secret, `${timestamp}.${nonce}.${rawBody}`)，
 *    配合 x-payment-timestamp（毫秒）与 x-payment-nonce 使用，5 分钟内有效。
 * 2. 旧协议兼容：x-payment-callback-secret 直接等于 secret（手动入账脚本仍可用）。
 */
function verifySignature(req: NextRequest, rawBody: string, secret: string): boolean {
    const signature = req.headers.get("x-payment-signature");
    const timestamp = req.headers.get("x-payment-timestamp");
    const nonce = req.headers.get("x-payment-nonce");

    if (signature && timestamp && nonce) {
        const ts = Number(timestamp);
        if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > SIGNATURE_MAX_AGE_MS) return false;
        const expected = createHmac("sha256", secret).update(`${timestamp}.${nonce}.${rawBody}`).digest("hex");
        return constantTimeEqual(signature.toLowerCase(), expected);
    }

    const legacy = req.headers.get("x-payment-callback-secret");
    return !!legacy && constantTimeEqual(legacy, secret);
}
