"use client";

import { useEffect, useState } from "react";
import { App, Button } from "antd";

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

/** 每积分单价（元），用于卡片上的性价比标注 */
function perCreditYuan(pkg: CreditPackage) {
    const total = pkg.credits + pkg.bonusCredits;
    return total > 0 ? pkg.priceCents / total / 100 : 0;
}

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
            title: "扫码付款",
            width: 440,
            okText: "知道了",
            className: "sf-pay-modal",
            content: (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-[#ded2c3] bg-[#fbf6ee]">
                        <div className="flex items-center justify-between gap-3 border-b border-dashed border-[#ded2c3] px-4 py-2.5 text-sm">
                            <span className="text-[#7a6d63]">应付金额</span>
                            <span className="font-semibold text-[#9b5b32]">{formatCny(order.amount ?? 0)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-b border-dashed border-[#ded2c3] px-4 py-2.5 text-sm">
                            <span className="text-[#7a6d63]">套餐 / 到账</span>
                            <span className="text-right font-medium">
                                {pkg?.name ?? "积分包"} / {credits.toLocaleString("zh-CN")} 积分
                                {pkg?.bonusCredits ? <span className="ml-1 text-[#4f8a4f]">（含赠送 {pkg.bonusCredits}）</span> : null}
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                            <span className="text-[#7a6d63]">付款备注</span>
                            <span className="sf-mono text-xs">{order.orderNo}</span>
                        </div>
                    </div>
                    <img src={paymentQrSrc} alt="收款码" className="mx-auto w-56 rounded-2xl border border-[#ded2c3] bg-white p-2" />
                    <p className="text-center text-sm leading-6 text-[#7a6d63]">{tip ?? "付款完成后，把付款截图或备注发给管理员，管理员确认后积分自动到账。"}</p>
                </div>
            ),
        });
    }

    // 特色卡：取中位档（按 sortOrder 排序后的中间一档），当前 4 档时命中「工作室包」
    const featuredIndex = Math.floor(packages.length / 2);

    return (
        <section className="py-14">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <h2 className="sf-serif text-[clamp(30px,3.4vw,44px)] font-semibold leading-[1.3] text-[#201914]">
                    选一个<em className="italic text-[#9b5b32]">档位</em>，开始囤积分。
                </h2>
                <p className="text-sm text-[#7a6d63]">价格含赠送积分，越买越划算</p>
            </div>

            {loading ? (
                <div className="py-10 text-sm text-[#98a2b3]">加载积分包…</div>
            ) : packages.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {packages.map((pkg, index) => {
                        const featured = index === featuredIndex;
                        const total = pkg.credits + pkg.bonusCredits;
                        return (
                            <article
                                key={pkg.id}
                                className={
                                    "relative flex min-h-[380px] flex-col rounded-[26px] border p-6 transition duration-200 " +
                                    (featured
                                        ? "border-[#9b5b32] bg-[#9b5b32] text-[#fffaf2] shadow-[0_26px_60px_rgba(155,91,50,0.26)]"
                                        : "border-[#ded2c3] bg-[#fffdf8] hover:-translate-y-1 hover:border-[#c8a58f] hover:shadow-[0_22px_56px_rgba(32,25,20,0.14)]")
                                }
                            >
                                {featured ? (
                                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#201914] bg-[#201914] px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-[#fffdf8]">最受欢迎</span>
                                ) : (
                                    <div className="h-[13px]" />
                                )}
                                <div className={"sf-mono text-[10px] uppercase tracking-[0.14em] " + (featured ? "text-[#f1e3cf]/75" : "text-[#7a6d63]")}>PKG. {String(index + 1).padStart(2, "0")}</div>
                                <h3 className="sf-serif mt-3 text-2xl font-medium leading-[1.3]">{pkg.name}</h3>
                                <div className="sf-serif mt-5 flex items-baseline gap-2 text-[44px] font-medium leading-none">
                                    {pkg.credits.toLocaleString("zh-CN")}
                                    <span className={"text-[13px] font-normal " + (featured ? "text-[#f1e3cf]/75" : "text-[#7a6d63]")}>积分</span>
                                </div>
                                {pkg.bonusCredits > 0 ? (
                                    <span className={"mt-3 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold " + (featured ? "bg-[#fffaf2] text-[#9b5b32]" : "bg-[#e7efe2] text-[#4f8a4f]")}>
                                        ＋赠送 {pkg.bonusCredits.toLocaleString("zh-CN")}
                                    </span>
                                ) : (
                                    <div className="mt-3 h-[26px]" />
                                )}
                                <hr className={"my-5 border-t " + (featured ? "border-[#f1e3cf]/50" : "border-[#ded2c3]")} />
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                    <span className="sf-serif text-2xl font-semibold">{formatCny(pkg.priceCents)}</span>
                                    <span className={"sf-mono text-[11px] " + (featured ? "text-[#f1e3cf]/75" : "text-[#7a6d63]")}>≈ ¥{perCreditYuan(pkg).toFixed(3)} / 积分</span>
                                </div>
                                <Button
                                    type="default"
                                    size="middle"
                                    loading={buyingId === pkg.id}
                                    onClick={() => void buy(pkg)}
                                    className={
                                        "mt-auto h-11 w-full rounded-[10px] text-sm font-medium transition " +
                                        (featured
                                            ? "!border-[#fffaf2] !bg-[#fffaf2] !text-[#9b5b32] hover:!border-[#f1e3cf] hover:!bg-[#f1e3cf] hover:!text-[#7c4526]"
                                            : "!border-[#201914] !bg-transparent !text-[#201914] hover:!border-[#201914] hover:!bg-[#201914] hover:!text-[#fffdf8]")
                                    }
                                >
                                    立即充值
                                </Button>
                                <p className={"mt-2.5 text-center text-[11px] " + (featured ? "text-[#f1e3cf]/75" : "text-[#7a6d63]")}>到账 {total.toLocaleString("zh-CN")} 积分</p>
                            </article>
                        );
                    })}
                </div>
            ) : (
                <div className="py-10 text-sm text-[#98a2b3]">暂无上架积分包，请联系管理员。</div>
            )}
        </section>
    );
}
