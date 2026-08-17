"use client";

import { Input, InputNumber, Select } from "antd";

import type { ModelCapabilitySpec } from "@/lib/model-capability-spec";
import { CredentialCapabilityEditor, type CredentialCapabilitiesMap } from "./credential-capability-editor";

export const PROVIDER_PRESETS = [
    { label: "OpenAI", value: "openai" },
    { label: "MiniMax", value: "minimax" },
    { label: "Seedance / 火山", value: "seedance" },
    { label: "Replicate", value: "replicate" },
    { label: "Gemini", value: "gemini" },
    { label: "DeepSeek", value: "deepseek" },
];

export type CredentialFormState = {
    name: string;
    provider: string;
    baseUrl: string;
    apiKey: string;
    models: string;
    priority: number;
    capabilities: CredentialCapabilitiesMap;
};

type CredentialFormFieldsProps = {
    form: CredentialFormState;
    onChange: (patch: Partial<CredentialFormState>) => void;
    /** 编辑模式：API Key 留空 = 不更换 */
    editMode: boolean;
};

export function parseModelList(models: string): string[] {
    return Array.from(new Set(models.split(/[,，\s]+/).map((model) => model.trim()).filter(Boolean)));
}

/** 落库前只保留「仍在绑定列表里」且「已启用标定」的模型能力 */
export function pickCapabilities(modelsText: string, map: CredentialCapabilitiesMap): Record<string, ModelCapabilitySpec> {
    const result: Record<string, ModelCapabilitySpec> = {};
    for (const model of parseModelList(modelsText)) {
        const spec = map[model];
        if (spec) result[model] = spec;
    }
    return result;
}

export function CredentialFormFields({ form, onChange, editMode }: CredentialFormFieldsProps) {
    const set = (patch: Partial<CredentialFormState>) => onChange(patch);
    const models = parseModelList(form.models);

    return (
        <div className="space-y-3 py-2">
            <div>
                <div className="mb-1 text-sm text-stone-600">名称</div>
                <Input value={form.name} maxLength={40} placeholder="如：MiniMax 生产 Key" onChange={(event) => set({ name: event.target.value })} />
            </div>
            <div>
                <div className="mb-1 text-sm text-stone-600">供应商</div>
                <Select className="w-full" value={form.provider} options={PROVIDER_PRESETS} onChange={(value) => set({ provider: value })} showSearch />
            </div>
            <div>
                <div className="mb-1 text-sm text-stone-600">Base URL</div>
                <Input value={form.baseUrl} placeholder="如：https://api.minimax.chat/v1" onChange={(event) => set({ baseUrl: event.target.value })} />
            </div>
            <div>
                <div className="mb-1 text-sm text-stone-600">API Key</div>
                <Input.Password value={form.apiKey} placeholder={editMode ? "留空则不更换（当前已加密存储）" : "上游 API Key（加密存储）"} onChange={(event) => set({ apiKey: event.target.value })} />
            </div>
            <div>
                <div className="mb-1 text-sm text-stone-600">绑定模型（逗号分隔；留空 = 全部）</div>
                <Input value={form.models} placeholder="如：MiniMax-H3, gpt-image-2" onChange={(event) => set({ models: event.target.value })} />
            </div>
            <div>
                <div className="mb-1 text-sm text-stone-600">优先级（越大越优先，同供应商多 Key 时生效）</div>
                <InputNumber className="w-full" min={0} value={form.priority} onChange={(value) => set({ priority: Number(value) || 0 })} />
            </div>
            <div>
                <div className="mb-1 text-sm text-stone-600">逐模型能力标定（与前端画质 / 分辨率 / 比例 / 时长等一一对应）</div>
                <CredentialCapabilityEditor models={models} value={form.capabilities} onChange={(capabilities) => set({ capabilities })} />
            </div>
        </div>
    );
}
