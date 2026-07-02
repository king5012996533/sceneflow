"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { App, Button } from "antd";
import { Check, Sparkles, Zap, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    id: "free",
    name: "免费版",
    price: 0,
    period: "",
    icon: Sparkles,
    color: "from-slate-100 to-slate-200",
    iconColor: "text-slate-500",
    features: [
      "基础画布功能",
      "3 个画布项目",
      "基础提示词库",
      "本地数据存储",
      "导出带水印",
    ],
  },
  {
    id: "creator",
    name: "创作者",
    price: 79,
    period: "月",
    yearlyPrice: 59,
    icon: Zap,
    color: "from-indigo-500 to-violet-500",
    iconColor: "text-white",
    popular: true,
    features: [
      "无限画布项目",
      "高级提示词库",
      "导出高清 PPTX",
      "自定义画布主题",
      "优先功能更新",
      "无水印导出",
    ],
  },
  {
    id: "pro",
    name: "专业版",
    price: 199,
    period: "月",
    yearlyPrice: 149,
    icon: Crown,
    color: "from-amber-400 to-orange-500",
    iconColor: "text-white",
    features: [
      "创作者版全部功能",
      "自定义模板库",
      "WebDAV 云同步",
      "批量导出",
      "API 接入",
      "专属客服支持",
    ],
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoading(planId);
    try {
      const res = await fetch("/canvas/api/subscription/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, yearly }),
      });
      if (res.ok) {
        message.success("订阅成功！");
        router.push("/canvas");
      } else {
        const data = await res.json();
        message.error(data.error || "订阅失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-16 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">选择适合你的套餐</h1>
          <p className="text-lg text-gray-500">用户自带 API Key，平台提供专业工具</p>

          {/* 年付/月付切换 */}
          <div className="mt-8 inline-flex items-center gap-3 bg-white rounded-full p-1 shadow-sm">
            <button
              onClick={() => setYearly(false)}
              className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all", !yearly ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700")}
            >
              月付
            </button>
            <button
              onClick={() => setYearly(true)}
              className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all", yearly ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700")}
            >
              年付 <span className="text-emerald-400 text-xs ml-1">省25%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const price = yearly && plan.yearlyPrice ? plan.yearlyPrice : plan.price;
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-2xl p-6 transition-all duration-300",
                  plan.popular
                    ? "bg-white shadow-xl ring-2 ring-indigo-500 scale-[1.02]"
                    : "bg-white/80 shadow-lg hover:shadow-xl"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-semibold rounded-full">
                    最受欢迎
                  </div>
                )}

                <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4", plan.color)}>
                  <Icon className={cn("w-6 h-6", plan.iconColor)} />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>

                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-gray-900">¥{price}</span>
                  {plan.period && <span className="text-gray-500">/{plan.period}</span>}
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  type={plan.popular ? "primary" : "default"}
                  block
                  size="large"
                  loading={loading === plan.id}
                  onClick={() => plan.price === 0 ? router.push("/canvas") : handleSubscribe(plan.id)}
                  className={cn(
                    "!rounded-xl !h-11 !font-medium",
                    plan.popular && "!bg-gradient-to-r !from-indigo-500 !to-violet-500 !border-0"
                  )}
                >
                  {plan.price === 0 ? "免费开始" : "立即订阅"}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-sm text-gray-400 mt-8">
          用户自带 API Key，平台不承担 AI 调用费用 · 随时可取消订阅
        </p>
      </div>
    </div>
  );
}
