"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { CreditPackagesSection } from "@/components/credits/credit-packages-section";
import { useCreditBalance } from "@/hooks/use-credit-balance";
import { apiPath } from "@/lib/app-paths";
import { getGenerationCreditsCost, type GenerationKind } from "@/lib/credit-pricing";

type RateCardRow = { model: string; mode: string; kind: GenerationKind; credits: number };

/** 接口不可用时的兜底行（与扣费同款内置草案计算，避免再次硬编码） */
const FALLBACK_RATE_CARD: RateCardRow[] = [
    { model: "gpt-image-1", mode: "标准", kind: "image", credits: getGenerationCreditsCost("image", { model: "gpt-image-1" }) },
    { model: "seedance-1-pro", mode: "720p", kind: "video", credits: getGenerationCreditsCost("video", { model: "seedance-1-pro" }) },
    { model: "seedance-1-pro", mode: "1080p", kind: "video", credits: getGenerationCreditsCost("video", { model: "seedance-1-pro", vquality: "1080p" }) },
];

function unitWord(kind: GenerationKind): string {
    return kind === "image" ? "每张" : kind === "video" ? "每条" : "每次";
}

const PAY_STEPS = [
    { title: "下单生成订单", desc: "点击「立即充值」创建积分包订单，获得订单号与应付金额。" },
    { title: "扫码付款", desc: "使用微信扫描收款码付款，在备注中保留订单号，便于对账。" },
    { title: "管理员确认入账", desc: "内测阶段为人工入账：管理员核对后确认，积分即时到账（到账幂等，不会重复发放）。" },
];

export default function PricingPage() {
    const { balance, loading: balanceLoading } = useCreditBalance();
    const [rateCard, setRateCard] = useState<RateCardRow[]>(FALLBACK_RATE_CARD);

    useEffect(() => {
        // 单价示例与计费规则：后台运营配置 / 逐模型定价驱动，接口失败时退回内置草案
        void fetch(apiPath("/api/billing/packages"), { cache: "no-store" })
            .then((res) => res.json())
            .then((json) => {
                if (Array.isArray(json?.rateCard) && json.rateCard.length) setRateCard(json.rateCard);
            })
            .catch(() => {
                // 静默：保留内置草案兜底
            });
    }, []);

    return (
        <main className="h-full overflow-y-auto bg-[#f4f6f2] text-[#2a3330]">
            <div className="mx-auto w-full max-w-[1180px] px-6 md:px-10">
                {/* 页头 */}
                <section className="pt-16 pb-10">
                    <p className="sf-mono mb-4 text-[11px] uppercase tracking-[0.14em] text-[#a0713f]">Credits · 按量付费</p>
                    <h1 className="sf-serif text-[clamp(38px,5.2vw,62px)] font-semibold leading-[1.32]">
                        为持续生产，
                        <br />
                        先把积分<em className="italic text-[#a0713f]">备足</em>。
                    </h1>
                    <p className="mt-5 max-w-[620px] text-[17px] leading-[1.85] text-[#3c4742]">
                        每次生成按 <strong>模型 × 类型 × 档位</strong> 扣积分。充值积分<strong>长期有效</strong>，生成失败<strong>自动原路退回</strong>。当前为内测阶段，扫码付款后由管理员确认入账。
                    </p>
                </section>

                {/* 余额条 */}
                <section className="grid grid-cols-1 border-y border-[#2a3330] bg-[#ffffff] md:grid-cols-[5fr_4fr_3fr]">
                    <div className="border-b border-[#dde2dc] py-6 md:border-b-0 md:py-7 md:pr-8">
                        <div className="sf-mono text-[10px] uppercase tracking-[0.12em] text-[#67726b]">Credit Balance / 当前余额</div>
                        <div className="mt-2.5 flex items-baseline gap-3">
                            <span className="sf-serif text-[42px] font-medium leading-none">
                                {balanceLoading ? "…" : balance === null ? "—" : balance.toLocaleString("zh-CN")}
                                <sup className="ml-1 align-super text-[15px] text-[#a0713f]">CR</sup>
                            </span>
                            <span className="rounded-full bg-[#e7ece8] px-2.5 py-1 text-[11px] font-semibold text-[#a0713f]">按量付费</span>
                        </div>
                        <p className="mt-2.5 text-[13px] text-[#67726b]">余额不足时将暂停生成，请在开始生产前充值。</p>
                    </div>
                    <div className="border-b border-[#dde2dc] py-6 md:border-b-0 md:border-l md:py-7 md:px-8">
                        <div className="sf-mono text-[10px] uppercase tracking-[0.12em] text-[#67726b]">Rate Card / 生成单价示例</div>
                        <div className="mt-2.5 text-[13px] leading-[1.9] text-[#3c4742]">
                            {rateCard.map((row) => (
                                <p key={`${row.model}-${row.mode}`}>
                                    {row.model} {row.mode !== "标准" ? row.mode : ""} {unitWord(row.kind)} <b className="font-semibold text-[#2a3330]">{row.credits} 积分</b>
                                </p>
                            ))}
                        </div>
                    </div>
                    <div className="py-6 md:border-l md:py-7 md:pl-8">
                        <div className="sf-mono text-[10px] uppercase tracking-[0.12em] text-[#67726b]">Notes / 充值说明</div>
                        <p className="mt-2.5 text-[13px] leading-[1.9] text-[#3c4742]">
                            充值积分<strong>长期有效</strong>，不过期。
                            <br />
                            生成失败 / 取消的任务<strong>原路退回</strong>。
                        </p>
                    </div>
                </section>

                <CreditPackagesSection />

                {/* 计费规则 */}
                <section className="border-y border-[#2a3330] bg-[#ffffff] py-12">
                    <div className="grid gap-10 md:grid-cols-[4fr_8fr]">
                        <div>
                            <p className="sf-mono mb-3 text-[11px] uppercase tracking-[0.14em] text-[#a0713f]">Rate Card</p>
                            <h2 className="sf-serif text-[clamp(28px,3vw,40px)] font-semibold leading-[1.32]">
                                积分怎么<em className="italic text-[#a0713f]">扣</em>？
                            </h2>
                            <p className="mt-3 max-w-[34ch] text-sm text-[#67726b]">每次生成开始时先锁定积分，任务失败或取消自动退回，同一任务不会重复扣费。</p>
                        </div>
                        <div>
                            <div className="border-t border-[#2a3330]">
                                <div className="sf-mono grid grid-cols-[7fr_3fr_3fr] gap-3 border-b border-[#dde2dc] py-2.5 text-[10px] uppercase tracking-[0.12em] text-[#67726b]">
                                    <span>模型</span>
                                    <span>档位</span>
                                    <span className="text-right">单次消耗</span>
                                </div>
                                {rateCard.map((row) => (
                                    <div key={`${row.model}-${row.mode}`} className="grid grid-cols-[7fr_3fr_3fr] gap-3 border-b border-[#dde2dc] py-3.5 text-sm">
                                        <span className="font-medium">{row.model}</span>
                                        <span className="text-[#3c4742]">{row.mode}</span>
                                        <span className="sf-mono text-right text-xs text-[#a0713f]">{row.credits} 积分</span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-4 text-[13px] leading-[1.8] text-[#67726b]">
                                <b className="font-medium text-[#3c4742]">长期有效：</b>充值积分不过期，可在套餐与画布内持续使用。
                                <br />
                                <b className="font-medium text-[#3c4742]">失败退回：</b>生成失败 / 用户取消的任务，锁定积分原路退回余额。
                            </p>
                        </div>
                    </div>
                </section>

                {/* 付款流程 */}
                <section className="py-14">
                    <p className="sf-mono mb-3 text-[11px] uppercase tracking-[0.14em] text-[#a0713f]">Payment Flow</p>
                    <h2 className="sf-serif text-[clamp(28px,3vw,40px)] font-semibold leading-[1.3]">
                        三步到账，<em className="italic text-[#a0713f]">人工确认</em>。
                    </h2>
                    <div className="mt-10 grid grid-cols-1 border-y border-[#2a3330] md:grid-cols-3">
                        {PAY_STEPS.map((step, index) => (
                            <div key={step.title} className="border-b border-[#dde2dc] py-6 last:border-b-0 md:border-b-0 md:border-r md:border-[#dde2dc] md:px-6 md:py-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
                                <span className="sf-mono text-[11px] tracking-[0.12em] text-[#a0713f]">STEP 0{index + 1}</span>
                                <strong className="sf-serif mt-7 block text-[23px] font-medium leading-[1.3]">{step.title}</strong>
                                <span className="mt-2 block text-[13px] leading-[1.7] text-[#67726b]">{step.desc}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 底部返回 */}
                <div className="pb-12">
                    <Link href="/canvas/canvas" className="inline-flex items-center gap-2 text-sm font-medium text-[#a0713f] transition hover:text-[#8a5e33]">
                        回到画布
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </main>
    );
}
