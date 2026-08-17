"use client";

import { useEffect, useState } from "react";
import { App, InputNumber, Switch } from "antd";
import { SlidersHorizontal } from "lucide-react";

import { apiPath } from "@/lib/app-paths";

type OperationConfigItem = {
    key: string;
    value: unknown;
    description: string;
};

type EditorSpec = {
    key: string;
    label: string;
    description: string;
    kind: "switch" | "number";
    /** 未配置时的展示默认值（与 server 端 getOperation* 的 fallback 保持一致） */
    defaultValue: boolean | number;
};

const EDITORS: EditorSpec[] = [
    { key: "daily_credit_grant", label: "免费用户每日赠送积分", description: "每次生成前自动赠送，按自然日幂等（0 = 不赠送）", kind: "number", defaultValue: 3 },
    { key: "signup_credit_grant", label: "新用户一次性赠送积分", description: "登录时自动发放一次（0 = 不赠送）", kind: "number", defaultValue: 50 },
];

/** 运营配置（daily_credit_grant 等），保存后 ≤30s 生效（进程内缓存 TTL） */
export default function OperationConfigTab() {
    const { message } = App.useApp();
    const [configs, setConfigs] = useState<OperationConfigItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        void fetch(apiPath("/api/admin/operation-config"), { cache: "no-store" })
            .then((res) => res.json())
            .then((json) => {
                if (json.error) throw new Error(json.error);
                setConfigs(json.configs || []);
            })
            .catch((error) => message.error(error instanceof Error ? error.message : "加载运营配置失败"))
            .finally(() => setLoading(false));
    }, [message]);

    async function update(key: string, value: unknown) {
        try {
            const res = await fetch(apiPath("/api/admin/operation-config"), {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key, value }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "保存失败");
            setConfigs((prev) => {
                const next = prev.filter((item) => item.key !== key);
                return [...next, { key, value, description: "" }];
            });
            message.success(`已更新 ${key}，约 30 秒内生效`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "保存运营配置失败");
        }
    }

    function currentValue(spec: EditorSpec): boolean | number {
        const found = configs.find((item) => item.key === spec.key);
        if (!found) return spec.defaultValue;
        if (spec.kind === "switch") return found.value === true || found.value === "true" || found.value === "1";
        return typeof found.value === "number" ? found.value : Number(found.value) || 0;
    }

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-stone-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <SlidersHorizontal className="size-5" />
                    灰度与计费开关
                </div>
                <p className="mb-4 text-xs leading-5 text-stone-400">修改保存后约 30 秒生效（进程内缓存 TTL）。未配置项使用系统默认值。</p>
                {loading ? (
                    <div className="text-sm text-stone-400">加载中…</div>
                ) : (
                    <div className="space-y-4">
                        {EDITORS.map((spec) => (
                            <div key={spec.key} className="flex items-start justify-between gap-4 rounded-md border border-stone-200 p-4">
                                <div>
                                    <div className="text-sm font-medium">{spec.label}</div>
                                    <div className="mt-1 text-xs leading-5 text-stone-500">{spec.description}</div>
                                    <div className="mt-1 font-mono text-[11px] text-stone-400">{spec.key}</div>
                                </div>
                                {spec.kind === "switch" ? (
                                    <Switch checked={currentValue(spec) === true} onChange={(checked) => void update(spec.key, checked)} />
                                ) : (
                                    <InputNumber min={0} max={1000000} value={currentValue(spec) as number} onChange={(value) => void update(spec.key, value ?? 0)} className="w-32" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
