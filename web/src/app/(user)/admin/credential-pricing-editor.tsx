"use client";

import { useState } from "react";
import { InputNumber, Switch } from "antd";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { ModelPricing } from "@/lib/credit-pricing";

/** 模型名 → 逐模型积分定价；undefined = 未启用（该模型全部走内置草案） */
export type CredentialPricingMap = Record<string, ModelPricing | undefined>;

type CredentialPricingEditorProps = {
    /** 当前「绑定模型」逗号列表解析出的模型名（去重保序） */
    models: string[];
    value: CredentialPricingMap;
    onChange: (next: CredentialPricingMap) => void;
};

const PRICING_FIELDS: Array<{ key: keyof ModelPricing; label: string; hint: string }> = [
    { key: "imageCredits", label: "图片生成（每张）", hint: "如 3：生成一张扣 3 积分" },
    { key: "videoCreditsPerSecond", label: "视频生成（每秒）", hint: "如 2：10 秒视频扣 20 积分；自动时长按 6 秒计" },
    { key: "audioCredits", label: "音频生成（每次）", hint: "留空 = 内置 1 积分" },
    { key: "textCredits", label: "文本 / 工具（每次）", hint: "留空 = 内置 0 积分（不扣）" },
];

/**
 * 逐模型积分定价编辑器。
 * 只有「启用定价」的模型才会进入 pricing 并参与服务端扣费；全部字段留空 = 等效内置草案。
 */
export function CredentialPricingEditor({ models, value, onChange }: CredentialPricingEditorProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    if (!models.length) {
        return <div className="rounded-lg border border-dashed border-[#ded2c3] px-3 py-4 text-center text-xs text-[#7a6d63]">先在「绑定模型」里填写模型名（逗号分隔），即可逐模型设置积分定价。</div>;
    }

    const toggleExpanded = (model: string) => setExpanded((prev) => ({ ...prev, [model]: !prev[model] }));

    const setEnabled = (model: string, checked: boolean) => {
        onChange({ ...value, [model]: checked ? {} : undefined });
        if (checked) setExpanded((prev) => ({ ...prev, [model]: true }));
    };

    const setField = (model: string, key: keyof ModelPricing, num: number | null) => {
        if (num === null || num === undefined) {
            const current = value[model] ? { ...value[model] } : {};
            delete current[key];
            if (!Object.keys(current).length) {
                const next = { ...value };
                delete next[model];
                onChange(next);
                return;
            }
            onChange({ ...value, [model]: current });
            return;
        }
        onChange({ ...value, [model]: { ...(value[model] || {}), [key]: Math.max(0, Math.floor(num)) } });
    };

    return (
        <div className="space-y-2">
            {models.map((model) => {
                const pricing = value[model];
                const enabled = Boolean(pricing);
                const open = Boolean(expanded[model]);
                return (
                    <div key={model} className="rounded-lg border border-[#ded2c3] bg-[#faf4ea]">
                        <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left" onClick={() => toggleExpanded(model)}>
                                {open ? <ChevronDown className="size-4 shrink-0 text-[#7a6d63]" /> : <ChevronRight className="size-4 shrink-0 text-[#7a6d63]" />}
                                <span className="truncate font-mono text-sm">{model}</span>
                                {enabled ? <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-600">已定价</span> : <span className="shrink-0 text-[11px] text-[#7a6d63]">内置草案</span>}
                            </button>
                            <Switch size="small" checked={enabled} onChange={(checked) => setEnabled(model, checked)} />
                        </div>
                        {open ? (
                            <div className="border-t border-[#ded2c3] px-3 py-3">
                                {enabled ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {PRICING_FIELDS.map((field) => (
                                            <div key={field.key}>
                                                <div className="mb-1 text-xs text-[#201914]">{field.label}</div>
                                                <InputNumber className="w-full" min={0} precision={0} placeholder="留空 = 内置" value={pricing?.[field.key] ?? null} onChange={(num) => setField(model, field.key, num)} />
                                                <div className="mt-0.5 text-[11px] text-[#7a6d63]">{field.hint}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs leading-5 text-[#7a6d63]">未启用：该模型所有生成均按内置草案扣积分（图片 1–10、视频 15–30、音频 1、文本/工具 0）。打开开关后可按类型设置积分。</div>
                                )}
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}
