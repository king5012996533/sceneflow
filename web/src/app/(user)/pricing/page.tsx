"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CreditPackagesSection } from "@/components/credits/credit-packages-section";
import { useCreditBalance } from "@/hooks/use-credit-balance";

const RATE_ROWS = [
    { name: "gpt-image", mode: "标准", credits: "10 积分" },
    { name: "Seedance 2.0", mode: "720p", credits: "15 积分" },
    { name: "Seedance 2.0", mode: "1080p", credits: "30 积分" },
];

const PAY_STEPS = [
    { title: "下单生成订单", desc: "点击「立即充值」创建积分包订单，获得订单号与应付金额。" },
    { title: "扫码付款", desc: "使用微信扫描收款码付款，在备注中保留订单号，便于对账。" },
    { title: "管理员确认入账", desc: "内测阶段为人工入账：管理员核对后确认，积分即时到账（到账幂等，不会重复发放）。" },
];

export default function PricingPage() {
    const { balance, loading: balanceLoading } = useCreditBalance();

    return (
        <main className="h-full overflow-y-auto bg-[#fbf6ee] text-[#201914]">
            <div className="mx-auto w-full max-w-[1180px] px-6 md:px-10">
                {/* 页头 */}
                <section className="pt-16 pb-10">
                    <p className="sf-mono mb-4 text-[11px] uppercase tracking-[0.14em] text-[#9b5b32]">Credits · 按量付费</p>
                    <h1 className="sf-serif text-[clamp(38px,5.2vw,62px)] font-semibold leading-[1.32]">
                        为持续生产，
                        <br />
                        先把积分<em className="italic text-[#9b5b32]">备足</em>。
                    </h1>
                    <p className="mt-5 max-w-[620px] text-[17px] leading-[1.85] text-[#4c4037]">
                        每次生成按 <strong>模型 × 类型 × 档位</strong> 扣积分。充值积分<strong>长期有效</strong>，生成失败<strong>自动原路退回</strong>。当前为内测阶段，扫码付款后由管理员确认入账。
                    </p>
                </section>

                {/* 余额条 */}
                <section className="grid grid-cols-1 border-y border-[#201914] bg-[#fffdf8] md:grid-cols-[5fr_4fr_3fr]">
                    <div className="border-b border-[#ded2c3] py-6 md:border-b-0 md:py-7 md:pr-8">
                        <div className="sf-mono text-[10px] uppercase tracking-[0.12em] text-[#7a6d63]">Credit Balance / 当前余额</div>
                        <div className="mt-2.5 flex items-baseline gap-3">
                            <span className="sf-serif text-[42px] font-medium leading-none">
                                {balanceLoading ? "…" : balance === null ? "—" : balance.toLocaleString("zh-CN")}
                                <sup className="ml-1 align-super text-[15px] text-[#9b5b32]">CR</sup>
                            </span>
                            <span className="rounded-full bg-[#f1e3cf] px-2.5 py-1 text-[11px] font-semibold text-[#9b5b32]">按量付费</span>
                        </div>
                        <p className="mt-2.5 text-[13px] text-[#7a6d63]">余额不足时将暂停生成，请在开始生产前充值。</p>
                    </div>
                    <div className="border-b border-[#ded2c3] py-6 md:border-b-0 md:border-l md:py-7 md:px-8">
                        <div className="sf-mono text-[10px] uppercase tracking-[0.12em] text-[#7a6d63]">Rate Card / 生成单价示例</div>
                        <p className="mt-2.5 text-[13px] leading-[1.9] text-[#4c4037]">
                            gpt-image 每张 <b className="font-semibold text-[#201914]">10 积分</b>
                            <br />
                            Seedance 720p 每次 <b className="font-semibold text-[#201914]">15 积分</b>
                            <br />
                            Seedance 1080p 每次 <b className="font-semibold text-[#201914]">30 积分</b>
                        </p>
                    </div>
                    <div className="py-6 md:border-l md:py-7 md:pl-8">
                        <div className="sf-mono text-[10px] uppercase tracking-[0.12em] text-[#7a6d63]">Notes / 充值说明</div>
                        <p className="mt-2.5 text-[13px] leading-[1.9] text-[#4c4037]">
                            充值积分<strong>长期有效</strong>，不过期。
                            <br />
                            生成失败 / 取消的任务<strong>原路退回</strong>。
                        </p>
                    </div>
                </section>

                <CreditPackagesSection />

                {/* 计费规则 */}
                <section className="border-y border-[#201914] bg-[#fffdf8] py-12">
                    <div className="grid gap-10 md:grid-cols-[4fr_8fr]">
                        <div>
                            <p className="sf-mono mb-3 text-[11px] uppercase tracking-[0.14em] text-[#9b5b32]">Rate Card</p>
                            <h2 className="sf-serif text-[clamp(28px,3vw,40px)] font-semibold leading-[1.32]">
                                积分怎么<em className="italic text-[#9b5b32]">扣</em>？
                            </h2>
                            <p className="mt-3 max-w-[34ch] text-sm text-[#7a6d63]">每次生成开始时先锁定积分，任务失败或取消自动退回，同一任务不会重复扣费。</p>
                        </div>
                        <div>
                            <div className="border-t border-[#201914]">
                                <div className="sf-mono grid grid-cols-[7fr_3fr_3fr] gap-3 border-b border-[#ded2c3] py-2.5 text-[10px] uppercase tracking-[0.12em] text-[#7a6d63]">
                                    <span>模型</span>
                                    <span>档位</span>
                                    <span className="text-right">单次消耗</span>
                                </div>
                                {RATE_ROWS.map((row) => (
                                    <div key={`${row.name}-${row.mode}`} className="grid grid-cols-[7fr_3fr_3fr] gap-3 border-b border-[#ded2c3] py-3.5 text-sm">
                                        <span className="font-medium">{row.name}</span>
                                        <span className="text-[#4c4037]">{row.mode}</span>
                                        <span className="sf-mono text-right text-xs text-[#9b5b32]">{row.credits}</span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-4 text-[13px] leading-[1.8] text-[#7a6d63]">
                                <b className="font-medium text-[#4c4037]">长期有效：</b>充值积分不过期，可在套餐与画布内持续使用。
                                <br />
                                <b className="font-medium text-[#4c4037]">失败退回：</b>生成失败 / 用户取消的任务，锁定积分原路退回余额。
                            </p>
                        </div>
                    </div>
                </section>

                {/* 付款流程 */}
                <section className="py-14">
                    <p className="sf-mono mb-3 text-[11px] uppercase tracking-[0.14em] text-[#9b5b32]">Payment Flow</p>
                    <h2 className="sf-serif text-[clamp(28px,3vw,40px)] font-semibold leading-[1.3]">
                        三步到账，<em className="italic text-[#9b5b32]">人工确认</em>。
                    </h2>
                    <div className="mt-10 grid grid-cols-1 border-y border-[#201914] md:grid-cols-3">
                        {PAY_STEPS.map((step, index) => (
                            <div key={step.title} className="border-b border-[#ded2c3] py-6 last:border-b-0 md:border-b-0 md:border-r md:border-[#ded2c3] md:px-6 md:py-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
                                <span className="sf-mono text-[11px] tracking-[0.12em] text-[#9b5b32]">STEP 0{index + 1}</span>
                                <strong className="sf-serif mt-7 block text-[23px] font-medium leading-[1.3]">{step.title}</strong>
                                <span className="mt-2 block text-[13px] leading-[1.7] text-[#7a6d63]">{step.desc}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 底部返回 */}
                <div className="pb-12">
                    <Link href="/canvas" className="inline-flex items-center gap-2 text-sm font-medium text-[#9b5b32] transition hover:text-[#7c4526]">
                        回到画布
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </main>
    );
}
