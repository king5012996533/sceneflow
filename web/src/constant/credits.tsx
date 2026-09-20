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

/** 预估本次生成将扣除的积分（逐模型定价 > 全局默认 > 内置草案；与实扣一致）。
 *  图片按分辨率分档计费，所以必须把 size/quality 一起带进来，否则 2K/4K 会被低估。
 *  视频可能是按秒计价的（配了每秒成本价的模型），所以时长、清晰度、草稿档一个都不能少，
 *  少一个就退回按条价 —— 面板显示的和实际扣的就会是两回事。 */
export function estimatedRequestCost(kind: GenerationKind, model: string, options?: { count?: string | number; size?: string; quality?: string; videoSeconds?: string | number; vquality?: string | number; videoDraft?: string | boolean }): number {
    if (!model) return 0;
    const count = Math.max(1, Math.floor(Math.abs(Number(options?.count)) || 1));
    const configured = getPlatformPricing(model);
    const metadata = { model, size: options?.size, quality: options?.quality, videoSeconds: options?.videoSeconds, vquality: options?.vquality, videoDraft: options?.videoDraft };
    return getGenerationCreditsCost(kind, metadata, configured, getPricingDefaults()) * count;
}
