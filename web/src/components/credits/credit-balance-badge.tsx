"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";

import { useCreditBalance } from "@/hooks/use-credit-balance";
import { cn } from "@/lib/utils";

type CreditBalanceBadgeProps = {
    /** canvas 变体：透明底 + 主题文字色，用于画布顶栏；warm 变体：暖色编辑风胶囊，用于全局导航栏 */
    variant?: "default" | "canvas" | "warm";
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
                    : variant === "warm"
                      ? "border border-[#dde2dc] bg-[#ffffff] text-[#2a3330] shadow-[0_6px_14px_rgba(35,28,20,0.06)] hover:border-[#a0713f] hover:bg-[#f7f9f5]"
                      : "border border-[#dde2dc] bg-white text-[#1f2937] shadow-[0_6px_14px_rgba(35,28,20,0.06)] hover:border-[#c7d2fe] hover:bg-[#e7ece8] hover:text-[#75827c]",
            )}
            style={style}
        >
            <Coins className={cn("size-4", variant === "warm" ? "text-[#a0713f]" : "text-[#75827c]")} />
            <span className={cn(variant === "warm" && "sf-mono font-bold")}>{loading ? "…" : balance === null ? "—" : balance.toLocaleString("zh-CN")}</span>
            {variant === "warm" ? <span className="hidden text-xs font-medium text-[#67726b] sm:inline">积分</span> : null}
        </Link>
    );
}
