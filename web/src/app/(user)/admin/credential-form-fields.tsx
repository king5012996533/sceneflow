"use client";

import { useState } from "react";
import { App, Button, Input, InputNumber, Select } from "antd";

import { apiPath } from "@/lib/app-paths";
import type { ModelCapabilitySpec } from "@/lib/model-capability-spec";
import type { ModelPricing } from "@/lib/credit-pricing";
import { CredentialCapabilityEditor, type CredentialCapabilitiesMap } from "./credential-capability-editor";
import { CredentialPricingEditor, type CredentialPricingMap } from "./credential-pricing-editor";

export const PROVIDER_PRESETS = [
    { label: "OpenAI", value: "openai" },
    { label: "MiniMax", value: "minimax" },
    { label: "Seedance / 火山", value: "seedance" },
    { label: "Aigccc / Seedance 2.0 网关", value: "aigccc" },
    { label: "GenVideo / ai-genvideo.com", value: "genvideo" },
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
    pricing: CredentialPricingMap;
};

type CredentialFormFieldsProps = {
    form: CredentialFormState;
    onChange: (patch: Partial<CredentialFormState>) => void;
    /** 编辑模式：API Key 留空 = 不更换 */
    editMode: boolean;
    /** 编辑已有凭证时的 id：Key 框留空时也能用它去拉上游模型列表 */
    credentialId?: string;
};

/** 「绑定模型」输入框占位符：Replicate 等供应商的模型名有特殊格式，按供应商提示 */
const MODELS_PLACEHOLDER: Record<string, string> = {
    replicate: "Replicate 格式：owner/模型名，如 prunaai/p-video, black-forest-labs/flux-schnell",
    minimax: "如：MiniMax-H3, gpt-image-1",
    seedance: "如：seedance-2.0-pro, seedance-2.0-max",
    aigccc: "如：seedance-2.0-pro, seedance-2.0-max",
    genvideo: "如：genvideo-2.0, genvideo-2.5（模型名仅作展示绑定，可自定义，需含 genvideo 或与能力标定配套）",
    gemini: "如：gemini-2.5-flash-image",
};
const MODELS_PLACEHOLDER_DEFAULT = "如：gpt-image-1, dall-e-3";

/** Base URL 占位符：按供应商提示常见端点（MiniMax 走秘塔中转时用 metaso.cn） */
const BASE_URL_PLACEHOLDER: Record<string, string> = {
    minimax: "如：https://metaso.cn/api/minimax 或 https://api.minimaxi.com/v1",
    genvideo: "如：https://ai-genvideo.com/v1（填到 /v1 为止，接口路径自动拼接）",
};

export function parseModelList(models: string): string[] {
    return Array.from(
        new Set(
            models
                .split(/[,，\s]+/)
                .map((model) => model.trim())
                .filter(Boolean),
        ),
    );
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

/** 落库前只保留「仍在绑定列表里」且「非空定价」的模型（全空 = 未启用，不走 sanitize 也会被清洗掉） */
export function pickPricing(modelsText: string, map: CredentialPricingMap): Record<string, ModelPricing> {
    const result: Record<string, ModelPricing> = {};
    for (const model of parseModelList(modelsText)) {
        const pricing = map[model];
        if (pricing && Object.keys(pricing).length) result[model] = pricing;
    }
    return result;
}

export function CredentialFormFields({ form, onChange, editMode, credentialId }: CredentialFormFieldsProps) {
    const { message } = App.useApp();
    const set = (patch: Partial<CredentialFormState>) => onChange(patch);
    const models = parseModelList(form.models);
    const [upstreamModels, setUpstreamModels] = useState<string[]>([]);
    const [upstreamNote, setUpstreamNote] = useState("");
    const [fetchingUpstream, setFetchingUpstream] = useState(false);

    /**
     * 用当前这把 Key 去问上游「你支持哪些模型 id」，再点选加入绑定模型。
     * 模型名是上游的机器标识（DeepSeek 只认 deepseek-flash / deepseek-v4-pro），手写极易写成展示名，
     * 落库后请求原样转发就会被上游 400 拒掉 —— 所以这里干脆不让手写。
     */
    async function fetchUpstreamModels() {
        setFetchingUpstream(true);
        setUpstreamNote("");
        try {
            const apiKey = form.apiKey.trim();
            if (!apiKey && !credentialId) throw new Error("请先填写 API Key；编辑已有凭证时留空会沿用已保存的那把");
            const res = await fetch(apiPath("/api/admin/credential-models"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(apiKey ? { baseUrl: form.baseUrl, provider: form.provider, apiKey } : { id: credentialId }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.detail ? `${json.error}：${json.detail}` : json.error || "拉取上游模型失败");
            const list = (json.models as Array<{ id: string }>).map((item) => item.id);
            setUpstreamModels(list);
            setUpstreamNote(`上游返回 ${list.length} 个模型（${json.endpoint}）；点一下加入 / 移出绑定模型。`);
            message.success(`已拉取 ${list.length} 个上游模型`);
        } catch (error) {
            setUpstreamModels([]);
            const text = error instanceof Error ? error.message : "拉取上游模型失败";
            setUpstreamNote(text);
            message.error(text);
        } finally {
            setFetchingUpstream(false);
        }
    }

    function toggleModel(modelId: string) {
        const next = models.includes(modelId) ? models.filter((item) => item !== modelId) : [...models, modelId];
        set({ models: next.join(", ") });
    }

    return (
        <div className="space-y-3 py-2">
            <div>
                <div className="mb-1 text-sm text-[#332f2a]">名称</div>
                <Input value={form.name} maxLength={40} placeholder="如：MiniMax 生产 Key" onChange={(event) => set({ name: event.target.value })} />
            </div>
            <div>
                <div className="mb-1 text-sm text-[#332f2a]">供应商</div>
                <Select className="w-full" value={form.provider} options={PROVIDER_PRESETS} onChange={(value) => set({ provider: value })} showSearch />
            </div>
            <div>
                <div className="mb-1 text-sm text-[#332f2a]">Base URL</div>
                <Input value={form.baseUrl} placeholder={BASE_URL_PLACEHOLDER[form.provider] ?? "如：https://api.minimax.chat/v1"} onChange={(event) => set({ baseUrl: event.target.value })} />
            </div>
            <div>
                <div className="mb-1 text-sm text-[#332f2a]">API Key</div>
                <Input.Password value={form.apiKey} placeholder={editMode ? "留空则不更换（当前已加密存储）" : "上游 API Key（加密存储）"} onChange={(event) => set({ apiKey: event.target.value })} />
            </div>
            <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm text-[#332f2a]">绑定模型（逗号分隔；留空 = 全部）</span>
                    <Button size="small" loading={fetchingUpstream} onClick={() => void fetchUpstreamModels()}>
                        拉取上游模型
                    </Button>
                </div>
                <Input value={form.models} placeholder={MODELS_PLACEHOLDER[form.provider] ?? MODELS_PLACEHOLDER_DEFAULT} onChange={(event) => set({ models: event.target.value })} />
                <div className="mt-1 text-[11px] leading-4 text-[#726d67]">必须填上游认得的那串 id（如 deepseek-flash），填展示名（如 DeepSeek-V4.1-Flash）会被上游直接 400 拒掉。点「拉取上游模型」按名字点选最稳。</div>
                {upstreamNote ? <div className="mt-1 text-[11px] leading-4 text-[#726d67]">{upstreamNote}</div> : null}
                {upstreamModels.length ? (
                    <div className="mt-1.5 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-[#e9e6e3] bg-white/60 p-2">
                        {upstreamModels.map((modelId) => {
                            const bound = models.includes(modelId);
                            return (
                                <button
                                    key={modelId}
                                    type="button"
                                    onClick={() => toggleModel(modelId)}
                                    className={`cursor-pointer rounded border px-1.5 py-0.5 font-mono text-[11px] ${bound ? "border-amber-200 bg-amber-50 text-amber-700" : "border-[#e2dfdc] bg-white text-[#5a5550] hover:border-[#c9c4bf]"}`}
                                    title={bound ? "点击移出绑定模型" : "点击加入绑定模型"}
                                >
                                    {bound ? "✓ " : ""}
                                    {modelId}
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </div>
            <div>
                <div className="mb-1 text-sm text-[#332f2a]">优先级（越大越优先，同供应商多 Key 时生效）</div>
                <InputNumber className="w-full" min={0} value={form.priority} onChange={(value) => set({ priority: Number(value) || 0 })} />
            </div>
            <div>
                <div className="mb-1 text-sm text-[#332f2a]">逐模型能力标定（与前端画质 / 分辨率 / 比例 / 时长等一一对应）</div>
                <CredentialCapabilityEditor models={models} value={form.capabilities} provider={form.provider} onChange={(capabilities) => set({ capabilities })} />
            </div>
            <div>
                <div className="mb-1 text-sm text-[#332f2a]">逐模型积分定价（按模型类型只显示该类型的价框：文本模型给文本价、图片模型给分辨率分档；未配置 = 全局默认 → 内置草案，可用「显示全部字段」展开其余类型）</div>
                <CredentialPricingEditor models={models} value={form.pricing} capabilities={form.capabilities} onChange={(pricing) => set({ pricing })} />
            </div>
        </div>
    );
}
