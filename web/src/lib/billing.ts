import { nanoid } from "nanoid";

import { prisma } from "@/lib/ic-prisma";

export type BillingCycle = "monthly" | "yearly";
export type PaymentProvider = "wechat" | "alipay" | "stripe" | "manual";

type DefaultEntitlement = readonly [key: string, label: string, value: string, unit: string];

export const PLAN_ENTITLEMENT_ORDER = [
    "projects",
    "storage_gb",
    "concurrent_jobs",
    "hd_export",
    "private_characters",
    "canvas_agent",
    "creative_agent",
    "cut_editor",
    "asset_library",
    "team_members",
] as const;

export function sortPlanEntitlements<T extends { key: string }>(entitlements: T[]) {
    const order = new Map(PLAN_ENTITLEMENT_ORDER.map((key, index) => [key, index]));
    return [...entitlements].sort((a, b) => (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999) || a.key.localeCompare(b.key));
}

export const DEFAULT_PLANS = [
    {
        id: "free",
        name: "免费版",
        description: "适合体验基础画布、少量生成和本地创作流程。",
        monthlyPrice: 0,
        yearlyPrice: 0,
        currency: "CNY",
        sortOrder: 0,
        isPopular: false,
        entitlements: [
            ["projects", "画布项目", "3", "个"],
            ["storage_gb", "素材存储", "1", "GB"],
            ["concurrent_jobs", "并发生成", "1", "个"],
            ["hd_export", "高清导出", "false", ""],
            ["private_characters", "私有角色资产", "0", "个"],
            ["team_members", "团队成员", "1", "人"],
            ["canvas_agent", "画布助手", "基础问答", ""],
            ["creative_agent", "创作 Agent", "流程建议", ""],
            ["cut_editor", "后期剪辑器", "即将上线", ""],
            ["asset_library", "资产沉淀", "本地素材管理", ""],
        ],
    },
    {
        id: "creator",
        name: "创作者版",
        description: "适合个人创作者持续生产图片、分镜、视频和可复用角色资产。",
        monthlyPrice: 7900,
        yearlyPrice: 79000,
        currency: "CNY",
        sortOrder: 1,
        isPopular: true,
        entitlements: [
            ["projects", "画布项目", "50", "个"],
            ["storage_gb", "素材存储", "50", "GB"],
            ["concurrent_jobs", "并发生成", "3", "个"],
            ["hd_export", "高清导出", "true", ""],
            ["private_characters", "私有角色资产", "20", "个"],
            ["team_members", "团队成员", "1", "人"],
            ["canvas_agent", "画布助手", "创作规划 + 提示词优化", ""],
            ["creative_agent", "创作 Agent", "多轮对话 + 分镜拆解", ""],
            ["cut_editor", "后期剪辑器", "基础剪辑能力", ""],
            ["asset_library", "资产沉淀", "角色 / 场景 / 分镜复用", ""],
        ],
    },
    {
        id: "team",
        name: "团队版",
        description: "适合小团队共享角色资产、场景资产、分镜模板和批量生产任务。",
        monthlyPrice: 29900,
        yearlyPrice: 299000,
        currency: "CNY",
        sortOrder: 2,
        isPopular: false,
        entitlements: [
            ["projects", "画布项目", "300", "个"],
            ["storage_gb", "素材存储", "500", "GB"],
            ["concurrent_jobs", "并发生成", "10", "个"],
            ["hd_export", "高清导出", "true", ""],
            ["private_characters", "私有角色资产", "200", "个"],
            ["team_members", "团队成员", "8", "人"],
            ["canvas_agent", "画布助手", "团队工作流规划", ""],
            ["creative_agent", "创作 Agent", "剧本拆解 + 资产复用建议", ""],
            ["cut_editor", "后期剪辑器", "团队剪辑工作台", ""],
            ["asset_library", "资产沉淀", "团队素材库", ""],
        ],
    },
    {
        id: "enterprise",
        name: "企业版",
        description: "适合机构级视觉生产、私有化模型配置、专属流程和团队支持。",
        monthlyPrice: 99900,
        yearlyPrice: 999000,
        currency: "CNY",
        sortOrder: 3,
        isPopular: false,
        entitlements: [
            ["projects", "画布项目", "unlimited", "个"],
            ["storage_gb", "素材存储", "unlimited", "GB"],
            ["concurrent_jobs", "并发生成", "custom", "个"],
            ["hd_export", "高清导出", "true", ""],
            ["private_characters", "私有角色资产", "unlimited", "个"],
            ["team_members", "团队成员", "custom", "人"],
            ["canvas_agent", "画布助手", "专属流程配置", ""],
            ["creative_agent", "创作 Agent", "企业知识库 + 私有技能", ""],
            ["cut_editor", "后期剪辑器", "高级剪辑与交付支持", ""],
            ["asset_library", "资产沉淀", "企业级资产库", ""],
        ],
    },
] as const satisfies ReadonlyArray<{
    id: string;
    name: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    currency: string;
    sortOrder: number;
    isPopular: boolean;
    entitlements: readonly DefaultEntitlement[];
}>;

export function getPlanAmount(plan: { monthlyPrice: number; yearlyPrice: number }, cycle: BillingCycle) {
    return cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
}

export function formatCny(amount: number) {
    return `￥${(amount / 100).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
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
