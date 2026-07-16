"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { App, Button, Segmented, Tag } from "antd";
import { ArrowRight, Check, Crown, Sparkles, Users, Zap } from "lucide-react";

import { apiPath, publicPath } from "@/lib/app-paths";
import { cn } from "@/lib/utils";

type Plan = {
    id: string;
    name: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    currency: string;
    isPopular: boolean;
    entitlements: Array<{ id: string; key: string; label: string; value: string; unit: string }>;
};

type CreatedOrder = {
    orderNo?: string;
    amount?: number;
};

const copy = {
    fetchPlansFailed: "\u83b7\u53d6\u5957\u9910\u5931\u8d25",
    free: "\u514d\u8d39",
    supported: "\u652f\u6301",
    unsupported: "\u6682\u4e0d\u652f\u6301",
    unlimited: "\u4e0d\u9650",
    custom: "\u5b9a\u5236",
    betaAccess: "Beta Access",
    betaTag: "\u5185\u6d4b\u671f\u4eba\u5de5\u5f00\u901a",
    title: "\u9009\u62e9\u9002\u5408\u4f60\u7684\u751f\u4ea7\u89c4\u6a21",
    intro:
        "\u5f53\u524d\u9636\u6bb5\u6682\u4e0d\u63a5\u5165\u5728\u7ebf\u6536\u94f6\u53f0\uff0c\u5957\u9910\u4ecd\u6309\u6240\u9009\u6743\u76ca\u4ed8\u8d39\u624b\u52a8\u5f00\u901a\u6743\u76ca\u3002\u9009\u62e9\u5957\u9910\u540e\u4f1a\u751f\u6210\u5bf9\u5e94\u5e94\u4ed8\u91d1\u989d\u548c\u4ed8\u6b3e\u5907\u6ce8\uff0c\u626b\u7801\u4ed8\u6b3e\u540e\u8054\u7cfb\u7ba1\u7406\u5458\u5f00\u901a\u3002",
    monthly: "\u6708\u4ed8",
    yearly: "\u5e74\u4ed8",
    popular: "\u63a8\u8350\u5957\u9910",
    perMonth: "\u6708",
    perYear: "\u5e74",
    betaPrice: "\u5185\u6d4b\u5f00\u901a\u4ef7",
    freeStart: "\u514d\u8d39\u5f00\u59cb",
    contactAdmin: "\u8054\u7cfb\u7ba1\u7406\u5458\u5f00\u901a",
    paidHint: "\u70b9\u51fb\u540e\u663e\u793a\u5e94\u4ed8\u91d1\u989d\u548c\u6536\u6b3e\u7801\u3002",
    freeInfo: "\u514d\u8d39\u7248\u767b\u5f55\u540e\u5373\u53ef\u4f7f\u7528\u3002",
    createOrderFailed: "\u521b\u5efa\u5f00\u901a\u7533\u8bf7\u5931\u8d25",
    orderCreated: "\u5df2\u751f\u6210\u4ed8\u6b3e\u91d1\u989d\u548c\u5f00\u901a\u5907\u6ce8",
    paymentTitle: "\u626b\u7801\u4ed8\u6b3e\u540e\u8054\u7cfb\u7ba1\u7406\u5458\u5f00\u901a",
    ok: "\u77e5\u9053\u4e86",
    amountDue: "\u5e94\u4ed8\u91d1\u989d",
    yearlyRights: "\u5e74\u5ea6\u6743\u76ca",
    monthlyRights: "\u6708\u5ea6\u6743\u76ca",
    orderFallback: "\u63d0\u4ea4\u540e\u7531\u7ba1\u7406\u5458\u6838\u5bf9",
    payYear: "\u5e74\u4ed8",
    payMonth: "\u6708\u4ed8",
    paymentNote: "\u4ed8\u6b3e\u5907\u6ce8",
    qrAlt: "\u5fae\u4fe1\u6536\u6b3e\u7801",
    qrTip:
        "\u4e2a\u4eba\u6536\u6b3e\u7801\u4e0d\u4f1a\u81ea\u52a8\u9501\u5b9a\u91d1\u989d\uff0c\u8bf7\u6309\u4e0a\u65b9\u91d1\u989d\u4ed8\u6b3e\u3002\u4ed8\u6b3e\u5b8c\u6210\u540e\uff0c\u628a\u4ed8\u6b3e\u622a\u56fe\u6216\u5907\u6ce8\u53d1\u7ed9\u7ba1\u7406\u5458\uff0c\u7ba1\u7406\u5458\u4f1a\u6309\u8d26\u53f7\u624b\u52a8\u5f00\u901a\u5957\u9910\u6743\u76ca\u3002",
    footer:
        "\u63d0\u4ea4\u5f00\u901a\u7533\u8bf7\u4e0d\u7b49\u4e8e\u514d\u8d39\u5f00\u901a\u3002\u7ba1\u7406\u5458\u4f1a\u6839\u636e\u4ed8\u6b3e\u8bb0\u5f55\u3001\u4ed8\u6b3e\u5907\u6ce8\u548c\u8d26\u53f7\u4fe1\u606f\u5b8c\u6210\u5957\u9910\u6743\u76ca\u5f00\u901a\u3002",
    backCanvas: "\u56de\u5230\u753b\u5e03",
};

const planIcons = {
    free: Sparkles,
    creator: Zap,
    team: Users,
    enterprise: Crown,
} as const;

function formatPrice(amount: number) {
    if (amount <= 0) return copy.free;
    return `\uffe5${(amount / 100).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
}

function formatEntitlement(value: string, unit: string) {
    if (value === "true") return copy.supported;
    if (value === "false") return copy.unsupported;
    if (value === "unlimited") return copy.unlimited;
    if (value === "custom") return copy.custom;
    return `${value}${unit}`;
}

export default function PricingPage() {
    const { message, modal } = App.useApp();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const paymentQrSrc = publicPath("/wechat-payment-qr.jpg");

    useEffect(() => {
        void fetch(apiPath("/api/billing/plans"))
            .then((res) => res.json())
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setPlans(data.plans || []);
            })
            .catch((error) => message.error(error instanceof Error ? error.message : copy.fetchPlansFailed));
    }, [message]);

    const sortedPlans = useMemo(() => plans, [plans]);

    function showPaymentModal(plan: Plan, order?: CreatedOrder) {
        const amount = order?.amount ?? (cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice);
        const orderNo = order?.orderNo || copy.orderFallback;
        const paymentNote = `${plan.name}-${cycle === "yearly" ? copy.payYear : copy.payMonth}-${orderNo}`;

        modal.info({
            title: copy.paymentTitle,
            width: 440,
            okText: copy.ok,
            content: (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-[#eadfce] bg-[#fffaf2] p-4">
                        <div className="text-xs tracking-[0.16em] text-stone-500">{copy.amountDue}</div>
                        <div className="mt-1 text-4xl font-semibold tracking-tight text-[#172033]">{formatPrice(amount)}</div>
                        <div className="mt-2 text-sm leading-6 text-stone-600">
                            {plan.name} / {cycle === "yearly" ? copy.yearlyRights : copy.monthlyRights}
                        </div>
                        <div className="mt-2 break-all rounded-xl bg-white px-3 py-2 text-xs text-stone-500">
                            {copy.paymentNote}: {paymentNote}
                        </div>
                    </div>
                    <img src={paymentQrSrc} alt={copy.qrAlt} className="mx-auto w-64 rounded-2xl border border-stone-200 bg-white p-2" />
                    <p className="text-sm leading-6 text-stone-600">{copy.qrTip}</p>
                </div>
            ),
        });
    }

    async function applyPlan(plan: Plan) {
        const isFree = plan.monthlyPrice <= 0 && plan.yearlyPrice <= 0;
        if (isFree) {
            message.info(copy.freeInfo);
            return;
        }

        setLoadingPlan(plan.id);
        try {
            const response = await fetch(apiPath("/api/billing/orders"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId: plan.id, billingCycle: cycle, provider: "manual", intent: "manual_payment" }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || copy.createOrderFailed);
            message.success(copy.orderCreated);
            showPaymentModal(plan, data.order);
        } catch (error) {
            message.error(error instanceof Error ? error.message : copy.createOrderFailed);
        } finally {
            setLoadingPlan(null);
        }
    }

    return (
        <main className="h-full overflow-y-auto bg-[#f7f2ea] text-[#172033]">
            <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-12 md:px-10">
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div className="max-w-3xl">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <span className="text-xs uppercase tracking-[0.36em] text-[#8a7182]">{copy.betaAccess}</span>
                            <Tag color="blue">{copy.betaTag}</Tag>
                        </div>
                        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{copy.title}</h1>
                        <p className="mt-5 max-w-2xl text-base leading-8 text-[#5f6170]">{copy.intro}</p>
                    </div>

                    <Segmented
                        value={cycle}
                        onChange={(value) => setCycle(value as "monthly" | "yearly")}
                        options={[
                            { label: copy.monthly, value: "monthly" },
                            { label: copy.yearly, value: "yearly" },
                        ]}
                        size="large"
                    />
                </div>

                <div className="grid gap-5 lg:grid-cols-4">
                    {sortedPlans.map((plan) => {
                        const Icon = planIcons[plan.id as keyof typeof planIcons] || Sparkles;
                        const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
                        const isFree = plan.monthlyPrice <= 0 && plan.yearlyPrice <= 0;

                        return (
                            <article
                                key={plan.id}
                                className={cn(
                                    "relative flex min-h-[560px] flex-col rounded-3xl border bg-white/82 p-6 shadow-[0_22px_68px_rgba(38,28,18,0.08)] backdrop-blur",
                                    plan.isPopular ? "border-[#4f5cff] ring-1 ring-[#4f5cff]" : "border-[#eadfce]",
                                )}
                            >
                                {plan.isPopular ? (
                                    <span className="absolute right-6 top-6 rounded-full bg-[#4f5cff] px-3 py-1 text-xs font-medium text-white">{copy.popular}</span>
                                ) : null}

                                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0eaff] text-[#4f5cff]">
                                    <Icon className="h-7 w-7" />
                                </div>

                                <h2 className="text-2xl font-semibold">{plan.name}</h2>
                                <p className="mt-4 min-h-14 text-sm leading-7 text-[#5f6170]">{plan.description}</p>

                                <div className="mt-7">
                                    <span className="text-5xl font-semibold tracking-tight">{formatPrice(price)}</span>
                                    {!isFree ? (
                                        <span className="ml-2 text-sm text-stone-500">
                                            / {cycle === "yearly" ? copy.perYear : copy.perMonth}, {copy.betaPrice}
                                        </span>
                                    ) : null}
                                </div>

                                <ul className="mt-7 flex-1 space-y-3 text-sm text-[#344054]">
                                    {plan.entitlements.map((item) => (
                                        <li key={item.id || item.key} className="flex gap-3">
                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                            <span>
                                                {item.label}: {formatEntitlement(item.value, item.unit)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {!isFree ? <p className="mb-3 text-xs leading-5 text-stone-500">{copy.paidHint}</p> : null}
                                <Button
                                    type={plan.isPopular ? "primary" : "default"}
                                    size="large"
                                    className={cn("h-12 w-full rounded-xl", plan.isPopular ? "!bg-[#111] !text-white" : "")}
                                    loading={loadingPlan === plan.id}
                                    onClick={() => void applyPlan(plan)}
                                >
                                    {isFree ? copy.freeStart : copy.contactAdmin}
                                </Button>
                            </article>
                        );
                    })}
                </div>

                <div className="rounded-3xl border border-[#eadfce] bg-white/70 p-6 text-sm leading-7 text-[#5f6170]">
                    <p>{copy.footer}</p>
                    <Link href="/canvas" className="mt-4 inline-flex items-center gap-2 font-medium text-[#4f5cff]">
                        {copy.backCanvas}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </main>
    );
}
