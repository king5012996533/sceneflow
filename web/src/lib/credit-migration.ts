import type { PrismaClient } from "@/generated/ic-prisma";

import { getOperationNumber } from "@/lib/operation-config";
import { ensureCreditBalance, grantCredits } from "@/lib/credit-ledger";

/**
 * 存量迁移：登录时对老用户做一次性补偿，全部幂等、失败静默。
 *
 * - ensureCreditBalance：老用户首次登录补建积分账户（此前只有新用户首次生成时才惰性创建）
 * - signup_grant：新用户一次性赠送（OperationConfig signup_credit_grant，默认 50）
 */
export async function ensureLoginCreditMigration(prismaClient: PrismaClient, userId: string): Promise<void> {
    const signupGrant = await getOperationNumber("signup_credit_grant", 50);

    await prismaClient.$transaction(async (tx) => {
        await ensureCreditBalance(tx, userId);

        if (signupGrant > 0) {
            const granted = await tx.creditTransaction.findFirst({ where: { userId, refType: "signup_grant", refId: "once" }, select: { id: true } });
            if (!granted) {
                await grantCredits(tx, userId, signupGrant, "grant", "signup_grant", "once", "新用户赠送积分");
            }
        }
    });
}
