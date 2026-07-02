"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { App, Button, Empty, Input, Select, Tabs, Tag } from "antd";
import { Ban, Boxes, CreditCard, Database, Settings, Shield, Users } from "lucide-react";

import { apiPath } from "@/lib/app-paths";

type Overview = {
    users: number;
    activeSubscriptions: number;
    paidOrders: number;
    pendingOrders: number;
    revenue: number;
};

type AdminUser = {
    id: string;
    email: string;
    name: string;
    phone?: string | null;
    role: string;
    bannedAt?: string | null;
    banReason?: string | null;
    createdAt: string;
    subscriptions: Array<{ plan?: { name: string } | null; status: string }>;
};

type AdminOrder = {
    id: string;
    orderNo: string;
    amount: number;
    status: string;
    provider: string;
    createdAt: string;
    user: { email: string; name: string };
    plan: { name: string };
};

type AdminConfig = {
    plans: Array<{ id: string; name: string; monthlyPrice: number; yearlyPrice: number; isActive: boolean; entitlements: Array<{ label: string; value: string; unit: string }> }>;
    modelConfigs: Array<{ id: string; provider: string; model: string; displayName: string; type: string; enabled: boolean; isDefault: boolean }>;
    operationConfigs: Array<{ id: string; key: string; value: unknown; description: string }>;
};

function formatPrice(amount: number) {
    return `¥${(amount / 100).toLocaleString("zh-CN", { maximumFractionDigits: 0 })}`;
}

export default function AdminPage() {
    const { message } = App.useApp();
    const [overview, setOverview] = useState<Overview | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [config, setConfig] = useState<AdminConfig | null>(null);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);

    async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
        const res = await fetch(url, init);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "请求失败");
        return json;
    }

    async function loadAll() {
        setLoading(true);
        try {
            const [overviewData, usersData, ordersData, configData] = await Promise.all([
                requestJson<{ metrics: Overview }>(apiPath("/api/admin/overview")),
                requestJson<{ users: AdminUser[] }>(apiPath(`/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`)),
                requestJson<{ orders: AdminOrder[] }>(apiPath("/api/admin/orders")),
                requestJson<AdminConfig>(apiPath("/api/admin/configs")),
            ]);
            setOverview(overviewData.metrics);
            setUsers(usersData.users);
            setOrders(ordersData.orders);
            setConfig(configData);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "加载后台失败");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadAll();
    }, []);

    async function updateUser(userId: string, action: string, payload: Record<string, unknown> = {}) {
        try {
            await requestJson(apiPath("/api/admin/users"), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, action, ...payload }),
            });
            message.success("用户已更新");
            await loadAll();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "更新用户失败");
        }
    }

    async function updateOrder(orderId: string, status: string) {
        try {
            await requestJson(apiPath("/api/admin/orders"), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, status }),
            });
            message.success("订单已更新");
            await loadAll();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "更新订单失败");
        }
    }

    return (
        <main className="h-full overflow-y-auto bg-[#f5f5f2] px-6 py-8 text-stone-950">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-stone-400">
                            <Shield className="size-4" />
                            ADMIN
                        </div>
                        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">管理后台</h1>
                    </div>
                    <Button loading={loading} onClick={() => void loadAll()}>
                        刷新数据
                    </Button>
                </div>

                <div className="mb-4 grid gap-3 md:grid-cols-5">
                    <Metric icon={Users} label="用户" value={overview?.users ?? "-"} />
                    <Metric icon={Boxes} label="活跃订阅" value={overview?.activeSubscriptions ?? "-"} />
                    <Metric icon={CreditCard} label="已支付订单" value={overview?.paidOrders ?? "-"} />
                    <Metric icon={CreditCard} label="待支付订单" value={overview?.pendingOrders ?? "-"} />
                    <Metric icon={Database} label="收入" value={overview ? formatPrice(overview.revenue) : "-"} />
                </div>

                <Tabs
                    items={[
                        {
                            key: "users",
                            label: "用户管理",
                            children: (
                                <section className="rounded-lg border border-stone-200 bg-white p-5">
                                    <div className="mb-4 flex flex-wrap gap-3">
                                        <Input.Search
                                            value={query}
                                            onChange={(event) => setQuery(event.target.value)}
                                            onSearch={() => void loadAll()}
                                            placeholder="搜索邮箱、昵称、手机号"
                                            className="max-w-md"
                                        />
                                    </div>
                                    <DataTable empty={!users.length}>
                                        <thead className="border-b border-stone-200 text-stone-500">
                                            <tr>
                                                <th className="py-3 font-medium">用户</th>
                                                <th className="py-3 font-medium">角色</th>
                                                <th className="py-3 font-medium">套餐</th>
                                                <th className="py-3 font-medium">状态</th>
                                                <th className="py-3 font-medium">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => (
                                                <tr key={user.id} className="border-b border-stone-100">
                                                    <td className="py-3">
                                                        <div className="font-medium">{user.name || user.email}</div>
                                                        <div className="text-xs text-stone-500">{user.email}</div>
                                                    </td>
                                                    <td className="py-3">
                                                        <Select
                                                            value={user.role}
                                                            options={[
                                                                { label: "user", value: "user" },
                                                                { label: "pro", value: "pro" },
                                                                { label: "admin", value: "admin" },
                                                            ]}
                                                            onChange={(role) => void updateUser(user.id, "role", { role })}
                                                            className="w-28"
                                                        />
                                                    </td>
                                                    <td className="py-3">{user.subscriptions[0]?.plan?.name || "无"}</td>
                                                    <td className="py-3">{user.bannedAt ? <Tag color="red">已封禁</Tag> : <Tag color="green">正常</Tag>}</td>
                                                    <td className="py-3">
                                                        <Button
                                                            size="small"
                                                            icon={<Ban className="size-3.5" />}
                                                            onClick={() => void updateUser(user.id, user.bannedAt ? "unban" : "ban")}
                                                        >
                                                            {user.bannedAt ? "解封" : "封禁"}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </DataTable>
                                </section>
                            ),
                        },
                        {
                            key: "orders",
                            label: "订单管理",
                            children: (
                                <section className="rounded-lg border border-stone-200 bg-white p-5">
                                    <DataTable empty={!orders.length}>
                                        <thead className="border-b border-stone-200 text-stone-500">
                                            <tr>
                                                <th className="py-3 font-medium">订单号</th>
                                                <th className="py-3 font-medium">用户</th>
                                                <th className="py-3 font-medium">套餐</th>
                                                <th className="py-3 font-medium">金额</th>
                                                <th className="py-3 font-medium">渠道</th>
                                                <th className="py-3 font-medium">状态</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.map((order) => (
                                                <tr key={order.id} className="border-b border-stone-100">
                                                    <td className="py-3 font-mono text-xs">{order.orderNo}</td>
                                                    <td className="py-3">{order.user.email}</td>
                                                    <td className="py-3">{order.plan.name}</td>
                                                    <td className="py-3">{formatPrice(order.amount)}</td>
                                                    <td className="py-3">{order.provider}</td>
                                                    <td className="py-3">
                                                        <Select
                                                            value={order.status}
                                                            options={["pending", "paid", "cancelled", "failed", "refunded"].map((value) => ({ label: value, value }))}
                                                            onChange={(status) => void updateOrder(order.id, status)}
                                                            className="w-32"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </DataTable>
                                </section>
                            ),
                        },
                        {
                            key: "projects",
                            label: "项目管理",
                            children: (
                                <section className="rounded-lg border border-stone-200 bg-white p-6">
                                    <Empty
                                        description="当前画布项目主要存储在前端/本地持久化，尚未接入服务端项目表。后续需要新增 Project、CanvasSnapshot、AssetReference 后才能做全局检索和异常排查。"
                                    />
                                </section>
                            ),
                        },
                        {
                            key: "configs",
                            label: "模型/运营配置",
                            children: (
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <section className="rounded-lg border border-stone-200 bg-white p-5">
                                        <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
                                            <Settings className="size-5" />
                                            套餐权益
                                        </div>
                                        <div className="space-y-3">
                                            {config?.plans.map((plan) => (
                                                <div key={plan.id} className="rounded-md border border-stone-200 p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="font-medium">{plan.name}</div>
                                                        <Tag>{plan.isActive ? "上架" : "下架"}</Tag>
                                                    </div>
                                                    <div className="mt-2 text-sm text-stone-500">
                                                        月付 {formatPrice(plan.monthlyPrice)} / 年付 {formatPrice(plan.yearlyPrice)}
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {plan.entitlements.map((item) => (
                                                            <Tag key={`${plan.id}-${item.label}`}>{`${item.label}: ${item.value}${item.unit}`}</Tag>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                    <section className="rounded-lg border border-stone-200 bg-white p-5">
                                        <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
                                            <Settings className="size-5" />
                                            模型与运营配置
                                        </div>
                                        {config?.modelConfigs.length ? (
                                            <div className="space-y-3">
                                                {config.modelConfigs.map((item) => (
                                                    <div key={item.id} className="rounded-md border border-stone-200 p-4 text-sm">
                                                        <div className="font-medium">{item.displayName}</div>
                                                        <div className="mt-1 text-stone-500">
                                                            {item.provider} / {item.model} / {item.type}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <Empty description="暂无模型配置，可通过 /api/admin/configs 写入。" />
                                        )}
                                    </section>
                                </div>
                            ),
                        },
                    ]}
                />
            </div>
        </main>
    );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) {
    return (
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm text-stone-500">
                <Icon className="size-4" />
                {label}
            </div>
            <div className="text-2xl font-semibold tracking-tight">{value}</div>
        </div>
    );
}

function DataTable({ children, empty }: { children: ReactNode; empty: boolean }) {
    if (empty) return <Empty description="暂无数据" />;
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">{children}</table>
        </div>
    );
}
