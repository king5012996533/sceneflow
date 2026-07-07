"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { App, Button, Empty, Progress, Tag } from "antd";
import { ArrowRight, CreditCard, Gauge, PackageCheck } from "lucide-react";

import { apiPath } from "@/lib/app-paths";

type BillingState = {
    subscription?: {
        id: string;
        status: string;
        billingCycle: string;
        currentPeriodEnd?: string | null;
        cancelAtPeriodEnd: boolean;
        autoRenew: boolean;
        plan?: {
            name: string;
            entitlements: Array<{ id: string; key: string; label: string; value: string; unit: string }>;
        } | null;
    };
    usage: Array<{ id: string; metric: string; used: number; limit?: number | null }>;
    orders: Array<{
        id: string;
        orderNo: string;
        amount: number;
        status: string;
        provider: string;
        createdAt: string;
        plan: { name: string };
    }>;
};

function formatPrice(amount: number) {
    return `¥${(amount / 100).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
}

export default function BillingPage() {
    const { message } = App.useApp();
    const [data, setData] = useState<BillingState | null>(null);
    const [loading, setLoading] = useState(false);

    async function loadBilling() {
        setLoading(true);
        try {
            const res = await fetch(apiPath("/api/billing/subscription"));
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "获取订阅失败");
            setData(json);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "获取订阅失败");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadBilling();
    }, []);

    async function toggleCancel(cancelAtPeriodEnd: boolean) {
        try {
            const res = await fetch(apiPath("/api/billing/subscription"), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cancelAtPeriodEnd }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "更新订阅失败");
            message.success(cancelAtPeriodEnd ? "已标记到期后不保留权益" : "已恢复权益保留状态");
            await loadBilling();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "更新订阅失败");
        }
    }

    const subscription = data?.subscription;
    const entitlements = subscription?.plan?.entitlements || [];

    return (
        <main className="h-full overflow-y-auto bg-[linear-gradient(135deg,#fbf7ef_0%,#f7f3ea_48%,#eef4ff_100%)] px-6 py-10 text-[#172033]">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="mb-3 text-xs font-medium tracking-[0.18em] text-[#8a7f91]">BETA ACCESS</div>
                        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">当前权益与用量</h1>
                    </div>
                    <Link href="/pricing" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#4f5dff] px-4 text-sm font-medium text-white shadow-[0_12px_30px_rgba(79,93,255,.22)]">
                        申请开通联系管理员
                        <ArrowRight className="size-4" />
                    </Link>
                </div>

                <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                    <section className="rounded-2xl border border-[#eadfce] bg-white/78 p-5 shadow-[0_20px_60px_rgba(66,56,38,0.06)]">
                        <div className="mb-5 flex items-center gap-2 text-lg font-semibold">
                            <PackageCheck className="size-5" />
                            权益状态
                        </div>
                        {subscription ? (
                            <div className="space-y-4">
                                <div>
                                    <div className="text-3xl font-semibold">{subscription.plan?.name || "免费版"}</div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <Tag color={subscription.status === "active" ? "green" : "default"}>{subscription.status}</Tag>
                                        <Tag>{subscription.billingCycle}</Tag>
                                        {subscription.autoRenew ? <Tag color="blue">权益保留</Tag> : <Tag>到期结束</Tag>}
                                    </div>
                                </div>
                                <div className="text-sm leading-7 text-[#6d6472]">
                                    权益到期：
                                    {subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleString("zh-CN") : "无固定期限"}
                                </div>
                                <Button onClick={() => void toggleCancel(!subscription.cancelAtPeriodEnd)} loading={loading}>
                                    {subscription.cancelAtPeriodEnd ? "恢复权益保留" : "到期后不保留"}
                                </Button>
                            </div>
                        ) : (
                            <Empty description="暂无权益信息" />
                        )}
                    </section>

                    <section className="rounded-2xl border border-[#eadfce] bg-white/78 p-5 shadow-[0_20px_60px_rgba(66,56,38,0.06)]">
                        <div className="mb-5 flex items-center gap-2 text-lg font-semibold">
                            <Gauge className="size-5" />
                            权益与用量
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            {entitlements.map((item) => {
                                const usage = data?.usage.find((u) => u.metric === item.key);
                                const limit = Number(item.value);
                                const hasNumericLimit = Number.isFinite(limit);
                                const percent = hasNumericLimit && limit > 0 ? Math.min(100, Math.round(((usage?.used || 0) / limit) * 100)) : 0;
                                return (
                                    <div key={item.id} className="rounded-xl border border-[#eadfce] bg-[#fffaf2] p-4">
                                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                                            <span className="font-medium">{item.label}</span>
                                            <span className="text-[#8a7f91]">
                                                {usage?.used || 0} / {item.value}
                                                {item.unit}
                                            </span>
                                        </div>
                                        <Progress percent={percent} showInfo={false} />
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                <section className="mt-4 rounded-2xl border border-[#eadfce] bg-white/78 p-5 shadow-[0_20px_60px_rgba(66,56,38,0.06)]">
                    <div className="mb-5 flex items-center gap-2 text-lg font-semibold">
                        <CreditCard className="size-5" />
                        开通申请记录
                    </div>
                    {data?.orders?.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="border-b border-[#eadfce] text-[#8a7f91]">
                                    <tr>
                                        <th className="py-3 font-medium">申请编号</th>
                                        <th className="py-3 font-medium">套餐</th>
                                        <th className="py-3 font-medium">开通金额</th>
                                        <th className="py-3 font-medium">方式</th>
                                        <th className="py-3 font-medium">状态</th>
                                        <th className="py-3 font-medium">创建时间</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.orders.map((order) => (
                                        <tr key={order.id} className="border-b border-[#f1ebe0]">
                                            <td className="py-3 font-mono text-xs">{order.orderNo}</td>
                                            <td className="py-3">{order.plan.name}</td>
                                            <td className="py-3">{formatPrice(order.amount)}</td>
                                            <td className="py-3">{order.provider}</td>
                                            <td className="py-3">
                                                <Tag>{order.status}</Tag>
                                            </td>
                                            <td className="py-3 text-[#8a7f91]">{new Date(order.createdAt).toLocaleString("zh-CN")}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <Empty description="暂无开通申请" />
                    )}
                </section>
            </div>
        </main>
    );
}
