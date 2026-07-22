import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/ic-prisma";
import { getCurrentUser } from "@/lib/current-user";

// 获取用户配置
export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const config = await prisma.userConfig.findUnique({
        where: { userId: user.id },
    });

    return NextResponse.json({ data: config?.config || {} });
}

// 保存用户配置
export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });

    const body = await req.json();

    await prisma.userConfig.upsert({
        where: { userId: user.id },
        update: { config: body },
        create: { userId: user.id, config: body },
    });

    return NextResponse.json({ ok: true });
}
