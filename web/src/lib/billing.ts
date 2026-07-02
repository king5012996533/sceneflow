import { nanoid } from "nanoid";

import { prisma } from "@/lib/ic-prisma";

export type BillingCycle = "monthly" | "yearly";
export type PaymentProvider = "wechat" | "alipay" | "stripe" | "manual";

export const DEFAULT_PLANS = [
    {
        id: "free",
        name: "免费版",
        description: "适合体验基础画布和本地生产流程。",
        monthlyPrice: 0,
        yearlyPrice: 0,
        currency: "CNY",
        sortOrder: 0,
        isPopular: false,
        entitlements: [
            ["projects", "项目数", "3", "个"],
            ["storage_gb", "存储空间", "1", "GB"],
            ["concurrent_jobs", "并发任务", "1", "个"],
            ["hd_export", "高清输出", "false", ""],
            ["private_characters", "私有角色资产", "0", "个"],
            ["team_members", "团队成员", "1", "人"],
        ],
    },
    {
        id: "creator",
        name: "创作者版",
        description: "适合个人创作者持续生产图片、分镜和视频素材。",
        monthlyPrice: 7900,
        yearlyPrice: 79000,
        currency: "CNY",
        sortOrder: 1,
        isPopular: true,
        entitlements: [
            ["projects", "项目数", "50", "个"],
            ["storage_gb", "存储空间", "50", "GB"],
            ["concurrent_jobs", "并发任务", "3", "个"],
            ["hd_export", "高清输出", "true", ""],
            ["private_characters", "私有角色资产", "20", "个"],
            ["team_members", "团队成员", "1", "人"],
        ],
    },
    {
        id: "team",
        name: "团队版",
        description: "适合小团队共享角色资产、场景资产和批量生产任务。",
        monthlyPrice: 29900,
        yearlyPrice: 299000,
        currency: "CNY",
        sortOrder: 2,
        isPopular: false,
        entitlements: [
            ["projects", "项目数", "300", "个"],
            ["storage_gb", "存储空间", "500", "GB"],
            ["concurrent_jobs", "并发任务", "10", "个"],
            ["hd_export", "高清输出", "true", ""],
            ["private_characters", "私有角色资产", "200", "个"],
            ["team_members", "团队成员", "8", "人"],
        ],
    },
    {
        id: "enterprise",
        name: "企业版",
        description: "适合机构级视觉生产、私有化模型配置和专属支持。",
        monthlyPrice: 99900,
        yearlyPrice: 999000,
        currency: "CNY",
        sortOrder: 3,
        isPopular: false,
        entitlements: [
            ["projects", "项目数", "unlimited", "个"],
            ["storage_gb", "存储空间", "unlimited", "GB"],
            ["concurrent_jobs", "并发任务", "custom", "个"],
            ["hd_export", "高清输出", "true", ""],
            ["private_characters", "私有角色资产", "unlimited", "个"],
            ["team_members", "团队成员", "custom", "人"],
        ],
    },
] as const;

export function getPlanAmount(plan: { monthlyPrice: number; yearlyPrice: number }, cycle: BillingCycle) {
    return cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
}

export function formatCny(amount: number) {
    return `¥${(amount / 100).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
}

export function createOrderNo() {
    const time = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
    return `SF${time}${nanoid(8).toUpperCase()}`;
}

export function getPeriodEnd(cycle: BillingCycle) {
    const date = new Date();
    if (cycle === "yearly") date.setFullYear(date.getFullYear() + 1);
    else date.setMonth(date.getMonth() + 1);
    return date;
}

export async function ensureDefaultPlans() {
    if (!prisma) return;

    for (const plan of DEFAULT_PLANS) {
        await prisma.plan.upsert({
            where: { id: plan.id },
            update: {
                name: plan.name,
                description: plan.description,
                monthlyPrice: plan.monthlyPrice,
                yearlyPrice: plan.yearlyPrice,
                currency: plan.currency,
                sortOrder: plan.sortOrder,
                isPopular: plan.isPopular,
                isActive: true,
            },
            create: {
                id: plan.id,
                name: plan.name,
                description: plan.description,
                monthlyPrice: plan.monthlyPrice,
                yearlyPrice: plan.yearlyPrice,
                currency: plan.currency,
                sortOrder: plan.sortOrder,
                isPopular: plan.isPopular,
                isActive: true,
            },
        });

        for (const [key, label, value, unit] of plan.entitlements) {
            await prisma.entitlement.upsert({
                where: { planId_key: { planId: plan.id, key } },
                update: { label, value, unit },
                create: { planId: plan.id, key, label, value, unit },
            });
        }
    }
}

export async function activateSubscription({
    userId,
    planId,
    cycle,
    provider,
}: {
    userId: string;
    planId: string;
    cycle: BillingCycle;
    provider: PaymentProvider;
}) {
    if (!prisma) throw new Error("Database unavailable");

    const now = new Date();
    const currentPeriodEnd = planId === "free" ? null : getPeriodEnd(cycle);

    await prisma.subscription.updateMany({
        where: { userId, status: "active" },
        data: { status: "expired", autoRenew: false },
    });

    return prisma.subscription.create({
        data: {
            userId,
            planId,
            status: "active",
            billingCycle: planId === "free" ? "manual" : cycle,
            currentPeriodStart: now,
            currentPeriodEnd,
            autoRenew: provider !== "manual",
            provider,
        },
        include: { plan: { include: { entitlements: true } } },
    });
}
