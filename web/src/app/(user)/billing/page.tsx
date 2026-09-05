"use client";

import { useEffect, useState } from "react";
import { Empty, Tag } from "antd";
import { Coins, CreditCard } from "lucide-react";

import { apiPath } from "@/lib/app-paths";
import { formatCny } from "@/lib/format";
import { CreditBalanceCard } from "@/components/credits/credit-balance-card";
import { CreditTransactionsTable } from "@/components/credits/credit-transactions-table";
import { CreditPackagesSection } from "@/components/credits/credit-packages-section";
import { ReferralCard } from "@/components/credits/referral-card";
import { useCreditBalance } from "@/hooks/use-credit-balance";

type Order = {
    id: string;
    orderNo: string;
    amount: number;
    status: string;
    provider: string;
    createdAt: string;
    package?: { name: string } | null;
};

export default function BillingPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const { balance, loading: balanceLoading, refresh } = useCreditBalance();

    async function loadOrders() {
        setLoading(true);
        try {
            const res = await fetch(apiPath("/api/billing/orders"));
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "获取订单失败");
            setOrders(json.orders || []);
        } catch {
            // 订单拉取失败静默，充值记录区显示空
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadOrders();
    }, []);

    return (
        <main className="h-full overflow-y-auto bg-[linear-gradient(135deg,#fbf7ef_0%,#f7f3ea_48%,#eef4ff_100%)] px-6 py-10 text-[#172033]">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8">
                    <div className="mb-3 text-xs font-medium tracking-[0.18em] text-[#67726b]">BETA ACCESS</div>
                    <h1 className="text-2xl font-semibold tracking-tight">积分账单</h1>
                </div>

                <section className="rounded-2xl border border-[#dde2dc] bg-white/78 p-5 shadow-[0_20px_60px_rgba(42,51,48,0.06)]">
                    <div className="mb-5 flex items-center gap-2 text-sm font-medium">
                        <Coins className="size-5" />
                        积分余额与流水
                    </div>
                    <div className="space-y-4">
                        <CreditBalanceCard balance={balance} loading={balanceLoading} onRefresh={() => void refresh()} actionHref="/pricing" actionLabel="去充值" />
                        <CreditTransactionsTable limit={20} />
                    </div>
                </section>

                <div className="mt-4">
                    <ReferralCard />
                </div>

                <section className="mt-4 rounded-2xl border border-[#dde2dc] bg-white/78 p-5 shadow-[0_20px_60px_rgba(42,51,48,0.06)]">
                    <div className="mb-5 flex items-center gap-2 text-sm font-medium">
                        <CreditCard className="size-5" />
                        充值记录
                    </div>
                    {orders.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] text-left text-sm">
                                <thead className="border-b border-[#dde2dc] text-[#67726b]">
                                    <tr>
                                        <th className="py-3 font-medium">订单编号</th>
                                        <th className="py-3 font-medium">积分包</th>
                                        <th className="py-3 font-medium">金额</th>
                                        <th className="py-3 font-medium">方式</th>
                                        <th className="py-3 font-medium">状态</th>
                                        <th className="py-3 font-medium">创建时间</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <tr key={order.id} className="border-b border-[#f1ebe0]">
                                            <td className="py-3 font-mono text-xs">{order.orderNo}</td>
                                            <td className="py-3">{order.package?.name || "—"}</td>
                                            <td className="py-3">{formatCny(order.amount)}</td>
                                            <td className="py-3">{order.provider}</td>
                                            <td className="py-3">
                                                <Tag>{order.status}</Tag>
                                            </td>
                                            <td className="py-3 text-[#67726b]">{new Date(order.createdAt).toLocaleString("zh-CN")}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <Empty description={loading ? "加载中…" : "暂无充值记录"} />
                    )}
                </section>

                <div className="mt-4">
                    <CreditPackagesSection />
                </div>
            </div>
        </main>
    );
}
