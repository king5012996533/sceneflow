"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

import { usePlatformCatalogStore } from "@/stores/platform-catalog-store";
import { useConfigStore } from "@/stores/use-config-store";

export function ClientRootInit({ children }: { children: ReactNode }) {
    useEffect(() => {
        // 平台托管模型：启动即拉取平台模型目录（/api/platform/catalog），
        // 目录就绪后重建前端模型列表（管理员后台配置的模型是前端唯一模型来源）。
        void usePlatformCatalogStore.getState().load();
        const unsubscribe = usePlatformCatalogStore.subscribe((state, prevState) => {
            if (state.models !== prevState.models || state.loadedAt !== prevState.loadedAt) {
                useConfigStore.getState().reconcilePlatformModels(state.models);
            }
        });
        return unsubscribe;
    }, []);

    return <>{children}</>;
}
