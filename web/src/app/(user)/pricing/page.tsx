"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { App, Button, Segmented } from "antd";
import { ArrowRight, Check, Crown, Sparkles, Users, Zap } from "lucide-react";

import { apiPath } from "@/lib/app-paths";
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

const planIcons = {
    free: Sparkles,
    creator: Zap,
    team: Users,
    enterprise: Crown,
} as const;

const providerLabels = {
    wechat: "微信支付",
    alipay: "支付宝",
    stripe: "Stripe",
} as const;

function formatPrice(amount: number) {
    if (amount <= 0) return "免费";
    return `¥${(amount / 100).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
}

export default function PricingPage() {
    const { message } = App.useApp();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
    const [provider, setProvider] = useState<"wechat" | "alipay" | "stripe">("wechat");
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    useEffect(() => {
        void fetch(apiPath("/api/billing/plans"))
            .then((res) => res.json())
            .then((data) => {
                if (data.error) throw new Error(data.error);
                setPlans(data.plans || []);
            })
            .catch((error) => message.error(error instanceof Error ? error.message : "获取套餐失败"));
    }, [message]);

    const sortedPlans = useMemo(() => plans, [plans]);

    async function createOrder(plan: Plan) {
        if (plan.id === "free") {
            message.info("免费版无需支付，登录后即可使用。");
            return;
        }

        setLoadingPlan(plan.id);
        try {
            const res = await fetch(apiPath("/api/billing/orders"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId: plan.id, billingCycle: cycle, provider }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "创建订单失败");
            message.success(`订单 ${data.order.orderNo} 已创建，等待接入真实${providerLabels[provider]}收银台。`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "创建订单失败");
        } finally {
            setLoadingPlan(null);
        }
    }

    return (
        <main className="h-full overflow-y-auto bg-[#f6f3ee] px-6 py-12 text-stone-950">
            <div className="mx-auto max-w-7xl">
                <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                    <div>
                        <div className="mb-3 text-xs font-medium tracking-[0.18em] text-stone-400">SUBSCRIPTION</div>
                        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">选择适合你的生产规模</h1>
                        <p className="mt-4 max-w-2xl text-base leading-7 text-stone-500">
                            SceneFlow 不赚 API 差价。订阅费用用于工作流、资产管理、团队协作、后台能力和虚拟人物资产体系。
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Segmented
                            value={cycle}
                            onChange={(value) => setCycle(value as "monthly" | "yearly")}
                            options={[
                                { label: "月付", value: "monthly" },
                                { label: "年付", value: "yearly" },
                            ]}
                        />
                        <Segmented
                            value={provider}
                            onChange={(value) => setProvider(value as "wechat" | "alipay" | "stripe")}
                            options={[
                                { label: "微信", value: "wechat" },
                                { label: "支付宝", value: "alipay" },
                                { label: "Stripe", value: "stripe" },
                            ]}
                        />
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-4">
                    {sortedPlans.map((plan) => {
                        const Icon = planIcons[plan.id as keyof typeof planIcons] || Sparkles;
                        const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
                        return (
                            <section
                                key={plan.id}
                                className={cn(
                                    "relative flex min-h-[520px] flex-col rounded-lg border bg-white p-5 shadow-sm",
                                    plan.isPopular ? "border-stone-950 ring-2 ring-stone-950/10" : "border-stone-200",
                                )}
                            >
                                {plan.isPopular ? (
                                    <div className="absolute right-4 top-4 rounded-full bg-stone-950 px-2.5 py-1 text-xs text-white">推荐</div>
                                ) : null}
                                <div className="mb-5 flex size-11 items-center justify-center rounded-md bg-stone-950 text-white">
                                    <Icon className="size-5" />
                                </div>
                                <h2 className="text-xl font-semibold tracking-tight">{plan.name}</h2>
                                <p className="mt-2 min-h-12 text-sm leading-6 text-stone-500">{plan.description}</p>
                                <div className="mt-6 flex items-end gap-2">
                                    <span className="text-4xl font-semibold tracking-tight">{formatPrice(price)}</span>
                                    {price > 0 ? <span className="pb-1 text-sm text-stone-400">/{cycle === "yearly" ? "年" : "月"}</span> : null}
                                </div>
                                <div className="mt-6 space-y-3">
                                    {plan.entitlements.map((item) => (
                                        <div key={item.id} className="flex items-start gap-2 text-sm text-stone-600">
                                            <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                            <span>
                                                {item.label}: {item.value === "true" ? "支持" : item.value === "false" ? "不支持" : `${item.value}${item.unit}`}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-auto pt-8">
                                    <Button
                                        type={plan.isPopular ? "primary" : "default"}
                                        block
                                        size="large"
                                        loading={loadingPlan === plan.id}
                                        onClick={() => void createOrder(plan)}
                                    >
                                        {plan.id === "free" ? "免费开始" : "创建订单"}
                                    </Button>
                                </div>
                            </section>
                        );
                    })}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-4">
                    <span className="text-sm text-stone-500">已订阅用户可以在当前套餐页查看用量、订单和续费状态。</span>
                    <Link href="/billing" className="inline-flex items-center gap-2 text-sm font-medium text-stone-950">
                        查看当前套餐
                        <ArrowRight className="size-4" />
                    </Link>
                </div>
            </div>
        </main>
    );
}
