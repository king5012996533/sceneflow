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
    plan?: { name?: string };
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

    function showPaymentModal(plan: Plan, order?: CreatedOrder) {
        const amount = order?.amount ?? (cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice);
        const orderNo = order?.orderNo || "提交后由管理员核对";
        const paymentNote = `${plan.name}-${cycle === "yearly" ? "年付" : "月付"}-${orderNo}`;

        modal.info({
            title: "扫码付款后联系管理员开通",
            width: 440,
            okText: "知道了",
            content: (
                <div className="space-y-4">
                    <div className="rounded-2xl border border-[#eadfce] bg-[#fffaf2] p-4">
                        <div className="text-xs tracking-[0.16em] text-stone-500">应付金额</div>
                        <div className="mt-1 text-4xl font-semibold tracking-tight text-[#172033]">{formatPrice(amount)}</div>
                        <div className="mt-2 text-sm leading-6 text-stone-600">
                            {plan.name} / {cycle === "yearly" ? "年度权益" : "月度权益"}
                        </div>
                        <div className="mt-2 break-all rounded-xl bg-white px-3 py-2 text-xs text-stone-500">
                            付款备注：{paymentNote}
                        </div>
                    </div>
                    <img
                        src={paymentQrSrc}
                        alt="微信收款码"
                        className="mx-auto w-64 rounded-2xl border border-stone-200 bg-white p-2"
                    />
                    <p className="text-sm leading-6 text-stone-600">
                        个人收款码不会自动锁定金额，请按上方金额付款。付款完成后，把付款截图或备注发给管理员，管理员会按账号手动开通套餐权益。
                    </p>
                </div>
            ),
        });
    }

    async function applyPlan(plan: Plan) {
        if (plan.monthlyPrice <= 0 && plan.yearlyPrice <= 0) {
            message.info("免费版登录后即可使用。");
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
            if (!response.ok) throw new Error(data.error || "创建开通申请失败");
            message.success("已生成付款金额和开通备注");
            showPaymentModal(plan, data.order);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "创建开通申请失败");
        } finally {
            setLoadingPlan(null);
        }
    }

    return (
        <main className="min-h-screen bg-[#f7f2ea] text-[#172033]">
            <section className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-16 md:px-10">
                <div className="flex flex-wrap items-end justify-between gap-8">
                    <div className="max-w-3xl">
                        <div className="mb-4 flex flex-wrap items-center gap-3">
                            <span className="text-xs uppercase tracking-[0.36em] text-[#8a7182]">Beta Access</span>
                            <Tag color="blue">内测期人工开通</Tag>
                        </div>
                        <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">选择适合你的生产规模</h1>
                        <p className="mt-6 max-w-2xl text-base leading-8 text-[#5f6170]">
                            当前阶段暂不接入在线收银台，套餐仍按所选权益付费手动开通权益。选择套餐后会生成对应应付金额和付款备注，扫码付款后联系管理员开通。
                        </p>
                    </div>

                    <Segmented
                        value={cycle}
                        onChange={(value) => setCycle(value as "monthly" | "yearly")}
                        options={[
                            { label: "月付", value: "monthly" },
                            { label: "年付", value: "yearly" },
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
                                    "relative flex min-h-[620px] flex-col rounded-3xl border bg-white/82 p-7 shadow-[0_26px_80px_rgba(38,28,18,0.08)] backdrop-blur",
                                    plan.isPopular ? "border-[#4f5cff] ring-1 ring-[#4f5cff]" : "border-[#eadfce]",
                                )}
                            >
                                {plan.isPopular ? (
                                    <span className="absolute right-6 top-6 rounded-full bg-[#4f5cff] px-3 py-1 text-xs font-medium text-white">
                                        推荐套餐
                                    </span>
                                ) : null}

                                <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0eaff] text-[#4f5cff]">
                                    <Icon className="h-7 w-7" />
                                </div>

                                <h2 className="text-2xl font-semibold">{plan.name}</h2>
                                <p className="mt-4 min-h-16 text-sm leading-7 text-[#5f6170]">{plan.description}</p>

                                <div className="mt-10">
                                    <span className="text-5xl font-semibold tracking-tight">{formatPrice(price)}</span>
                                    {!isFree ? <span className="ml-2 text-sm text-stone-500">/ {cycle === "yearly" ? "年" : "月"}，内测开通价</span> : null}
                                </div>

                                <ul className="mt-8 flex-1 space-y-4 text-sm text-[#344054]">
                                    {plan.entitlements.map((item) => (
                                        <li key={item.id || item.key} className="flex gap-3">
                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                            <span>
                                                {item.label}：{formatEntitlement(item.value, item.unit)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {!isFree ? (
                                    <p className="mb-3 text-xs leading-5 text-stone-500">点击后显示应付金额和收款码。</p>
                                ) : null}
                                <Button
                                    type={plan.isPopular ? "primary" : "default"}
                                    size="large"
                                    className={cn("h-12 w-full rounded-xl", plan.isPopular ? "!bg-[#111] !text-white" : "")}
                                    loading={loadingPlan === plan.id}
                                    onClick={() => void applyPlan(plan)}
                                >
                                    {isFree ? "免费开始" : "联系管理员开通"}
                                </Button>
                            </article>
                        );
                    })}
                </div>

                <div className="rounded-3xl border border-[#eadfce] bg-white/70 p-6 text-sm leading-7 text-[#5f6170]">
                    <p>
                        提交开通申请不等于免费开通。管理员会根据付款记录、付款备注和账号信息完成套餐权益开通。
                    </p>
                    <Link href="/canvas" className="mt-4 inline-flex items-center gap-2 font-medium text-[#4f5cff]">
                        回到画布
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </section>
        </main>
    );
}
