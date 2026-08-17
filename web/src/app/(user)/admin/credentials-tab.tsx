"use client";

import { useEffect, useState } from "react";
import { App, Button, Input, Modal, Select, Space, Switch, Table, Tag, Tooltip } from "antd";
import { KeyRound, Plus, RefreshCw, Trash2 } from "lucide-react";

import { apiPath } from "@/lib/app-paths";

type Credential = {
    id: string;
    name: string;
    provider: string;
    baseUrl: string;
    apiKeyMasked: string;
    models: string[];
    enabled: boolean;
    priority: number;
    createdAt: string;
    updatedAt: string;
};

const PROVIDER_PRESETS = [
    { label: "OpenAI", value: "openai" },
    { label: "MiniMax", value: "minimax" },
    { label: "Seedance / 火山", value: "seedance" },
    { label: "Replicate", value: "replicate" },
    { label: "Gemini", value: "gemini" },
    { label: "DeepSeek", value: "deepseek" },
];

export default function CredentialsTab() {
    const { message } = App.useApp();
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: "",
        provider: "openai",
        baseUrl: "",
        apiKey: "",
        models: "",
        priority: 0,
    });

    async function load() {
        setLoading(true);
        try {
            const res = await fetch(apiPath("/api/admin/credentials"));
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "加载失败");
            setCredentials(json.credentials || []);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "加载平台密钥失败");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void load();
    }, []);

    async function create() {
        if (!form.name.trim() || !form.provider.trim() || !form.baseUrl.trim() || !form.apiKey.trim()) {
            message.error("名称、供应商、Base URL、API Key 均为必填");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(apiPath("/api/admin/credentials"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    models: form.models
                        .split(/[,，\s]+/)
                        .map((m) => m.trim())
                        .filter(Boolean),
                    priority: Number(form.priority) || 0,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "新增失败");
            message.success("平台密钥已添加");
            setModalOpen(false);
            setForm({ name: "", provider: "openai", baseUrl: "", apiKey: "", models: "", priority: 0 });
            await load();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "新增平台密钥失败");
        } finally {
            setSaving(false);
        }
    }

    async function patch(id: string, body: Record<string, unknown>, successText: string) {
        try {
            const res = await fetch(apiPath("/api/admin/credentials"), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, ...body }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "更新失败");
            message.success(successText);
            await load();
        } catch (error) {
            message.error(error instanceof Error ? error.message : "更新失败");
        }
    }

    async function remove(id: string, name: string) {
        Modal.confirm({
            title: `删除平台密钥「${name}」？`,
            content: "删除后该地址的代理请求将回退到 BYOK 或失败。此操作不可撤销。",
            okText: "删除",
            okButtonProps: { danger: true },
            cancelText: "取消",
            onOk: async () => {
                try {
                    const res = await fetch(apiPath(`/api/admin/credentials?id=${encodeURIComponent(id)}`), { method: "DELETE" });
                    const json = await res.json();
                    if (!res.ok) throw new Error(json.error || "删除失败");
                    message.success("已删除");
                    await load();
                } catch (error) {
                    message.error(error instanceof Error ? error.message : "删除失败");
                }
            },
        });
    }

    return (
        <section className="rounded-lg border border-stone-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-lg font-semibold">
                    <KeyRound className="size-5" />
                    平台密钥
                </div>
                <div className="flex items-center gap-2">
                    <Tooltip title="刷新列表">
                        <Button icon={<RefreshCw className="size-3.5" />} onClick={() => void load()} />
                    </Tooltip>
                    <Button type="primary" icon={<Plus className="size-3.5" />} onClick={() => setModalOpen(true)}>
                        添加密钥
                    </Button>
                </div>
            </div>
            <p className="mb-4 text-xs leading-5 text-stone-400">平台统一配置上游 API Key（AES-256-GCM 加密存储，明文永不进客户端）。 代理按目标地址匹配注入；多个凭证按优先级取用。设置后约 30 秒内生效（进程内缓存）。</p>

            <Table<Credential>
                rowKey="id"
                size="small"
                loading={loading}
                dataSource={credentials}
                pagination={false}
                locale={{ emptyText: "暂无平台密钥，点击右上角「添加密钥」配置第一个。" }}
                columns={[
                    { title: "名称", dataIndex: "name", render: (value: string, row) => <span className="font-medium">{value}</span> },
                    { title: "供应商", dataIndex: "provider", render: (value: string) => <Tag>{value}</Tag> },
                    { title: "Base URL", dataIndex: "baseUrl", render: (value: string) => <span className="font-mono text-xs">{value}</span> },
                    { title: "Key", dataIndex: "apiKeyMasked", render: (value: string) => <span className="font-mono text-xs">{value}</span> },
                    {
                        title: "模型绑定",
                        dataIndex: "models",
                        render: (value: string[]) =>
                            value.length ? (
                                <Space size={2} wrap>
                                    {value.slice(0, 4).map((m) => (
                                        <Tag key={m} className="max-w-[140px] truncate">
                                            {m}
                                        </Tag>
                                    ))}
                                    {value.length > 4 ? <Tag>+{value.length - 4}</Tag> : null}
                                </Space>
                            ) : (
                                <span className="text-xs text-stone-400">全部</span>
                            ),
                    },
                    { title: "优先级", dataIndex: "priority", width: 70 },
                    {
                        title: "启用",
                        dataIndex: "enabled",
                        width: 80,
                        render: (value: boolean, row) => <Switch size="small" checked={value} onChange={(checked) => void patch(row.id, { enabled: checked }, "已更新")} />,
                    },
                    {
                        title: "操作",
                        key: "actions",
                        width: 80,
                        render: (_, row) => (
                            <Tooltip title="删除">
                                <Button size="small" danger icon={<Trash2 className="size-3.5" />} onClick={() => void remove(row.id, row.name)} />
                            </Tooltip>
                        ),
                    },
                ]}
            />

            <Modal title="添加平台密钥" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => void create()} confirmLoading={saving} okText="添加" cancelText="取消" destroyOnHidden>
                <div className="space-y-3 py-2">
                    <div>
                        <div className="mb-1 text-sm text-stone-600">名称</div>
                        <Input value={form.name} maxLength={40} placeholder="如：MiniMax 生产 Key" onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                        <div className="mb-1 text-sm text-stone-600">供应商</div>
                        <Select className="w-full" value={form.provider} options={PROVIDER_PRESETS} onChange={(value) => setForm((f) => ({ ...f, provider: value }))} showSearch />
                    </div>
                    <div>
                        <div className="mb-1 text-sm text-stone-600">Base URL</div>
                        <Input value={form.baseUrl} placeholder="如：https://api.minimax.chat/v1" onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))} />
                    </div>
                    <div>
                        <div className="mb-1 text-sm text-stone-600">API Key</div>
                        <Input.Password value={form.apiKey} placeholder="上游 API Key（加密存储）" onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))} />
                    </div>
                    <div>
                        <div className="mb-1 text-sm text-stone-600">绑定模型（可选，逗号分隔；留空 = 全部）</div>
                        <Input value={form.models} placeholder="如：MiniMax-H3, gpt-image-2" onChange={(e) => setForm((f) => ({ ...f, models: e.target.value }))} />
                    </div>
                    <div>
                        <div className="mb-1 text-sm text-stone-600">优先级（越大越优先，同供应商多 Key 时生效）</div>
                        <Input type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) || 0 }))} />
                    </div>
                </div>
            </Modal>
        </section>
    );
}
