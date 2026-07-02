import { NextResponse } from "next/server";

import { DEFAULT_PLANS, ensureDefaultPlans } from "@/lib/billing";
import { prisma } from "@/lib/ic-prisma";

export async function GET() {
    try {
        if (!prisma) return NextResponse.json({ plans: getFallbackPlans(), dbAvailable: false });

        await ensureDefaultPlans();

        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            include: { entitlements: { orderBy: { key: "asc" } } },
            orderBy: { sortOrder: "asc" },
        });

        return NextResponse.json({ plans, dbAvailable: true });
    } catch (error) {
        console.error("[billing/plans]", error);
        return NextResponse.json({ plans: getFallbackPlans(), dbAvailable: false });
    }
}

function getFallbackPlans() {
    return DEFAULT_PLANS.map((plan) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        currency: plan.currency,
        sortOrder: plan.sortOrder,
        isActive: true,
        isPopular: plan.isPopular,
        entitlements: plan.entitlements.map(([key, label, value, unit]) => ({
            id: `${plan.id}-${key}`,
            planId: plan.id,
            key,
            label,
            value,
            unit,
            description: "",
        })),
    }));
}
