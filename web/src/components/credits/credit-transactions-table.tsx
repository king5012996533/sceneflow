"use client";

import { useEffect, useState } from "react";
import { Empty, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { apiPath } from "@/lib/app-paths";

type CreditTransaction = {
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    refType: string | null;
    refId: string | null;
    note: string | null;
    createdAt: string;
};

const TYPE_META: Record<string, { label: string; color: string }> = {
    purchase: { label: "充值", color: "green" },
    grant: { label: "赠送", color: "blue" },
    consume: { label: "消耗", color: "default" },
    refund: { label: "退款", color: "cyan" },
    adjust: { label: "调整", color: "orange" },
    expire: { label: "过期", color: "default" },
};

function typeMeta(type: string) {
    return TYPE_META[type] || { label: type, color: "default" };
}

/** 积分流水列表（账单页用，数据来自 /api/billing/credits） */
export function CreditTransactionsTable({ limit = 20 }: { limit?: number }) {
    const [rows, setRows] = useState<CreditTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        void fetch(apiPath(`/api/billing/credits?take=${limit}`), { credentials: "include", cache: "no-store" })
            .then((res) => res.json())
            .then((data) => {
                if (!cancelled) setRows(data?.transactions || []);
            })
            .catch(() => {
                if (!cancelled) setRows([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [limit]);

    const columns: TableColumnsType<CreditTransaction> = [
        {
            title: "时间",
            dataIndex: "createdAt",
            width: 170,
            render: (value: string) => new Date(value).toLocaleString("zh-CN"),
        },
        {
            title: "类型",
            dataIndex: "type",
            width: 80,
            render: (value: string) => {
                const meta = typeMeta(value);
                return <Tag color={meta.color}>{meta.label}</Tag>;
            },
        },
        {
            title: "变动",
            dataIndex: "amount",
            width: 100,
            align: "right",
            render: (value: number) => (
                <span className={value > 0 ? "font-medium text-emerald-600" : value < 0 ? "font-medium text-rose-500" : undefined}>
                    {value > 0 ? `+${value}` : value}
                </span>
            ),
        },
        {
            title: "余额",
            dataIndex: "balanceAfter",
            width: 90,
            align: "right",
        },
        {
            title: "备注",
            dataIndex: "note",
            ellipsis: true,
            render: (value: string | null) => (value ? <span className="text-[#667085]">{value}</span> : "—"),
        },
    ];

    return (
        <Table<CreditTransaction>
            rowKey="id"
            loading={loading}
            dataSource={rows}
            columns={columns}
            size="small"
            locale={{ emptyText: <Empty description="暂无积分流水" /> }}
            pagination={rows.length > 10 ? { pageSize: 10, hideOnSinglePage: true, size: "small" } : false}
        />
    );
}
