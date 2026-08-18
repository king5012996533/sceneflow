"use client";

import { useState } from "react";
import { Switch } from "antd";
import { ChevronDown, ChevronRight } from "lucide-react";

import { defaultCapabilityForModel, type ModelCapabilitySpec } from "@/lib/model-capability-spec";
import { ModelCapabilityFields } from "./model-capability-fields";

/** 模型名 → 能力标定；undefined = 未启用（前端按内置默认） */
export type CredentialCapabilitiesMap = Record<string, ModelCapabilitySpec | undefined>;

type CredentialCapabilityEditorProps = {
    /** 当前「绑定模型」逗号列表解析出的模型名（去重保序） */
    models: string[];
    value: CredentialCapabilitiesMap;
    onChange: (next: CredentialCapabilitiesMap) => void;
};

/** 已知模型名的默认能力；未知模型名（文本/音频等无标定参数的类型）返回 undefined = 无需标定 */
function initialSpecForModel(model: string): ModelCapabilitySpec | undefined {
    return defaultCapabilityForModel(model) ?? undefined;
}

/**
 * 逐模型能力标定编辑器。
 * 只有「启用」的模型才会进入 capabilities 并下发给前端设置面板。
 */
export function CredentialCapabilityEditor({ models, value, onChange }: CredentialCapabilityEditorProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    if (!models.length) {
        return (
            <div className="rounded-lg border border-dashed border-[#ded2c3] px-3 py-4 text-center text-xs leading-5 text-[#7a6d63]">
                暂无可标定的模型：先在下方「绑定模型」里填写模型名（逗号分隔），保存后即可在这里逐模型标定画质 / 分辨率 / 比例 / 时长等参数。
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {models.map((model) => {
                const spec = value[model];
                const enabled = Boolean(spec);
                const open = Boolean(expanded[model]);
                const toggle = () => setExpanded((prev) => ({ ...prev, [model]: !prev[model] }));
                // 文本/音频等模型没有可标定参数，禁止开启能力开关（此前误开成图片能力的，允许关闭恢复）
                const supportsCapability = Boolean(defaultCapabilityForModel(model));
                const setEnabled = (checked: boolean) => {
                    if (checked && !supportsCapability) return;
                    onChange({ ...value, [model]: checked ? initialSpecForModel(model) : undefined });
                    if (checked) setExpanded((prev) => ({ ...prev, [model]: true }));
                };
                return (
                    <div key={model} className="rounded-lg border border-[#ded2c3] bg-[#faf4ea]">
                        <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left" onClick={toggle}>
                                {open ? <ChevronDown className="size-4 shrink-0 text-[#7a6d63]" /> : <ChevronRight className="size-4 shrink-0 text-[#7a6d63]" />}
                                <span className="truncate font-mono text-sm">{model}</span>
                                {enabled ? <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-600">已标定</span> : <span className="shrink-0 text-[11px] text-[#7a6d63]">内置默认</span>}
                            </button>
                            <Switch size="small" checked={enabled} onChange={setEnabled} />
                        </div>
                        {open ? (
                            <div className="border-t border-[#ded2c3] px-3 py-3">
                                {!supportsCapability ? (
                                    <div className="text-xs leading-5 text-amber-600">该模型（文本/音频等）无需能力标定，使用内置默认。请保持开关关闭；若此前误开导致被当作图片模型，关闭后即恢复文本/音频分类。</div>
                                ) : enabled ? (
                                    <ModelCapabilityFields model={model} spec={spec as ModelCapabilitySpec} onChange={(next) => onChange({ ...value, [model]: next })} />
                                ) : (
                                    <div className="text-xs leading-5 text-[#7a6d63]">未启用：前端使用内置默认参数。打开开关后可按前端画质 / 分辨率 / 比例标定。</div>
                                )}
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}
