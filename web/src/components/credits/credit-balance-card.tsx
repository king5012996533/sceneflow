"use client";

import Link from "next/link";
import { ArrowRight, Coins, RefreshCw } from "lucide-react";

type CreditBalanceCardProps = {
    balance: number | null;
    loading?: boolean;
    onRefresh?: () => void;
    /** 右侧按钮跳转地址，默认 /billing（充值/明细） */
    actionHref?: string;
    actionLabel?: string;
};

/** 积分余额卡片（定价页 / 账单页共用） */
export function CreditBalanceCard({ balance, loading, onRefresh, actionHref = "/billing", actionLabel = "充值 / 明细" }: CreditBalanceCardProps) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e6e8ec] bg-white p-5 shadow-[0_4px_24px_rgba(16,24,40,0.06)]">
            <div className="flex items-center gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#eef1ff] text-[#4f6bff]">
                    <Coins className="size-6" />
                </div>
                <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-[#98a2b3]">当前积分余额</div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight text-[#101828]">
                        {loading ? "…" : balance === null ? "—" : balance.toLocaleString("zh-CN")}
                        <span className="ml-1 text-sm font-normal text-[#98a2b3]">积分</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {onRefresh ? (
                    <button
                        type="button"
                        onClick={onRefresh}
                        className="grid size-10 place-items-center rounded-xl border border-[#e6e8ec] text-[#667085] transition hover:border-[#c7d2fe] hover:text-[#4f6bff]"
                        title="刷新余额"
                    >
                        <RefreshCw className="size-4" />
                    </button>
                ) : null}
                <Link href={actionHref} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#4f5dff] px-4 text-sm font-medium text-white transition hover:opacity-90">
                    {actionLabel}
                    <ArrowRight className="size-4" />
                </Link>
            </div>
        </div>
    );
}
