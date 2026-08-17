"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { App } from "antd";

import { createModelChannel, useConfigStore } from "@/stores/use-config-store";

export function ClientRootInit({ children }: { children: ReactNode }) {
    const { message } = App.useApp();
    const handledConfigParams = useRef(false);
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const config = useConfigStore((state) => state.config);

    useEffect(() => {
        if (handledConfigParams.current) return;
        const searchParams = new URLSearchParams(window.location.search);
        const baseUrl = searchParams.get("baseUrl") || searchParams.get("baseurl");
        if (!baseUrl) return;
        handledConfigParams.current = true;
        searchParams.delete("baseUrl");
        searchParams.delete("baseurl");
        window.history.replaceState(null, "", `${window.location.pathname}${searchParams.size ? `?${searchParams}` : ""}${window.location.hash}`);
        const firstChannel = config.channels[0];
        updateConfig(
            "channels",
            firstChannel
                ? config.channels.map((channel, index) =>
                      index === 0
                          ? {
                                ...channel,
                                ...(baseUrl ? { baseUrl } : {}),
                            }
                          : channel,
                  )
                : [createModelChannel({ id: "default", name: "默认渠道", baseUrl: baseUrl || undefined })],
        );
        if (baseUrl) updateConfig("baseUrl", baseUrl);
        message.success("已导入渠道 Base URL");
    }, [config.channels, message, updateConfig]);

    return <>{children}</>;
}
