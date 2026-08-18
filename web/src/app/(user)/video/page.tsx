"use client";

import { ArrowLeft, ArrowRight, BookOpen, CheckSquare, ClipboardPaste, Download, FolderPlus, History, ImageIcon, LoaderCircle, Music2, Plus, SlidersHorizontal, Sparkles, Trash2, Upload, VideoIcon } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { App, Button, Checkbox, ConfigProvider, Drawer, Empty, Input, Modal, Tag, Typography } from "antd";
import { nanoid } from "nanoid";
import { saveAs } from "file-saver";

import { AssetPickerModal, type InsertAssetPayload } from "@/app/(user)/canvas/components/asset-picker-modal";
import { ModelPicker } from "@/components/model-picker";
import { PromptSelectDialog } from "@/components/prompts/prompt-select-dialog";
import { VideoSettingsPanel, videoSizeLabel } from "@/components/video-settings-panel";
import { canvasThemes } from "@/lib/canvas-theme";
import { sceneflowTheme } from "@/lib/sceneflow-theme";
import { formatBytes, formatDuration } from "@/lib/image-utils";
import { buildVideoGenerationConfig, normalizeVideoResolution as normalizeResolution, normalizeVideoSeconds } from "@/lib/generation/generation-config";
import { seedanceReferenceLabel, seedanceVideoReferenceError, seedanceVideoReferenceHint, SEEDANCE_REFERENCE_LIMITS } from "@/lib/seedance-video";
import { deleteStoredMedia, resolveMediaUrl, uploadMediaFile } from "@/services/file-storage";
import { resolveImageUrl, uploadImage } from "@/services/image-storage";
import { createGeneratedVideoTask, persistGeneratedVideo, pollGeneratedVideoTask, type VideoGenerationTask } from "@/lib/generation/generation-request";
import { useAssetStore } from "@/stores/use-asset-store";
import { modelOptionLabel, useConfigStore, useEffectiveConfig, type AiConfig } from "@/stores/use-config-store";
import { getPlatformPricing } from "@/stores/platform-catalog-store";
import { useUserStore } from "@/stores/use-user-store";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";
import { InsufficientCreditsModal, type InsufficientCreditsModalHandle } from "@/components/credits/insufficient-credits-modal";
import { InsufficientCreditsError } from "@/lib/generation/generation-guard";
import { getGenerationCreditsCost } from "@/lib/credit-pricing";
import { useCreditBalance } from "@/hooks/use-credit-balance";
import { createScopedLocalForageStore } from "@/lib/user-data-scope";

type GeneratedVideo = {
    id: string;
    url: string;
    storageKey: string;
    durationMs: number;
    width: number;
    height: number;
    bytes: number;
    mimeType: string;
};

type GenerationResult = {
    id: string;
    status: "pending" | "success" | "failed";
    video?: GeneratedVideo;
    error?: string;
};

type GenerationLog = {
    id: string;
    createdAt: number;
    title: string;
    prompt: string;
    time: string;
    model: string;
    config: GenerationLogConfig;
    references: ReferenceImage[];
    videoReferences: ReferenceVideo[];
    audioReferences: ReferenceAudio[];
    durationMs: number;
    size: string;
    resolution: string;
    seconds: string;
    status: "生成中" | "成功" | "失败";
    task?: VideoGenerationTask;
    video?: GeneratedVideo;
    error?: string;
};

type GenerationLogConfig = Pick<AiConfig, "model" | "videoModel" | "size" | "vquality" | "videoSeconds" | "videoGenerateAudio" | "videoWatermark" | "videoDraft">;

type UpdateAiConfig = <K extends keyof AiConfig>(key: K, value: AiConfig[K]) => void;

const getLogStore = () => createScopedLocalForageStore("video_generation_logs");

export default function VideoPage() {
    const user = useUserStore((state) => state.user);
    const { message } = App.useApp();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const activeLogIdsRef = useRef<Set<string>>(new Set());
    const config = useConfigStore((state) => state.config);
    const effectiveConfig = useEffectiveConfig();
    const updateConfig = useConfigStore((state) => state.updateConfig);
    const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady);
    const addAsset = useAssetStore((state) => state.addAsset);
    const [prompt, setPrompt] = useState("");
    const [references, setReferences] = useState<ReferenceImage[]>([]);
    const [videoReferences, setVideoReferences] = useState<ReferenceVideo[]>([]);
    const [audioReferences, setAudioReferences] = useState<ReferenceAudio[]>([]);
    const [results, setResults] = useState<GenerationResult[]>([]);
    const [logs, setLogs] = useState<GenerationLog[]>([]);
    const [running, setRunning] = useState(false);
    const [logsOpen, setLogsOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [promptDialogOpen, setPromptDialogOpen] = useState(false);
    const [assetPickerOpen, setAssetPickerOpen] = useState(false);
    const [startedAt, setStartedAt] = useState(0);
    const [elapsedMs, setElapsedMs] = useState(0);
    const [selectedLogIds, setSelectedLogIds] = useState<string[]>([]);
    const [previewLog, setPreviewLog] = useState<GenerationLog | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const quotaModalRef = useRef<InsufficientCreditsModalHandle>(null);
    const { balance: creditBalance } = useCreditBalance();

    const model = effectiveConfig.videoModel || effectiveConfig.model;
    const canGenerate = Boolean(prompt.trim());
    const unitCost = getGenerationCreditsCost("video", { model, videoModel: model, videoSeconds: effectiveConfig.videoSeconds }, getPlatformPricing(model));

    useEffect(() => {
        if (!running || !startedAt) return;
        const timer = window.setInterval(() => setElapsedMs(performance.now() - startedAt), 1000);
        return () => window.clearInterval(timer);
    }, [running, startedAt]);

    useEffect(() => {
        void refreshLogs();
    }, []);

    const addReferences = async (files?: FileList | null) => {
        const selectedFiles = Array.from(files || []);
        const unsupported = selectedFiles.filter((file) => !file.type.startsWith("image/") && !file.type.startsWith("video/") && !isSupportedAudioFile(file));
        if (unsupported.length) message.warning("已忽略不支持的参考素材，请使用图片、mp4/mov 视频或 mp3/wav 音频");
        const imageFiles = selectedFiles.filter((file) => file.type.startsWith("image/") && file.size <= SEEDANCE_REFERENCE_LIMITS.imageMaxBytes).slice(0, SEEDANCE_REFERENCE_LIMITS.images - references.length);
        const videoFiles = selectedFiles.filter((file) => file.type.startsWith("video/") && file.size <= SEEDANCE_REFERENCE_LIMITS.videoMaxBytes).slice(0, SEEDANCE_REFERENCE_LIMITS.videos - videoReferences.length);
        const audioFiles = selectedFiles.filter((file) => isSupportedAudioFile(file) && file.size <= SEEDANCE_REFERENCE_LIMITS.audioMaxBytes).slice(0, SEEDANCE_REFERENCE_LIMITS.audios - audioReferences.length);
        if (selectedFiles.some((file) => file.type.startsWith("image/") && file.size > SEEDANCE_REFERENCE_LIMITS.imageMaxBytes)) message.warning("已忽略超过 30MB 的参考图");
        if (selectedFiles.some((file) => file.type.startsWith("video/") && file.size > SEEDANCE_REFERENCE_LIMITS.videoMaxBytes)) message.warning("已忽略超过 50MB 的参考视频");
        if (selectedFiles.some((file) => isSupportedAudioFile(file) && file.size > SEEDANCE_REFERENCE_LIMITS.audioMaxBytes)) message.warning("已忽略超过 15MB 的参考音频");
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
        setReferences((value) => [...value, ...nextReferences].slice(0, SEEDANCE_REFERENCE_LIMITS.images));
        setVideoReferences((value) => [...value, ...nextVideoReferences].slice(0, SEEDANCE_REFERENCE_LIMITS.videos));
        setAudioReferences((value) => [...value, ...nextAudioReferences].slice(0, SEEDANCE_REFERENCE_LIMITS.audios));
    };

    const addReferencesFromClipboard = async () => {
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
    };
    const generate = async () => {
        const snapshot = buildRequestSnapshot();
        if (!snapshot) return;
        // 积分预检（服务端为最终裁决，这里只做体验拦截；定价优先取后台逐模型配置，视频按每秒×时长）
        const required = getGenerationCreditsCost("video", { model, videoModel: model, videoSeconds: effectiveConfig.videoSeconds }, getPlatformPricing(model));
        if (user?.role !== "admin" && creditBalance !== null && creditBalance < required) {
            quotaModalRef.current?.open({ balance: creditBalance, required });
            return;
        }
        setElapsedMs(0);
        setRunning(true);
        setPreviewLog(null);
        setResults([{ id: nanoid(), status: "pending" }]);
        const batchStartedAt = performance.now();
        setStartedAt(batchStartedAt);
        try {
            const task = await createGeneratedVideoTask({ config: snapshot.config, prompt: snapshot.text, references: snapshot.references, videoReferences: snapshot.videoReferences, audioReferences: snapshot.audioReferences });
            const log = buildLog({ prompt: snapshot.text, model, config: snapshot.config, references: snapshot.references, videoReferences: snapshot.videoReferences, audioReferences: snapshot.audioReferences, durationMs: 0, status: "生成中", task });
            await saveLog(log);
            void pollGenerationLog(log, snapshot.config);
        } catch (error) {
            if (error instanceof InsufficientCreditsError) {
                quotaModalRef.current?.open({ message: error.message });
                setRunning(false);
                return;
            }
            const errorMessage = error instanceof Error ? error.message : "生成失败";
            setResults([{ id: nanoid(), status: "failed", error: errorMessage }]);
            await saveLog(
                buildLog({
                    prompt: snapshot.text,
                    model,
                    config: snapshot.config,
                    references: snapshot.references,
                    videoReferences: snapshot.videoReferences,
                    audioReferences: snapshot.audioReferences,
                    durationMs: performance.now() - batchStartedAt,
                    status: "失败",
                    error: errorMessage,
                }),
            );
            message.error(errorMessage);
            setRunning(false);
        }
    };

    const buildRequestSnapshot = () => {
        const text = prompt.trim();
        if (!text) {
            message.error("请输入视频提示词");
            return null;
        }
        if (!isAiConfigReady(effectiveConfig, model)) {
            message.warning("暂无可用模型，请联系管理员在后台配置平台模型");
            return null;
        }
        const videoReferenceError = seedanceVideoReferenceError(videoReferences);
        if (videoReferenceError) {
            message.error(`${videoReferenceError}。${seedanceVideoReferenceHint}`);
            return null;
        }
        return { text, config: buildVideoConfig(effectiveConfig, model), references: [...references], videoReferences: [...videoReferences], audioReferences: [...audioReferences] };
    };

    const retryResult = () => {
        void generate();
    };

    const downloadVideo = (video: GeneratedVideo) => {
        saveAs(video.url, "video.mp4");
    };

    const saveResultToAssets = (video: GeneratedVideo) => {
        addAsset({
            kind: "video",
            title: "生成视频",
            coverUrl: "",
            tags: [],
            source: "视频创作台",
            data: { url: video.url, storageKey: video.storageKey, width: video.width, height: video.height, bytes: video.bytes, mimeType: video.mimeType },
            metadata: { source: "video-page", prompt },
        });
        message.success("已加入我的素材");
    };

    const insertPickedAsset = async (payload: InsertAssetPayload) => {
        if (payload.kind === "text") {
            setPrompt(payload.content);
        } else if (payload.kind === "image") {
            const stored = await uploadImage(payload.dataUrl);
            setReferences((value) => [...value, { id: nanoid(), name: payload.title, type: stored.mimeType, dataUrl: stored.url, storageKey: stored.storageKey }].slice(0, SEEDANCE_REFERENCE_LIMITS.images));
        } else if (payload.kind === "video") {
            setVideoReferences((value) => [...value, { id: nanoid(), name: payload.title, type: "video/mp4", url: payload.url, storageKey: payload.storageKey, width: payload.width, height: payload.height }].slice(0, SEEDANCE_REFERENCE_LIMITS.videos));
        }
        setAssetPickerOpen(false);
    };

    const createSession = () => {
        setPrompt("");
        setReferences([]);
        setVideoReferences([]);
        setAudioReferences([]);
        setResults([]);
        setElapsedMs(0);
        setStartedAt(0);
        setSelectedLogIds([]);
        setPreviewLog(null);
    };

    const deleteSelectedLogs = () => {
        const mediaKeys = logs
            .filter((log) => selectedLogIds.includes(log.id))
            .map((log) => log.video?.storageKey)
            .filter((key): key is string => Boolean(key));
        void Promise.all([deleteStoredMedia(mediaKeys), ...selectedLogIds.map((id) => getLogStore().removeItem(id))]).then(refreshLogs);
        if (previewLog && selectedLogIds.includes(previewLog.id)) {
            setPreviewLog(null);
            setResults([]);
        }
        setSelectedLogIds([]);
        setDeleteConfirmOpen(false);
    };

    const saveLog = async (log: GenerationLog) => {
        await getLogStore().setItem(log.id, serializeLog(log));
        await refreshLogs();
    };

    const refreshLogs = async () => {
        const nextLogs = await readStoredLogs();
        setLogs(nextLogs);
        resumePendingLogs(nextLogs);
        return nextLogs;
    };

    const resumePendingLogs = (items: GenerationLog[]) => {
        for (const log of items) {
            if (log.status === "生成中" && log.task) void pollGenerationLog(log);
        }
    };

    const pollGenerationLog = async (log: GenerationLog, configOverride?: AiConfig) => {
        if (!log.task || activeLogIdsRef.current.has(log.id)) return;
        activeLogIdsRef.current.add(log.id);
        setRunning(true);
        setStartedAt((value) => value || performance.now());
        setResults((value) => (value.length ? value : [{ id: log.id, status: "pending" }]));
        const taskConfig = buildVideoConfig({ ...effectiveConfig, ...log.config }, log.task.model || log.model);
        try {
            for (let attempt = 0; attempt < 120; attempt += 1) {
                const state = await pollGeneratedVideoTask(configOverride || taskConfig, log.task);
                if (state.status === "completed") {
                    const stored = await persistGeneratedVideo(state.result);
                    const nextVideo: GeneratedVideo = {
                        id: nanoid(),
                        url: stored.url,
                        storageKey: stored.storageKey,
                        durationMs: Date.now() - log.createdAt,
                        width: stored.width || 1280,
                        height: stored.height || 720,
                        bytes: stored.bytes,
                        mimeType: stored.mimeType,
                    };
                    setResults([{ id: nextVideo.id, status: "success", video: nextVideo }]);
                    await saveLog({ ...log, status: "成功", durationMs: nextVideo.durationMs, video: nextVideo, error: undefined });
                    message.success("视频已生成");
                    return;
                }
                if (state.status === "failed") throw new Error(state.error);
                if (attempt === 119) throw new Error("视频生成超时，请稍后重试");
                await delay(log.task.provider === "seedance" ? 5000 : 2500);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "生成失败";
            setResults([{ id: log.id, status: "failed", error: errorMessage }]);
            await saveLog({ ...log, status: "失败", durationMs: Date.now() - log.createdAt, error: errorMessage });
            message.error(errorMessage);
        } finally {
            activeLogIdsRef.current.delete(log.id);
            if (!activeLogIdsRef.current.size) {
                setRunning(false);
                setStartedAt(0);
            }
        }
    };

    const previewGenerationLog = (log: GenerationLog) => {
        setPreviewLog(log);
        setLogsOpen(false);
        setPrompt(log.prompt);
        setReferences(log.references || []);
        setVideoReferences(log.videoReferences || []);
        setAudioReferences(log.audioReferences || []);
        if (log.config.videoModel || log.model) updateConfig("videoModel", log.config.videoModel || log.model);
        if (log.config.size) updateConfig("size", log.config.size);
        if (log.config.vquality) updateConfig("vquality", log.config.vquality);
        if (log.config.videoSeconds) updateConfig("videoSeconds", log.config.videoSeconds);
        if (log.config.videoGenerateAudio) updateConfig("videoGenerateAudio", log.config.videoGenerateAudio);
        if (log.config.videoWatermark) updateConfig("videoWatermark", log.config.videoWatermark);
        if (log.config.videoDraft) updateConfig("videoDraft", log.config.videoDraft);
        setResults(log.status === "生成中" ? [{ id: log.id, status: "pending" }] : log.video ? [{ id: log.video.id, status: "success", video: log.video }] : [{ id: log.id, status: "failed", error: log.error || "生成失败" }]);
    };

    return (
        <ConfigProvider theme={sceneflowTheme("sceneflow-workbench")}>
            <div className="flex h-full flex-col overflow-hidden bg-[#f6efe4] text-[#201914]">
                <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[300px_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[320px_minmax(0,1fr)]">
                    <aside className="thin-scrollbar hidden min-h-0 overflow-y-auto rounded-2xl border border-[#ded2c3] bg-[#fffdf8] p-4 shadow-[0_20px_60px_rgba(57,48,34,0.06)] lg:block">
                        <LogPanel
                            logs={logs}
                            selectedLogIds={selectedLogIds}
                            activeLogId={previewLog?.id}
                            onSelectedLogIdsChange={setSelectedLogIds}
                            onCreateSession={createSession}
                            onDeleteSelected={() => setDeleteConfirmOpen(true)}
                            onPreviewLog={previewGenerationLog}
                        />
                    </aside>

                    <section className="grid gap-3 lg:min-h-0 lg:overflow-hidden xl:grid-cols-[420px_minmax(0,1fr)]">
                        <div className="thin-scrollbar flex flex-col rounded-2xl border border-[#ded2c3] bg-[#fffdf8] p-4 shadow-[0_20px_60px_rgba(57,48,34,0.06)] lg:min-h-0 lg:overflow-y-auto">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="sf-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b5b32]">Video Workbench · 02</p>
                                    <h1 className="sf-serif mt-2 text-[26px] font-semibold tracking-tight text-[#201914]">视频创作台</h1>
                                </div>
                                <div className="flex shrink-0 gap-2 lg:hidden">
                                    <Button icon={<History className="size-4" />} onClick={() => setLogsOpen(true)}>
                                        记录
                                    </Button>
                                    <Button icon={<SlidersHorizontal className="size-4" />} onClick={() => setSettingsOpen(true)}>
                                        参数
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-7 space-y-5">
                                <div>
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <span className="sf-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a6d63]">
                                            01 · Prompt <span className="font-semibold normal-case tracking-normal text-[#b7a99b]">提示词</span>
                                        </span>
                                        <div className="flex gap-2">
                                            <Button size="small" icon={<BookOpen className="size-3.5" />} onClick={() => setPromptDialogOpen(true)}>
                                                提示词库
                                            </Button>
                                            <Button size="small" icon={<FolderPlus className="size-3.5" />} onClick={() => setAssetPickerOpen(true)}>
                                                我的素材
                                            </Button>
                                        </div>
                                    </div>
                                    <Input.TextArea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={7} placeholder="描述镜头运动、主体动作、场景氛围和画面风格" />
                                </div>

                                <div className="min-w-0">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <span className="sf-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a6d63]">
                                            02 · References <span className="font-semibold normal-case tracking-normal text-[#b7a99b]">参考素材</span>
                                        </span>
                                        <div className="flex gap-2">
                                            <Button size="small" icon={<ClipboardPaste className="size-3.5" />} onClick={() => void addReferencesFromClipboard()}>
                                                剪切板
                                            </Button>
                                            <Button size="small" icon={<Upload className="size-3.5" />} onClick={() => fileInputRef.current?.click()}>
                                                上传
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        <div className="flex min-w-0 flex-col gap-1.5">
                                            <div className="flex items-center gap-1.5 px-0.5">
                                                <ImageIcon className="size-3.5 text-[#9b5b32]" />
                                                <span className="sf-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#7a6d63]">图片</span>
                                                <span className="sf-mono text-[10px] text-[#b7a99b]">
                                                    {references.length}/{SEEDANCE_REFERENCE_LIMITS.images}
                                                </span>
                                            </div>
                                            <div className="flex min-h-[86px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#ded2c3] bg-[#fffdf8] px-2 py-2 text-center">
                                                {references.length ? (
                                                    <div className="hover-scrollbar hover-scrollbar-hint flex w-full gap-1.5 overflow-x-auto overscroll-x-contain">
                                                        {references.map((item, index) => (
                                                            <div key={item.id} className="group relative size-14 shrink-0 overflow-hidden rounded-lg border border-[#ded2c3]">
                                                                <img src={item.dataUrl} alt={item.name} className="size-full object-cover" />
                                                                <span className="absolute left-0.5 top-0.5 rounded bg-black/60 px-1 text-[9px] font-medium leading-4 text-white">{seedanceReferenceLabel("image", index)}</span>
                                                                <ReferenceOrderButtons index={index} total={references.length} onMove={(offset) => setReferences((value) => moveListItem(value, index, offset))} />
                                                                <button
                                                                    type="button"
                                                                    className="absolute right-0.5 top-0.5 hidden size-5 items-center justify-center rounded bg-black/60 text-white group-hover:flex"
                                                                    onClick={() => setReferences((value) => value.filter((ref) => ref.id !== item.id))}
                                                                    aria-label="移除参考图"
                                                                >
                                                                    <Trash2 className="size-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="grid size-7 place-items-center rounded-lg bg-[#f1e3cf] text-[#9b5b32]">
                                                            <ImageIcon className="size-4" />
                                                        </span>
                                                        <span className="text-[11px] leading-4 text-[#b7a99b]">
                                                            <b className="sf-mono font-semibold text-[#7a6d63]">图片 ×{SEEDANCE_REFERENCE_LIMITS.images}</b>
                                                            <br />
                                                            png / jpg
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex min-w-0 flex-col gap-1.5">
                                            <div className="flex items-center gap-1.5 px-0.5">
                                                <VideoIcon className="size-3.5 text-[#9b5b32]" />
                                                <span className="sf-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#7a6d63]">视频</span>
                                                <span className="sf-mono text-[10px] text-[#b7a99b]">
                                                    {videoReferences.length}/{SEEDANCE_REFERENCE_LIMITS.videos}
                                                </span>
                                            </div>
                                            <div className="flex min-h-[86px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#ded2c3] bg-[#fffdf8] px-2 py-2 text-center">
                                                {videoReferences.length ? (
                                                    <div className="hover-scrollbar hover-scrollbar-hint flex w-full gap-1.5 overflow-x-auto overscroll-x-contain">
                                                        {videoReferences.map((item, index) => (
                                                            <div key={item.id} className="group relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-[#ded2c3] bg-black">
                                                                <video src={item.url} className="size-full object-cover" muted preload="metadata" />
                                                                <span className="absolute left-0.5 top-0.5 rounded bg-black/60 px-1 text-[9px] font-medium leading-4 text-white">{seedanceReferenceLabel("video", index)}</span>
                                                                <ReferenceOrderButtons index={index} total={videoReferences.length} onMove={(offset) => setVideoReferences((value) => moveListItem(value, index, offset))} />
                                                                <button
                                                                    type="button"
                                                                    className="absolute right-0.5 top-0.5 hidden size-5 items-center justify-center rounded bg-black/60 text-white group-hover:flex"
                                                                    onClick={() => setVideoReferences((value) => value.filter((ref) => ref.id !== item.id))}
                                                                    aria-label="移除参考视频"
                                                                >
                                                                    <Trash2 className="size-3" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="grid size-7 place-items-center rounded-lg bg-[#f1e3cf] text-[#9b5b32]">
                                                            <VideoIcon className="size-4" />
                                                        </span>
                                                        <span className="text-[11px] leading-4 text-[#b7a99b]">
                                                            <b className="sf-mono font-semibold text-[#7a6d63]">视频 ×{SEEDANCE_REFERENCE_LIMITS.videos}</b>
                                                            <br />
                                                            mp4 / mov
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex min-w-0 flex-col gap-1.5">
                                            <div className="flex items-center gap-1.5 px-0.5">
                                                <Music2 className="size-3.5 text-[#9b5b32]" />
                                                <span className="sf-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[#7a6d63]">音频</span>
                                                <span className="sf-mono text-[10px] text-[#b7a99b]">
                                                    {audioReferences.length}/{SEEDANCE_REFERENCE_LIMITS.audios}
                                                </span>
                                            </div>
                                            <div className="flex min-h-[86px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#ded2c3] bg-[#fffdf8] px-2 py-2 text-center">
                                                {audioReferences.length ? (
                                                    <div className="flex w-full flex-col gap-1">
                                                        {audioReferences.map((item, index) => (
                                                            <div key={item.id} className="group relative flex min-w-0 items-center gap-1.5 rounded-lg border border-[#ded2c3] bg-[#fbf6ee] px-1.5 py-1">
                                                                <Music2 className="size-3.5 shrink-0 text-[#9b5b32]" />
                                                                <span className="shrink-0 rounded bg-[#f1e3cf] px-1 text-[9px] font-medium text-[#7a6d63]">{seedanceReferenceLabel("audio", index)}</span>
                                                                <span className="truncate text-[11px] text-[#7a6d63]">{item.name}</span>
                                                                <button
                                                                    type="button"
                                                                    className="absolute right-1 top-1 hidden size-4 items-center justify-center rounded bg-black/60 text-white group-hover:flex"
                                                                    onClick={() => setAudioReferences((value) => value.filter((ref) => ref.id !== item.id))}
                                                                    aria-label="移除参考音频"
                                                                >
                                                                    <Trash2 className="size-2.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <span className="grid size-7 place-items-center rounded-lg bg-[#f1e3cf] text-[#9b5b32]">
                                                            <Music2 className="size-4" />
                                                        </span>
                                                        <span className="text-[11px] leading-4 text-[#b7a99b]">
                                                            <b className="sf-mono font-semibold text-[#7a6d63]">音频 ×{SEEDANCE_REFERENCE_LIMITS.audios}</b>
                                                            <br />
                                                            mp3 / wav
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between rounded-xl border border-[#ded2c3] bg-[#f1e3cf] px-3 py-2 text-sm sm:hidden">
                                    <span className="sf-mono truncate text-[12px] text-[#7a6d63]">
                                        {modelOptionLabel(effectiveConfig, model)} · {normalizeResolution(effectiveConfig.vquality)}p · {videoSizeLabel(effectiveConfig.size)} · {normalizeVideoSeconds(effectiveConfig.videoSeconds)}s
                                    </span>
                                    <Button size="small" type="text" icon={<SlidersHorizontal className="size-4" />} onClick={() => setSettingsOpen(true)}>
                                        调整
                                    </Button>
                                </div>

                                <div className="hidden gap-4 sm:grid sm:grid-cols-2">
                                    <GenerationSettings config={effectiveConfig} model={model} updateConfig={updateConfig} />
                                </div>
                            </div>

                            <div className="mt-auto pt-6">
                                <Button type="primary" size="large" block icon={<Sparkles className="size-4" />} loading={running} disabled={!canGenerate || running} onClick={() => void generate()}>
                                    开始生成
                                </Button>
                                <p className="sf-mono mt-2.5 text-center text-[10.5px] text-[#b7a99b]">
                                    预计消耗{" "}
                                    <b className="font-bold text-[#9b5b32]">
                                        ≈ {unitCost} 积分 / {normalizeVideoSeconds(effectiveConfig.videoSeconds)}s
                                    </b>{" "}
                                    · 余额 {creditBalance == null ? "—" : creditBalance.toLocaleString("zh-CN")}
                                </p>
                            </div>
                        </div>

                        <div className="thin-scrollbar rounded-2xl border border-[#ded2c3] bg-[#fffdf8] p-4 shadow-[0_20px_60px_rgba(57,48,34,0.06)] lg:min-h-0 lg:overflow-y-auto lg:p-5">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="sf-serif text-lg font-semibold">生成结果</h2>
                                </div>
                                {running ? <Tag className="sf-mono m-0 rounded-full border-[#ded2c3] bg-[#f1e3cf] px-2.5 py-0.5 !text-[#9b5b32]">等待 {formatDuration(elapsedMs)}</Tag> : null}
                            </div>
                            {results.length ? (
                                <div className="grid gap-4">
                                    {results.map((result) =>
                                        result.status === "success" && result.video ? (
                                            <ResultVideoCard key={result.id} video={result.video} onDownload={downloadVideo} onSaveAsset={saveResultToAssets} />
                                        ) : result.status === "failed" ? (
                                            <FailedVideoCard key={result.id} error={result.error || "生成失败"} onRetry={retryResult} />
                                        ) : (
                                            <PendingVideoCard key={result.id} />
                                        ),
                                    )}
                                </div>
                            ) : (
                                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#ded2c3] text-center lg:min-h-[560px]">
                                    <VideoIcon className="mb-4 size-11 text-[#b7a99b]" />
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有生成视频" />
                                </div>
                            )}
                        </div>
                    </section>
                </main>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/mp4,video/quicktime,audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                        void addReferences(event.target.files);
                        event.target.value = "";
                    }}
                />
                <Drawer title="生成记录" placement="bottom" size="large" open={logsOpen} onClose={() => setLogsOpen(false)}>
                    <LogPanel
                        logs={logs}
                        selectedLogIds={selectedLogIds}
                        activeLogId={previewLog?.id}
                        onSelectedLogIdsChange={setSelectedLogIds}
                        onCreateSession={createSession}
                        onDeleteSelected={() => setDeleteConfirmOpen(true)}
                        onPreviewLog={previewGenerationLog}
                    />
                </Drawer>
                <Drawer title="参数" placement="bottom" height="82vh" open={settingsOpen} onClose={() => setSettingsOpen(false)}>
                    <div className="grid grid-cols-2 gap-3 pb-4">
                        <GenerationSettings config={effectiveConfig} model={model} updateConfig={updateConfig} />
                    </div>
                </Drawer>
                <PromptSelectDialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen} onSelect={setPrompt} />
                <AssetPickerModal open={assetPickerOpen} onInsert={(payload) => void insertPickedAsset(payload)} onClose={() => setAssetPickerOpen(false)} />
                <Modal title="删除生成记录" open={deleteConfirmOpen} onCancel={() => setDeleteConfirmOpen(false)} onOk={deleteSelectedLogs} okText="删除" okButtonProps={{ danger: true }} cancelText="取消">
                    确定删除选中的 {selectedLogIds.length} 条生成记录吗？
                </Modal>
                <InsufficientCreditsModal ref={quotaModalRef} />
            </div>
        </ConfigProvider>
    );
}

function GenerationSettings({ config, model, updateConfig }: { config: AiConfig; model: string; updateConfig: UpdateAiConfig }) {
    const theme = canvasThemes.warm;

    return (
        <>
            <label className="col-span-2 block min-w-0">
                <span className="sf-mono mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#7a6d63]">
                    03 · Model <span className="font-semibold normal-case tracking-normal text-[#b7a99b]">模型</span>
                </span>
                <ModelPicker config={config} value={model} onChange={(value) => updateConfig("videoModel", value)} capability="video" fullWidth />
            </label>
            <div className="col-span-2">
                <VideoSettingsPanel config={config} onConfigChange={(key, value) => updateConfig(key, value)} theme={theme} showTitle={false} className="space-y-4" />
            </div>
        </>
    );
}

function ResultVideoCard({ video, onDownload, onSaveAsset }: { video: GeneratedVideo; onDownload: (video: GeneratedVideo) => void; onSaveAsset: (video: GeneratedVideo) => void }) {
    return (
        <div className="overflow-hidden rounded-xl border border-[#ded2c3] bg-[#fffdf8]">
            <video src={video.url} controls className="aspect-video w-full bg-black object-contain" />
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[#eee4d5] px-3 py-2.5">
                <div className="sf-mono flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-[11px] text-[#7a6d63]">
                    <span>
                        {video.width}x{video.height}
                    </span>
                    <span>{formatBytes(video.bytes)}</span>
                    <span>{formatDuration(video.durationMs)}</span>
                </div>
                <div className="flex shrink-0 gap-1">
                    <Button size="small" icon={<FolderPlus className="size-3.5" />} onClick={() => onSaveAsset(video)}>
                        添加到素材
                    </Button>
                    <Button size="small" icon={<Download className="size-3.5" />} onClick={() => onDownload(video)}>
                        下载
                    </Button>
                </div>
            </div>
        </div>
    );
}

function PendingVideoCard() {
    return (
        <div className="relative aspect-video overflow-hidden rounded-xl border border-dashed border-[#ded2c3] bg-[#fbf6ee]">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-[#7a6d63]">
                <LoaderCircle className="size-6 animate-spin" />
                <span>生成中</span>
            </div>
        </div>
    );
}

function FailedVideoCard({ error, onRetry }: { error: string; onRetry: () => void }) {
    return (
        <div className="overflow-hidden rounded-xl border border-[#e6b8ab] bg-[#faf1ee]">
            <div className="flex aspect-video flex-col items-center justify-center gap-3 p-5 text-center">
                <div className="text-sm font-medium text-[#c2412e]">生成失败</div>
                <Typography.Paragraph ellipsis={{ rows: 4 }} className="!mb-0 !text-xs !text-[#c2412e]">
                    {error}
                </Typography.Paragraph>
            </div>
            <div className="flex justify-end border-t border-[#e6b8ab] p-3">
                <Button size="small" danger onClick={onRetry}>
                    重试
                </Button>
            </div>
        </div>
    );
}

function LogPanel({
    logs,
    selectedLogIds,
    activeLogId,
    onSelectedLogIdsChange,
    onCreateSession,
    onDeleteSelected,
    onPreviewLog,
}: {
    logs: GenerationLog[];
    selectedLogIds: string[];
    activeLogId?: string;
    onSelectedLogIdsChange: (ids: string[]) => void;
    onCreateSession: () => void;
    onDeleteSelected: () => void;
    onPreviewLog: (log: GenerationLog) => void;
}) {
    const allSelected = Boolean(logs.length) && selectedLogIds.length === logs.length;
    const toggleAll = () => onSelectedLogIdsChange(allSelected ? [] : logs.map((log) => log.id));

    return (
        <>
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="sf-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#7a6d63]">生成记录</h2>
                <Tag className="sf-mono m-0 rounded-full border-[#ded2c3] bg-[#f1e3cf] px-2 !text-[#9b5b32]">{String(logs.length).padStart(2, "0")}</Tag>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
                <Button size="small" icon={<Plus className="size-3.5" />} onClick={onCreateSession}>
                    新建
                </Button>
                <Button size="small" icon={<CheckSquare className="size-3.5" />} disabled={!logs.length} onClick={toggleAll}>
                    {allSelected ? "取消" : "全选"}
                </Button>
                <Button size="small" danger icon={<Trash2 className="size-3.5" />} disabled={!selectedLogIds.length} onClick={onDeleteSelected}>
                    删除
                </Button>
            </div>
            <div className="space-y-3">
                {logs.map((log) => (
                    <LogCard
                        key={log.id}
                        log={log}
                        selected={selectedLogIds.includes(log.id)}
                        active={activeLogId === log.id}
                        onSelectedChange={(checked) => onSelectedLogIdsChange(checked ? [...selectedLogIds, log.id] : selectedLogIds.filter((id) => id !== log.id))}
                        onClick={() => onPreviewLog(log)}
                    />
                ))}
                {!logs.length ? <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-[#ded2c3] text-center text-sm text-[#7a6d63]">暂无生成记录</div> : null}
            </div>
        </>
    );
}

function LogCard({ log, selected, active, onSelectedChange, onClick }: { log: GenerationLog; selected: boolean; active: boolean; onSelectedChange: (checked: boolean) => void; onClick: () => void }) {
    return (
        <button
            type="button"
            className={`block w-full rounded-xl border p-2.5 text-left transition ${active ? "border-[#9b5b32] bg-[#faf3ea] shadow-[0_0_0_1px_#9b5b32]" : "border-[#eee4d5] bg-[#fffdf8] hover:border-[#ded2c3] hover:bg-[#fbf6ee]"}`}
            onClick={onClick}
        >
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
                <Checkbox className="mt-0.5" checked={selected} onClick={(event) => event.stopPropagation()} onChange={(event) => onSelectedChange(event.target.checked)} />
                <div className="min-w-0">
                    <div className="truncate text-sm font-medium leading-5">{log.title}</div>
                    <div className="mt-2 flex flex-wrap gap-1">
                        <Tag className="sf-mono m-0 flex h-6 items-center rounded-md border-[#e5ddcf] bg-[#f2ede4] px-1.5 text-xs leading-none !text-[#7a6d63]">{log.size}</Tag>
                        <Tag className="sf-mono m-0 flex h-6 items-center rounded-md border-[#e5ddcf] bg-[#f2ede4] px-1.5 text-xs leading-none !text-[#7a6d63]">{log.resolution}p</Tag>
                        <Tag className="sf-mono m-0 flex h-6 items-center rounded-md border-[#e5ddcf] bg-[#f2ede4] px-1.5 text-xs leading-none !text-[#7a6d63]">{log.seconds}s</Tag>
                    </div>
                </div>
                <div className="grid justify-items-end gap-2">
                    <Tag
                        className={`sf-mono m-0 flex h-6 items-center rounded-md px-1.5 text-xs leading-none ${
                            log.status === "成功" ? "border-[#d9e2d0] bg-[#eef2e7] !text-[#5f7a52]" : log.status === "生成中" ? "border-[#ded2c3] bg-[#f1e3cf] !text-[#9b5b32]" : "border-[#eed9d1] bg-[#f9ece8] !text-[#c2412e]"
                        }`}
                    >
                        {log.status}
                    </Tag>
                    <Tag className="sf-mono m-0 flex h-6 items-center rounded-md border-[#d9e2d0] bg-[#eef2e7] px-1.5 text-xs leading-none !text-[#5f7a52]">{formatDuration(log.durationMs)}</Tag>
                </div>
            </div>
        </button>
    );
}

async function readStoredLogs() {
    if (typeof window === "undefined") return [];
    try {
        const logs: GenerationLog[] = [];
        await getLogStore().iterate<GenerationLog, void>((value) => {
            logs.push(value);
        });
        return (await Promise.all(logs.map(normalizeLog))).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch {
        return [];
    }
}

async function normalizeLog(log: Partial<GenerationLog>): Promise<GenerationLog> {
    const video = log.video?.storageKey ? { ...log.video, url: await resolveMediaUrl(log.video.storageKey, log.video.url) } : log.video;
    const videoReferences = await Promise.all(
        (log.videoReferences || []).map(async (item) => ({
            ...item,
            url: item.storageKey ? await resolveMediaUrl(item.storageKey, item.url) : item.url,
        })),
    );
    const audioReferences = await Promise.all(
        (log.audioReferences || []).map(async (item) => ({
            ...item,
            url: item.storageKey ? await resolveMediaUrl(item.storageKey, item.url) : item.url,
        })),
    );
    const references = await Promise.all(
        (log.references || []).map(async (item) => ({
            ...item,
            dataUrl: await resolveImageUrl(item.storageKey, item.dataUrl),
        })),
    );
    const config = normalizeLogConfig(log);
    return {
        id: log.id || nanoid(),
        createdAt: log.createdAt || Date.now(),
        title: log.title || log.model || "未命名",
        prompt: log.prompt || "",
        time: log.time || new Date().toLocaleString("zh-CN", { hour12: false }),
        model: log.model || config.videoModel || "",
        config,
        references,
        videoReferences,
        audioReferences,
        durationMs: log.durationMs || 0,
        size: log.size || config.size || "",
        resolution: normalizeResolution(log.resolution || config.vquality || ""),
        seconds: log.seconds || config.videoSeconds || "",
        status: log.status || "成功",
        task: log.task,
        video,
        error: log.error,
    };
}

function serializeLog(log: GenerationLog): GenerationLog {
    return {
        ...log,
        references: log.references.map((item) => ({ ...item, dataUrl: item.storageKey ? "" : item.dataUrl })),
        videoReferences: log.videoReferences.map((item) => (item.storageKey ? { ...item, url: "" } : item)),
        audioReferences: log.audioReferences.map((item) => (item.storageKey ? { ...item, url: "" } : item)),
        video: log.video?.storageKey ? { ...log.video, url: "" } : log.video,
    };
}

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

function moveListItem<T>(items: T[], index: number, offset: number) {
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= items.length) return items;
    const next = [...items];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    return next;
}

function ReferenceOrderButtons({ index, total, onMove }: { index: number; total: number; onMove: (offset: number) => void }) {
    if (total <= 1) return null;
    return (
        <div className="absolute inset-x-1 bottom-1 flex justify-between">
            <Button size="small" className="!h-6 !w-6 !min-w-6 !rounded-full !bg-white/85 !p-0 !shadow-sm" icon={<ArrowLeft className="size-3" />} disabled={index <= 0} onClick={() => onMove(-1)} />
            <Button size="small" className="!h-6 !w-6 !min-w-6 !rounded-full !bg-white/85 !p-0 !shadow-sm" icon={<ArrowRight className="size-3" />} disabled={index >= total - 1} onClick={() => onMove(1)} />
        </div>
    );
}

function normalizeLogConfig(log: Partial<GenerationLog>): GenerationLogConfig {
    return {
        model: log.config?.model || log.model || "",
        videoModel: log.config?.videoModel || log.model || "",
        size: log.config?.size || log.size || "",
        vquality: normalizeResolution(log.config?.vquality || log.resolution || ""),
        videoSeconds: log.config?.videoSeconds || log.seconds || "",
        videoGenerateAudio: log.config?.videoGenerateAudio || "true",
        videoWatermark: log.config?.videoWatermark || "false",
        videoDraft: log.config?.videoDraft || "true",
    };
}

function buildLog({
    prompt,
    model,
    config,
    references,
    videoReferences,
    audioReferences,
    durationMs,
    status,
    task,
    video,
    error,
}: {
    prompt: string;
    model: string;
    config: AiConfig;
    references: ReferenceImage[];
    videoReferences: ReferenceVideo[];
    audioReferences: ReferenceAudio[];
    durationMs: number;
    status: GenerationLog["status"];
    task?: VideoGenerationTask;
    video?: GeneratedVideo;
    error?: string;
}): GenerationLog {
    const logConfig = {
        model: config.model,
        videoModel: config.videoModel,
        size: config.size,
        vquality: normalizeResolution(config.vquality),
        videoSeconds: config.videoSeconds,
        videoGenerateAudio: config.videoGenerateAudio,
        videoWatermark: config.videoWatermark,
        videoDraft: config.videoDraft,
    };
    return {
        id: nanoid(),
        createdAt: Date.now(),
        title: prompt.slice(0, 12) || "未命名",
        prompt,
        time: new Date().toLocaleString("zh-CN", { hour12: false }),
        model,
        config: logConfig,
        references,
        videoReferences,
        audioReferences,
        durationMs,
        size: logConfig.size,
        resolution: logConfig.vquality,
        seconds: logConfig.videoSeconds,
        status,
        task,
        video,
        error,
    };
}

function buildVideoConfig(config: AiConfig, model: string): AiConfig {
    return buildVideoGenerationConfig(config, model);
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
