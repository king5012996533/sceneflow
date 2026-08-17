"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CreditBalanceCard } from "@/components/credits/credit-balance-card";
import { CreditPackagesSection } from "@/components/credits/credit-packages-section";
import { useCreditBalance } from "@/hooks/use-credit-balance";

export default function PricingPage() {
    const { balance, loading: balanceLoading, refresh } = useCreditBalance();

    return (
        <main className="h-full overflow-y-auto bg-[#f7f8fa] text-[#101828]">
            <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:px-10">
                <div className="max-w-3xl">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                        <span className="text-xs uppercase tracking-[0.36em] text-[#98a2b3]">Beta Access</span>
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight">积分充值</h1>
                    <p className="mt-5 max-w-2xl text-base leading-8 text-[#667085]">生成按次扣积分（模型 × 类型 × 档位），充值积分包后即可持续使用。当前阶段暂不接入在线收银台，扫码付款后联系管理员确认入账。</p>
                </div>

                <CreditBalanceCard balance={balance} loading={balanceLoading} onRefresh={() => void refresh()} />

                <CreditPackagesSection />

                <div className="rounded-3xl border border-[#e6e8ec] bg-white p-6 text-sm leading-7 text-[#667085]">
                    <p>下单会生成积分包订单，扫码付款后联系管理员确认入账（内测阶段为人工入账，到账幂等）。</p>
                    <Link href="/canvas" className="mt-4 inline-flex items-center gap-2 font-medium text-[#4f6bff]">
                        回到画布
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </main>
    );
}
