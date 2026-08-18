import { NextRequest, NextResponse } from "next/server";

import { ensureDefaultCreditPackages } from "@/lib/billing";
import { prisma } from "@/lib/ic-prisma";
import { getGenerationCreditsCost, type GenerationKind } from "@/lib/credit-pricing";
import { resolveConfiguredPricing } from "@/lib/credential-store.server";
import { getPricingDefaults } from "@/lib/operation-config";
import { GENERIC_VIDEO_KIND, IMAGE_KIND, SEEDANCE_VIDEO_KIND, inferModelKindByName } from "@/lib/model-capability-spec";

/**
 * 定价页「生成单价示例 / 计费规则」的 rateCard。
 * 不写死模板：自动枚举后台所有「启用凭证」绑定的模型（图片 / 视频 / 音频），
 * 按扣费同款三层定价（逐模型 > 运营配置全局默认 > 内置草案）实时计算单价。
 * 后台加模型、改价（运营配置 / 逐模型定价）后，本接口与定价页同步变化。
 * 视频 Seedance 类：720p 与 1080p 草案价不同时，拆成两行展示。
 */
const RATE_CARD_ROW_LIMIT = 16;

export async function GET(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ packages: [], rateCard: [], dbAvailable: false }, { status: 503 });

        await ensureDefaultCreditPackages();

        const [packages, defaults] = await Promise.all([prisma.creditPackage.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }), getPricingDefaults()]);

        const credentials = await prisma.providerCredential.findMany({
            where: { enabled: true },
            orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
            select: { models: true },
        });

        const seen = new Set<string>();
        const rateCard: Array<{ model: string; mode: string; kind: GenerationKind; credits: number }> = [];
        for (const credential of credentials) {
            for (const rawModel of credential.models ?? []) {
                const model = String(rawModel).trim();
                if (!model || seen.has(model) || rateCard.length >= RATE_CARD_ROW_LIMIT) continue;
                seen.add(model);

                let kind: GenerationKind | null = null;
                const inferred = inferModelKindByName(model);
                if (inferred === IMAGE_KIND) kind = "image";
                else if (inferred === SEEDANCE_VIDEO_KIND || inferred === GENERIC_VIDEO_KIND) kind = "video";
                else {
                    const low = model.toLowerCase();
                    if (low.includes("audio") || low.includes("tts") || low.includes("speech") || low.includes("voice") || low.includes("music") || low.includes("sound")) kind = "audio";
                }
                if (!kind) continue; // 文本 / 工具等不计费类型不上价目表

                const configured = await resolveConfiguredPricing(model);
                const baseCredits = getGenerationCreditsCost(kind, { model }, configured ?? undefined, defaults);
                if (kind === "video") {
                    const highCredits = getGenerationCreditsCost(kind, { model, vquality: "1080p" }, configured ?? undefined, defaults);
                    if (highCredits !== baseCredits) {
                        rateCard.push({ model, mode: "720p", kind, credits: baseCredits });
                        if (rateCard.length < RATE_CARD_ROW_LIMIT) rateCard.push({ model, mode: "1080p", kind, credits: highCredits });
                        continue;
                    }
                }
                rateCard.push({ model, mode: "标准", kind, credits: baseCredits });
            }
        }

        return NextResponse.json({ packages, rateCard, dbAvailable: true });
    } catch (error) {
        console.error("[billing/packages]", error);
        return NextResponse.json({ error: "获取积分包失败" }, { status: 500 });
    }
}
