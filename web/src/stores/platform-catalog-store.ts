"use client";

import { useEffect } from "react";
import { create } from "zustand";

import { apiPath } from "@/lib/app-paths";
import type { ModelCapabilitySpec } from "@/lib/model-capability-spec";
import type { ModelPricing } from "@/lib/credit-pricing";
import { modelOptionName } from "@/stores/use-config-store";

/**
 * 平台模型能力目录（客户端缓存）。
 *
 * 数据源：/api/platform/catalog（汇总后台所有启用凭证的逐模型能力标定，不含 Key）。
 * 未加载/加载失败/该模型无能力标定 → 返回 undefined，调用方退回内置默认（与现状一致）。
 * 约 60 秒内后台配置生效（TTL 刷新）。
 */

export type PlatformCatalogModel = {
    model: string;
    provider: string;
    baseUrl: string;
    capabilities: ModelCapabilitySpec | null;
    /** 后台逐模型积分定价（null = 未配置，扣费走内置草案） */
    pricing?: ModelPricing | null;
};

type PlatformCatalogStore = {
    /** 平台模型目录完整列表（admin 后台启用的 ProviderCredential 模型），模型选项的唯一来源 */
    models: PlatformCatalogModel[];
    byModel: Record<string, ModelCapabilitySpec | undefined>;
    byPricing: Record<string, ModelPricing | undefined>;
    loadedAt: number;
    lastAttemptAt: number;
    load: () => Promise<void>;
};

const CATALOG_TTL_MS = 60_000;

export const usePlatformCatalogStore = create<PlatformCatalogStore>((set, get) => ({
    models: [],
    byModel: {},
    byPricing: {},
    loadedAt: 0,
    lastAttemptAt: 0,
    load: async () => {
        const now = Date.now();
        if (now - get().lastAttemptAt < CATALOG_TTL_MS) return;
        set({ lastAttemptAt: now });
        try {
            const res = await fetch(apiPath("/api/platform/catalog"), { credentials: "include" });
            if (!res.ok) return;
            const data = (await res.json()) as { models?: PlatformCatalogModel[] };
            const catalogModels = data.models ?? [];
            const byModel: Record<string, ModelCapabilitySpec | undefined> = {};
            const byPricing: Record<string, ModelPricing | undefined> = {};
            for (const item of catalogModels) {
                if (item.capabilities) byModel[item.model] = item.capabilities;
                if (item.pricing) byPricing[item.model] = item.pricing;
            }
            set({ models: catalogModels, byModel, byPricing, loadedAt: Date.now() });
        } catch {
            // 静默失败：目录拿不到时前端退回内置默认
        }
    },
}));

/** 非 Hook 读取（服务/工具函数用）：能力标定，没有则 undefined */
export function getPlatformCapability(model: string): ModelCapabilitySpec | undefined {
    const state = usePlatformCatalogStore.getState();
    if (Date.now() - state.lastAttemptAt > CATALOG_TTL_MS) {
        // 延迟到事件循环外触发，避免渲染期间同步 setState 告警
        setTimeout(() => void usePlatformCatalogStore.getState().load(), 0);
    }
    return state.byModel[modelOptionName(model)];
}

/** 非 Hook 读取（积分预检/成本展示用）：后台逐模型定价，没有则 undefined（调用方退回内置草案） */
export function getPlatformPricing(model: string): ModelPricing | undefined {
    const state = usePlatformCatalogStore.getState();
    if (Date.now() - state.lastAttemptAt > CATALOG_TTL_MS) {
        // 延迟到事件循环外触发，避免渲染期间同步 setState 告警
        setTimeout(() => void usePlatformCatalogStore.getState().load(), 0);
    }
    return state.byPricing[modelOptionName(model)];
}

/** Hook 读取（设置面板用）：能力标定，没有则 undefined */
export function usePlatformCapability(model: string): ModelCapabilitySpec | undefined {
    const byModel = usePlatformCatalogStore((s) => s.byModel);
    const lastAttemptAt = usePlatformCatalogStore((s) => s.lastAttemptAt);
    useEffect(() => {
        if (Date.now() - lastAttemptAt > CATALOG_TTL_MS) void usePlatformCatalogStore.getState().load();
    }, [lastAttemptAt]);
    return byModel[modelOptionName(model)];
}
