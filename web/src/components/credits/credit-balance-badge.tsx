"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";

import { useCreditBalance } from "@/hooks/use-credit-balance";
import { cn } from "@/lib/utils";

type CreditBalanceBadgeProps = {
    /** canvas 变体：透明底 + 主题文字色，用于画布顶栏 */
    variant?: "default" | "canvas";
    style?: CSSProperties;
};

/** 顶栏 / 画布角标：显示当前积分余额，点击进入账单页 */
export function CreditBalanceBadge({ variant = "default", style }: CreditBalanceBadgeProps) {
    const { balance, loading } = useCreditBalance();

    return (
        <Link
            href="/billing"
            title="积分余额（点击查看充值/明细）"
            className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold transition",
                variant === "canvas"
                    ? "hover:bg-black/5 dark:hover:bg-white/10"
                    : "border border-[#e6e8ec] bg-white text-[#1f2937] shadow-[0_6px_14px_rgba(35,28,20,0.06)] hover:border-[#c7d2fe] hover:bg-[#eef1ff] hover:text-[#4f6bff]",
            )}
            style={style}
        >
            <Coins className="size-4 text-[#4f6bff]" />
            <span>{loading ? "…" : balance === null ? "—" : balance.toLocaleString("zh-CN")}</span>
        </Link>
    );
}
