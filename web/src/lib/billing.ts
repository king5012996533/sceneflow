import { nanoid } from "nanoid";

import { prisma } from "@/lib/ic-prisma";

export type PaymentProvider = "wechat" | "alipay" | "stripe" | "manual";

export function createOrderNo() {
    const time = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    return `SF${time}${nanoid(8).toUpperCase()}`;
}

/** 积分包默认档位（只播种不覆盖：已存在的保持数据库当前值，admin 可改） */
const DEFAULT_CREDIT_PACKAGES = [
    { id: "starter", name: "体验包", credits: 100, priceCents: 1000, bonusCredits: 0, sortOrder: 0 },
    { id: "creator", name: "创作者包", credits: 500, priceCents: 4500, bonusCredits: 50, sortOrder: 1 },
    { id: "studio", name: "工作室包", credits: 2000, priceCents: 16000, bonusCredits: 300, sortOrder: 2 },
    { id: "enterprise", name: "企业包", credits: 10000, priceCents: 70000, bonusCredits: 2000, sortOrder: 3 },
] as const;

export async function ensureDefaultCreditPackages() {
    if (!prisma) return;
    for (const pkg of DEFAULT_CREDIT_PACKAGES) {
        const existing = await prisma.creditPackage.findUnique({ where: { id: pkg.id } });
        if (!existing) {
            await prisma.creditPackage.create({
                data: {
                    id: pkg.id,
                    name: pkg.name,
                    credits: pkg.credits,
                    priceCents: pkg.priceCents,
                    bonusCredits: pkg.bonusCredits,
                    sortOrder: pkg.sortOrder,
                    isActive: true,
                },
            });
        }
    }
}
