"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { App, Button, ConfigProvider, Empty, Input, Select, Tabs, Tag } from "antd";
import { Ban, Coins, CreditCard, FileText, History, Shield, TrendingUp, Users } from "lucide-react";

import { apiPath } from "@/lib/app-paths";
import { formatCny } from "@/lib/format";
import { useUserStore } from "@/stores/use-user-store";
import { adminTheme } from "./admin-theme";
import CredentialsTab from "./credentials-tab";
import CreditsTab from "./credits-tab";
import CostsTab from "./costs-tab";
import OperationConfigTab from "./operation-config-tab";

type Overview = {
    users: number;
    paidOrders: number;
    pendingOrders: number;
    revenue: number;
    creditBalanceSum: number;
    creditsConsumed: number;
    creditsPurchased: number;
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
};

type AdminOrder = {
    id: string;
    orderNo: string;
    amount: number;
    status: string;
    provider: string;
    createdAt: string;
    user: { email: string; name: string };
    package: { name: string } | null;
};

type AuditLog = {
    id: string;
    actor: { email: string; name: string } | null;
    action: string;
    target: string;
    targetId: string;
    metadata: unknown;
    createdAt: string;
};

type GenerationJob = {
    id: string;
    user: { email: string; name: string } | null;
    status: string;
    kind: string;
    metadata: Record<string, unknown> | null;
    resultUrl: string | null;
    createdAt: string;
};

function formatDateTime(value?: string | null) {
    if (!value) return "-";
    return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function formatRelativeTime(value?: string | null) {
    if (!value) return "";
    const diffMs = Date.now() - new Date(value).getTime();
    if (!Number.isFinite(diffMs)) return "";
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "刚刚注册";
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} 天前`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} 个月前`;
    return `${Math.floor(months / 12)} 年前`;
}

export default function AdminPage() {
    const router = useRouter();
    const { message } = App.useApp();
    const user = useUserStore((state) => state.user);
    const fetchSession = useUserStore((state) => state.fetchSession);
    const [overview, setOverview] = useState<Overview | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingAccess, setCheckingAccess] = useState(true);

    async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
        const res = await fetch(url, init);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "请求失败");
        return json;
    }

    async function loadAll() {
        setLoading(true);
        try {
            const [overviewData, usersData, ordersData, auditData, jobsData] = await Promise.all([
                requestJson<{ metrics: Overview }>(apiPath("/api/admin/overview")),
                requestJson<{ users: AdminUser[] }>(apiPath(`/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`)),
                requestJson<{ orders: AdminOrder[] }>(apiPath("/api/admin/orders")),
                requestJson<{ logs: AuditLog[] }>(apiPath("/api/admin/audit-log?take=50")),
                requestJson<{ jobs: GenerationJob[] }>(apiPath("/api/admin/generation-jobs?take=50")),
            ]);
            setOverview(overviewData.metrics);
            setUsers(usersData.users);
            setOrders(ordersData.orders);
            setAuditLogs(auditData.logs);
            setGenerationJobs(jobsData.jobs);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "加载后台失败");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        let mounted = true;

        async function checkAccess() {
            await fetchSession();
            if (mounted) setCheckingAccess(false);
        }

        void checkAccess();
        return () => {
            mounted = false;
        };
    }, [fetchSession]);

    useEffect(() => {
        if (checkingAccess) return;
        if (user?.role !== "admin") {
            message.error("没有管理员权限");
            router.replace("/canvas/canvas");
            return;
        }
        void loadAll();
    }, [checkingAccess, user?.role]);

    async function updateUser(userId: string, action: string, payload: Record<string, unknown> = {}, successText?: string) {
        try {
            await requestJson(apiPath("/api/admin/users"), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, action, ...payload }),
            });
            message.success(successText || "用户已更新");
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
            message.success("记录已更新");
            await loadAll();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "更新记录失败");
        }
    }

    if (checkingAccess || user?.role !== "admin") {
        return (
            <main className="grid h-full place-items-center bg-[#f4f6f2] px-6">
                <div className="rounded-xl border border-[#dde2dc] bg-[#ffffff] p-6 text-sm text-[#67726b] shadow-sm">正在校验管理员权限...</div>
            </main>
        );
    }

    const pendingOrders = overview?.pendingOrders ?? 0;

    return (
        <ConfigProvider theme={adminTheme}>
            <main className="h-full overflow-y-auto bg-[#f4f6f2] px-6 py-8 text-[#2a3330]">
                <div className="mx-auto max-w-[1180px]">
                    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <div className="mb-2.5 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[#a0713f]">
                                <Shield className="size-3.5" />
                                ADMIN · 控制台
                            </div>
                            <h1 className="sf-serif text-[30px] font-semibold tracking-[0.01em] text-[#2a3330]">管理后台</h1>
                            <p className="mt-2 max-w-[520px] text-[13px] leading-relaxed text-[#67726b]">内测期间订单由管理员人工确认后入账，待处理订单会以红点标注。</p>
                        </div>
                        <Button loading={loading} onClick={() => void loadAll()} className="!border-[#dde2dc] !bg-[#ffffff] !text-[#2a3330]">
                            刷新数据
                        </Button>
                    </div>

                    <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                        <Metric icon={Users} label="用户总数" value={overview?.users?.toLocaleString("zh-CN") ?? "-"} caption="注册用户累计" />
                        <Metric icon={CreditCard} label="待处理订单" value={overview?.pendingOrders ?? "-"} caption="需人工确认入账" />
                        <Metric icon={TrendingUp} label="累计收入 · 参考" value={overview ? formatCny(overview.revenue) : "-"} caption="按订单金额估算" />
                        <Metric icon={Coins} label="积分余额合计" value={overview ? overview.creditBalanceSum.toLocaleString("zh-CN") : "-"} caption="全体用户累计" />
                    </div>

                    <Tabs
                        defaultActiveKey="users"
                        items={[
                            {
                                key: "users",
                                label: "用户管理",
                                children: (
                                    <section className="rounded-2xl border border-[#dde2dc] bg-[#ffffff] p-5 shadow-[0_8px_20px_rgba(35,28,20,0.05)]">
                                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                            <div className="sf-serif flex items-center gap-2 text-[17px] font-semibold">
                                                <Users className="size-4 text-[#a0713f]" />
                                                用户列表
                                            </div>
                                            <Input.Search value={query} onChange={(event) => setQuery(event.target.value)} onSearch={() => void loadAll()} placeholder="搜索邮箱、昵称、手机号" className="max-w-md" />
                                        </div>
                                        <DataTable empty={!users.length}>
                                            <thead>
                                                <tr>
                                                    <th className="py-3">用户</th>
                                                    <th className="py-3">注册时间</th>
                                                    <th className="py-3">角色</th>
                                                    <th className="py-3">状态</th>
                                                    <th className="py-3">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="py-3">
                                                            <div className="flex items-center gap-3">
                                                                <span className="sf-serif flex size-[30px] shrink-0 items-center justify-center rounded-[9px] bg-[#a0713f] text-[14px] font-semibold text-[#ffffff]">
                                                                    {(item.name || item.email || "U").slice(0, 1).toUpperCase()}
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <div className="font-medium text-[#2a3330]">{item.name || item.email}</div>
                                                                    <div className="text-xs text-[#67726b]">{item.email}</div>
                                                                    {item.phone ? <div className="text-[11px] text-[#9aa49e]">{item.phone}</div> : null}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-sm text-[#3c4742]">
                                                            <div>{formatDateTime(item.createdAt)}</div>
                                                            <div className="text-xs text-[#9aa49e]">{formatRelativeTime(item.createdAt)}</div>
                                                        </td>
                                                        <td className="py-3">
                                                            <Select
                                                                value={item.role}
                                                                options={[
                                                                    { label: "user", value: "user" },
                                                                    { label: "admin", value: "admin" },
                                                                ]}
                                                                onChange={(role) => void updateUser(item.id, "role", { role })}
                                                                className="w-28"
                                                            />
                                                        </td>
                                                        <td className="py-3">{item.bannedAt ? <Tag color="red">已封禁</Tag> : <Tag color="green">正常</Tag>}</td>
                                                        <td className="py-3">
                                                            <Button size="small" icon={<Ban className="size-3.5" />} onClick={() => void updateUser(item.id, item.bannedAt ? "unban" : "ban")}>
                                                                {item.bannedAt ? "解封" : "封禁"}
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
                                label: (
                                    <span className="inline-flex items-center gap-1.5">
                                        {pendingOrders > 0 ? <span aria-hidden="true" className="size-1.5 rounded-full bg-[#c2412e]" /> : null}
                                        订单管理
                                    </span>
                                ),
                                children: (
                                    <section className="rounded-2xl border border-[#dde2dc] bg-[#ffffff] p-5 shadow-[0_8px_20px_rgba(35,28,20,0.05)]">
                                        <div className="sf-serif mb-4 flex items-center gap-2 text-[17px] font-semibold">
                                            <CreditCard className="size-4 text-[#a0713f]" />
                                            订单列表
                                            {pendingOrders > 0 ? <Tag color="red">{pendingOrders} 笔待处理</Tag> : null}
                                        </div>
                                        <DataTable empty={!orders.length}>
                                            <thead>
                                                <tr>
                                                    <th className="py-3">记录号</th>
                                                    <th className="py-3">用户</th>
                                                    <th className="py-3">积分包</th>
                                                    <th className="py-3">金额</th>
                                                    <th className="py-3">来源</th>
                                                    <th className="py-3">时间</th>
                                                    <th className="py-3">状态</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orders.map((order) => (
                                                    <tr key={order.id}>
                                                        <td className="py-3 font-mono text-xs">{order.orderNo}</td>
                                                        <td className="py-3">
                                                            <div className="font-medium">{order.user.name || order.user.email}</div>
                                                            <div className="text-xs text-[#67726b]">{order.user.email}</div>
                                                        </td>
                                                        <td className="py-3">{order.package?.name || "—"}</td>
                                                        <td className="py-3">{formatCny(order.amount)}</td>
                                                        <td className="py-3">{order.provider === "manual" ? "人工确认" : order.provider}</td>
                                                        <td className="py-3 text-sm text-[#3c4742]">
                                                            <div>{formatDateTime(order.createdAt)}</div>
                                                            <div className="text-xs text-[#9aa49e]">{formatRelativeTime(order.createdAt)}</div>
                                                        </td>
                                                        <td className="py-3">
                                                            <Select
                                                                value={order.status}
                                                                options={[
                                                                    { label: "待处理", value: "pending" },
                                                                    { label: "已开通", value: "paid" },
                                                                    { label: "已取消", value: "cancelled" },
                                                                    { label: "失败", value: "failed" },
                                                                    { label: "已退款", value: "refunded" },
                                                                ]}
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
                                key: "credits",
                                label: "积分管理",
                                children: <CreditsTab />,
                            },
                            {
                                key: "jobs",
                                label: "生成记录",
                                children: (
                                    <section className="rounded-2xl border border-[#dde2dc] bg-[#ffffff] p-5 shadow-[0_8px_20px_rgba(35,28,20,0.05)]">
                                        <div className="sf-serif mb-4 flex items-center gap-2 text-[17px] font-semibold">
                                            <FileText className="size-4 text-[#a0713f]" />
                                            AI 生成任务
                                        </div>
                                        <DataTable empty={!generationJobs.length}>
                                            <thead>
                                                <tr>
                                                    <th className="py-3">时间</th>
                                                    <th className="py-3">用户</th>
                                                    <th className="py-3">类型</th>
                                                    <th className="py-3">模型</th>
                                                    <th className="py-3">状态</th>
                                                    <th className="py-3">预览</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {generationJobs.map((job) => (
                                                    <tr key={job.id}>
                                                        <td className="py-3 text-sm text-[#3c4742]">{formatDateTime(job.createdAt)}</td>
                                                        <td className="py-3 text-sm">{job.user?.email || "-"}</td>
                                                        <td className="py-3">
                                                            <Tag>{job.kind}</Tag>
                                                        </td>
                                                        <td className="py-3 text-sm">{String(job.metadata?.model || job.metadata?.imageModel || job.metadata?.videoModel || "-")}</td>
                                                        <td className="py-3">
                                                            <Tag color={job.status === "succeeded" ? "green" : job.status === "failed" ? "red" : "blue"}>{job.status}</Tag>
                                                        </td>
                                                        <td className="py-3">
                                                            {job.resultUrl ? (
                                                                <a href={job.resultUrl} target="_blank" rel="noopener noreferrer">
                                                                    <img src={job.resultUrl} alt="生成结果" className="h-12 w-12 rounded border border-[#dde2dc] object-cover" />
                                                                </a>
                                                            ) : (
                                                                <span className="text-xs text-[#9aa49e]">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </DataTable>
                                    </section>
                                ),
                            },
                            {
                                key: "audit",
                                label: "审计日志",
                                children: (
                                    <section className="rounded-2xl border border-[#dde2dc] bg-[#ffffff] p-5 shadow-[0_8px_20px_rgba(35,28,20,0.05)]">
                                        <div className="sf-serif mb-4 flex items-center gap-2 text-[17px] font-semibold">
                                            <History className="size-4 text-[#a0713f]" />
                                            管理员操作记录
                                        </div>
                                        <DataTable empty={!auditLogs.length}>
                                            <thead>
                                                <tr>
                                                    <th className="py-3">时间</th>
                                                    <th className="py-3">操作人</th>
                                                    <th className="py-3">操作</th>
                                                    <th className="py-3">目标</th>
                                                    <th className="py-3">目标ID</th>
                                                    <th className="py-3">详情</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {auditLogs.map((log) => (
                                                    <tr key={log.id}>
                                                        <td className="py-3 text-sm text-[#3c4742]">{formatDateTime(log.createdAt)}</td>
                                                        <td className="py-3 text-sm">{log.actor?.email || "-"}</td>
                                                        <td className="py-3">
                                                            <Tag>{log.action}</Tag>
                                                        </td>
                                                        <td className="py-3 text-sm">{log.target}</td>
                                                        <td className="py-3 font-mono text-xs text-[#67726b]">{log.targetId.slice(0, 12)}...</td>
                                                        <td className="max-w-[200px] truncate py-3 text-xs text-[#9aa49e]">{JSON.stringify(log.metadata)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </DataTable>
                                    </section>
                                ),
                            },
                            {
                                key: "credentials",
                                label: "平台密钥",
                                children: <CredentialsTab />,
                            },
                            {
                                key: "operation-config",
                                label: "运营配置",
                                children: <OperationConfigTab />,
                            },
                            {
                                key: "costs",
                                label: "对账",
                                children: <CostsTab />,
                            },
                        ]}
                    />
                </div>
            </main>
        </ConfigProvider>
    );
}

function Metric({ icon: Icon, label, value, caption }: { icon: typeof Users; label: string; value: string | number; caption: string }) {
    return (
        <div className="rounded-2xl border border-[#dde2dc] bg-[#ffffff] p-4 shadow-[0_8px_20px_rgba(35,28,20,0.05)]">
            <div className="mb-2.5 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#67726b]">
                <Icon className="size-3.5 text-[#a0713f]" />
                {label}
            </div>
            <div className="sf-serif text-[26px] font-semibold tracking-[0.01em] text-[#2a3330]">{value}</div>
            <div className="mt-1 text-[11px] text-[#9aa49e]">{caption}</div>
        </div>
    );
}

function DataTable({ children, empty }: { children: ReactNode; empty: boolean }) {
    if (empty) return <Empty description="暂无数据" />;
    return (
        <div className="overflow-x-auto">
            <table className="admin-tbl w-full min-w-[980px] text-left text-sm">{children}</table>
        </div>
    );
}
