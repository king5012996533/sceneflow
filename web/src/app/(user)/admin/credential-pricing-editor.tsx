"use client";

import { useState } from "react";
import { InputNumber, Switch } from "antd";
import { ChevronDown, ChevronRight } from "lucide-react";

import type { ModelPricing } from "@/lib/credit-pricing";
import { IMAGE_KIND, normalizeImageCapability, type ModelCapabilitySpec } from "@/lib/model-capability-spec";
import type { ImageResolutionTier } from "@/lib/image-resolution";
import { inferPricingKind, PRICING_KIND_LABEL, type PricingKind } from "@/lib/model-pricing-kind";

/** 模型名 → 逐模型积分定价；undefined = 未启用（该模型全部走内置草案） */
export type CredentialPricingMap = Record<string, ModelPricing | undefined>;

type CredentialPricingEditorProps = {
    /** 当前「绑定模型」逗号列表解析出的模型名（去重保序） */
    models: string[];
    value: CredentialPricingMap;
    onChange: (next: CredentialPricingMap) => void;
    /** 逐模型能力标定（可选）：用于标注「该档位没勾」，只提示不拦着定价 */
    capabilities?: Record<string, ModelCapabilitySpec | undefined>;
};

const PRICING_FIELDS: Array<{ key: keyof ModelPricing; label: string; hint: string }> = [
    { key: "audioCredits", label: "音频生成（每次）", hint: "留空 = 内置 1 积分" },
    { key: "textCredits", label: "文本 / 工具（每次）", hint: "留空 = 内置 0 积分（不扣）" },
];

/** 图片分档定价：1K 是基础价，2K/4K 留空 = 沿用 1K 价（后台不配 = 与过去完全一致） */
const IMAGE_TIERS: Array<{ key: keyof ModelPricing; tier: ImageResolutionTier; label: string; hint: string }> = [
    { key: "imageCredits", tier: "1k", label: "1K（基础档）", hint: "留空 = 内置草案（大多模型 2 积分）" },
    { key: "imageCredits2k", tier: "2k", label: "2K", hint: "留空 = 按 1K 价扣" },
    { key: "imageCredits4k", tier: "4k", label: "4K", hint: "留空 = 按 1K 价扣" },
];

/** 视频分档定价：高清档（2K/1080p）与标准档（768P/720p 等）分开配置 */
const VIDEO_TIERS: Array<{ key: keyof ModelPricing; label: string; hint: string }> = [
    { key: "videoCreditsStandard", label: "标准档（768P/720p）", hint: "如 20：768P 等标准分辨率每条扣 20" },
    { key: "videoCreditsHigh", label: "高清档（2K/1080p）", hint: "如 40：2K 等高清分辨率每条扣 40" },
];

/**
 * 字段分组：每个模型默认只铺开自己那一组，其余折叠在「显示全部字段」后面。
 * 起因（2026-09-19 老板反馈「文本模型还不能定义价格」）：文本价过去被夹在图片 3 档 + 视频 2 档中间，
 * 能配但看不见 —— 所以文本模型现在第一眼看到的就是「文本 / 工具（每次）」这个价框。
 */
type PricingGroupId = "textAudio" | "image" | "video";

const GROUP_TITLE: Record<PricingGroupId, string> = {
    textAudio: "文本 / 工具 · 音频（每次调用）",
    image: "图片生成（每张，按分辨率分档）",
    video: "视频生成（每条，按分辨率分档）",
};

const ALL_GROUPS: PricingGroupId[] = ["textAudio", "image", "video"];

/** 该类型的模型默认显示哪几组字段（其余组折叠） */
function primaryGroupsForKind(kind: PricingKind): PricingGroupId[] {
    if (kind === "image") return ["image"];
    if (kind === "video") return ["video"];
    return ["textAudio"];
}

/** 类型徽标配色：一眼分出文本 / 图片 / 视频 / 音频 */
const KIND_BADGE_CLASS: Record<PricingKind, string> = {
    text: "border-[#cfdcef] bg-[#eef3fb] text-[#38609e]",
    image: "border-[#dcd6f2] bg-[#f3f1fc] text-[#5b4bb8]",
    video: "border-[#cfe4e0] bg-[#eef7f5] text-[#2f7d6d]",
    audio: "border-[#f0dfc8] bg-[#fdf6ec] text-[#a5711f]",
};

/** 未启用定价时，按类型说清会走哪个默认价 */
const DISABLED_HINT: Record<PricingKind, string> = {
    text: "未启用：该模型的对话 / Agent 调用按「全局默认（运营配置）→ 内置 0 积分（不扣费）」计价。打开开关即可给文本调用单独定价。",
    image: "未启用：该模型出图按「全局默认（运营配置）→ 内置草案（大多 2 积分/张）」扣，2K/4K 未单独定价时沿用 1K 价。打开开关可按分辨率分档定价。",
    video: "未启用：该模型出片按「全局默认（运营配置）→ 内置草案（每条 15–30 积分）」扣。打开开关可按标准档 / 高清档定价。",
    audio: "未启用：该模型音频生成按「全局默认（运营配置）→ 内置 1 积分」扣。打开开关可单独定价。",
};

/**
 * 逐模型积分定价编辑器。
 * 只有「启用定价」的模型才会进入 pricing 并参与服务端扣费；全部字段留空 = 等效内置草案。
 */
export function CredentialPricingEditor({ models, value, onChange, capabilities }: CredentialPricingEditorProps) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [showAllFields, setShowAllFields] = useState<Record<string, boolean>>({});

    /** 该模型能力标定里勾了哪些图片分辨率档位（没标定 = undefined，不做任何标注） */
    const capabilityTiers = (model: string): ImageResolutionTier[] | null => {
        const spec = capabilities?.[model];
        if (!spec || spec.kind !== IMAGE_KIND) return null;
        return normalizeImageCapability(spec).resolutions;
    };

    if (!models.length) {
        return <div className="rounded-lg border border-dashed border-[#e2dfdc] px-3 py-4 text-center text-xs text-[#726d67]">先在「绑定模型」里填写模型名（逗号分隔），即可逐模型设置积分定价。</div>;
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

    /** 渲染一组定价字段：同组字段都写在同一个 pricing 对象上 */
    const renderGroup = (model: string, kind: PricingKind, pricing: ModelPricing | undefined, group: PricingGroupId, allowedTiers: ImageResolutionTier[] | null) => {
        if (group === "textAudio") {
            return (
                <div key={group} className="rounded-lg border border-[#e9e6e3] bg-white/60 p-2.5">
                    <div className="mb-1.5 text-xs text-[#332f2a]">{GROUP_TITLE.textAudio}</div>
                    <div className="grid grid-cols-2 gap-3">
                        {PRICING_FIELDS.map((field) => (
                            <div key={field.key}>
                                <div className="mb-1 text-xs text-[#332f2a]">
                                    {field.label}
                                    {kind === "text" && field.key === "textCredits" ? <span className="ml-1 text-[11px] text-[#38609e]">本模型按此处扣费</span> : null}
                                </div>
                                <InputNumber className="w-full" min={0} precision={0} placeholder="留空 = 内置" value={pricing?.[field.key] ?? null} onChange={(num) => setField(model, field.key, num)} />
                                <div className="mt-0.5 text-[11px] text-[#726d67]">{field.hint}</div>
                            </div>
                        ))}
                    </div>
                    {kind === "text" ? <div className="mt-1.5 text-[11px] leading-4 text-[#726d67]">对话、画布 Agent 每轮规划都按「文本 / 工具」价扣；0 = 不扣费，留空则沿用运营配置里的全局默认。</div> : null}
                </div>
            );
        }
        if (group === "image") {
            return (
                <div key={group} className="rounded-lg border border-[#e9e6e3] bg-white/60 p-2.5">
                    <div className="mb-1.5 text-xs text-[#332f2a]">{GROUP_TITLE.image}</div>
                    <div className="grid grid-cols-3 gap-3">
                        {IMAGE_TIERS.map((item) => {
                            const unsupported = allowedTiers ? !allowedTiers.includes(item.tier) : false;
                            return (
                                <div key={item.key}>
                                    <div className="mb-1 text-xs text-[#332f2a]">
                                        {item.label}
                                        {unsupported ? <span className="ml-1 text-[11px] text-amber-600">能力未勾选</span> : null}
                                    </div>
                                    <InputNumber className="w-full" min={0} precision={0} placeholder="留空 = 内置" value={pricing?.[item.key] ?? null} onChange={(num) => setField(model, item.key, num)} />
                                    <div className="mt-0.5 text-[11px] text-[#726d67]">{item.hint}</div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-1.5 text-[11px] leading-4 text-[#726d67]">分档只影响扣费，不影响上游出图：用户选 2K/4K 才按对应档位扣。参考倍率 2K ≈ 1.5–2×、4K ≈ 3–4× 基础价。</div>
                </div>
            );
        }
        return (
            <div key={group} className="rounded-lg border border-[#e9e6e3] bg-white/60 p-2.5">
                <div className="mb-1.5 text-xs text-[#332f2a]">{GROUP_TITLE.video}</div>
                <div className="grid grid-cols-2 gap-3">
                    {VIDEO_TIERS.map((tier) => (
                        <div key={tier.key}>
                            <InputNumber className="w-full" min={0} precision={0} placeholder="留空 = 内置" value={pricing?.[tier.key] ?? null} onChange={(num) => setField(model, tier.key, num)} />
                            <div className="mt-0.5 text-[11px] text-[#726d67]">
                                {tier.label}：{tier.hint}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-2">
            {models.map((model) => {
                const pricing = value[model];
                const enabled = Boolean(pricing);
                const open = Boolean(expanded[model]);
                const allowedTiers = capabilityTiers(model);
                const kind = inferPricingKind(model, capabilities?.[model]?.kind);
                const primaryGroups = primaryGroupsForKind(kind);
                const allOpen = Boolean(showAllFields[model]);
                const shownGroups = allOpen ? [...primaryGroups, ...ALL_GROUPS.filter((group) => !primaryGroups.includes(group))] : primaryGroups;
                return (
                    <div key={model} className="rounded-lg border border-[#e2dfdc] bg-[#f9f7f5]">
                        <div className="flex items-center justify-between gap-2 px-3 py-2">
                            <button type="button" className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left" onClick={() => toggleExpanded(model)}>
                                {open ? <ChevronDown className="size-4 shrink-0 text-[#726d67]" /> : <ChevronRight className="size-4 shrink-0 text-[#726d67]" />}
                                <span className="truncate font-mono text-sm">{model}</span>
                                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[11px] ${KIND_BADGE_CLASS[kind]}`}>{PRICING_KIND_LABEL[kind]}</span>
                                {enabled ? <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-600">已定价</span> : <span className="shrink-0 text-[11px] text-[#726d67]">内置草案</span>}
                            </button>
                            <Switch size="small" checked={enabled} onChange={(checked) => setEnabled(model, checked)} />
                        </div>
                        {open ? (
                            <div className="border-t border-[#e2dfdc] px-3 py-3">
                                {enabled ? (
                                    <div className="space-y-2">
                                        {shownGroups.map((group) => renderGroup(model, kind, pricing, group, allowedTiers))}
                                        <button
                                            type="button"
                                            className="cursor-pointer text-[11px] text-[#726d67] underline decoration-dotted underline-offset-2 hover:text-[#332f2a]"
                                            onClick={() => setShowAllFields((prev) => ({ ...prev, [model]: !prev[model] }))}
                                        >
                                            {allOpen ? `只看${PRICING_KIND_LABEL[kind]}字段` : "显示全部字段（文本 / 图片 / 视频）"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="text-xs leading-5 text-[#726d67]">{DISABLED_HINT[kind]}</div>
                                )}
                            </div>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}
