"use client";

import { useState } from "react";
import { Switch } from "antd";
import { ChevronDown, ChevronRight } from "lucide-react";

import { DEFAULT_IMAGE_CAPABILITY, defaultCapabilityForModel, type ModelCapabilitySpec } from "@/lib/model-capability-spec";
import { ModelCapabilityFields } from "./model-capability-fields";

/** 模型名 → 能力标定；undefined = 未启用（前端按内置默认） */
export type CredentialCapabilitiesMap = Record<string, ModelCapabilitySpec | undefined>;

type CredentialCapabilityEditorProps = {
    /** 当前「绑定模型」逗号列表解析出的模型名（去重保序） */
    models: string[];
    value: CredentialCapabilitiesMap;
    onChange: (next: CredentialCapabilitiesMap) => void;
};

function initialSpecForModel(model: string): ModelCapabilitySpec {
    return defaultCapabilityForModel(model) ?? { ...DEFAULT_IMAGE_CAPABILITY };
}

/**
 * 逐模型能力标定编辑器。
 * 只有「启用」的模型才会进入 capabilities 并下发给前端设置面板。
 */
export function CredentialCapabilityEditor({ models, value, onChange }: CredentialCapabilityEditorProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    if (!models.length) {
        return <div className="rounded-lg border border-dashed border-stone-300 px-3 py-4 text-center text-xs text-stone-400">先在「绑定模型」里填写模型名（逗号分隔），即可逐模型标定画质 / 分辨率 / 比例等参数。</div>;
    }

    return (
        <div className="space-y-2">
            {models.map((model) => {
                const spec = value[model];
                const enabled = Boolean(spec);
                const open = Boolean(expanded[model]);
                const toggle = () => setExpanded((prev) => ({ ...prev, [model]: !prev[model] }));
                const setEnabled = (checked: boolean) => {
                    onChange({ ...value, [model]: checked ? initialSpecForModel(model) : undefined });
                    if (checked) setExpanded((prev) => ({ ...prev, [model]: true }));
                };
                return (
                    <div key={model} className="rounded-lg border border-stone-200 bg-stone-50/60">
                        <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left" onClick={toggle}>
                                {open ? <ChevronDown className="size-4 shrink-0 text-stone-400" /> : <ChevronRight className="size-4 shrink-0 text-stone-400" />}
                                <span className="truncate font-mono text-sm">{model}</span>
                                {enabled ? <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-600">已标定</span> : <span className="shrink-0 text-[11px] text-stone-400">内置默认</span>}
                            </button>
                            <Switch size="small" checked={enabled} onChange={setEnabled} />
                        </div>
                        {open ? (
                            <div className="border-t border-stone-200 px-3 py-3">
                                {enabled ? (
                                    <ModelCapabilityFields model={model} spec={spec as ModelCapabilitySpec} onChange={(next) => onChange({ ...value, [model]: next })} />
                                ) : (
                                    <div className="text-xs leading-5 text-stone-400">未启用：前端使用内置默认参数。打开开关后可按前端画质 / 分辨率 / 比例标定。</div>
                                )}
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}
