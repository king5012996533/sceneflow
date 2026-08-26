import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/ic-prisma";
import { getCurrentUser } from "@/lib/current-user";
import { isSameOriginRequest } from "@/lib/auth";

type UserConfigDelegate = {
    findUnique: (args: { where: { userId: string } }) => Promise<{ config: unknown } | null>;
    upsert: (args: { where: { userId: string }; update: { config: unknown }; create: { userId: string; config: unknown } }) => Promise<unknown>;
};

function getUserConfigDelegate(): UserConfigDelegate | null {
    return prisma && "userConfig" in prisma ? (prisma.userConfig as unknown as UserConfigDelegate) : null;
}

// BYOK 下线：用户配置里不再允许出现任何 API Key，服务端统一剥离（含历史存量数据）
function stripApiKeys(value: unknown): unknown {
    if (Array.isArray(value)) return value.map((item) => stripApiKeys(item));
    if (value && typeof value === "object") {
        const result: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
            if (key === "apiKey") continue;
            result[key] = stripApiKeys(item);
        }
        return result;
    }
    return value;
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

    return NextResponse.json({ data: stripApiKeys(config?.config || {}) });
}

// 保存用户配置
export async function POST(req: NextRequest) {
    const user = await getCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    if (!isSameOriginRequest(req)) return NextResponse.json({ error: "请求来源不合法" }, { status: 403 });

    const body = await req.json();

    const userConfig = getUserConfigDelegate();
    if (!userConfig) return NextResponse.json({ ok: true });

    const config = stripApiKeys(body);

    await userConfig.upsert({
        where: { userId: user.id },
        update: { config },
        create: { userId: user.id, config },
    });

    return NextResponse.json({ ok: true });
}
