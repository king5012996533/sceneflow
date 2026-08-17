"use client";

import { useEffect, useState } from "react";
import { App, Button, Modal } from "antd";
import { Coins, Gift, Sparkles } from "lucide-react";

import { apiPath, publicPath } from "@/lib/app-paths";
import { formatCny } from "@/lib/format";

type CreditPackage = {
    id: string;
    name: string;
    credits: number;
    priceCents: number;
    currency: string;
    bonusCredits: number;
    sortOrder: number;
};

type CreatedOrder = {
    orderNo?: string;
    amount?: number;
    package?: { name: string; credits: number; bonusCredits: number } | null;
};

/**
 * 积分包区（定价页 / 账单页共用）：列出可充值积分包，下单后展示扫码付款信息。
 * 内测阶段为手动入账：生成订单 → 用户扫码付款 → 管理员在后台确认入账。
 */
export function CreditPackagesSection() {
    const { message, modal } = App.useApp();
    const [packages, setPackages] = useState<CreditPackage[]>([]);
    const [loading, setLoading] = useState(false);
    const [buyingId, setBuyingId] = useState<string | null>(null);
    const paymentQrSrc = publicPath("/wechat-payment-qr.jpg");

    useEffect(() => {
        setLoading(true);
        void fetch(apiPath("/api/billing/packages"), { credentials: "include", cache: "no-store" })
            .then((res) => res.json())
            .then((data) => {
                if (data?.error) throw new Error(data.error);
                setPackages(data.packages || []);
            })
            .catch((error) => message.error(error instanceof Error ? error.message : "获取积分包失败"))
            .finally(() => setLoading(false));
    }, [message]);

    async function buy(pkg: CreditPackage) {
        setBuyingId(pkg.id);
        try {
            const res = await fetch(apiPath("/api/billing/orders"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ packageId: pkg.id, provider: "manual", intent: "package" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || "下单失败");
            showPaymentModal(data.order, data.checkout?.message);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "下单失败");
        } finally {
            setBuyingId(null);
        }
    }

    function showPaymentModal(order: CreatedOrder, tip?: string) {
        const pkg = order.package;
        const credits = (pkg?.credits ?? 0) + (pkg?.bonusCredits ?? 0);
        modal.info({
            title: "扫码付款后联系管理员确认入账",
            width: 440,
            okText: "知道了",
            content: (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-[#e6e8ec] bg-[#f8fafc] p-4">
                        <div className="text-xs tracking-[0.16em] text-[#667085]">应付金额</div>
                        <div className="mt-1 text-2xl font-semibold tracking-tight text-[#101828]">{formatCny(order.amount ?? 0)}</div>
                        <div className="mt-2 text-sm leading-6 text-[#475467]">
                            {pkg?.name ?? "积分包"} / 到账 {credits} 积分
                            {pkg?.bonusCredits ? <span className="ml-1 text-emerald-600">（含赠送 {pkg.bonusCredits}）</span> : null}
                        </div>
                        <div className="mt-2 break-all rounded-xl bg-white px-3 py-2 text-xs text-[#667085]">付款备注: {order.orderNo}</div>
                    </div>
                    <img src={paymentQrSrc} alt="收款码" className="mx-auto w-64 rounded-2xl border border-[#e6e8ec] bg-white p-2" />
                    <p className="text-sm leading-6 text-[#475467]">{tip ?? "付款完成后，把付款截图或备注发给管理员，管理员确认后积分自动到账。"}</p>
                </div>
            ),
        });
    }

    return (
        <section className="rounded-3xl border border-[#e6e8ec] bg-white p-6">
            <div className="mb-5 flex items-center gap-2">
                <Coins className="size-5 text-[#4f6bff]" />
                <h2 className="text-lg font-semibold tracking-tight">积分充值</h2>
                <span className="ml-1 rounded-full bg-[#eef1ff] px-2 py-0.5 text-[11px] font-medium text-[#4f6bff]">按量付费</span>
            </div>
            <p className="mb-6 max-w-2xl text-sm leading-6 text-[#667085]">
                每次生成按模型与档位消耗积分（如 gpt-image 每次 10 积分，Seedance 高清每次 30 积分）。充值积分长期有效，生成失败自动原路退回。
            </p>
            {loading ? (
                <div className="text-sm text-[#98a2b3]">加载积分包…</div>
            ) : packages.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {packages.map((pkg, index) => (
                        <article
                            key={pkg.id}
                            className="relative flex flex-col rounded-2xl border border-[#e6e8ec] p-5 transition hover:-translate-y-0.5 hover:border-[#c7d2fe] hover:shadow-[0_12px_32px_rgba(79,93,255,0.12)]"
                        >
                            {index === 0 ? (
                                <span className="absolute right-4 top-4 rounded-full bg-[#eef1ff] px-2 py-0.5 text-[11px] font-medium text-[#4f6bff]">入门</span>
                            ) : null}
                            <div className="mb-3 flex items-center gap-2">
                                <div className="grid size-9 place-items-center rounded-lg bg-[#eef1ff] text-[#4f6bff]">
                                    <Sparkles className="size-4" />
                                </div>
                                <h3 className="text-sm font-semibold">{pkg.name}</h3>
                            </div>
                            <div className="text-2xl font-semibold tracking-tight text-[#101828]">
                                {pkg.credits.toLocaleString("zh-CN")}
                                <span className="ml-1 text-xs font-normal text-[#98a2b3]">积分</span>
                            </div>
                            {pkg.bonusCredits > 0 ? (
                                <div className="mt-1.5 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                                    <Gift className="size-3" />
                                    赠送 {pkg.bonusCredits}
                                </div>
                            ) : (
                                <div className="mt-1.5 h-5" />
                            )}
                            <div className="my-4 h-px bg-[#eaecf0]" />
                            <div className="flex items-baseline gap-1">
                                <span className="text-lg font-semibold">{formatCny(pkg.priceCents)}</span>
                            </div>
                            <Button
                                type={index === 0 ? "primary" : "default"}
                                size="middle"
                                className="mt-4 h-10 w-full rounded-xl"
                                loading={buyingId === pkg.id}
                                onClick={() => void buy(pkg)}
                            >
                                立即充值
                            </Button>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="text-sm text-[#98a2b3]">暂无上架积分包，请联系管理员。</div>
            )}
        </section>
    );
}
