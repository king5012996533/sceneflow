"use client";

import { useState } from "react";
import { InputNumber, Switch } from "antd";
import { ChevronDown, ChevronRight } from "lucide-react";

import { hasTextTokenPricing, hasVideoCostPricing, type ModelPricing } from "@/lib/credit-pricing";
import { IMAGE_KIND, IMAGE_QUALITY_TIER_OPTIONS, normalizeImageCapability, type ImageQuality, type ModelCapabilitySpec } from "@/lib/model-capability-spec";
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

/** 单个数字价字段的键（imageQualityCredits 是一张表，不走这一套） */
type NumericPricingKey = Exclude<keyof ModelPricing, "imageQualityCredits">;

const PRICING_FIELDS: Array<{ key: NumericPricingKey; label: string; hint: string }> = [
    { key: "audioCredits", label: "音频生成（每次）", hint: "留空 = 内置 1 积分" },
    { key: "textCredits", label: "文本 / 工具（每次）", hint: "留空 = 内置 0 积分（不扣）" },
];

/**
 * 文本类的按 token 计价字段（元 / 百万 token）。
 *
 * 与上面两组积分价的关键差别：**这里的小数不能取整**。「¥0.5 / 百万 token」向下取整就是 0，
 * 等于白送；而且上游价目表本身就是这个单位（DeepSeek 写 ¥2、OpenAI 写 $/1M），
 * 换算成「积分/千 token」会让倍率一动就得重填一遍。
 */
const TEXT_COST_FIELDS: Array<{ key: NumericPricingKey; label: string; hint: string }> = [
    { key: "textInputCostYuanPerMillion", label: "输入成本", hint: "缓存未命中的那部分，如 2" },
    { key: "textOutputCostYuanPerMillion", label: "输出成本", hint: "如 8" },
    { key: "textCachedInputCostYuanPerMillion", label: "缓存命中输入成本", hint: "留空 = 按输入价计（不给默认折扣）" },
];

/** 图片分档定价：1K 是基础价，其余档留空 = 沿用 1K 价（后台不配 = 与过去完全一致） */
const IMAGE_TIERS: Array<{ key: NumericPricingKey; tier: ImageResolutionTier; label: string; hint: string }> = [
    { key: "imageCredits", tier: "1k", label: "1K（基础档）", hint: "留空 = 内置草案（大多模型 2 积分）" },
    { key: "imageCredits15k", tier: "1.5k", label: "1.5K", hint: "留空 = 按 1K 价扣（方舟 pro 官方与 1K 同价）" },
    { key: "imageCredits2k", tier: "2k", label: "2K", hint: "留空 = 按 1K 价扣" },
    { key: "imageCredits3k", tier: "3k", label: "3K", hint: "留空 = 按 1K 价扣（方舟 lite 一口价）" },
    { key: "imageCredits4k", tier: "4k", label: "4K", hint: "留空 = 按 1K 价扣" },
];

/**
 * 画质档位轴的模型（标了 qualityTiers）按「画质档」逐档定价，不再用 1K/2K/4K 三个像素桶。
 *
 * 起因（2026-09-19 老板反馈「最高档 0.5 美金一张，低的 0.01」）：上游六个档的成本跨度是 50 倍，
 * 三个桶最多表达三档，挤在一起必然有档位赔钱（实测「极高 / 最高 / 自动」全落在 4K 桶里，
 * 按最贵那档收都不够成本）。所以改成逐档一个价框：低 = 基础价 imageCredits，
 * 其余写进 imageQualityCredits，未填的档位回落基础价。
 */
const IMAGE_QUALITY_COST_REFERENCE: Partial<Record<ImageQuality, string>> = {
    low: "$0.012",
    medium: "$0.047",
    high: "$0.128",
    xhigh: "$0.25",
    max: "$0.50",
    auto: "$0.25（与「极高」同价）",
};

/** 该模型要配哪几档价：只列它在能力标定里勾了的档位 */
function qualityTierPriceFields(tiers: ImageQuality[]): Array<{ quality: ImageQuality; label: string; hint: string }> {
    return IMAGE_QUALITY_TIER_OPTIONS.filter((item) => tiers.includes(item.value)).map((item) => ({
        quality: item.value,
        label: item.value === "low" ? `${item.label}（基础档）` : item.label,
        hint: item.value === "low" ? "也是其它档位没填时的兜底价" : "留空 = 按「低」档价扣",
    }));
}

/** 视频分档定价：高清档（2K/1080p）与标准档（768P/720p 等）分开配置 */
const VIDEO_TIERS: Array<{ key: NumericPricingKey; label: string; hint: string }> = [
    { key: "videoCreditsStandard", label: "标准档（768P/720p）", hint: "如 20：768P 等标准分辨率每条扣 20" },
    { key: "videoCreditsHigh", label: "高清档（2K/1080p）", hint: "如 40：2K 等高清分辨率每条扣 40" },
];

/**
 * 视频的按秒成本价（元/秒），四档 = 清晰度 × 是否草稿，与上游价目表一一对应。
 *
 * 为什么需要它（2026-09-21 老板反馈「价格不对」）：Replicate 系的模型（prunaai/p-video）按
 * **输出秒数**收费，而按条一口价与时长无关 —— 20 秒 1080p 成本 ¥5.68、按 20 积分（¥2）卖，
 * 每出一条赔 ¥3.68。这里填上游的每秒价，售价由运营配置里的「视频计价倍率」换算。
 */
const VIDEO_COST_FIELDS: Array<{ key: NumericPricingKey; label: string; hint: string }> = [
    { key: "videoCostYuanPerSecondStandard", label: "720p 标准（元/秒）", hint: "上游 $0.02/秒 ≈ ¥0.142" },
    { key: "videoCostYuanPerSecondStandardDraft", label: "720p 草稿（元/秒）", hint: "上游 $0.005/秒 ≈ ¥0.0355" },
    { key: "videoCostYuanPerSecondHigh", label: "1080p 标准（元/秒）", hint: "上游 $0.04/秒 ≈ ¥0.284" },
    { key: "videoCostYuanPerSecondHighDraft", label: "1080p 草稿（元/秒）", hint: "上游 $0.01/秒 ≈ ¥0.071" },
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
    video: "未启用：该模型出片按「全局默认（运营配置）→ 内置草案（每条 15–30 积分）」扣。打开开关可按条分档定价，或按上游的每秒成本价改成按秒计价。",
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
        const view = normalizeImageCapability(spec);
        // 画质档位轴的模型没有像素档可言，别拿 1K/2K/4K 去标「能力未勾选」
        return view.qualityTiers?.length ? null : view.resolutions;
    };

    /** 该模型是不是画质档位轴；是则返回它标定的档位（价格要逐档配，不再用像素桶） */
    const qualityAxisTierList = (model: string): ImageQuality[] => {
        const spec = capabilities?.[model];
        if (!spec || spec.kind !== IMAGE_KIND) return [];
        return normalizeImageCapability(spec).qualityTiers ?? [];
    };

    if (!models.length) {
        return <div className="rounded-lg border border-dashed border-[#e2dfdc] px-3 py-4 text-center text-xs text-[#726d67]">先在「绑定模型」里填写模型名（逗号分隔），即可逐模型设置积分定价。</div>;
    }

    const toggleExpanded = (model: string) => setExpanded((prev) => ({ ...prev, [model]: !prev[model] }));

    const setEnabled = (model: string, checked: boolean) => {
        onChange({ ...value, [model]: checked ? {} : undefined });
        if (checked) setExpanded((prev) => ({ ...prev, [model]: true }));
    };

    /** 落一条逐模型定价：整条空了就把模型摘掉（留个空对象会被当成「已定价」，实际全走内置草案） */
    const commitPricing = (model: string, next: ModelPricing) => {
        if (!Object.keys(next).length) {
            const rest = { ...value };
            delete rest[model];
            onChange(rest);
            return;
        }
        onChange({ ...value, [model]: next });
    };

    /** 积分价字段：整数（积分没有小数） */
    const setField = (model: string, key: NumericPricingKey, num: number | null) => {
        const next = { ...(value[model] || {}) };
        if (num === null || num === undefined) delete next[key];
        else next[key] = Math.max(0, Math.floor(num));
        commitPricing(model, next);
    };

    /**
     * token 成本字段（元 / 百万 token）：保留两位小数，**不能**跟着积分价一起取整。
     * 上限与服务端清洗保持一致（> ¥10000/百万 视为填错，宁可当场拦住也不留下一个脏价）。
     */
    const setCostField = (model: string, key: NumericPricingKey, num: number | null) => {
        const next = { ...(value[model] || {}) };
        if (num === null || num === undefined) delete next[key];
        else {
            if (!Number.isFinite(num) || num < 0 || num > 10_000) return; // 越界不改（服务端也会丢，别让界面显示成保存成功）
            next[key] = Math.round(num * 100) / 100;
        }
        commitPricing(model, next);
    };

    /**
     * 视频每秒成本字段（元/秒）：保留**四位**小数。
     * 与 token 成本价的两位不同，这里的数小一个量级（草稿档 ¥0.0355），
     * 两位小数会把它抹成 ¥0.04（差 13%），而草稿档恰好全在这个精度上。
     * 上限与服务端清洗一致（> 1000 元/秒 视为填错，宁可当场不改也不留下脏价）。
     */
    const setPerSecondCostField = (model: string, key: NumericPricingKey, num: number | null) => {
        const next = { ...(value[model] || {}) };
        if (num === null || num === undefined) delete next[key];
        else {
            if (!Number.isFinite(num) || num < 0 || num > 1000) return;
            next[key] = Math.round(num * 10_000) / 10_000;
        }
        commitPricing(model, next);
    };

    /** 画质档位轴的逐档价：低档走基础价 imageCredits，其余写进 imageQualityCredits */
    const setQualityTierPrice = (model: string, quality: ImageQuality, num: number | null) => {
        if (quality === "low") {
            setField(model, "imageCredits", num);
            return;
        }
        const next = { ...(value[model] || {}) };
        const table = { ...(next.imageQualityCredits || {}) };
        if (num === null || num === undefined) delete table[quality];
        else table[quality] = Math.max(0, Math.floor(num));
        if (Object.keys(table).length) next.imageQualityCredits = table;
        else delete next.imageQualityCredits;
        commitPricing(model, next);
    };

    /** 渲染一组定价字段：同组字段都写在同一个 pricing 对象上 */
    const renderGroup = (model: string, kind: PricingKind, pricing: ModelPricing | undefined, group: PricingGroupId, allowedTiers: ImageResolutionTier[] | null, qualityAxisTiers: ImageQuality[]) => {
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
                    {kind === "text" ? (
                        <div className="mt-2.5 rounded-md border border-dashed border-[#d9d4ce] bg-white/70 p-2.5">
                            <div className="mb-1 flex items-center gap-2 text-xs text-[#332f2a]">
                                按 token 计价（元 / 百万 token）
                                {hasTextTokenPricing(pricing) ? <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-600">已启用按量结算</span> : null}
                            </div>
                            <div className="mb-1.5 text-[11px] leading-4 text-[#726d67]">
                                这里填的是<span className="font-medium text-[#332f2a]">我们的成本</span>（照上游价目表原样填）。填了输入或输出成本，这个模型就改成「上游回报了用量才结算」，上面的「每次」价失效 —— 一轮花多少不由我们猜，由上游报的 token
                                数决定。售价 = 成本 × 运营配置里的「文本计价倍率」。留空 = 这个模型仍然按次计价，行为与过去完全一样。
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {TEXT_COST_FIELDS.map((field) => (
                                    <div key={field.key}>
                                        <div className="mb-1 text-xs text-[#332f2a]">{field.label}</div>
                                        <InputNumber className="w-full" min={0} max={10000} precision={2} placeholder="留空 = 不按量" value={pricing?.[field.key] ?? null} onChange={(num) => setCostField(model, field.key, num)} />
                                        <div className="mt-0.5 text-[11px] text-[#726d67]">{field.hint}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-1.5 text-[11px] leading-4 text-[#a49f9a]">
                                例：输入 ¥2 / 输出 ¥8，一轮 3,000 输入 + 600 输出成本约 ¥0.011；倍率 2 后不足 1 积分，按 1 积分收（¥0.1）。 缓存命中数由上游回报，命中部分按缓存价计，不会重复按输入价再算一遍。
                            </div>
                        </div>
                    ) : null}
                </div>
            );
        }
        if (group === "image") {
            if (qualityAxisTiers.length) {
                const tierFields = qualityTierPriceFields(qualityAxisTiers);
                return (
                    <div key={group} className="rounded-lg border border-[#e9e6e3] bg-white/60 p-2.5">
                        <div className="mb-1.5 text-xs text-[#332f2a]">图片生成（每张，按画质档逐档定价）</div>
                        <div className="grid grid-cols-3 gap-3">
                            {tierFields.map((item) => {
                                const cost = IMAGE_QUALITY_COST_REFERENCE[item.quality];
                                return (
                                    <div key={item.quality}>
                                        <div className="mb-1 text-xs text-[#332f2a]">{item.label}</div>
                                        <InputNumber
                                            className="w-full"
                                            min={0}
                                            precision={0}
                                            placeholder="留空 = 按基础档"
                                            value={item.quality === "low" ? (pricing?.imageCredits ?? null) : (pricing?.imageQualityCredits?.[item.quality] ?? null)}
                                            onChange={(num) => setQualityTierPrice(model, item.quality, num)}
                                        />
                                        <div className="mt-0.5 text-[11px] text-[#726d67]">
                                            {item.hint}
                                            {cost ? <span className="ml-1 text-[#a49f9a]">上游 {cost}/张</span> : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-1.5 text-[11px] leading-4 text-[#726d67]">
                            逐档只影响扣费，不影响上游出图。参考「1 积分 = 0.1 元」时各档成本约：低 0.9 / 中 3.3 / 高 9.1 / 极高 17.8 / 最高 35.5 / 自动 17.8 积分（按 1 美元 ≈ 7.1 元折算）——低于成本的档位每出一张图都在赔钱，改价前先对一眼。
                        </div>
                    </div>
                );
            }
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
                <div className="mt-2.5 rounded-md border border-dashed border-[#d9d4ce] bg-white/70 p-2.5">
                    <div className="mb-1 flex items-center gap-2 text-xs text-[#332f2a]">
                        按秒计价（元/秒，四档）
                        {hasVideoCostPricing(pricing) ? <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-600">已启用按秒计价</span> : null}
                    </div>
                    <div className="mb-1.5 text-[11px] leading-4 text-[#726d67]">
                        这里填的是<span className="font-medium text-[#332f2a]">我们的成本</span>（照上游价目表的每秒价填，美元按 1 美元 ≈ 7.1 元折成元）。
                        四档里任意一档填了，这个模型就改成「秒数 × 每秒成本 × 运营配置里的视频计价倍率」计价，上面那两栏「每条」价失效 ——
                        上游是按**输出秒数**收的，按条一口价卖的话 20 秒 1080p 会比成本还低。
                        只填标准档也能跑，但高清档会按标准档算（成本会被低估），建议四档填全。留空 = 保持按条计价，行为与过去完全一样。
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {VIDEO_COST_FIELDS.map((field) => (
                            <div key={field.key}>
                                <div className="mb-1 text-xs text-[#332f2a]">{field.label}</div>
                                <InputNumber
                                    className="w-full"
                                    min={0}
                                    max={1000}
                                    step={0.001}
                                    precision={4}
                                    placeholder="留空 = 按条计价"
                                    value={pricing?.[field.key] ?? null}
                                    onChange={(num) => setPerSecondCostField(model, field.key, num)}
                                />
                                <div className="mt-0.5 text-[11px] text-[#726d67]">{field.hint}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-1.5 text-[11px] leading-4 text-[#a49f9a]">
                        例：720p 标准 ¥0.142/秒，20 秒成本 ¥2.84；倍率 3 后 85.2 积分，向上取整按 86 积分收（1 积分 = ¥0.1）。
                        草稿档成本是标准档的 1/4，别照抄标准档的价。
                    </div>
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
                const qualityAxisTiers = qualityAxisTierList(model);
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
                                        {shownGroups.map((group) => renderGroup(model, kind, pricing, group, allowedTiers, qualityAxisTiers))}
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
