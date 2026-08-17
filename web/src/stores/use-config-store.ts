"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { nanoid } from "nanoid";

import { scopedStorageKey } from "@/lib/user-data-scope";
import type { PlatformCatalogModel } from "@/stores/platform-catalog-store";

export type ApiCallFormat = "openai" | "gemini" | "replicate" | "minimax";

export type ModelChannel = {
    id: string;
    name: string;
    baseUrl: string;
    apiKey: string;
    apiFormat: ApiCallFormat;
    models: string[];
};

export type AiConfig = {
    channelMode: "remote" | "local";
    baseUrl: string;
    apiKey: string;
    apiFormat: ApiCallFormat;
    channels: ModelChannel[];
    model: string;
    imageModel: string;
    videoModel: string;
    textModel: string;
    audioModel: string;
    audioVoice: string;
    audioFormat: string;
    audioSpeed: string;
    audioInstructions: string;
    videoSeconds: string;
    vquality: string;
    videoGenerateAudio: string;
    videoWatermark: string;
    videoDraft: string;
    systemPrompt: string;
    models: string[];
    imageModels: string[];
    videoModels: string[];
    textModels: string[];
    audioModels: string[];
    quality: string;
    size: string;
    count: string;
    canvasImageCount: string;
};

export type WebdavSyncConfig = {
    proxyMode: "direct" | "nextjs";
    url: string;
    username: string;
    password: string;
    directory: string;
    lastSyncedAt: string;
};

export const CONFIG_STORE_KEY = "infinite-canvas:ai_config_store";
export type ModelCapability = "image" | "video" | "text" | "audio";
const CHANNEL_MODEL_SEPARATOR = "::";
const OPENAI_BASE_URL = "https://api.openai.com";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com";
const REPLICATE_BASE_URL = "https://api.replicate.com/v1";

export const defaultConfig: AiConfig = {
    // 平台托管模式：渠道/模型列表由管理员后台的 ProviderCredential 决定，前端启动时经
    // reconcilePlatformModels 用 /api/platform/catalog 重建；此处不再保留任何占位渠道/模型。
    channelMode: "remote",
    baseUrl: "",
    apiKey: "",
    apiFormat: "openai",
    channels: [],
    model: "",
    imageModel: "",
    videoModel: "",
    textModel: "",
    audioModel: "",
    audioVoice: "alloy",
    audioFormat: "mp3",
    audioSpeed: "1",
    audioInstructions: "",
    videoSeconds: "6",
    vquality: "720",
    videoGenerateAudio: "true",
    videoWatermark: "false",
    videoDraft: "true",
    systemPrompt: "",
    models: [],
    imageModels: [],
    videoModels: [],
    textModels: [],
    audioModels: [],
    quality: "auto",
    size: "1:1",
    count: "1",
    canvasImageCount: "3",
};

export const defaultWebdavSyncConfig: WebdavSyncConfig = {
    proxyMode: "direct",
    url: "",
    username: "",
    password: "",
    directory: "infinite-canvas",
    lastSyncedAt: "",
};

function sanitizePersistedWebdavConfig(webdav: WebdavSyncConfig): WebdavSyncConfig {
    return {
        ...webdav,
        username: "",
        password: "",
    };
}

function sanitizeHydratedWebdavConfig(webdav: Partial<WebdavSyncConfig>): WebdavSyncConfig {
    return sanitizePersistedWebdavConfig({ ...defaultWebdavSyncConfig, ...webdav });
}

const configStorage: StateStorage = {
    getItem: (name) => {
        if (typeof window === "undefined") return null;
        const key = scopedStorageKey(name);
        const scopedValue = window.localStorage.getItem(key);
        const legacyValue = window.localStorage.getItem(name);
        const value = scopedValue || legacyValue;
        const sanitized = sanitizePersistedConfigStorageValue(value);
        if (sanitized) window.localStorage.setItem(key, sanitized);
        if (legacyValue) window.localStorage.removeItem(name);
        return sanitized;
    },
    setItem: (name, value) => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(scopedStorageKey(name), sanitizePersistedConfigStorageValue(value) || value);
        window.localStorage.removeItem(name);
    },
    removeItem: (name) => {
        if (typeof window === "undefined") return;
        window.localStorage.removeItem(scopedStorageKey(name));
        window.localStorage.removeItem(name);
    },
};

function sanitizePersistedConfigStorageValue(value: string | null) {
    if (!value) return value;
    try {
        const payload = JSON.parse(value) as { state?: Partial<ConfigStore> };
        if (!payload.state?.webdav) return value;
        payload.state.webdav = sanitizePersistedWebdavConfig({ ...defaultWebdavSyncConfig, ...payload.state.webdav });
        return JSON.stringify(payload);
    } catch {
        return value;
    }
}

type ConfigStore = {
    config: AiConfig;
    webdav: WebdavSyncConfig;
    /** 平台模型目录快照（reconcilePlatformModels 写入，不持久化；resolveModelChannel 依赖它做平台路由） */
    platformCatalog: PlatformCatalogModel[];
    updateConfig: <K extends keyof AiConfig>(key: K, value: AiConfig[K]) => void;
    updateWebdavConfig: <K extends keyof WebdavSyncConfig>(key: K, value: WebdavSyncConfig[K]) => void;
    resetWebdavConfig: () => void;
    isAiConfigReady: (config: AiConfig, model: string) => boolean;
    /** 用平台模型目录重建模型列表/选中项（管理员后台配置的模型是前端唯一模型来源） */
    reconcilePlatformModels: (catalogModels: PlatformCatalogModel[]) => void;
    hydrateFromServer: () => Promise<void>;
};

function isVideoModelName(model: string) {
    const value = modelOptionName(model).toLowerCase();
    return value.includes("seedance") || value.includes("video") || value.includes("sora") || value.includes("veo") || value.includes("kling") || value.includes("wan") || value.includes("hailuo");
}

function isImageModelName(model: string) {
    const value = modelOptionName(model).toLowerCase();
    return (
        !isVideoModelName(model) &&
        !isAudioModelName(model) &&
        (value.includes("seedream") ||
            value.includes("gpt-image") ||
            value.includes("image") ||
            value.includes("dall-e") ||
            value.includes("dalle") ||
            value.includes("imagen") ||
            value.includes("flux") ||
            value.includes("sdxl") ||
            value.includes("stable-diffusion") ||
            value.includes("midjourney"))
    );
}

function isAudioModelName(model: string) {
    const value = modelOptionName(model).toLowerCase();
    return value.includes("audio") || value.includes("tts") || value.includes("speech") || value.includes("voice") || value.includes("music") || value.includes("sound");
}

function isTextModelName(model: string) {
    return !isImageModelName(model) && !isVideoModelName(model) && !isAudioModelName(model);
}

export function modelMatchesCapability(model: string, capability?: ModelCapability) {
    if (!capability) return true;
    if (capability === "image") return isImageModelName(model);
    if (capability === "video") return isVideoModelName(model);
    if (capability === "audio") return isAudioModelName(model);
    return isTextModelName(model);
}

export function filterModelsByCapability(models: string[], capability?: ModelCapability) {
    return capability ? models.filter((model) => modelMatchesCapability(model, capability)) : models;
}

/**
 * 平台模型能力分类：优先使用管理员在后台逐模型标定的 capabilities.kind
 * （image / seedance-video / video）；text / audio 无标定，退回名称启发式。
 */
export function classifyCatalogModel(item: PlatformCatalogModel): ModelCapability {
    const kind = item.capabilities?.kind;
    if (kind === "image") return "image";
    if (kind === "seedance-video" || kind === "video") return "video";
    const name = modelOptionName(item.model);
    if (isVideoModelName(name)) return "video";
    if (isImageModelName(name)) return "image";
    if (isAudioModelName(name)) return "audio";
    return "text";
}

export function selectableModelsByCapability(config: AiConfig, capability?: ModelCapability) {
    if (!capability) return config.models;
    return config[modelListKey(capability)];
}

function modelListKey(capability: ModelCapability) {
    return `${capability}Models` as "imageModels" | "videoModels" | "textModels" | "audioModels";
}

function isAiConfigReady(config: AiConfig, model: string): boolean {
    const channel = resolveModelChannel(config, model);
    // 平台 Key 化：API Key 不再必需（服务端注入平台 Key），只需模型 + Base URL 能路由到代理
    return Boolean(model.trim() && channel.baseUrl.trim());
}

export const useConfigStore = create<ConfigStore>()(
    persist(
        (set, get) => ({
            config: defaultConfig,
            webdav: defaultWebdavSyncConfig,
            platformCatalog: [],
            updateConfig: (key, value) => {
                set((state) => {
                    const newConfig = { ...state.config, [key]: value };
                    // 异步同步到服务器，不阻塞 UI
                    syncConfigToServer(newConfig, state.webdav);
                    return { config: newConfig };
                });
            },
            updateWebdavConfig: (key, value) => {
                set((state) => {
                    const newWebdav = { ...state.webdav, [key]: value };
                    syncConfigToServer(state.config, newWebdav);
                    return { webdav: newWebdav };
                });
            },
            resetWebdavConfig: () => set({ webdav: defaultWebdavSyncConfig }),
            isAiConfigReady: (config, model) => isAiConfigReady(config, model),
            reconcilePlatformModels: (catalogModels) => {
                const imageModels: string[] = [];
                const videoModels: string[] = [];
                const textModels: string[] = [];
                const audioModels: string[] = [];
                const pushUnique = (bucket: string[], name: string) => {
                    if (name && !bucket.includes(name)) bucket.push(name);
                };
                for (const item of catalogModels) {
                    const name = modelOptionName(item.model);
                    const capability = classifyCatalogModel(item);
                    if (capability === "image") pushUnique(imageModels, name);
                    else if (capability === "video") pushUnique(videoModels, name);
                    else if (capability === "audio") pushUnique(audioModels, name);
                    else pushUnique(textModels, name);
                }
                const models = [...imageModels, ...videoModels, ...textModels, ...audioModels];
                set((state) => {
                    const current = state.config;
                    const pick = (selected: string, list: string[]) => (selected && list.includes(selected) ? selected : list[0] || "");
                    const nextConfig: AiConfig = {
                        ...current,
                        // 平台托管：渠道由管理员后台统一配置，前端不再维护任何用户渠道
                        channelMode: "remote",
                        channels: [],
                        models,
                        imageModels,
                        videoModels,
                        textModels,
                        audioModels,
                        model: pick(current.model, models),
                        imageModel: pick(current.imageModel, imageModels),
                        videoModel: pick(current.videoModel, videoModels),
                        textModel: pick(current.textModel, textModels),
                        audioModel: pick(current.audioModel, audioModels),
                    };
                    syncConfigToServer(nextConfig, state.webdav);
                    return { config: nextConfig, platformCatalog: catalogModels };
                });
            },
            hydrateFromServer: async () => {
                const serverData = await loadConfigFromServer();
                if (!serverData?.config) return;
                const serverConfig = serverData.config as Partial<AiConfig>;
                const serverWebdav = serverData.webdav as Partial<WebdavSyncConfig>;
                set((state) => {
                    const mergedConfig = { ...state.config, ...serverConfig };
                    const channels = normalizeChannels(mergedConfig);
                    const models = modelOptionsFromChannels(channels);
                    return {
                        config: {
                            ...mergedConfig,
                            channels,
                            models,
                            imageModels: Array.isArray(serverConfig.imageModels) ? serverConfig.imageModels : filterModelsByCapability(models, "image"),
                            videoModels: Array.isArray(serverConfig.videoModels) ? serverConfig.videoModels : filterModelsByCapability(models, "video"),
                            textModels: Array.isArray(serverConfig.textModels) ? serverConfig.textModels : filterModelsByCapability(models, "text"),
                            audioModels: Array.isArray(serverConfig.audioModels) ? serverConfig.audioModels : filterModelsByCapability(models, "audio"),
                        },
                        webdav: sanitizeHydratedWebdavConfig(serverWebdav),
                    };
                });
                // 竞态防护：服务器回填可能晚于目录加载并覆盖平台模型列表 →
                // 目录已就绪时立即用目录重建，保证旧持久化列表永远打不过平台目录。
                const catalogModels = useConfigStore.getState().platformCatalog;
                if (catalogModels.length) useConfigStore.getState().reconcilePlatformModels(catalogModels);
            },
        }),
        {
            name: CONFIG_STORE_KEY,
            storage: createJSONStorage(() => configStorage),
            partialize: (state) => ({ config: state.config, webdav: sanitizePersistedWebdavConfig(state.webdav) }),
            merge: (persisted, current) => {
                const persistedState = (persisted || {}) as Partial<ConfigStore>;
                const persistedConfig = (persistedState.config || {}) as Partial<AiConfig>;
                const persistedWebdav = (persistedState.webdav || {}) as Partial<WebdavSyncConfig>;
                const config = { ...defaultConfig, ...persistedConfig };
                if (!Array.isArray(persistedConfig.channels)) config.channels = [];
                const channels = normalizeChannels(config);
                const models = modelOptionsFromChannels(channels);
                return {
                    ...current,
                    webdav: sanitizeHydratedWebdavConfig(persistedWebdav),
                    config: {
                        ...config,
                        channelMode: persistedConfig.channelMode || config.channelMode,
                        apiFormat: normalizeApiFormat(config.apiFormat),
                        channels,
                        models,
                        imageModel: normalizeModelOptionValue(config.imageModel || config.model, channels),
                        videoModel: normalizeModelOptionValue(config.videoModel, channels),
                        textModel: normalizeModelOptionValue(config.textModel || config.model, channels),
                        audioModel: normalizeModelOptionValue(config.audioModel || defaultConfig.audioModel, channels),
                        audioVoice: config.audioVoice || defaultConfig.audioVoice,
                        audioFormat: config.audioFormat || defaultConfig.audioFormat,
                        audioSpeed: config.audioSpeed || defaultConfig.audioSpeed,
                        audioInstructions: config.audioInstructions || "",
                        videoSeconds: config.videoSeconds || "6",
                        vquality: config.vquality || "720",
                        videoGenerateAudio: config.videoGenerateAudio || "true",
                        videoWatermark: config.videoWatermark || "false",
                        videoDraft: config.videoDraft || "true",
                        canvasImageCount: config.canvasImageCount || "3",
                        imageModels: Array.isArray(persistedConfig.imageModels) ? normalizeModelList(config.imageModels, channels) : filterModelsByCapability(models, "image"),
                        videoModels: Array.isArray(persistedConfig.videoModels) ? normalizeModelList(config.videoModels, channels) : filterModelsByCapability(models, "video"),
                        textModels: Array.isArray(persistedConfig.textModels) ? normalizeModelList(config.textModels, channels) : filterModelsByCapability(models, "text"),
                        audioModels: Array.isArray(persistedConfig.audioModels) ? normalizeModelList(config.audioModels, channels) : filterModelsByCapability(models, "audio"),
                    },
                };
            },
        },
    ),
);

function normalizeModelList(models: string[], channels: ModelChannel[]) {
    const allModelOptions = channels.flatMap((channel) => channel.models.map((model) => encodeChannelModel(channel.id, model)));
    return Array.from(new Set((models || []).map((model) => model.trim()).filter(Boolean)))
        .map((model) => normalizeModelOptionValue(model, channels))
        .filter((model) => !allModelOptions.length || allModelOptions.includes(model) || !isChannelModelValue(model));
}

export function useEffectiveConfig() {
    return useConfigStore((state) => state.config);
}

export function createModelChannel(channel?: Partial<ModelChannel>): ModelChannel {
    const apiFormat = normalizeApiFormat(channel?.apiFormat);
    return {
        id: channel?.id?.trim() || nanoid(),
        name: channel?.name?.trim() || "新渠道",
        baseUrl: channel?.baseUrl?.trim() || defaultBaseUrlForApiFormat(apiFormat),
        apiKey: channel?.apiKey || "",
        apiFormat,
        models: uniqueRawModels(channel?.models || []),
    };
}

export function encodeChannelModel(channelId: string, model: string) {
    return `${channelId}${CHANNEL_MODEL_SEPARATOR}${model.trim()}`;
}

export function isChannelModelValue(value: string) {
    return value.includes(CHANNEL_MODEL_SEPARATOR);
}

export function decodeChannelModel(value: string) {
    const index = value.indexOf(CHANNEL_MODEL_SEPARATOR);
    if (index < 0) return null;
    return { channelId: value.slice(0, index), model: value.slice(index + CHANNEL_MODEL_SEPARATOR.length) };
}

export function modelOptionName(value: string) {
    return decodeChannelModel(value)?.model || value;
}

export function modelOptionLabel(config: AiConfig, value: string): string {
    const decoded = decodeChannelModel(value);
    if (!decoded) {
        // 平台模型（无渠道前缀）：命中平台目录时标注「平台」，否则原样返回
        const channel = resolveModelChannel(config, value);
        return channel.id === "platform" ? `${modelOptionName(value)}（平台）` : value;
    }
    const channel = config.channels.find((item) => item.id === decoded.channelId);
    return channel ? `${decoded.model}（${channel.name}）` : decoded.model;
}

export function modelOptionsFromChannels(channels: ModelChannel[]) {
    return uniqueModelOptions(channels.flatMap((channel) => channel.models.map((model) => encodeChannelModel(channel.id, model))));
}

export function normalizeModelOptionValue(value: string | undefined, channels: ModelChannel[]) {
    const model = (value || "").trim();
    if (!model) return "";
    const decoded = decodeChannelModel(model);
    if (decoded) {
        const channel = channels.find((item) => item.id === decoded.channelId);
        return channel && channel.models.includes(decoded.model) ? model : "";
    }
    const channel = channels.find((item) => item.models.includes(model)) || channels[0];
    return channel && channel.models.includes(model) ? encodeChannelModel(channel.id, model) : model;
}

export function resolveModelChannel(config: AiConfig, value: string): ModelChannel {
    const decoded = decodeChannelModel(value);
    const model = decoded?.model || value;
    // 平台模型优先：管理员后台配置的模型统一走平台合成渠道（无用户 Key，由服务端代理注入平台 Key）
    if (!decoded) {
        const catalogItem = useConfigStore.getState().platformCatalog.find((item) => modelOptionName(item.model) === modelOptionName(model));
        if (catalogItem) {
            return createModelChannel({
                id: "platform",
                name: "平台",
                baseUrl: catalogItem.baseUrl,
                apiFormat: inferApiFormatFromBaseUrl(catalogItem.baseUrl) || "openai",
                models: [model],
            });
        }
    }
    const matched = decoded ? config.channels.find((channel) => channel.id === decoded.channelId) : config.channels.find((channel) => channel.models.includes(model));
    return matched || config.channels[0] || createModelChannel({ id: "default", name: "默认渠道", baseUrl: config.baseUrl, apiKey: config.apiKey, apiFormat: config.apiFormat, models: config.models.map(modelOptionName) });
}

export function resolveModelRequestConfig(config: AiConfig, value: string): AiConfig {
    const channel = resolveModelChannel(config, value);
    const apiFormat = inferApiFormatFromBaseUrl(channel.baseUrl) || channel.apiFormat;
    return {
        ...config,
        model: modelOptionName(value || config.model),
        baseUrl: channel.baseUrl,
        apiKey: channel.apiKey,
        apiFormat,
    };
}

function normalizeChannels(config: AiConfig) {
    const persistedChannels = Array.isArray(config.channels) ? config.channels : [];
    const channels = persistedChannels.map((channel, index) =>
        createModelChannel({
            ...channel,
            id: channel.id || (index === 0 ? "default" : `channel-${index + 1}`),
            name: channel.name || (index === 0 ? "默认渠道" : `渠道 ${index + 1}`),
            models: uniqueRawModels(channel.models || []),
        }),
    );
    if (!channels.length) {
        channels.push(
            createModelChannel({
                id: "default",
                name: "默认渠道",
                baseUrl: config.baseUrl || defaultConfig.baseUrl,
                apiKey: config.apiKey || "",
                apiFormat: config.apiFormat || defaultConfig.apiFormat,
                models: uniqueRawModels([...(config.models || []), config.model, config.imageModel, config.videoModel, config.textModel, config.audioModel]),
            }),
        );
    }
    return channels.map((channel) => ({ ...channel, models: uniqueRawModels(channel.models) }));
}

export function defaultBaseUrlForApiFormat(apiFormat: ApiCallFormat) {
    if (apiFormat === "gemini") return GEMINI_BASE_URL;
    if (apiFormat === "replicate") return REPLICATE_BASE_URL;
    return OPENAI_BASE_URL;
}

function normalizeApiFormat(apiFormat: unknown): ApiCallFormat {
    if (apiFormat === "gemini" || apiFormat === "replicate" || apiFormat === "minimax") return apiFormat;
    return "openai";
}

export function inferApiFormatFromBaseUrl(baseUrl: string): ApiCallFormat | null {
    const value = baseUrl.trim().toLowerCase();
    if (value.includes("api.replicate.com") || value.includes("replicate.com/v1")) return "replicate";
    if (value.includes("generativelanguage.googleapis.com")) return "gemini";
    if (value.includes("api.minimaxi.com")) return "minimax";
    return null;
}

/**
 * 代理请求的 x-sf-provider 提示（与后台凭证的 provider 标签对齐，用于同 host 多凭证消歧）。
 * Seedance/DeepSeek 走 OpenAI 兼容接口，需按 Base URL 特征识别。
 */
export function inferProviderHint(apiFormat: ApiCallFormat, baseUrl: string): string {
    if (apiFormat === "gemini") return "gemini";
    if (apiFormat === "replicate") return "replicate";
    if (apiFormat === "minimax") return "minimax";
    const value = baseUrl.trim().toLowerCase();
    if (value.includes("ark.cn-beijing.volces.com") || value.includes("/api/plan/v3")) return "seedance";
    if (value.includes("api.deepseek.com")) return "deepseek";
    return "openai";
}

function uniqueRawModels(models: string[]) {
    return Array.from(new Set((models || []).map((model) => modelOptionName(model).trim()).filter(Boolean)));
}

function uniqueModelOptions(models: string[]) {
    return Array.from(new Set((models || []).map((model) => model.trim()).filter(Boolean)));
}

export function buildApiUrl(baseUrl: string, path: string) {
    let normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
    normalizedBaseUrl = normalizeArkPlanBaseUrl(normalizedBaseUrl);
    const lowerBaseUrl = normalizedBaseUrl.toLowerCase();
    const apiBaseUrl = lowerBaseUrl.endsWith("/v1") || lowerBaseUrl.includes("/api/v3") || lowerBaseUrl.endsWith("/api/plan/v3") ? normalizedBaseUrl : `${normalizedBaseUrl}/v1`;
    return `${apiBaseUrl}${path}`;
}

function normalizeArkPlanBaseUrl(baseUrl: string) {
    try {
        const url = new URL(baseUrl);
        const path = url.pathname.replace(/\/+$/, "");
        const lowerPath = path.toLowerCase();
        const arkPlanIndex = lowerPath.indexOf("/api/plan/v3");
        if (arkPlanIndex < 0) return baseUrl;
        const end = arkPlanIndex + "/api/plan/v3".length;
        if (lowerPath.length !== end && lowerPath[end] !== "/") return baseUrl;
        url.pathname = path.slice(0, end);
        url.search = "";
        url.hash = "";
        return url.toString().replace(/\/+$/, "");
    } catch {
        return baseUrl;
    }
}

// ========== 服务器同步 ==========
import { apiPath } from "@/lib/app-paths";

export async function syncConfigToServer(config: AiConfig, webdav: WebdavSyncConfig) {
    try {
        await fetch(apiPath("/api/user-config"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ config, webdav: sanitizePersistedWebdavConfig(webdav) }),
        });
    } catch {
        // 静默失败，不影响用户体验
    }
}

export async function loadConfigFromServer(): Promise<{ config?: AiConfig; webdav?: WebdavSyncConfig } | null> {
    try {
        const res = await fetch(apiPath("/api/user-config"), { credentials: "include" });
        if (!res.ok) return null;
        const data = await res.json();
        return data.data || null;
    } catch {
        return null;
    }
}
