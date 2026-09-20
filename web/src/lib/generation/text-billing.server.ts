/**
 * 文本轮次的按 token 结算（2026-09-20，Phase 0 计费地基）。
 *
 * 与图片/视频的根本差别：**单价已知，但数量要等上游说了才知道**。
 * 所以建任务那一刻不预扣（beginGenerationJob 对 token 计价的模型返回 0），
 * 等代理从上游报文里读到 usage 之后，在这里按真实用量结账。
 *
 * 三条口径：
 *
 * 1) **只在后台配了 token 成本价的模型上生效**。没配的模型一路照旧（按次 textCredits，默认 0）——
 *    这是 Phase 0 能安全上线的全部理由：地基先落，计费行为由后台配置开关决定。
 *
 * 2) **幂等靠 (userId, "consume", "generation_job", `${requestKey}#usage`)**。
 *    补发、重试、代理重放都可能让同一次上游调用被看见第二次；
 *    用独立 refId 而不是复用 requestKey（那是建任务时预扣用的），两者互不挤占。
 *
 * 3) **余额不足时按余额扣完，缺口记进任务元数据，不造欠账**。
 *    垫付上界就是单轮成本 —— Phase 2 的「阈值暂停」才是根治，
 *    在那之前宁可少收这一轮的差额，也不要让余额变成负数（负数会让后续每一轮都算不清）。
 */

import { prisma } from "@/lib/ic-prisma";
import { Prisma } from "@/generated/ic-prisma/client";
import { deductCredits, getCreditBalance } from "@/lib/credit-ledger";
import { generationModel, hasTextTokenPricing, textTurnCostCents, textTurnCredits, type TokenUsage } from "@/lib/credit-pricing";
import { resolveConfiguredPricing } from "@/lib/credential-store.server";
import { getOperationNumber } from "@/lib/operation-config";

/** 全局计价倍率（运营配置；默认 2 = 按平台实际成本的两倍定价） */
export const TEXT_PRICING_MULTIPLIER_KEY = "text_pricing_multiplier";
export const TEXT_PRICING_MULTIPLIER_DEFAULT = 2;

export type TextSettlement = {
    jobId: string;
    model: string;
    /** 按用量算出的应收积分 */
    credits: number;
    /** 实际扣掉的积分（余额不足时小于应收） */
    charged: number;
    shortfallCredits: number;
    /** 这一轮的平台成本（分，人民币） */
    costCents: number;
    balanceAfter: number;
    /** 本条调用结束时的任务状态 */
    jobStatus: string;
};

export type TextSettlementOutcome = { ok: true; settlement: TextSettlement } | { ok: false; reason: string };

/**
 * 按上游回报的用量结算一条文本任务。返回 ok:false 的情形都**不是错误**，是「不需要结算」：
 * 不是文本任务 / 模型没配 token 价 / 已经结过 / 任务不属于该用户。调用方照常放行即可。
 */
export async function settleTextTurnUsage(input: { userId: string; jobId: string; usage: TokenUsage; source?: string }): Promise<TextSettlementOutcome> {
    if (!prisma) return { ok: false, reason: "数据库不可用" };

    const job = await prisma.generationJob.findFirst({
        where: { id: input.jobId, userId: input.userId },
        select: { id: true, kind: true, requestKey: true, status: true, metadata: true },
    });
    if (!job) return { ok: false, reason: "任务不存在或不属于当前账号" };
    if (job.kind !== "text" && job.kind !== "tool") return { ok: false, reason: `按 token 结算只适用于文本轮次（本条是 ${job.kind}）` };

    const model = generationModel((job.metadata ?? {}) as Record<string, unknown>);
    const configured = await resolveConfiguredPricing(model);
    if (!hasTextTokenPricing(configured ?? undefined)) return { ok: false, reason: `模型 ${model || "(未记模型)"} 未配置 token 成本价` };

    const multiplier = await getOperationNumber(TEXT_PRICING_MULTIPLIER_KEY, TEXT_PRICING_MULTIPLIER_DEFAULT);
    const credits = textTurnCredits(configured ?? undefined, input.usage, multiplier);
    const costCents = textTurnCostCents(configured ?? undefined, input.usage);
    const usageRef = `${job.requestKey}#usage`;

    return prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.userId}))`;

        const existing = await tx.creditTransaction.findFirst({
            where: { userId: input.userId, type: "consume", refType: "generation_job", refId: usageRef },
            select: { id: true },
        });
        if (existing) return { ok: false, reason: "这一轮已经结算过（幂等）" };

        const balance = await getCreditBalance(tx, input.userId);
        const chargeable = Math.max(0, Math.min(credits, balance));
        const noteParts = [`文本轮次按量结算：输入 ${input.usage.inputTokens} / 输出 ${input.usage.outputTokens}`];
        if (input.usage.cachedInputTokens) noteParts.push(`缓存命中 ${input.usage.cachedInputTokens}`);
        noteParts.push(`倍率 ${multiplier}`);
        if (credits > chargeable) noteParts.push(`余额不足，实扣 ${chargeable}，缺口 ${credits - chargeable}`);

        let balanceAfter = balance;
        if (chargeable > 0) {
            const deducted = await deductCredits(tx, input.userId, chargeable, usageRef, noteParts.join("；"));
            balanceAfter = deducted.balance;
        }

        // 审计口径：job.creditsCost 记**实际扣到的**（记录页显示的就是它），
        // 应收与缺口另记在 metadata.billing 里，两者都在，账才复算得出来。
        const previousMetadata = (job.metadata ?? {}) as Record<string, unknown>;
        const billing = {
            mode: "token" as const,
            model,
            inputTokens: input.usage.inputTokens,
            outputTokens: input.usage.outputTokens,
            cachedInputTokens: input.usage.cachedInputTokens || 0,
            inputCostYuanPerMillion: configured?.textInputCostYuanPerMillion ?? null,
            outputCostYuanPerMillion: configured?.textOutputCostYuanPerMillion ?? null,
            cachedInputCostYuanPerMillion: configured?.textCachedInputCostYuanPerMillion ?? null,
            multiplier,
            credits,
            charged: chargeable,
            shortfallCredits: credits - chargeable,
            costCents,
            settledAt: new Date().toISOString(),
            source: input.source ?? "proxy",
        };

        await tx.generationJob.update({
            where: { id: job.id },
            data: {
                creditsCost: chargeable,
                costCents,
                metadata: {
                    ...previousMetadata,
                    // usage 单独存一份干净形状：readTokenUsage 与成本重算都读它，
                    // billing 里那份带倍率与单价，是给人看与复算用的
                    usage: { inputTokens: input.usage.inputTokens, outputTokens: input.usage.outputTokens, cachedInputTokens: input.usage.cachedInputTokens || 0 },
                    billing,
                } as Prisma.InputJsonValue,
            },
        });

        return {
            ok: true,
            settlement: { jobId: job.id, model, credits, charged: chargeable, shortfallCredits: credits - chargeable, costCents, balanceAfter, jobStatus: job.status },
        };
    });
}
