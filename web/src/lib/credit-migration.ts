import type { PrismaClient } from "@/generated/ic-prisma";

import { getOperationNumber } from "@/lib/operation-config";
import { ensureCreditBalance, grantCredits } from "@/lib/credit-ledger";

/**
 * 存量迁移（Phase 6）：登录时对老用户做一次性补偿，全部幂等、失败静默。
 *
 * - ensureCreditBalance：老用户首次登录补建积分账户（此前只有新用户首次生成时才惰性创建）
 * - signup_grant：新用户一次性赠送（OperationConfig signup_credit_grant，默认 50）
 * - sub_compensation：存量 active 付费订阅按订阅一次性折算补偿
 *   （OperationConfig sub_compensation_credits，默认 500；free 套餐不补偿）
 */
export async function ensureLoginCreditMigration(prismaClient: PrismaClient, userId: string): Promise<void> {
    const [signupGrant, subCompensation] = await Promise.all([
        getOperationNumber("signup_credit_grant", 50),
        getOperationNumber("sub_compensation_credits", 500),
    ]);

    await prismaClient.$transaction(async (tx) => {
        await ensureCreditBalance(tx, userId);

        if (signupGrant > 0) {
            const granted = await tx.creditTransaction.findFirst({ where: { userId, refType: "signup_grant", refId: "once" }, select: { id: true } });
            if (!granted) {
                await grantCredits(tx, userId, signupGrant, "grant", "signup_grant", "once", "新用户赠送积分");
            }
        }

        if (subCompensation > 0) {
            const subs = await tx.subscription.findMany({
                where: { userId, status: "active" },
                include: { plan: { select: { id: true } } },
            });
            for (const sub of subs) {
                if (!sub.planId || sub.plan?.id === "free") continue;
                const compensated = await tx.creditTransaction.findFirst({ where: { userId, refType: "sub_compensation", refId: sub.id }, select: { id: true } });
                if (compensated) continue;
                await grantCredits(tx, userId, subCompensation, "grant", "sub_compensation", sub.id, "存量付费订阅折算补偿");
            }
        }
    });
}
