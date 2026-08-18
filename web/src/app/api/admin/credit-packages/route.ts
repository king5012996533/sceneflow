import { NextRequest, NextResponse } from "next/server";

import { requireAdminUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";

// 积分套餐管理：列表（GET）、新增（POST）、编辑（PATCH）
// 数据同时供 /pricing 与 /billing 页实时读取（isActive=true 才展示）。
// 订单创建时服务端重读套餐价（amount 快照），历史订单不受改价影响。
export const dynamic = "force-dynamic";

function toInt(value: unknown, { min, max }: { min: number; max: number }): number | undefined {
    const num = Math.floor(Number(value));
    if (!Number.isFinite(num) || num < min || num > max) return undefined;
    return num;
}

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const packages = await prisma.creditPackage.findMany({
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        });
        return NextResponse.json({ packages });
    } catch (error) {
        console.error("[admin/credit-packages:get]", error);
        return NextResponse.json({ error: "获取积分套餐失败" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const body = await req.json();
        const name = String(body.name || "")
            .trim()
            .slice(0, 50);
        const credits = toInt(body.credits, { min: 1, max: 10_000_000 });
        const priceCents = toInt(body.priceCents, { min: 1, max: 1_000_000_000 });
        const bonusCredits = toInt(body.bonusCredits, { min: 0, max: 10_000_000 }) ?? 0;
        const sortOrder = toInt(body.sortOrder, { min: 0, max: 10_000 }) ?? 0;
        const isActive = body.isActive === true;

        if (!name) return NextResponse.json({ error: "套餐名称不能为空" }, { status: 400 });
        if (credits === undefined) return NextResponse.json({ error: "积分数量必须为正整数" }, { status: 400 });
        if (priceCents === undefined) return NextResponse.json({ error: "价格必须为正整数（单位：分）" }, { status: 400 });

        const pkg = await prisma.creditPackage.create({
            data: { name, credits, priceCents, bonusCredits, sortOrder, isActive },
        });

        await prisma.adminAuditLog.create({
            data: {
                actorId: admin.id,
                action: "credit_package.create",
                target: "credit_package",
                targetId: pkg.id,
                metadata: { name, credits, priceCents, bonusCredits, sortOrder, isActive },
            },
        });

        return NextResponse.json({ package: pkg }, { status: 201 });
    } catch (error) {
        console.error("[admin/credit-packages:post]", error);
        return NextResponse.json({ error: "新增积分套餐失败" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const admin = await requireAdminUser(req);
        if (!admin) return NextResponse.json({ error: "没有管理员权限" }, { status: 403 });

        const body = await req.json();
        const id = String(body.id || "");
        if (!id) return NextResponse.json({ error: "缺少套餐 ID" }, { status: 400 });

        const data: Record<string, unknown> = {};
        const changed: string[] = [];

        if (body.name !== undefined) {
            const name = String(body.name).trim().slice(0, 50);
            if (!name) return NextResponse.json({ error: "套餐名称不能为空" }, { status: 400 });
            data.name = name;
            changed.push("name");
        }
        if (body.credits !== undefined) {
            const credits = toInt(body.credits, { min: 1, max: 10_000_000 });
            if (credits === undefined) return NextResponse.json({ error: "积分数量必须为正整数" }, { status: 400 });
            data.credits = credits;
            changed.push("credits");
        }
        if (body.priceCents !== undefined) {
            const priceCents = toInt(body.priceCents, { min: 1, max: 1_000_000_000 });
            if (priceCents === undefined) return NextResponse.json({ error: "价格必须为正整数（单位：分）" }, { status: 400 });
            data.priceCents = priceCents;
            changed.push("priceCents");
        }
        if (body.bonusCredits !== undefined) {
            const bonusCredits = toInt(body.bonusCredits, { min: 0, max: 10_000_000 });
            if (bonusCredits === undefined) return NextResponse.json({ error: "赠送积分必须为不小于 0 的整数" }, { status: 400 });
            data.bonusCredits = bonusCredits;
            changed.push("bonusCredits");
        }
        if (body.sortOrder !== undefined) {
            const sortOrder = toInt(body.sortOrder, { min: 0, max: 10_000 });
            if (sortOrder === undefined) return NextResponse.json({ error: "排序必须为不小于 0 的整数" }, { status: 400 });
            data.sortOrder = sortOrder;
            changed.push("sortOrder");
        }
        if (body.isActive !== undefined) {
            data.isActive = body.isActive === true;
            changed.push("isActive");
        }

        if (!Object.keys(data).length) return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });

        const existing = await prisma.creditPackage.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "套餐不存在" }, { status: 404 });

        const pkg = await prisma.creditPackage.update({ where: { id }, data: data as never });

        await prisma.adminAuditLog.create({
            data: {
                actorId: admin.id,
                action: "credit_package.update",
                target: "credit_package",
                targetId: pkg.id,
                metadata: { changed, data: data as never },
            },
        });

        return NextResponse.json({ package: pkg });
    } catch (error) {
        console.error("[admin/credit-packages:patch]", error);
        return NextResponse.json({ error: "更新积分套餐失败" }, { status: 500 });
    }
}
