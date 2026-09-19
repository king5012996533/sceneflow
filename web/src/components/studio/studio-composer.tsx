"use client";

import { ArrowUp, AudioLines, Clapperboard, Clipboard, ImagePlus, Info, Library, NotebookTabs, X } from "lucide-react";
import { useRef } from "react";

import { getStylePreset } from "@/lib/studio/style-presets";
import type { StudioKind, StudioStylePresetId } from "@/lib/studio/types";
import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";

export type StudioMode = StudioKind | "auto";

const MODES: { value: StudioMode; label: string }[] = [
    { value: "auto", label: "自动" },
    { value: "image", label: "图片" },
    { value: "video", label: "视频" },
];

type StudioComposerProps = {
    draft: string;
    references: ReferenceImage[];
    videoReferences: ReferenceVideo[];
    audioReferences: ReferenceAudio[];
    modeOverride: StudioMode;
    detectedKind: StudioKind;
    stylePreset: StudioStylePresetId;
    sending: boolean;
    creditCost: number | null;
    onDraftChange: (value: string) => void;
    onModeChange: (mode: StudioMode) => void;
    onSend: () => void;
    onAttachImages: (files: File[]) => void;
    onAttachVideos: (files: File[]) => void;
    onAttachAudios: (files: File[]) => void;
    onPasteClipboard: () => void;
    onOpenAssetPicker: () => void;
    onOpenPromptDialog: () => void;
    onOpenSettings: () => void;
    onRemoveReference: (index: number) => void;
    onRemoveVideoReference: (index: number) => void;
    onRemoveAudioReference: (index: number) => void;
    /**
     * 参考图入口是否可用。当前模型不吃参考图时为 false：三个图片类入口禁用并显示原因。
     * 上游对多余的输入字段是静默忽略的（不发报错），所以只能在这里拦，否则用户会为一张
     * 与参考图无关的图付钱（见 lib/model-reference-support.ts）。
     */
    referenceImagesEnabled?: boolean;
    /** referenceImagesEnabled 为 false 时显示的原因文案 */
    referenceImagesHint?: string;
};

export function StudioComposer({
    draft,
    references,
    videoReferences,
    audioReferences,
    modeOverride,
    detectedKind,
    stylePreset,
    sending,
    creditCost,
    onDraftChange,
    onModeChange,
    onSend,
    onAttachImages,
    onAttachVideos,
    onAttachAudios,
    onPasteClipboard,
    onOpenAssetPicker,
    onOpenPromptDialog,
    onOpenSettings,
    onRemoveReference,
    onRemoveVideoReference,
    onRemoveAudioReference,
    referenceImagesEnabled = true,
    referenceImagesHint = "",
}: StudioComposerProps) {
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    const effectiveKind = modeOverride === "auto" ? detectedKind : modeOverride;
    const hasAttachments = references.length || videoReferences.length || audioReferences.length;
    const styleLabel = stylePreset !== "none" ? getStylePreset(stylePreset).label : "";
    const costNote = [
        styleLabel ? `风格：${styleLabel}` : "",
        modeOverride === "auto" ? `自动 · 将生成${effectiveKind === "image" ? "图片" : "视频"}` : effectiveKind === "image" ? "图片模式" : "视频模式",
        creditCost !== null ? `≈${creditCost} 积分/次` : "",
    ]
        .filter(Boolean)
        .join(" · ");

    return (
        <div className="composer">
            <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    if (files.length) onAttachImages(files);
                    event.target.value = "";
                }}
            />
            <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    if (files.length) onAttachVideos(files);
                    event.target.value = "";
                }}
            />
            <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                multiple
                className="hidden"
                onChange={(event) => {
                    const files = Array.from(event.target.files || []);
                    if (files.length) onAttachAudios(files);
                    event.target.value = "";
                }}
            />

            {hasAttachments ? (
                <div className="attachment-tray has-items">
                    {references.map((ref, index) => (
                        <div key={ref.id} className="attachment-chip">
                            <img src={ref.dataUrl} alt={ref.name} />
                            <button type="button" aria-label="移除参考图" onClick={() => onRemoveReference(index)}>
                                <X />
                            </button>
                        </div>
                    ))}
                    {videoReferences.map((ref, index) => (
                        <div key={ref.id} className="attachment-chip" title={ref.name}>
                            <span className="attachment-icon">
                                <Clapperboard />
                            </span>
                            <button type="button" aria-label="移除参考视频" onClick={() => onRemoveVideoReference(index)}>
                                <X />
                            </button>
                        </div>
                    ))}
                    {audioReferences.map((ref, index) => (
                        <div key={ref.id} className="attachment-chip" title={ref.name}>
                            <span className="attachment-icon">
                                <AudioLines />
                            </span>
                            <button type="button" aria-label="移除参考音频" onClick={() => onRemoveAudioReference(index)}>
                                <X />
                            </button>
                        </div>
                    ))}
                </div>
            ) : null}

            {referenceImagesEnabled ? null : (
                <div className="composer-notice" role="status">
                    <Info />
                    <span>{referenceImagesHint}</span>
                </div>
            )}

            <textarea
                value={draft}
                rows={3}
                placeholder="描述一个画面，或继续编辑上一张图。Enter 发送，Shift+Enter 换行。"
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        if (!sending) onSend();
                    }
                }}
                disabled={sending}
            />

            <div className="composer-bottom">
                <div className="composer-left">
                    <div className="mode-switch">
                        {MODES.map((mode) => (
                            <button key={mode.value} type="button" className={`mode-button ${modeOverride === mode.value ? "is-active" : ""}`} data-mode={mode.value} onClick={() => onModeChange(mode.value)}>
                                {mode.label}
                            </button>
                        ))}
                    </div>
                    <div className="asset-actions">
                        <button
                            type="button"
                            className="asset-button"
                            data-asset="image"
                            aria-label="添加图片"
                            title={referenceImagesEnabled ? undefined : referenceImagesHint}
                            onClick={() => imageInputRef.current?.click()}
                            disabled={sending || !referenceImagesEnabled}
                        >
                            <ImagePlus />
                        </button>
                        <button type="button" className="asset-button" data-asset="video" aria-label="添加视频" onClick={() => videoInputRef.current?.click()} disabled={sending}>
                            <Clapperboard />
                        </button>
                        <button type="button" className="asset-button" data-asset="audio" aria-label="添加音频" onClick={() => audioInputRef.current?.click()} disabled={sending}>
                            <AudioLines />
                        </button>
                        <button
                            type="button"
                            className="asset-button"
                            data-asset="clipboard"
                            aria-label="从剪贴板添加"
                            title={referenceImagesEnabled ? undefined : referenceImagesHint}
                            onClick={onPasteClipboard}
                            disabled={sending || !referenceImagesEnabled}
                        >
                            <Clipboard />
                        </button>
                        <button
                            type="button"
                            className="asset-button"
                            data-asset="library"
                            aria-label="从素材库添加"
                            title={referenceImagesEnabled ? undefined : referenceImagesHint}
                            onClick={onOpenAssetPicker}
                            disabled={sending || !referenceImagesEnabled}
                        >
                            <Library />
                        </button>
                        <button type="button" className="asset-button" data-asset="prompt" aria-label="打开提示词库" onClick={onOpenPromptDialog} disabled={sending}>
                            <NotebookTabs />
                        </button>
                    </div>
                </div>
                <div className="composer-right">
                    <span className="cost-note">{costNote}</span>
                    <span className="keyboard-hint">Enter 发送 · Shift+Enter 换行</span>
                    <button type="button" className="primary-button" onClick={onSend} disabled={sending} aria-label="发送">
                        {sending ? <span className="inline-block size-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <ArrowUp />}
                    </button>
                </div>
            </div>
        </div>
    );
}
