"use client";

import { useEffect, useState } from "react";
import { App, Table } from "antd";
import type { TableColumnsType } from "antd";
import { ChartPie, Coins, TrendingDown, TrendingUp } from "lucide-react";

import { apiPath } from "@/lib/app-paths";
import { formatCny } from "@/lib/format";

type CostSummary = {
    totalRevenueCents: number;
    totalCostCents: number;
    marginCents: number;
    marginRate: number | null;
    days: number;
};

type DayRow = { day: string; revenueCents: number; costCents: number };

function formatPercent(value: number | null): string {
    if (value === null || !Number.isFinite(value)) return "—";
    return `${(value * 100).toFixed(1)}%`;
}

/** 对账：积分充值收入 vs 平台成本估算 → 毛利（Phase 5） */
export default function CostsTab() {
    const { message } = App.useApp();
    const [summary, setSummary] = useState<CostSummary | null>(null);
    const [rows, setRows] = useState<DayRow[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        void fetch(apiPath("/api/admin/costs?days=30"), { cache: "no-store" })
            .then((res) => res.json())
            .then((json) => {
                if (json.error) throw new Error(json.error);
                setSummary(json.summary);
                setRows(json.byDay || []);
            })
            .catch((error) => message.error(error instanceof Error ? error.message : "加载对账数据失败"))
            .finally(() => setLoading(false));
    }, [message]);

    const columns: TableColumnsType<DayRow> = [
        { title: "日期", dataIndex: "day", width: 130 },
        { title: "充值收入", dataIndex: "revenueCents", align: "right", render: (value: number) => (value ? formatCny(value) : "—") },
        { title: "平台成本估算", dataIndex: "costCents", align: "right", render: (value: number) => (value ? formatCny(value) : "—") },
        {
            title: "毛利",
            align: "right",
            render: (_: unknown, row: DayRow) => {
                const margin = row.revenueCents - row.costCents;
                return <span className={margin >= 0 ? "text-emerald-600" : "text-rose-500"}>{formatCny(margin)}</span>;
            },
        },
    ];

    return (
        <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-[#ded2c3] bg-[#fffdf8] p-4 shadow-[0_8px_20px_rgba(35,28,20,0.05)]">
                    <div className="mb-2.5 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a6d63]">
                        <TrendingUp className="size-4" />
                        近 {summary?.days ?? 30} 天充值收入
                    </div>
                    <div className="sf-serif text-[26px] font-semibold tracking-[0.01em] text-[#201914]">{summary ? formatCny(summary.totalRevenueCents) : "—"}</div>
                </div>
                <div className="rounded-2xl border border-[#ded2c3] bg-[#fffdf8] p-4 shadow-[0_8px_20px_rgba(35,28,20,0.05)]">
                    <div className="mb-2.5 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a6d63]">
                        <TrendingDown className="size-4" />
                        平台成本估算
                    </div>
                    <div className="sf-serif text-[26px] font-semibold tracking-[0.01em] text-[#201914]">{summary ? formatCny(summary.totalCostCents) : "—"}</div>
                    <div className="mt-1 text-[11px] text-[#b7a99b]">按 GenerationJob.costCents 公开价粗估</div>
                </div>
                <div className="rounded-2xl border border-[#ded2c3] bg-[#fffdf8] p-4 shadow-[0_8px_20px_rgba(35,28,20,0.05)]">
                    <div className="mb-2.5 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a6d63]">
                        <ChartPie className="size-4" />
                        毛利
                    </div>
                    <div className="sf-serif text-[26px] font-semibold tracking-[0.01em] text-emerald-600">{summary ? formatCny(summary.marginCents) : "—"}</div>
                </div>
                <div className="rounded-2xl border border-[#ded2c3] bg-[#fffdf8] p-4 shadow-[0_8px_20px_rgba(35,28,20,0.05)]">
                    <div className="mb-2.5 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7a6d63]">
                        <Coins className="size-4" />
                        毛利率
                    </div>
                    <div className="sf-serif text-[26px] font-semibold tracking-[0.01em] text-[#201914]">{summary ? formatPercent(summary.marginRate) : "—"}</div>
                </div>
            </div>

            <section className="rounded-2xl border border-[#ded2c3] bg-[#fffdf8] p-5 shadow-[0_8px_20px_rgba(35,28,20,0.05)]">
                <div className="sf-serif mb-4 flex items-center gap-2 text-[17px] font-semibold">
                    <ChartPie className="size-4 text-[#9b5b32]" />
                    按日对账
                </div>
                <Table<DayRow> rowKey="day" loading={loading} dataSource={rows} columns={columns} size="small" pagination={{ pageSize: 15, hideOnSinglePage: true, size: "small" }} />
            </section>
        </div>
    );
}
