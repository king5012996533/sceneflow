"use client";

import { useEffect, useState } from "react";
import { Empty, Tag } from "antd";
import { Gift } from "lucide-react";

type LeaderboardRow = { id: string; email: string; name: string; invited: number; earned: number };
type RecentRow = { id: string; createdAt: string; type: string; amount: number; referrer: { email: string; name: string }; referee: { email: string; name: string } | null; orderNo: string };

const TYPE_LABELS: Record<string, string> = {
    referral_first_topup: "首充返利",
    referral_topup: "充值返利",
};

function formatDateTime(value: string) {
    return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

export default function ReferralsTab() {
    const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
    const [recent, setRecent] = useState<RecentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch("/api/admin/referrals");
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "获取邀请报表失败");
                setLeaderboard(json.leaderboard || []);
                setRecent(json.recent || []);
            } catch (err) {
                setError(err instanceof Error ? err.message : "获取邀请报表失败");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return <div className="py-8 text-center text-sm text-[#67726b]">加载中…</div>;
    if (error) return <div className="py-8 text-center text-sm text-red-500">{error}</div>;

    return (
        <div className="space-y-4">
            <section className="rounded-2xl border border-[#dde2dc] bg-[#ffffff] p-5 shadow-[0_8px_20px_rgba(35,28,20,0.05)]">
                <div className="sf-serif mb-4 flex items-center gap-2 text-[17px] font-semibold">
                    <Gift className="size-4 text-[#a0713f]" />
                    邀请排行榜
                </div>
                {leaderboard.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-left text-sm">
                            <thead className="border-b border-[#dde2dc] text-[#67726b]">
                                <tr>
                                    <th className="py-3 font-medium">邀请人</th>
                                    <th className="py-3 font-medium">已邀请</th>
                                    <th className="py-3 font-medium">累计返利（积分）</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((row) => (
                                    <tr key={row.id} className="border-b border-[#f1ebe0]">
                                        <td className="py-3 text-sm">{row.name || row.email}</td>
                                        <td className="py-3 text-sm">{row.invited}</td>
                                        <td className="py-3 text-sm font-medium text-[#a0713f]">{row.earned}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Empty description="暂无邀请数据" />
                )}
            </section>

            <section className="rounded-2xl border border-[#dde2dc] bg-[#ffffff] p-5 shadow-[0_8px_20px_rgba(35,28,20,0.05)]">
                <div className="sf-serif mb-4 flex items-center gap-2 text-[17px] font-semibold">
                    <Gift className="size-4 text-[#a0713f]" />
                    返利明细
                </div>
                {recent.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="border-b border-[#dde2dc] text-[#67726b]">
                                <tr>
                                    <th className="py-3 font-medium">时间</th>
                                    <th className="py-3 font-medium">类型</th>
                                    <th className="py-3 font-medium">邀请人</th>
                                    <th className="py-3 font-medium">被邀请人</th>
                                    <th className="py-3 font-medium">积分</th>
                                    <th className="py-3 font-medium">订单</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recent.map((row) => (
                                    <tr key={row.id} className="border-b border-[#f1ebe0]">
                                        <td className="py-3 text-sm text-[#3c4742]">{formatDateTime(row.createdAt)}</td>
                                        <td className="py-3 text-sm">
                                            <Tag>{TYPE_LABELS[row.type] || row.type}</Tag>
                                        </td>
                                        <td className="py-3 text-sm">{row.referrer.name || row.referrer.email}</td>
                                        <td className="py-3 text-sm">{row.referee ? row.referee.name || row.referee.email : "-"}</td>
                                        <td className="py-3 text-sm font-medium text-[#a0713f]">+{row.amount}</td>
                                        <td className="py-3 font-mono text-xs text-[#67726b]">{row.orderNo}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Empty description="暂无返利流水" />
                )}
            </section>
        </div>
    );
}
