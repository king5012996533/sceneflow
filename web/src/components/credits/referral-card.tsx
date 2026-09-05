"use client";

import { useEffect, useState } from "react";
import { App, Button } from "antd";
import { Copy, Gift, Users } from "lucide-react";

import { apiPath } from "@/lib/app-paths";

type ReferralSummary = {
    referralCode: string;
    invitedCount: number;
    totalEarned: number;
    percents: { firstTopup: number; topup: number; refereeBonus: number };
};

export function ReferralCard() {
    const { message } = App.useApp();
    const [summary, setSummary] = useState<ReferralSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [inviteLink, setInviteLink] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(apiPath("/api/referral/summary"));
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "获取邀请信息失败");
                setSummary(json);
                setInviteLink(`${window.location.origin}/register?ref=${json.referralCode}`);
            } catch {
                // 静默：邀请卡片获取失败不影响账单页其余部分
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const copy = async (text: string, tip: string) => {
        try {
            await navigator.clipboard.writeText(text);
            message.success(tip);
        } catch {
            message.warning("复制失败，请手动复制");
        }
    };

    return (
        <section className="rounded-2xl border border-[#dde2dc] bg-white/78 p-5 shadow-[0_20px_60px_rgba(42,51,48,0.06)]">
            <div className="mb-5 flex items-center gap-2 text-sm font-medium">
                <Gift className="size-5" />
                邀请好友，返积分
            </div>
            {loading || !summary ? (
                <div className="py-2 text-sm text-[#67726b]">{loading ? "加载中…" : "邀请信息暂不可用"}</div>
            ) : (
                <>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-[#ece5d8] bg-[#fbf7ef] px-4 py-3">
                            <div className="text-xs text-[#67726b]">已邀请好友</div>
                            <div className="mt-1 text-xl font-semibold text-[#172033]">{summary.invitedCount} 人</div>
                        </div>
                        <div className="rounded-xl border border-[#ece5d8] bg-[#fbf7ef] px-4 py-3">
                            <div className="text-xs text-[#67726b]">累计返利</div>
                            <div className="mt-1 text-xl font-semibold text-[#172033]">{summary.totalEarned} 积分</div>
                        </div>
                        <div className="rounded-xl border border-[#ece5d8] bg-[#fbf7ef] px-4 py-3">
                            <div className="text-xs text-[#67726b]">我的邀请码</div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                                <span className="sf-mono text-lg font-semibold tracking-wider text-[#172033]">{summary.referralCode}</span>
                                <Button size="small" type="text" icon={<Copy className="size-3.5" />} onClick={() => copy(summary.referralCode, "邀请码已复制")} />
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#ece5d8] bg-white px-3 py-2">
                        <input readOnly value={inviteLink} className="sf-mono min-w-0 flex-1 bg-transparent text-xs text-[#67726b] outline-none" onFocus={(event) => event.target.select()} />
                        <Button size="small" className="!rounded-lg !border-[#a0713f] !bg-[#a0713f] !text-white" onClick={() => copy(inviteLink, "邀请链接已复制")}>
                            复制链接
                        </Button>
                    </div>
                    <div className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-[#67726b]">
                        <Users className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                            好友通过你的链接注册并首充：你得 {summary.percents.firstTopup}% 积分，好友额外 +{summary.percents.refereeBonus}% 加成；之后 Ta 每笔充值你都得 {summary.percents.topup}%。
                        </span>
                    </div>
                </>
            )}
        </section>
    );
}
