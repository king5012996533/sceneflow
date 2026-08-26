"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App, ConfigProvider, Modal } from "antd";
import { nanoid } from "nanoid";
import { ChevronDown, CircleHelp, Menu, PanelLeftClose, PanelLeftOpen, SlidersHorizontal, Sparkles, X } from "lucide-react";

import { AssetPickerModal, type InsertAssetPayload } from "@/app/(user)/canvas/components/asset-picker-modal";
import { PromptSelectDialog } from "@/components/prompts/prompt-select-dialog";
import { InsufficientCreditsModal, type InsufficientCreditsModalHandle } from "@/components/credits/insufficient-credits-modal";
import { MessageList } from "@/components/studio/message-list";
import { SessionPanel } from "@/components/studio/session-panel";
import { StudioComposer, type StudioMode } from "@/components/studio/studio-composer";
import { StudioSettingsDrawer } from "@/components/studio/studio-settings-drawer";
import { useCreditBalance } from "@/hooks/use-credit-balance";
import { getGenerationCreditsCost } from "@/lib/credit-pricing";
import { buildVideoGenerationConfig } from "@/lib/generation/generation-config";
import { InsufficientCreditsError } from "@/lib/generation/generation-guard";
import { SEEDANCE_REFERENCE_LIMITS } from "@/lib/seedance-video";
import { detectStudioKind, imageSizeToVideoSize, videoSizeToImageSize } from "@/lib/studio/detect-kind";
import { executeStudioInstruction, pollVideoTask } from "@/lib/studio/execute";
import { deleteSession, readSession, readSessionMetas, saveSession, type StudioSessionMeta } from "@/lib/studio/session-store";
import { applyStylePreset } from "@/lib/studio/style-presets";
import type { StudioMessage, StudioSession, StudioStylePresetId } from "@/lib/studio/types";
import { sceneflowTheme } from "@/lib/sceneflow-theme";
import { uploadImage } from "@/services/image-storage";
import { uploadMediaFile } from "@/services/file-storage";
import { getPlatformPricing, getPricingDefaults } from "@/stores/platform-catalog-store";
import { useAssetStore } from "@/stores/use-asset-store";
import { useConfigStore, useEffectiveConfig, type AiConfig } from "@/stores/use-config-store";
import { useUserStore } from "@/stores/use-user-store";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";

import "./workbench.css";

function isSupportedAudioFile(file: File) {
    return file.type === "audio/mpeg" || file.type === "audio/mp3" || file.type === "audio/wav" || file.type === "audio/x-wav" || /\.(mp3|wav)$/i.test(file.name);
}

function filterAudioReferencesByDuration(existing: ReferenceAudio[], next: ReferenceAudio[], warn: (content: string) => void) {
    let total = existing.reduce((sum, item) => sum + (item.durationMs || 0), 0);
    const accepted: ReferenceAudio[] = [];
    let skipped = false;
    for (const item of next) {
        if (item.durationMs && (item.durationMs < 2000 || item.durationMs > 15000)) {
            skipped = true;
            continue;
        }
        if (item.durationMs && total + item.durationMs > 15000) {
            skipped = true;
            continue;
        }
        total += item.durationMs || 0;
        accepted.push(item);
    }
    if (skipped) warn("已忽略不符合时长要求的参考音频：单个 2-15 秒，总时长不超过 15 秒");
    return accepted;
}

export default function StudioPage() {
    const { message } = App.useApp();
    const effectiveConfig = useEffectiveConfig();
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady);
    const user = useUserStore((state) => state.user);
    const addAsset = useAssetStore((state) => state.addAsset);
    const { balance: creditBalance } = useCreditBalance();
    const quotaModalRef = useRef<InsufficientCreditsModalHandle>(null);

    // ===== 会话 =====
    const [sessions, setSessions] = useState<StudioSessionMeta[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<StudioMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const messagesRef = useRef<StudioMessage[]>([]);
    const activeSessionIdRef = useRef<string | null>(null);
    const createdAtRef = useRef<number>(Date.now());
    const configRef = useRef<AiConfig>(effectiveConfig);
    const [stylePreset, setStylePreset] = useState<StudioStylePresetId>("none");
    const stylePresetRef = useRef<StudioStylePresetId>("none");
    const activePollIdsRef = useRef<Set<string>>(new Set());
    const scrollRef = useRef<HTMLDivElement>(null);

    // ===== 输入 =====
    const [draft, setDraft] = useState("");
    const [references, setReferences] = useState<ReferenceImage[]>([]);
    const [videoReferences, setVideoReferences] = useState<ReferenceVideo[]>([]);
    const [audioReferences, setAudioReferences] = useState<ReferenceAudio[]>([]);
    const [modeOverride, setModeOverride] = useState<StudioMode>("auto");
    const [sending, setSending] = useState(false);

    // ===== UI =====
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [assetPickerOpen, setAssetPickerOpen] = useState(false);
    const [promptDialogOpen, setPromptDialogOpen] = useState(false);
    const [railCollapsed, setRailCollapsed] = useState(false);
    const [mobileRailOpen, setMobileRailOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [preview, setPreview] = useState<{ src: string; caption: string } | null>(null);

    useEffect(() => {
        configRef.current = effectiveConfig;
    }, [effectiveConfig]);

    useEffect(() => {
        stylePresetRef.current = stylePreset;
    }, [stylePreset]);

    useEffect(() => {
        activeSessionIdRef.current = activeSessionId;
    }, [activeSessionId]);

    const updateMessages = useCallback((updater: (prev: StudioMessage[]) => StudioMessage[]) => {
        messagesRef.current = updater(messagesRef.current);
        setMessages(messagesRef.current);
    }, []);

    const appendMessages = useCallback((items: StudioMessage[]) => updateMessages((prev) => [...prev, ...items]), [updateMessages]);

    const updateMessage = useCallback((id: string, patch: Partial<StudioMessage>) => updateMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m))), [updateMessages]);

    // 滚动到底部
    useEffect(() => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages, sending]);

    // ===== 会话读写 =====
    const resetDraft = useCallback(() => {
        setDraft("");
        setReferences([]);
        setVideoReferences([]);
        setAudioReferences([]);
        setModeOverride("auto");
    }, []);

    const saveCurrentSession = useCallback(async (messagesOverride?: StudioMessage[], configOverride?: AiConfig) => {
        const id = activeSessionIdRef.current;
        if (!id) return;
        const nextMessages = messagesOverride ?? messagesRef.current;
        const nextConfig = configOverride ?? configRef.current;
        const session: StudioSession = {
            id,
            title: nextMessages[0]?.prompt?.slice(0, 12) || "新会话",
            messages: nextMessages,
            config: nextConfig,
            stylePreset: stylePresetRef.current,
            createdAt: createdAtRef.current,
            updatedAt: Date.now(),
        };
        await saveSession(session);
        setSessions((prev) => prev.map((item) => (item.id === id ? { ...item, title: session.title, updatedAt: session.updatedAt, messageCount: session.messages.length } : item)));
    }, []);

    const applySessionConfig = useCallback(
        (config: AiConfig) => {
            if (config.imageModel) updateConfig("imageModel", config.imageModel);
            if (config.videoModel) updateConfig("videoModel", config.videoModel);
            if (config.quality) updateConfig("quality", config.quality);
            if (config.size) updateConfig("size", config.size);
            if (config.count) updateConfig("count", config.count);
            if (config.vquality) updateConfig("vquality", config.vquality);
            if (config.videoSeconds) updateConfig("videoSeconds", config.videoSeconds);
            if (config.videoGenerateAudio) updateConfig("videoGenerateAudio", config.videoGenerateAudio);
            if (config.videoWatermark) updateConfig("videoWatermark", config.videoWatermark);
            if (config.videoDraft) updateConfig("videoDraft", config.videoDraft);
        },
        [updateConfig],
    );

    const resumeVideo = useCallback(
        async (item: StudioMessage) => {
            if (!item.task || activePollIdsRef.current.has(item.id)) return;
            activePollIdsRef.current.add(item.id);
            try {
                const taskConfig = buildVideoGenerationConfig(configRef.current, item.task.model);
                await pollVideoTask(item.task, taskConfig, item.createdAt, (patch) => updateMessage(item.id, patch));
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "生成失败";
                updateMessage(item.id, { status: "failed", error: errorMessage });
                message.error(errorMessage);
            } finally {
                activePollIdsRef.current.delete(item.id);
                void saveCurrentSession();
            }
        },
        [message, saveCurrentSession, updateMessage],
    );

    const resumePending = useCallback(
        (items: StudioMessage[]) => {
            for (const item of items) {
                if (item.role === "assistant" && item.status === "pending" && item.task) void resumeVideo(item);
            }
        },
        [resumeVideo],
    );

    const createSession = useCallback(() => {
        const now = Date.now();
        const id = nanoid();
        activeSessionIdRef.current = id;
        createdAtRef.current = now;
        setActiveSessionId(id);
        setMessages([]);
        messagesRef.current = [];
        stylePresetRef.current = "none";
        setStylePreset("none");
        setSessions((prev) => [{ id, title: "新会话", createdAt: now, updatedAt: now, messageCount: 0 }, ...prev]);
        resetDraft();
        void saveSession({ id, title: "新会话", messages: [], config: configRef.current, stylePreset: "none", createdAt: now, updatedAt: now });
    }, [resetDraft]);

    const switchSession = useCallback(
        async (id: string) => {
            if (id === activeSessionIdRef.current) return;
            await saveCurrentSession();
            const session = await readSession(id);
            if (!session) return;
            activeSessionIdRef.current = id;
            createdAtRef.current = session.createdAt;
            setActiveSessionId(id);
            setMessages(session.messages);
            messagesRef.current = session.messages;
            const preset = session.stylePreset ?? "none";
            stylePresetRef.current = preset;
            setStylePreset(preset);
            applySessionConfig(session.config);
            resetDraft();
            resumePending(session.messages);
        },
        [applySessionConfig, resetDraft, resumePending, saveCurrentSession],
    );

    const confirmDeleteSession = useCallback(
        async (id: string) => {
            const session = await readSession(id);
            if (!session) return;
            await deleteSession(session);
            const remaining = (await readSessionMetas()).filter((item) => item.id !== id);
            setSessions(remaining);
            if (activeSessionIdRef.current === id) {
                if (remaining.length) void switchSession(remaining[0].id);
                else createSession();
            }
        },
        [createSession, switchSession],
    );

    // 初始化
    const initRef = useRef(false);
    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;
        void (async () => {
            const metas = await readSessionMetas();
            setSessions(metas);
            if (metas.length) {
                const session = await readSession(metas[0].id);
                if (session) {
                    activeSessionIdRef.current = session.id;
                    createdAtRef.current = session.createdAt;
                    setActiveSessionId(session.id);
                    setMessages(session.messages);
                    messagesRef.current = session.messages;
                    const preset = session.stylePreset ?? "none";
                    stylePresetRef.current = preset;
                    setStylePreset(preset);
                    applySessionConfig(session.config);
                    resumePending(session.messages);
                } else {
                    createSession();
                }
            } else {
                createSession();
            }
            setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ===== 参考素材 =====
    const addReferenceFiles = useCallback(
        async (files: File[]) => {
            const unsupported = files.filter((file) => !file.type.startsWith("image/") && !file.type.startsWith("video/") && !isSupportedAudioFile(file));
            if (unsupported.length) message.warning("已忽略不支持的参考素材，请使用图片、mp4/mov 视频或 mp3/wav 音频");
            const imageFiles = files.filter((file) => file.type.startsWith("image/") && file.size <= SEEDANCE_REFERENCE_LIMITS.imageMaxBytes).slice(0, SEEDANCE_REFERENCE_LIMITS.images - references.length);
            const videoFiles = files.filter((file) => file.type.startsWith("video/") && file.size <= SEEDANCE_REFERENCE_LIMITS.videoMaxBytes).slice(0, SEEDANCE_REFERENCE_LIMITS.videos - videoReferences.length);
            const audioFiles = files.filter((file) => isSupportedAudioFile(file) && file.size <= SEEDANCE_REFERENCE_LIMITS.audioMaxBytes).slice(0, SEEDANCE_REFERENCE_LIMITS.audios - audioReferences.length);
            if (files.some((file) => file.type.startsWith("image/") && file.size > SEEDANCE_REFERENCE_LIMITS.imageMaxBytes)) message.warning("已忽略超过 30MB 的参考图");
            if (files.some((file) => file.type.startsWith("video/") && file.size > SEEDANCE_REFERENCE_LIMITS.videoMaxBytes)) message.warning("已忽略超过 50MB 的参考视频");
            if (files.some((file) => isSupportedAudioFile(file) && file.size > SEEDANCE_REFERENCE_LIMITS.audioMaxBytes)) message.warning("已忽略超过 15MB 的参考音频");
            const nextReferences = await Promise.all(
                imageFiles.map(async (file) => {
                    const image = await uploadImage(file);
                    return { id: nanoid(), name: file.name, type: image.mimeType, dataUrl: image.url, storageKey: image.storageKey };
                }),
            );
            const nextVideoReferences = await Promise.all(
                videoFiles.map(async (file) => {
                    const video = await uploadMediaFile(file, "video-reference");
                    return { id: nanoid(), name: file.name, type: video.mimeType, url: video.url, storageKey: video.storageKey, bytes: video.bytes, width: video.width, height: video.height, durationMs: video.durationMs };
                }),
            );
            const nextAudioReferences = filterAudioReferencesByDuration(
                audioReferences,
                await Promise.all(
                    audioFiles.map(async (file) => {
                        const audio = await uploadMediaFile(file, "audio-reference");
                        return { id: nanoid(), name: file.name, type: audio.mimeType, url: audio.url, storageKey: audio.storageKey, durationMs: audio.durationMs };
                    }),
                ),
                message.warning,
            );
            if (nextReferences.length || nextVideoReferences.length || nextAudioReferences.length) message.success("参考素材已添加");
            setReferences((value) => [...value, ...nextReferences].slice(0, SEEDANCE_REFERENCE_LIMITS.images));
            setVideoReferences((value) => [...value, ...nextVideoReferences].slice(0, SEEDANCE_REFERENCE_LIMITS.videos));
            setAudioReferences((value) => [...value, ...nextAudioReferences].slice(0, SEEDANCE_REFERENCE_LIMITS.audios));
        },
        [audioReferences, message, references.length, videoReferences.length],
    );

    const addReferencesFromClipboard = useCallback(async () => {
        try {
            const items = await navigator.clipboard.read();
            const blobs = await Promise.all(items.flatMap((item) => item.types.filter((type) => type.startsWith("image/")).map((type) => item.getType(type))));
            if (!blobs.length) {
                message.error("剪切板里没有可读取的图片");
                return;
            }
            const nextReferences = await Promise.all(
                blobs.slice(0, SEEDANCE_REFERENCE_LIMITS.images - references.length).map(async (blob, index) => {
                    const image = await uploadImage(blob);
                    return { id: nanoid(), name: `clipboard-${index + 1}.png`, type: image.mimeType, dataUrl: image.url, storageKey: image.storageKey };
                }),
            );
            setReferences((value) => [...value, ...nextReferences].slice(0, SEEDANCE_REFERENCE_LIMITS.images));
            message.success(`已读取 ${nextReferences.length} 张参考图`);
        } catch {
            message.error("剪切板里没有可读取的图片");
        }
    }, [message, references.length]);

    const insertPickedAsset = useCallback(async (payload: InsertAssetPayload) => {
        if (payload.kind === "text") {
            setDraft(payload.content);
        } else if (payload.kind === "image") {
            const stored = await uploadImage(payload.dataUrl);
            setReferences((value) => [...value, { id: nanoid(), name: payload.title, type: stored.mimeType, dataUrl: stored.url, storageKey: stored.storageKey }].slice(0, SEEDANCE_REFERENCE_LIMITS.images));
        } else if (payload.kind === "video") {
            setVideoReferences((value) => [...value, { id: nanoid(), name: payload.title, type: "video/mp4", url: payload.url, storageKey: payload.storageKey, width: payload.width, height: payload.height }].slice(0, SEEDANCE_REFERENCE_LIMITS.videos));
        }
        setAssetPickerOpen(false);
    }, []);

    // ===== 模式判定与积分 =====
    const detectedKind = useMemo(() => detectStudioKind(draft, references, videoReferences, audioReferences), [draft, references, videoReferences, audioReferences]);
    const effectiveKind = modeOverride === "auto" ? detectedKind : modeOverride;
    const activeModel = effectiveKind === "image" ? effectiveConfig.imageModel || effectiveConfig.model : effectiveConfig.videoModel || effectiveConfig.model;
    const creditCost = useMemo(
        () => getGenerationCreditsCost(effectiveKind, { model: activeModel, [effectiveKind === "image" ? "imageModel" : "videoModel"]: activeModel, videoSeconds: effectiveConfig.videoSeconds, vquality: effectiveKind === "video" ? effectiveConfig.vquality : undefined }, getPlatformPricing(activeModel), getPricingDefaults()),
        [activeModel, effectiveConfig.videoSeconds, effectiveConfig.vquality, effectiveKind],
    );

    const buildInstructionConfig = useCallback(
        (kind: "image" | "video"): AiConfig => {
            const model = kind === "image" ? effectiveConfig.imageModel || effectiveConfig.model : effectiveConfig.videoModel || effectiveConfig.model;
            const base = { ...effectiveConfig, model };
            if (kind === "image") {
                const size = /^\d+x\d+$/.test(base.size || "") ? videoSizeToImageSize(base.size) : base.size;
                return { ...base, size, count: "1" };
            }
            return buildVideoGenerationConfig(base, model);
        },
        [effectiveConfig],
    );

    // ===== 发送 =====
    const send = useCallback(async () => {
        const text = draft.trim();
        if (!text) {
            message.error("请输入提示词");
            return;
        }
        if (!activeSessionIdRef.current) return;
        const kind = modeOverride === "auto" ? detectStudioKind(text, references, videoReferences, audioReferences) : modeOverride;
        const model = kind === "image" ? effectiveConfig.imageModel || effectiveConfig.model : effectiveConfig.videoModel || effectiveConfig.model;
        if (!isAiConfigReady(effectiveConfig, model)) {
            message.warning("暂无可用模型，请联系管理员在后台配置平台模型");
            return;
        }
        const required = getGenerationCreditsCost(kind, { model, [kind === "image" ? "imageModel" : "videoModel"]: model, videoSeconds: effectiveConfig.videoSeconds, vquality: kind === "video" ? effectiveConfig.vquality : undefined }, getPlatformPricing(model), getPricingDefaults());
        if (user?.role !== "admin" && creditBalance !== null && creditBalance < required) {
            quotaModalRef.current?.open({ balance: creditBalance, required });
            return;
        }

        const instructionConfig = buildInstructionConfig(kind);
        const finalPrompt = applyStylePreset(text, kind, stylePresetRef.current);
        const userMessage: StudioMessage = {
            id: nanoid(),
            role: "user",
            kind,
            prompt: text,
            stylePreset: stylePresetRef.current,
            references: [...references],
            videoReferences: [...videoReferences],
            audioReferences: [...audioReferences],
            results: [],
            status: "success",
            createdAt: Date.now(),
        };
        const assistantMessage: StudioMessage = { id: nanoid(), role: "assistant", kind, prompt: text, stylePreset: stylePresetRef.current, references: [], videoReferences: [], audioReferences: [], results: [], status: "pending", createdAt: Date.now() };
        appendMessages([userMessage, assistantMessage]);
        resetDraft();
        setSending(true);
        try {
            await executeStudioInstruction({ kind, prompt: finalPrompt, references: [...references], videoReferences: [...videoReferences], audioReferences: [...audioReferences], config: instructionConfig }, (patch) =>
                updateMessage(assistantMessage.id, patch),
            );
        } catch (error) {
            const errorMessage = error instanceof InsufficientCreditsError ? error.message : error instanceof Error ? error.message : "生成失败";
            if (error instanceof InsufficientCreditsError) quotaModalRef.current?.open({ message: errorMessage });
            else message.error(errorMessage);
            updateMessage(assistantMessage.id, { status: "failed", error: errorMessage });
        } finally {
            setSending(false);
            await saveCurrentSession();
        }
    }, [appendMessages, buildInstructionConfig, creditBalance, draft, effectiveConfig, isAiConfigReady, message, modeOverride, references, resetDraft, saveCurrentSession, updateMessage, user?.role, videoReferences, audioReferences]);

    // ===== 结果操作 =====
    const useResultAsReference = useCallback(
        (item: StudioMessage) => {
            const imageRefs = item.results.filter((result) => result.kind === "image").map((result) => ({ id: result.id, name: "生成图片", type: "image/png", dataUrl: result.dataUrl, storageKey: result.storageKey }));
            const videoRefs = item.results
                .filter((result) => result.kind === "video")
                .map((result) => ({ id: result.id, name: "生成视频", type: result.mimeType || "video/mp4", url: result.url, storageKey: result.storageKey, width: result.width, height: result.height }));
            if (!imageRefs.length && !videoRefs.length) return;
            if (imageRefs.length) setReferences((value) => [...value, ...imageRefs].slice(0, SEEDANCE_REFERENCE_LIMITS.images));
            if (videoRefs.length) setVideoReferences((value) => [...value, ...videoRefs].slice(0, SEEDANCE_REFERENCE_LIMITS.videos));
            message.success("已加入参考，继续描述你的修改");
            requestAnimationFrame(() => {
                const el = scrollRef.current;
                if (el) el.scrollTop = el.scrollHeight;
            });
        },
        [message],
    );

    const saveResultToAssets = useCallback(
        (item: StudioMessage) => {
            for (const result of item.results) {
                if (result.kind === "image") {
                    addAsset({
                        kind: "image",
                        title: "生成图片",
                        coverUrl: "",
                        tags: [],
                        source: "创作台",
                        data: { dataUrl: result.dataUrl, storageKey: result.storageKey, width: result.width, height: result.height, bytes: result.bytes, mimeType: "image/png" },
                        metadata: { source: "studio", prompt: item.prompt },
                    });
                } else {
                    addAsset({
                        kind: "video",
                        title: "生成视频",
                        coverUrl: "",
                        tags: [],
                        source: "创作台",
                        data: { url: result.url, storageKey: result.storageKey, width: result.width, height: result.height, bytes: result.bytes ?? 0, mimeType: result.mimeType ?? "video/mp4" },
                        metadata: { source: "studio", prompt: item.prompt },
                    });
                }
            }
            message.success("已加入我的素材");
        },
        [addAsset, message],
    );

    const retryMessage = useCallback(
        (item: StudioMessage) => {
            if (!activeSessionIdRef.current) return;
            const kind = item.kind;
            const model = kind === "image" ? effectiveConfig.imageModel || effectiveConfig.model : effectiveConfig.videoModel || effectiveConfig.model;
            const instructionConfig = buildInstructionConfig(kind);
            const finalPrompt = applyStylePreset(item.prompt, kind, item.stylePreset ?? "none");
            updateMessage(item.id, { status: "pending", error: undefined, results: [], task: undefined });
            setSending(true);
            void executeStudioInstruction({ kind, prompt: finalPrompt, references: item.references, videoReferences: item.videoReferences, audioReferences: item.audioReferences, config: instructionConfig }, (patch) => updateMessage(item.id, patch))
                .catch((error) => {
                    const errorMessage = error instanceof InsufficientCreditsError ? error.message : error instanceof Error ? error.message : "生成失败";
                    if (error instanceof InsufficientCreditsError) quotaModalRef.current?.open({ message: errorMessage });
                    else message.error(errorMessage);
                    updateMessage(item.id, { status: "failed", error: errorMessage });
                })
                .finally(() => {
                    setSending(false);
                    void saveCurrentSession();
                });
        },
        [buildInstructionConfig, effectiveConfig, message, saveCurrentSession, updateMessage],
    );

    // ===== 渲染 =====
    const activeSessionTitle = messages[0]?.prompt?.slice(0, 12) || "新会话";

    if (loading) {
        return (
            <ConfigProvider theme={sceneflowTheme("sceneflow-workbench")}>
                <div className="flex h-full items-center justify-center bg-[#f4f6f2] text-sm text-[#67726b]">加载中…</div>
            </ConfigProvider>
        );
    }

    return (
        <ConfigProvider theme={sceneflowTheme("sceneflow-workbench")}>
            <div className="sf-workbench h-full">
                <div className="app-shell">
                    <header className="topbar">
                        <div className="topbar-left">
                            <button type="button" className="icon-button mobile-session-toggle" aria-label="打开会话栏" onClick={() => setMobileRailOpen((value) => !value)}>
                                <Menu />
                            </button>
                            <div className="brand-lockup">
                                <div className="brand-mark">S</div>
                                <span className="brand-name">SceneFlow</span>
                            </div>
                            <div className="divider-vertical" />
                            <div className="session-title">
                                <strong>{activeSessionTitle}</strong>
                                <ChevronDown className="chevron" />
                            </div>
                        </div>
                        <div className="topbar-right">
                            <div className="credit-pill" title="今日积分余额">
                                <Sparkles className="credit-icon" />
                                <span className="credit-value">{creditBalance == null ? "—" : creditBalance.toLocaleString("zh-CN")}</span>
                                <span className="credit-label">积分</span>
                            </div>
                            <div className="topbar-actions">
                                <button type="button" className="icon-button" aria-label="帮助" onClick={() => message.info("这是 SceneFlow 创作台：描述画面即可生成图片/视频，结果可继续编辑。")}>
                                    <CircleHelp />
                                </button>
                                <button type="button" className="icon-button" aria-label="打开参数设置" onClick={() => setSettingsOpen(true)}>
                                    <SlidersHorizontal />
                                </button>
                            </div>
                        </div>
                    </header>

                    <div className="workspace">
                        {/* 会话栏（桌面可折叠 / 移动端抽屉） */}
                        <aside className={`session-rail ${railCollapsed ? "is-collapsed" : ""} ${mobileRailOpen ? "is-mobile-open" : ""}`}>
                            <div className="rail-top">
                                <span className="rail-label">会话</span>
                                <button
                                    type="button"
                                    className="icon-button"
                                    aria-label={railCollapsed ? "展开会话栏" : "收起会话栏"}
                                    onClick={() => {
                                        if (window.innerWidth <= 780) {
                                            setMobileRailOpen(false);
                                            return;
                                        }
                                        setRailCollapsed((value) => !value);
                                    }}
                                >
                                    {railCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                                </button>
                            </div>
                            <SessionPanel
                                sessions={sessions}
                                activeId={activeSessionId}
                                onSelect={(id) => {
                                    setMobileRailOpen(false);
                                    void switchSession(id);
                                }}
                                onCreate={createSession}
                                onDelete={(id) => setDeleteConfirmId(id)}
                            />
                        </aside>

                        {/* 主对话区 */}
                        <main className="conversation-pane">
                            <div ref={scrollRef} className="conversation-scroll thin-scrollbar">
                                <div className="conversation-inner">
                                    <MessageList
                                        messages={messages}
                                        onQuickPrompt={(text) => {
                                            setDraft(text);
                                            requestAnimationFrame(() => {
                                                const el = scrollRef.current;
                                                if (el) el.scrollTop = el.scrollHeight;
                                            });
                                        }}
                                        onUseAsReference={useResultAsReference}
                                        onSaveToAssets={saveResultToAssets}
                                        onRetry={(item) => retryMessage(item)}
                                        onPreview={(payload) => setPreview(payload)}
                                    />
                                </div>
                            </div>

                            <div className="composer-wrap">
                                <StudioComposer
                                    draft={draft}
                                    references={references}
                                    videoReferences={videoReferences}
                                    audioReferences={audioReferences}
                                    modeOverride={modeOverride}
                                    detectedKind={detectedKind}
                                    stylePreset={stylePreset}
                                    sending={sending}
                                    creditCost={creditCost}
                                    onDraftChange={setDraft}
                                    onModeChange={setModeOverride}
                                    onSend={() => void send()}
                                    onAttachImages={(files) => void addReferenceFiles(files)}
                                    onAttachVideos={(files) => void addReferenceFiles(files)}
                                    onAttachAudios={(files) => void addReferenceFiles(files)}
                                    onPasteClipboard={() => void addReferencesFromClipboard()}
                                    onOpenAssetPicker={() => setAssetPickerOpen(true)}
                                    onOpenPromptDialog={() => setPromptDialogOpen(true)}
                                    onOpenSettings={() => setSettingsOpen(true)}
                                    onRemoveReference={(index) => setReferences((value) => value.filter((_, i) => i !== index))}
                                    onRemoveVideoReference={(index) => setVideoReferences((value) => value.filter((_, i) => i !== index))}
                                    onRemoveAudioReference={(index) => setAudioReferences((value) => value.filter((_, i) => i !== index))}
                                />
                            </div>
                        </main>
                    </div>
                </div>

                <StudioSettingsDrawer
                    open={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    kind={effectiveKind}
                    config={effectiveConfig}
                    stylePreset={stylePreset}
                    onStylePresetChange={setStylePreset}
                    onModelChange={(model) => updateConfig(effectiveKind === "image" ? "imageModel" : "videoModel", model)}
                    onConfigChange={updateConfig}
                />

                {/* 图片放大预览 */}
                <div
                    className={`preview-modal ${preview ? "is-open" : ""}`}
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setPreview(null);
                    }}
                >
                    <div className="preview-frame">
                        <button type="button" className="preview-close" aria-label="关闭预览" onClick={() => setPreview(null)}>
                            <X />
                        </button>
                        {preview ? <img src={preview.src} alt="放大预览" /> : null}
                        <div className="preview-caption">{preview ? `${preview.caption} · 放大预览` : ""}</div>
                    </div>
                </div>

                <PromptSelectDialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen} onSelect={setDraft} />
                <AssetPickerModal open={assetPickerOpen} onInsert={(payload) => void insertPickedAsset(payload)} onClose={() => setAssetPickerOpen(false)} />
                <Modal
                    title="删除会话"
                    open={deleteConfirmId !== null}
                    onCancel={() => setDeleteConfirmId(null)}
                    onOk={() => {
                        if (deleteConfirmId) void confirmDeleteSession(deleteConfirmId);
                        setDeleteConfirmId(null);
                    }}
                    okText="删除"
                    okButtonProps={{ danger: true }}
                    cancelText="取消"
                >
                    删除后该会话的对话记录和生成结果将被移除，无法恢复。确定删除吗？
                </Modal>
                <InsufficientCreditsModal ref={quotaModalRef} />
            </div>
        </ConfigProvider>
    );
}
