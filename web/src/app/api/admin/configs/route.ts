import { NextRequest, NextResponse } from "next/server";

import { ensureDefaultPlans, sortPlanEntitlements } from "@/lib/billing";
import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        await ensureDefaultPlans();

        const [plans, modelConfigs, operationConfigs] = await Promise.all([
            prisma.plan.findMany({ include: { entitlements: true }, orderBy: { sortOrder: "asc" } }),
            prisma.modelConfig.findMany({ orderBy: [{ type: "asc" }, { provider: "asc" }, { displayName: "asc" }] }),
            prisma.operationConfig.findMany({ orderBy: { key: "asc" } }),
        ]);

        return NextResponse.json({
            plans: plans.map((plan) => ({ ...plan, entitlements: sortPlanEntitlements(plan.entitlements) })),
            modelConfigs,
            operationConfigs,
        });
    } catch (error) {
        console.error("[admin/configs:get]", error);
        return NextResponse.json({ error: "获取配置失败" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const body = await req.json();
        const type = String(body.type || "");

        if (type === "model") {
            const config = await prisma.modelConfig.upsert({
                where: {
                    provider_model_type: {
                        provider: String(body.provider || ""),
                        model: String(body.model || ""),
                        type: String(body.modelType || "image"),
                    },
                },
                update: {
                    displayName: String(body.displayName || body.model || ""),
                    enabled: body.enabled !== false,
                    isDefault: Boolean(body.isDefault),
                    params: body.params || undefined,
                },
                create: {
                    provider: String(body.provider || ""),
                    model: String(body.model || ""),
                    displayName: String(body.displayName || body.model || ""),
                    type: String(body.modelType || "image"),
                    enabled: body.enabled !== false,
                    isDefault: Boolean(body.isDefault),
                    params: body.params || undefined,
                },
            });
            return NextResponse.json({ config });
        }

        if (type === "operation") {
            const key = String(body.key || "");
            if (!key) return NextResponse.json({ error: "缺少配置 Key" }, { status: 400 });
            const config = await prisma.operationConfig.upsert({
                where: { key },
                update: { value: body.value ?? null, description: String(body.description || "") },
                create: { key, value: body.value ?? null, description: String(body.description || "") },
            });
            return NextResponse.json({ config });
        }

        if (type === "plan") {
            const planId = String(body.planId || "");
            const plan = await prisma.plan.findUnique({ where: { id: planId } });
            if (!plan) return NextResponse.json({ error: "套餐不存在" }, { status: 404 });

            const data: Record<string, unknown> = {};
            if (body.name !== undefined) data.name = String(body.name || "").slice(0, 40);
            if (body.description !== undefined) data.description = String(body.description || "");
            if (body.monthlyPrice !== undefined) {
                const price = Number(body.monthlyPrice);
                if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: "月度价格无效" }, { status: 400 });
                data.monthlyPrice = Math.round(price);
            }
            if (body.yearlyPrice !== undefined) {
                const price = Number(body.yearlyPrice);
                if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: "年度价格无效" }, { status: 400 });
                data.yearlyPrice = Math.round(price);
            }
            if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
            if (body.isPopular !== undefined) data.isPopular = Boolean(body.isPopular);
            if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;

            const updated = await prisma.plan.update({ where: { id: planId }, data });

            // 权益批量更新（可选）：[{ key, label, value, unit }]
            if (Array.isArray(body.entitlements)) {
                for (const item of body.entitlements) {
                    const key = String(item?.key || "");
                    if (!key) continue;
                    await prisma.entitlement.upsert({
                        where: { planId_key: { planId, key } },
                        update: {
                            label: item.label !== undefined ? String(item.label).slice(0, 40) : undefined,
                            value: item.value !== undefined ? String(item.value).slice(0, 100) : undefined,
                            unit: item.unit !== undefined ? String(item.unit).slice(0, 10) : undefined,
                        },
                        create: {
                            planId,
                            key,
                            label: String(item.label ?? key).slice(0, 40),
                            value: String(item.value ?? "").slice(0, 100),
                            unit: String(item.unit ?? "").slice(0, 10),
                        },
                    });
                }
            }

            return NextResponse.json({ plan: updated });
        }

        return NextResponse.json({ error: "配置类型无效" }, { status: 400 });
    } catch (error) {
        console.error("[admin/configs:post]", error);
        return NextResponse.json({ error: "保存配置失败" }, { status: 500 });
    }
}
