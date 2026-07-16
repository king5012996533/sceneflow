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

const planIcons = {
    free: Sparkles,
    creator: Zap,
    team: Users,
    enterprise: Crown,
} as const;

function formatPrice(amount: number) {
    if (amount <= 0) return "免费";
    return `￥${(amount / 100).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
}

function formatEntitlement(value: string, unit: string) {
    if (value === "true") return "支持";
    if (value === "false") return "暂不支持";
    if (value === "unlimited") return "不限";
    if (value === "custom") return "定制";
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
            .catch((error) => message.error(error instanceof Error ? error.message : "获取套餐失败"));
    }, [message]);

    const sortedPlans = useMemo(() => plans, [plans]);

    async function applyPlan(plan: Plan) {
        if (plan.id === "free") {
            message.info("免费版登录后即可使用。");
            return;
        }

        setLoadingPlan(plan.id);
        try {
            const res = await fetch(apiPath("/api/billing/orders"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planId: plan.id, billingCycle: cycle, provider: "manual", intent: "manual_payment" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "提交开通申请失败");

            message.success(`已提交 ${plan.name} 开通申请，请完成付款并联系管理员。`);
            modal.info({
                title: "扫码付款后联系管理员开通",
                width: 420,
                okText: "知道了",
                content: (
                    <div className="space-y-3">
                        <p className="text-sm leading-6 text-stone-600">
                            已提交 {plan.name} 开通申请。当前阶段暂不接在线收银台，请先使用微信扫码付款，然后联系管理员确认账号、套餐和周期。
                        </p>
                        <img src={paymentQrSrc} alt="微信收款码" className="mx-auto w-64 rounded-2xl border border-stone-200 bg-white p-2" />
                    </div>
                ),
            });
        } catch (error) {
            message.error(error instanceof Error ? error.message : "提交开通申请失败");
        } finally {
            setLoadingPlan(null);
        }
    }

    return (
        <main className="h-full overflow-y-auto bg-[linear-gradient(135deg,#fbf7ef_0%,#f7f3ea_48%,#eef4ff_100%)] px-6 py-12 text-[#172033]">
            <div className="mx-auto max-w-7xl">
                <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_280px] lg:items-end">
                    <div>
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium tracking-[0.18em] text-[#8a7f91]">BETA ACCESS</span>
                            <Tag color="blue">内测期人工开通</Tag>
                        </div>
                        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">选择适合你的生产规模</h1>
                        <p className="mt-4 max-w-2xl text-base leading-7 text-[#6d6472]">
                            当前阶段暂不接入在线收银台，套餐仍按所选权益付费手动开通权益。请先扫码付款，再提交开通申请；管理员会联系确认账号、使用场景、套餐周期和开通方式。
                        </p>
                    </div>

                    <div className="rounded-2xl border border-[#eadfce] bg-white/84 p-4 shadow-[0_18px_56px_rgba(57,48,34,0.08)]">
                        <Segmented
                            className="mb-4 w-full"
                            value={cycle}
                            onChange={(value) => setCycle(value as "monthly" | "yearly")}
                            options={[
                                { label: "月度权益", value: "monthly" },
                                { label: "年度权益", value: "yearly" },
                            ]}
                        />
                        <div className="text-sm font-semibold text-[#172033]">微信扫码付款</div>
                        <p className="mt-1 text-xs leading-5 text-[#6d6472]">付款后提交开通申请，管理员会按账号手动开通套餐权益。</p>
                        <img src={paymentQrSrc} alt="微信收款码" className="mt-3 w-full rounded-xl border border-[#eadfce] bg-white p-1" />
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
                                    "relative flex min-h-[560px] flex-col rounded-2xl border bg-white/78 p-5 shadow-[0_24px_70px_rgba(66,56,38,0.07)]",
                                    plan.isPopular ? "border-[#4f5dff] ring-2 ring-[#4f5dff]/10" : "border-[#eadfce]",
                                )}
                            >
                                {plan.isPopular ? <div className="absolute right-4 top-4 rounded-full bg-[#4f5dff] px-2.5 py-1 text-xs text-white">推荐套餐</div> : null}
                                <div className={cn("mb-5 flex size-11 items-center justify-center rounded-xl", plan.isPopular ? "bg-[#4f5dff] text-white" : "bg-[#f4f1ff] text-[#4f5dff]")}>
                                    <Icon className="size-5" />
                                </div>
                                <h2 className="text-xl font-semibold tracking-tight">{plan.name}</h2>
                                <p className="mt-2 min-h-12 text-sm leading-6 text-[#6d6472]">{plan.description}</p>
                                <div className="mt-6 flex items-end gap-2">
                                    <span className="text-4xl font-semibold tracking-tight">{formatPrice(price)}</span>
                                    {price > 0 ? <span className="pb-1 text-sm text-stone-400">/{cycle === "yearly" ? "年" : "月"}，内测开通价</span> : null}
                                </div>
                                <div className="mt-6 space-y-3">
                                    {plan.entitlements.map((item) => (
                                        <div key={item.id} className="flex items-start gap-2 text-sm text-[#5f6678]">
                                            <Check className="mt-0.5 size-4 shrink-0 text-[#18a889]" />
                                            <span>
                                                {item.label}: {formatEntitlement(item.value, item.unit)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-auto space-y-2 pt-8">
                                    {plan.id !== "free" ? <div className="text-center text-xs text-stone-500">先扫码付款，再提交申请</div> : null}
                                    <Button type={plan.isPopular ? "primary" : "default"} block size="large" loading={loadingPlan === plan.id} onClick={() => void applyPlan(plan)}>
                                        {plan.id === "free" ? "免费开始" : "扫码付款并提交开通申请"}
                                    </Button>
                                </div>
                            </section>
                        );
                    })}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/70 bg-white/78 p-4 shadow-[0_20px_70px_rgba(57,48,34,0.08)] backdrop-blur">
                    <span className="text-sm text-stone-500">提交开通申请不等于免费开通。管理员会根据付款记录和账号信息完成套餐权益开通。</span>
                    <Link href="/billing" className="inline-flex items-center gap-2 text-sm font-medium text-stone-950">
                        查看当前套餐
                        <ArrowRight className="size-4" />
                    </Link>
                </div>
            </div>
        </main>
    );
}
