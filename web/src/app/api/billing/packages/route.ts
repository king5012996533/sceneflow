import { NextRequest, NextResponse } from "next/server";

import { ensureDefaultCreditPackages } from "@/lib/billing";
import { prisma } from "@/lib/ic-prisma";

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ packages: [], dbAvailable: false }, { status: 503 });

        await ensureDefaultCreditPackages();

        const packages = await prisma.creditPackage.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
        });

        return NextResponse.json({ packages, dbAvailable: true });
    } catch (error) {
        console.error("[billing/packages]", error);
        return NextResponse.json({ error: "获取积分包失败" }, { status: 500 });
    }
}
