"use client";

import { useEffect, useState } from "react";
import { App, Button, Input, InputNumber, Select, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { Coins, Wallet } from "lucide-react";

import { apiPath } from "@/lib/app-paths";
import { formatCny } from "@/lib/format";

type AdminCreditTx = {
    id: string;
    type: string;
    amount: number;
    balanceAfter: number;
    note: string | null;
    createdAt: string;
    user: { id: string; email: string; name: string } | null;
};

type UserOption = { label: string; value: string };

const TYPE_META: Record<string, { label: string; color: string }> = {
    purchase: { label: "充值", color: "green" },
    grant: { label: "赠送", color: "blue" },
    consume: { label: "消耗", color: "default" },
    refund: { label: "退款", color: "cyan" },
    adjust: { label: "手动调整", color: "orange" },
    expire: { label: "过期", color: "default" },
};

/** 积分管理：全量流水查询 + 手动充/扣（Phase 5） */
export default function CreditsTab() {
    const { message } = App.useApp();
    const [transactions, setTransactions] = useState<AdminCreditTx[]>([]);
    const [totalBalance, setTotalBalance] = useState(0);
    const [loading, setLoading] = useState(false);
    const [userOptions, setUserOptions] = useState<UserOption[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | undefined>();
    const [typeFilter, setTypeFilter] = useState<string | undefined>();
    const [adjustAmount, setAdjustAmount] = useState<number | null>(100);
    const [adjustNote, setAdjustNote] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const query = new URLSearchParams();
            if (selectedUserId) query.set("userId", selectedUserId);
            if (typeFilter) query.set("type", typeFilter);
            query.set("take", "100");
            const res = await fetch(apiPath(`/api/admin/credits?${query.toString()}`), { cache: "no-store" });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "加载失败");
            setTransactions(json.transactions || []);
            setTotalBalance(json.totalBalance || 0);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "加载积分流水失败");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, [selectedUserId, typeFilter]);

    async function searchUsers(query: string) {
        if (!query.trim()) {
            setUserOptions([]);
            return;
        }
        try {
            const res = await fetch(apiPath(`/api/admin/users?q=${encodeURIComponent(query.trim())}`), { cache: "no-store" });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "搜索失败");
            setUserOptions((json.users || []).map((u: { id: string; email: string; name: string }) => ({ label: `${u.name || u.email}（${u.email}）`, value: u.id })));
        } catch (error) {
            message.error(error instanceof Error ? error.message : "搜索用户失败");
        }
    }

    async function submitAdjust() {
        if (!selectedUserId) {
            message.warning("请先选择用户");
            return;
        }
        const amount = Math.floor(Number(adjustAmount) || 0);
        if (!amount) {
            message.warning("调整积分数不能为 0");
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(apiPath("/api/admin/credits"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: selectedUserId, amount, note: adjustNote.trim() }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "调整失败");
            message.success(`调整成功，该用户当前余额 ${json.balance} 积分`);
            setAdjustNote("");
            await load();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "调整积分失败");
        } finally {
            setSubmitting(false);
        }
    }

    const columns: TableColumnsType<AdminCreditTx> = [
        {
            title: "时间",
            dataIndex: "createdAt",
            width: 170,
            render: (value: string) => new Date(value).toLocaleString("zh-CN", { hour12: false }),
        },
        {
            title: "用户",
            dataIndex: "user",
            render: (user: AdminCreditTx["user"]) => (user ? `${user.name || user.email}` : "—"),
        },
        {
            title: "类型",
            dataIndex: "type",
            width: 90,
            render: (value: string) => {
                const meta = TYPE_META[value] || { label: value, color: "default" };
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
            render: (value: string | null) => (value ? <span className="text-stone-500">{value}</span> : "—"),
        },
    ];

    return (
        <div className="space-y-4">
            <section className="rounded-lg border border-stone-200 bg-white p-5">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                        <Wallet className="size-5" />
                        手动充 / 扣
                    </div>
                    <span className="text-xs text-stone-400">所有调整写入 adjust 流水，可在下方审计</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Select
                        showSearch
                        filterOption={false}
                        onSearch={searchUsers}
                        onClear={() => setSelectedUserId(undefined)}
                        placeholder="搜索并选择用户（邮箱/昵称）"
                        options={userOptions}
                        value={selectedUserId}
                        onChange={setSelectedUserId}
                        className="w-72"
                        allowClear
                    />
                    <InputNumber
                        value={adjustAmount}
                        onChange={setAdjustAmount}
                        placeholder="积分数（正=充值，负=扣减）"
                        className="w-44"
                    />
                    <Input value={adjustNote} onChange={(event) => setAdjustNote(event.target.value)} placeholder="备注（可选）" maxLength={200} className="w-64" />
                    <Button type="primary" loading={submitting} onClick={() => void submitAdjust()}>
                        确认调整
                    </Button>
                </div>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                        <Coins className="size-5" />
                        积分流水
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <span className="text-stone-500">
                            全体用户余额合计：<span className="font-semibold text-stone-800">{totalBalance.toLocaleString("zh-CN")} 积分</span>
                        </span>
                        <Select
                            value={typeFilter}
                            onChange={setTypeFilter}
                            placeholder="全部类型"
                            allowClear
                            options={Object.entries(TYPE_META).map(([value, meta]) => ({ label: meta.label, value }))}
                            className="w-32"
                        />
                    </div>
                </div>
                <Table<AdminCreditTx> rowKey="id" loading={loading} dataSource={transactions} columns={columns} size="small" pagination={{ pageSize: 20, hideOnSinglePage: true, size: "small" }} />
            </section>
        </div>
    );
}
