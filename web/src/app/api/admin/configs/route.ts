import { NextRequest, NextResponse } from "next/server";

import { ensureDefaultPlans } from "@/lib/billing";
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

        return NextResponse.json({ plans, modelConfigs, operationConfigs });
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

        return NextResponse.json({ error: "配置类型无效" }, { status: 400 });
    } catch (error) {
        console.error("[admin/configs:post]", error);
        return NextResponse.json({ error: "保存配置失败" }, { status: 500 });
    }
}
