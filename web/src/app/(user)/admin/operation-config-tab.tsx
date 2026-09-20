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
    /** 小数位（不填 = 整数）。倍率这类可以带小数，积分/张数必须整数 */
    precision?: number;
};

const EDITORS: EditorSpec[] = [
    { key: "daily_credit_grant", label: "免费用户每日赠送积分", description: "每次生成前自动赠送，按自然日幂等（0 = 不赠送）", kind: "number", defaultValue: 3 },
    { key: "signup_credit_grant", label: "新用户一次性赠送积分", description: "登录时自动发放一次（0 = 不赠送）", kind: "number", defaultValue: 50 },
    { key: "image_credit", label: "图片生成默认积分（每张）", description: "全局默认：未逐模型定价的模型按此扣费（0 = 免费）；逐模型定价优先", kind: "number", defaultValue: 2 },
    { key: "video_credit", label: "视频生成默认积分（每条）", description: "全局默认：每条视频固定扣费，与时长无关（0 = 免费）；逐模型定价优先", kind: "number", defaultValue: 15 },
    { key: "audio_credit", label: "音频生成默认积分（每次）", description: "全局默认：未逐模型定价的模型按此扣费（0 = 免费）；逐模型定价优先", kind: "number", defaultValue: 1 },
    { key: "text_credit", label: "文本 / 工具默认积分（每次）", description: "全局默认：对话/工具类按此扣费（0 = 不扣）；逐模型定价优先", kind: "number", defaultValue: 0 },
    {
        key: "text_pricing_multiplier",
        label: "文本计价倍率（按 token 计价时用）",
        description: "售价 = 平台成本 × 本倍率。只作用于「后台给该模型填了 token 成本价」的文本模型（逐模型定价里那一栏）；没填成本价的模型完全不受影响。0 = 按 1 倍（成本价卖）。例：一轮成本 ¥0.011，倍率 2 → 0.216 积分，向上取整按 1 积分收。",
        kind: "number",
        defaultValue: 2,
        precision: 2,
    },
    {
        key: "video_pricing_multiplier",
        label: "视频计价倍率（按秒计价时用）",
        description: "售价 = 平台成本 × 本倍率。只作用于「后台给该模型填了每秒成本价」的视频模型（逐模型定价里那四档）；按条计价的模型完全不受影响。0 或留空 = 按内置默认 3 倍。例：20 秒 1080p 成本 ¥5.68，倍率 3 → 170.4 积分，向上取整按 171 积分收。",
        kind: "number",
        defaultValue: 3,
        precision: 2,
    },
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
            <section className="rounded-2xl border border-[#e2dfdc] bg-[#ffffff] p-5 shadow-[0_8px_20px_rgba(35,28,20,0.05)]">
                <div className="sf-serif mb-4 flex items-center gap-2 text-[17px] font-semibold">
                    <SlidersHorizontal className="size-4 text-[#a0713f]" />
                    灰度与计费开关
                </div>
                <p className="mb-4 text-xs leading-5 text-[#726d67]">修改保存后约 30 秒生效（进程内缓存 TTL）。未配置项使用系统默认值。</p>
                {loading ? (
                    <div className="text-sm text-[#726d67]">加载中…</div>
                ) : (
                    <div className="space-y-4">
                        {EDITORS.map((spec) => (
                            <div key={spec.key} className="flex items-start justify-between gap-4 rounded-md border border-[#e2dfdc] bg-[#ffffff] p-4">
                                <div>
                                    <div className="text-sm font-medium">{spec.label}</div>
                                    <div className="mt-1 text-xs leading-5 text-[#726d67]">{spec.description}</div>
                                    <div className="mt-1 font-mono text-[11px] text-[#a49f9a]">{spec.key}</div>
                                </div>
                                {spec.kind === "switch" ? (
                                    <Switch checked={currentValue(spec) === true} onChange={(checked) => void update(spec.key, checked)} />
                                ) : (
                                    <InputNumber min={0} max={1000000} precision={spec.precision} value={currentValue(spec) as number} onChange={(value) => void update(spec.key, value ?? 0)} className="w-32" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
