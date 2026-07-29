import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/ic-prisma";
import { getCurrentUser } from "@/lib/current-user";

type UserConfigDelegate = {
    findUnique: (args: { where: { userId: string } }) => Promise<{ config: unknown } | null>;
    upsert: (args: { where: { userId: string }; update: { config: unknown }; create: { userId: string; config: unknown } }) => Promise<unknown>;
};

function getUserConfigDelegate(): UserConfigDelegate | null {
    return prisma && "userConfig" in prisma ? (prisma.userConfig as UserConfigDelegate) : null;
}

// 获取用户配置
export async function GET(req: NextRequest) {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const userConfig = getUserConfigDelegate();
    if (!userConfig) return NextResponse.json({ data: {} });

    const config = await userConfig.findUnique({
        where: { userId: user.id },
    });

    return NextResponse.json({ data: config?.config || {} });
}

// 保存用户配置
export async function POST(req: NextRequest) {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const body = await req.json();

    const userConfig = getUserConfigDelegate();
    if (!userConfig) return NextResponse.json({ ok: true });

    await userConfig.upsert({
        where: { userId: user.id },
        update: { config: body },
        create: { userId: user.id, config: body },
    });

    return NextResponse.json({ ok: true });
}
