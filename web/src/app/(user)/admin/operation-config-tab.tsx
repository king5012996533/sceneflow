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

/** 运营配置（byok_enabled / daily_credit_grant 等），保存后 ≤30s 生效（进程内缓存 TTL） */
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
            setConfigs((prev) => prev.map((item) => (item.key === key ? { ...item, value } : item)));
            message.success(`已更新 ${key}，约 30 秒内生效`);
        } catch (error) {
            message.error(error instanceof Error ? error.message : "保存运营配置失败");
        }
    }

    const find = (key: string) => configs.find((item) => item.key === key);

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-stone-200 bg-white p-5">
                <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <SlidersHorizontal className="size-5" />
                    灰度与计费开关
                </div>
                {loading ? (
                    <div className="text-sm text-stone-400">加载中…</div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-4 rounded-md border border-stone-200 p-4">
                            <div>
                                <div className="text-sm font-medium">允许用户自带 API Key（BYOK）</div>
                                <div className="mt-1 text-xs leading-5 text-stone-500">{find("byok_enabled")?.description || "是否允许用户自带 API Key（关闭后仅使用平台密钥）"}</div>
                            </div>
                            <Switch checked={find("byok_enabled")?.value === true} loading={loading} onChange={(checked) => void update("byok_enabled", checked)} />
                        </div>
                        <div className="flex items-start justify-between gap-4 rounded-md border border-stone-200 p-4">
                            <div>
                                <div className="text-sm font-medium">免费用户每日赠送积分</div>
                                <div className="mt-1 text-xs leading-5 text-stone-500">{find("daily_credit_grant")?.description || "免费用户每日赠送积分（0 = 不赠送）"}</div>
                            </div>
                            <InputNumber
                                min={0}
                                max={100000}
                                value={typeof find("daily_credit_grant")?.value === "number" ? (find("daily_credit_grant")?.value as number) : undefined}
                                onChange={(value) => void update("daily_credit_grant", value ?? 0)}
                                className="w-32"
                            />
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
