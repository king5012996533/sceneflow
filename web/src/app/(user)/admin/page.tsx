"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { App, Button, Empty, Input, InputNumber, Select, Switch, Tabs, Tag, Tooltip } from "antd";
import { Ban, Boxes, CreditCard, Database, FileText, History, Settings, Shield, Users } from "lucide-react";

import { apiPath } from "@/lib/app-paths";
import { formatCny } from "@/lib/format";
import { useUserStore } from "@/stores/use-user-store";

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
    subscriptions: Array<{ planId?: string; plan?: { id: string; name: string } | null; status: string }>;
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
    plans: Array<{
        id: string;
        name: string;
        monthlyPrice: number;
        yearlyPrice: number;
        isActive: boolean;
        isPopular?: boolean;
        entitlements: Array<{ key: string; label: string; value: string; unit: string }>;
    }>;
    modelConfigs: Array<{ id: string; provider: string; model: string; displayName: string; type: string; enabled: boolean; isDefault: boolean }>;
    operationConfigs: Array<{ id: string; key: string; value: unknown; description: string }>;
};

type PlanEntitlementDraft = { key: string; label: string; value: string; unit: string };
type PlanDraft = {
    name: string;
    monthlyPrice: number;
    yearlyPrice: number;
    isActive: boolean;
    isPopular: boolean;
    entitlements: PlanEntitlementDraft[];
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
    const [config, setConfig] = useState<AdminConfig | null>(null);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [generationJobs, setGenerationJobs] = useState<GenerationJob[]>([]);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingAccess, setCheckingAccess] = useState(true);
    const [selectedPlans, setSelectedPlans] = useState<Record<string, string>>({});
    const [selectedCycles, setSelectedCycles] = useState<Record<string, "monthly" | "yearly">>({});
    const [planDrafts, setPlanDrafts] = useState<Record<string, PlanDraft>>({});

    async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
        const res = await fetch(url, init);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "请求失败");
        return json;
    }

    async function loadAll() {
        setLoading(true);
        try {
            const [overviewData, usersData, ordersData, configData, auditData, jobsData] = await Promise.all([
                requestJson<{ metrics: Overview }>(apiPath("/api/admin/overview")),
                requestJson<{ users: AdminUser[] }>(apiPath(`/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`)),
                requestJson<{ orders: AdminOrder[] }>(apiPath("/api/admin/orders")),
                requestJson<AdminConfig>(apiPath("/api/admin/configs")),
                requestJson<{ logs: AuditLog[] }>(apiPath("/api/admin/audit-log?take=50")),
                requestJson<{ jobs: GenerationJob[] }>(apiPath("/api/admin/generation-jobs?take=50")),
            ]);
            setOverview(overviewData.metrics);
            setUsers(usersData.users);
            setOrders(ordersData.orders);
            setConfig(configData);
            setAuditLogs(auditData.logs);
            setGenerationJobs(jobsData.jobs);
            setSelectedPlans(Object.fromEntries(usersData.users.map((user) => [user.id, user.subscriptions[0]?.plan?.id || "free"])));
            setSelectedCycles(Object.fromEntries(usersData.users.map((user) => [user.id, "monthly"])));
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
        if (!config) return;
        setPlanDrafts((prev) => {
            const next = { ...prev };
            for (const plan of config.plans) {
                if (!next[plan.id]) {
                    next[plan.id] = {
                        name: plan.name,
                        monthlyPrice: plan.monthlyPrice,
                        yearlyPrice: plan.yearlyPrice,
                        isActive: plan.isActive,
                        isPopular: plan.isPopular ?? false,
                        entitlements: plan.entitlements.map((item) => ({
                            key: item.key,
                            label: item.label,
                            value: item.value,
                            unit: item.unit,
                        })),
                    };
                }
            }
            return next;
        });
    }, [config]);

    useEffect(() => {
        if (checkingAccess) return;
        if (user?.role !== "admin") {
            message.error("没有管理员权限");
            router.replace("/canvas");
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

    function updatePlanDraft(planId: string, patch: Partial<PlanDraft>) {
        setPlanDrafts((prev) => {
            const draft = prev[planId];
            if (!draft) return prev;
            return { ...prev, [planId]: { ...draft, ...patch } };
        });
    }

    function updatePlanEntitlement(planId: string, index: number, patch: Partial<PlanEntitlementDraft>) {
        setPlanDrafts((prev) => {
            const draft = prev[planId];
            if (!draft) return prev;
            const entitlements = draft.entitlements.map((item, i) => (i === index ? { ...item, ...patch } : item));
            return { ...prev, [planId]: { ...draft, entitlements } };
        });
    }

    async function savePlan(planId: string) {
        const draft = planDrafts[planId];
        if (!draft) return;
        try {
            await requestJson(apiPath("/api/admin/configs"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "plan", planId, ...draft }),
            });
            message.success("套餐已保存，定价页立即生效");
            await loadAll();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "保存套餐失败");
        }
    }

    const planOptions = (config?.plans || []).map((plan) => ({ label: plan.name, value: plan.id }));

    if (checkingAccess || user?.role !== "admin") {
        return (
            <main className="grid h-full place-items-center bg-[#f5f5f2] px-6 text-stone-950">
                <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-stone-500 shadow-sm">正在校验管理员权限...</div>
            </main>
        );
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
                        <p className="mt-2 text-sm text-stone-500">内测阶段暂不接入在线收银台，管理员确认用户套餐后人工开通权益。</p>
                    </div>
                    <Button loading={loading} onClick={() => void loadAll()}>
                        刷新数据
                    </Button>
                </div>

                <div className="mb-4 grid gap-3 md:grid-cols-5">
                    <Metric icon={Users} label="用户" value={overview?.users ?? "-"} />
                    <Metric icon={Boxes} label="活跃订阅" value={overview?.activeSubscriptions ?? "-"} />
                    <Metric icon={CreditCard} label="已开通记录" value={overview?.paidOrders ?? "-"} />
                    <Metric icon={CreditCard} label="开通申请" value={overview?.pendingOrders ?? "-"} />
                    <Metric icon={Database} label="参考金额" value={overview ? formatCny(overview.revenue) : "-"} />
                </div>

                <Tabs
                    items={[
                        {
                            key: "users",
                            label: "用户管理",
                            children: (
                                <section className="rounded-lg border border-stone-200 bg-white p-5">
                                    <div className="mb-4 flex flex-wrap gap-3">
                                        <Input.Search value={query} onChange={(event) => setQuery(event.target.value)} onSearch={() => void loadAll()} placeholder="搜索邮箱、昵称、手机号" className="max-w-md" />
                                    </div>
                                    <DataTable empty={!users.length}>
                                        <thead className="border-b border-stone-200 text-stone-500">
                                            <tr>
                                                <th className="py-3 font-medium">用户</th>
                                                <th className="py-3 font-medium">注册时间</th>
                                                <th className="py-3 font-medium">角色</th>
                                                <th className="py-3 font-medium">当前套餐</th>
                                                <th className="py-3 font-medium">手动开通</th>
                                                <th className="py-3 font-medium">状态</th>
                                                <th className="py-3 font-medium">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => (
                                                <tr key={user.id} className="border-b border-stone-100 align-top">
                                                    <td className="py-3">
                                                        <div className="font-medium">{user.name || user.email}</div>
                                                        <div className="text-xs text-stone-500">{user.email}</div>
                                                        {user.phone ? <div className="text-xs text-stone-400">{user.phone}</div> : null}
                                                    </td>
                                                    <td className="py-3 text-sm text-stone-600">
                                                        <div>{formatDateTime(user.createdAt)}</div>
                                                        <div className="text-xs text-stone-400">{formatRelativeTime(user.createdAt)}</div>
                                                    </td>
                                                    <td className="py-3">
                                                        <Select
                                                            value={user.role}
                                                            options={[
                                                                { label: "user", value: "user" },
                                                                { label: "pro（无权益，请用套餐开通）", value: "pro", disabled: true },
                                                                { label: "admin", value: "admin" },
                                                            ]}
                                                            onChange={(role) => void updateUser(user.id, "role", { role })}
                                                            className="w-28"
                                                        />
                                                    </td>
                                                    <td className="py-3">{user.subscriptions[0]?.plan?.name || "未开通"}</td>
                                                    <td className="py-3">
                                                        <div className="flex flex-wrap gap-2">
                                                            <Select value={selectedPlans[user.id] || "free"} options={planOptions} onChange={(value) => setSelectedPlans((prev) => ({ ...prev, [user.id]: value }))} className="w-32" />
                                                            <Select
                                                                value={selectedCycles[user.id] || "monthly"}
                                                                options={[
                                                                    { label: "月度", value: "monthly" },
                                                                    { label: "年度", value: "yearly" },
                                                                ]}
                                                                onChange={(value) => setSelectedCycles((prev) => ({ ...prev, [user.id]: value }))}
                                                                className="w-24"
                                                            />
                                                            <Tooltip title="为用户开通所选套餐并创建订阅；用户刷新页面（或回到页面）后按新套餐生效">
                                                                <Button
                                                                    size="small"
                                                                    type="primary"
                                                                    onClick={() => {
                                                                        const planId = selectedPlans[user.id] || "free";
                                                                        const planName = planOptions.find((plan) => plan.value === planId)?.label || "免费版";
                                                                        void updateUser(user.id, "subscription", { planId, billingCycle: selectedCycles[user.id] || "monthly" }, `已开通「${planName}」订阅，刷新后生效`);
                                                                    }}
                                                                >
                                                                    开通·{planOptions.find((plan) => plan.value === (selectedPlans[user.id] || "free"))?.label || "免费版"}
                                                                </Button>
                                                            </Tooltip>
                                                        </div>
                                                    </td>
                                                    <td className="py-3">{user.bannedAt ? <Tag color="red">已封禁</Tag> : <Tag color="green">正常</Tag>}</td>
                                                    <td className="py-3">
                                                        <Button size="small" icon={<Ban className="size-3.5" />} onClick={() => void updateUser(user.id, user.bannedAt ? "unban" : "ban")}>
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
                            label: "开通申请",
                            children: (
                                <section className="rounded-lg border border-stone-200 bg-white p-5">
                                    <DataTable empty={!orders.length}>
                                        <thead className="border-b border-stone-200 text-stone-500">
                                            <tr>
                                                <th className="py-3 font-medium">记录号</th>
                                                <th className="py-3 font-medium">用户</th>
                                                <th className="py-3 font-medium">套餐</th>
                                                <th className="py-3 font-medium">参考金额</th>
                                                <th className="py-3 font-medium">来源</th>
                                                <th className="py-3 font-medium">时间</th>
                                                <th className="py-3 font-medium">状态</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.map((order) => (
                                                <tr key={order.id} className="border-b border-stone-100">
                                                    <td className="py-3 font-mono text-xs">{order.orderNo}</td>
                                                    <td className="py-3">{order.user.email}</td>
                                                    <td className="py-3">{order.plan.name}</td>
                                                    <td className="py-3">{formatCny(order.amount)}</td>
                                                    <td className="py-3">{order.provider === "manual" ? "开通申请" : order.provider}</td>
                                                    <td className="py-3 text-sm text-stone-600">
                                                        <div>{formatDateTime(order.createdAt)}</div>
                                                        <div className="text-xs text-stone-400">{formatRelativeTime(order.createdAt)}</div>
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
                            key: "projects",
                            label: "项目管理",
                            children: (
                                <section className="rounded-lg border border-stone-200 bg-white p-6">
                                    <Empty description="当前画布项目主要存储在前端/本地持久化，后续接入服务端 Project、CanvasSnapshot、AssetReference 后再做全局检索和异常排查。" />
                                </section>
                            ),
                        },
                        {
                            key: "audit",
                            label: "审计日志",
                            children: (
                                <section className="rounded-lg border border-stone-200 bg-white p-5">
                                    <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
                                        <History className="size-5" />
                                        管理员操作记录
                                    </div>
                                    <DataTable empty={!auditLogs.length}>
                                        <thead className="border-b border-stone-200 text-stone-500">
                                            <tr>
                                                <th className="py-3 font-medium">时间</th>
                                                <th className="py-3 font-medium">操作人</th>
                                                <th className="py-3 font-medium">操作</th>
                                                <th className="py-3 font-medium">目标</th>
                                                <th className="py-3 font-medium">目标ID</th>
                                                <th className="py-3 font-medium">详情</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {auditLogs.map((log) => (
                                                <tr key={log.id} className="border-b border-stone-100">
                                                    <td className="py-3 text-sm text-stone-600">{formatDateTime(log.createdAt)}</td>
                                                    <td className="py-3 text-sm">{log.actor?.email || "-"}</td>
                                                    <td className="py-3">
                                                        <Tag>{log.action}</Tag>
                                                    </td>
                                                    <td className="py-3 text-sm">{log.target}</td>
                                                    <td className="py-3 font-mono text-xs text-stone-500">{log.targetId.slice(0, 12)}...</td>
                                                    <td className="py-3 text-xs text-stone-400 max-w-[200px] truncate">{JSON.stringify(log.metadata)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </DataTable>
                                </section>
                            ),
                        },
                        {
                            key: "jobs",
                            label: "生成记录",
                            children: (
                                <section className="rounded-lg border border-stone-200 bg-white p-5">
                                    <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
                                        <FileText className="size-5" />
                                        AI 生成任务
                                    </div>
                                    <DataTable empty={!generationJobs.length}>
                                        <thead className="border-b border-stone-200 text-stone-500">
                                            <tr>
                                                <th className="py-3 font-medium">时间</th>
                                                <th className="py-3 font-medium">用户</th>
                                                <th className="py-3 font-medium">类型</th>
                                                <th className="py-3 font-medium">模型</th>
                                                <th className="py-3 font-medium">状态</th>
                                                <th className="py-3 font-medium">预览</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {generationJobs.map((job) => (
                                                <tr key={job.id} className="border-b border-stone-100">
                                                    <td className="py-3 text-sm text-stone-600">{formatDateTime(job.createdAt)}</td>
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
                                                                <img src={job.resultUrl} alt="生成结果" className="h-12 w-12 rounded object-cover border border-stone-200" />
                                                            </a>
                                                        ) : (
                                                            <span className="text-xs text-stone-400">-</span>
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
                            key: "configs",
                            label: "模型/运营配置",
                            children: (
                                <div className="grid gap-4 lg:grid-cols-2">
                                    <section className="rounded-lg border border-stone-200 bg-white p-5">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 text-lg font-semibold">
                                                <Settings className="size-5" />
                                                套餐权益
                                            </div>
                                            <span className="text-xs text-stone-400">修改保存后立即生效（定价页 / 开通均读取数据库）</span>
                                        </div>
                                        <div className="space-y-4">
                                            {(config?.plans || []).map((plan) => {
                                                const draft = planDrafts[plan.id];
                                                if (!draft) return null;
                                                return (
                                                    <div key={plan.id} className="rounded-md border border-stone-200 p-4">
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <Input value={draft.name} maxLength={40} onChange={(event) => updatePlanDraft(plan.id, { name: event.target.value })} className="w-36" />
                                                            <div className="flex items-center gap-2 text-sm text-stone-600">
                                                                <Switch size="small" checked={draft.isActive} onChange={(checked) => updatePlanDraft(plan.id, { isActive: checked })} />
                                                                上架
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-stone-600">
                                                                <Switch size="small" checked={draft.isPopular} onChange={(checked) => updatePlanDraft(plan.id, { isPopular: checked })} />
                                                                热门
                                                            </div>
                                                            <Button type="primary" size="small" className="ml-auto" onClick={() => void savePlan(plan.id)}>
                                                                保存
                                                            </Button>
                                                        </div>
                                                        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                                                            <div className="flex items-center gap-2 text-stone-600">
                                                                月度
                                                                <InputNumber min={0} precision={2} value={draft.monthlyPrice / 100} onChange={(value) => updatePlanDraft(plan.id, { monthlyPrice: Math.round((value ?? 0) * 100) })} className="w-28" />
                                                                <span className="text-stone-400">元</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-stone-600">
                                                                年度
                                                                <InputNumber min={0} precision={2} value={draft.yearlyPrice / 100} onChange={(value) => updatePlanDraft(plan.id, { yearlyPrice: Math.round((value ?? 0) * 100) })} className="w-28" />
                                                                <span className="text-stone-400">元</span>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 space-y-1.5">
                                                            {draft.entitlements.map((item, index) => (
                                                                <div key={item.key} className="flex items-center gap-2 text-sm">
                                                                    <span className="w-36 shrink-0 truncate text-stone-500" title={item.label}>
                                                                        {item.label}
                                                                    </span>
                                                                    <Input size="small" value={item.value} maxLength={100} onChange={(event) => updatePlanEntitlement(plan.id, index, { value: event.target.value })} className="w-24" />
                                                                    <Input size="small" value={item.unit} maxLength={10} onChange={(event) => updatePlanEntitlement(plan.id, index, { unit: event.target.value })} className="w-12" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
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
            <table className="w-full min-w-[980px] text-left text-sm">{children}</table>
        </div>
    );
}
