"use client";

import { useEffect, useState } from "react";
import { App, Button, Modal, Space, Switch, Table, Tag, Tooltip } from "antd";
import { KeyRound, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import { apiPath } from "@/lib/app-paths";
import type { ModelCapabilitySpec } from "@/lib/model-capability-spec";
import { CredentialFormFields, parseModelList, pickCapabilities, type CredentialFormState } from "./credential-form-fields";

type Credential = {
    id: string;
    name: string;
    provider: string;
    baseUrl: string;
    apiKeyMasked: string;
    models: string[];
    capabilities?: Record<string, ModelCapabilitySpec>;
    enabled: boolean;
    priority: number;
    createdAt: string;
    updatedAt: string;
};

const EMPTY_FORM: CredentialFormState = {
    name: "",
    provider: "openai",
    baseUrl: "",
    apiKey: "",
    models: "",
    priority: 0,
    capabilities: {},
};

export default function CredentialsTab() {
    const { message } = App.useApp();
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Credential | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<CredentialFormState>(EMPTY_FORM);

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

    function openCreate() {
        setEditing(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    }

    function openEdit(row: Credential) {
        setEditing(row);
        setForm({
            name: row.name,
            provider: row.provider,
            baseUrl: row.baseUrl,
            apiKey: "",
            models: (row.models || []).join(", "),
            priority: row.priority || 0,
            capabilities: { ...(row.capabilities || {}) },
        });
        setModalOpen(true);
    }

    async function save() {
        if (!form.name.trim() || !form.provider.trim() || !form.baseUrl.trim() || (!editing && !form.apiKey.trim())) {
            message.error(editing ? "名称、供应商、Base URL 均为必填" : "名称、供应商、Base URL、API Key 均为必填");
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: form.name,
                provider: form.provider,
                baseUrl: form.baseUrl,
                models: parseModelList(form.models),
                capabilities: pickCapabilities(form.models, form.capabilities),
                priority: Number(form.priority) || 0,
                ...(form.apiKey.trim() ? { apiKey: form.apiKey } : {}),
            };
            const res = await fetch(apiPath("/api/admin/credentials"), {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || (editing ? "更新失败" : "新增失败"));
            message.success(editing ? "平台密钥已更新" : "平台密钥已添加");
            setModalOpen(false);
            setEditing(null);
            setForm(EMPTY_FORM);
            await load();
        } catch (error) {
            message.error(error instanceof Error ? error.message : (editing ? "更新平台密钥失败" : "新增平台密钥失败"));
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

    function remove(id: string, name: string) {
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
                    <Button type="primary" icon={<Plus className="size-3.5" />} onClick={openCreate}>
                        添加密钥
                    </Button>
                </div>
            </div>
            <p className="mb-4 text-xs leading-5 text-stone-400">
                平台统一配置上游 API Key（AES-256-GCM 加密存储，明文永不进客户端）。代理按目标地址匹配注入；多个凭证按优先级取用。逐模型「能力标定」与前端画质 / 分辨率 / 比例 / 时长等参数一一对应，改完约 60 秒内生效（客户端目录缓存）。
            </p>

            <Table<Credential>
                rowKey="id"
                size="small"
                loading={loading}
                dataSource={credentials}
                pagination={false}
                locale={{ emptyText: "暂无平台密钥，点击右上角「添加密钥」配置第一个。" }}
                columns={[
                    { title: "名称", dataIndex: "name", render: (value: string) => <span className="font-medium">{value}</span> },
                    { title: "供应商", dataIndex: "provider", render: (value: string) => <Tag>{value}</Tag> },
                    { title: "Base URL", dataIndex: "baseUrl", render: (value: string) => <span className="font-mono text-xs">{value}</span> },
                    { title: "Key", dataIndex: "apiKeyMasked", render: (value: string) => <span className="font-mono text-xs">{value}</span> },
                    {
                        title: "模型绑定 / 能力标定",
                        dataIndex: "models",
                        render: (value: string[], row) => {
                            const capCount = row.capabilities ? Object.keys(row.capabilities).length : 0;
                            return (
                                <Space size={2} wrap>
                                    {value.length ? (
                                        value.slice(0, 4).map((model) => (
                                            <Tag key={model} className="max-w-[140px] truncate">
                                                {model}
                                            </Tag>
                                        ))
                                    ) : (
                                        <span className="text-xs text-stone-400">全部</span>
                                    )}
                                    {value.length > 4 ? <Tag>+{value.length - 4}</Tag> : null}
                                    {capCount ? <Tag color="blue">能力标定 {capCount}</Tag> : null}
                                </Space>
                            );
                        },
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
                        width: 120,
                        render: (_, row) => (
                            <Space size={4}>
                                <Tooltip title="编辑（含能力标定）">
                                    <Button size="small" icon={<Pencil className="size-3.5" />} onClick={() => openEdit(row)} />
                                </Tooltip>
                                <Tooltip title="删除">
                                    <Button size="small" danger icon={<Trash2 className="size-3.5" />} onClick={() => void remove(row.id, row.name)} />
                                </Tooltip>
                            </Space>
                        ),
                    },
                ]}
            />

            <Modal title={editing ? `编辑平台密钥「${editing.name}」` : "添加平台密钥"} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => void save()} confirmLoading={saving} okText={editing ? "保存" : "添加"} cancelText="取消" destroyOnHidden width={640}>
                <CredentialFormFields form={form} onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))} editMode={Boolean(editing)} />
            </Modal>
        </section>
    );
}
