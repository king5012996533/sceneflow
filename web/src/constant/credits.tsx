import type { ComponentProps } from "react";
import { Zap } from "lucide-react";

import { getGenerationCreditsCost, type GenerationKind } from "@/lib/credit-pricing";
import { getPlatformPricing, getPricingDefaults } from "@/stores/platform-catalog-store";

export function CreditSymbol({ className, ...props }: ComponentProps<"span">) {
    return (
        <span {...props} className={`inline-flex items-center justify-center ${className || ""}`}>
            <Zap className="size-[1em] fill-current" strokeWidth={2.4} />
        </span>
    );
}

/** 预估本次生成将扣除的积分（逐模型定价 > 全局默认 > 内置草案；与实扣一致） */
export function estimatedRequestCost(kind: GenerationKind, model: string, options?: { count?: string | number; videoSeconds?: string | number; vquality?: string | number }): number {
    if (!model) return 0;
    const count = Math.max(1, Math.floor(Math.abs(Number(options?.count)) || 1));
    const configured = getPlatformPricing(model);
    return getGenerationCreditsCost(kind, { model, videoSeconds: options?.videoSeconds, vquality: options?.vquality }, configured, getPricingDefaults()) * count;
}
