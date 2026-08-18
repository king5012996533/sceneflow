import { NextRequest, NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/ic-prisma";
import type { CredentialCapabilities, ModelCapabilitySpec } from "@/lib/model-capability-spec";
import type { ModelPricing, PricingDefaults } from "@/lib/credit-pricing";
import { getPricingDefaults } from "@/lib/operation-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 平台模型能力目录（登录即可访问，admin/普通用户共用）。
 *
 * 汇总所有「启用」凭证的模型绑定，附上逐模型能力标定与积分定价（不含任何 Key），
 * 并附上全局默认定价（运营配置，客户端积分预检/成本展示用）。
 * 前端设置面板据此过滤画质/分辨率/比例等参数；能力为空 = 退回内置默认。
 * 客户端约 60 秒缓存一次，后台改完配置稍等即可生效。
 */
export async function GET(req: NextRequest) {
    const user = await requireCurrentUser(req);
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    if (!prisma) return NextResponse.json({ models: [], defaults: null, updatedAt: null });

    try {
        const credentials = await prisma.providerCredential.findMany({
            where: { enabled: true },
            orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
            select: { provider: true, baseUrl: true, models: true, capabilities: true, pricing: true },
        });

        const seen = new Set<string>();
        const models: Array<{ model: string; provider: string; baseUrl: string; capabilities: ModelCapabilitySpec | null; pricing: ModelPricing | null }> = [];
        for (const credential of credentials) {
            const caps = (credential.capabilities ?? {}) as CredentialCapabilities;
            const pricingByModel = (credential.pricing ?? {}) as Record<string, ModelPricing>;
            for (const rawModel of credential.models ?? []) {
                const model = String(rawModel).trim();
                if (!model || seen.has(model)) continue;
                seen.add(model);
                models.push({
                    model,
                    provider: credential.provider,
                    baseUrl: credential.baseUrl,
                    capabilities: caps[model] ?? null,
                    pricing: pricingByModel[model] ?? null,
                });
            }
        }
        const defaults: PricingDefaults = await getPricingDefaults();
        return NextResponse.json({ models, defaults, updatedAt: new Date().toISOString() });
    } catch (error) {
        console.error("[platform/catalog:get]", error);
        return NextResponse.json({ models: [], defaults: null, updatedAt: null });
    }
}
