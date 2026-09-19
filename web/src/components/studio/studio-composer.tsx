"use client";

import { ArrowUp, AudioLines, Clapperboard, Clipboard, ImagePlus, Info, Library, NotebookTabs, ScanSearch, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ImageMarkerDialog } from "@/components/image-marker-dialog";
import { imageReferenceLabel } from "@/lib/image-reference-prompt";
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
    /**
     * 参考图上是否出现「标注」入口（交互编辑）。只有后台标定过 interactiveEdit 的模型才为 true。
     * 标了支持才显示：坐标标记发给不支持的模型是**静默无效**的（上游当普通文字忽略，钱照扣）。
     */
    interactiveEditEnabled?: boolean;
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
    interactiveEditEnabled = false,
}: StudioComposerProps) {
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    /** 标注面板要标的是哪一张参考图（null = 没开） */
    const [markerIndex, setMarkerIndex] = useState<number | null>(null);
    /** 插入标记后要把光标放回哪里（受控 textarea 重新渲染会丢选区，得自己还原） */
    const pendingCaret = useRef<number | null>(null);

    useEffect(() => {
        const caret = pendingCaret.current;
        const element = textareaRef.current;
        if (caret === null || !element) return;
        pendingCaret.current = null;
        element.focus();
        element.setSelectionRange(caret, caret);
    }, [draft]);

    /**
     * 把标记文字插到**光标处**（不是追加到末尾）：提示词通常是「把…换成…」这种句子，
     * 标记要嵌在句子中间、紧跟在图片编号后面。两侧补空格，避免和汉字/标点粘成一个词。
     */
    const insertMarkerText = (text: string) => {
        const element = textareaRef.current;
        const start = element ? (element.selectionStart ?? draft.length) : draft.length;
        const end = element ? (element.selectionEnd ?? draft.length) : draft.length;
        const before = draft.slice(0, start);
        const after = draft.slice(end);
        const prefix = before && !/\s$/.test(before) ? " " : "";
        const suffix = after && !/^\s/.test(after) ? " " : "";
        const inserted = `${prefix}${text}${suffix}`;
        onDraftChange(`${before}${inserted}${after}`);
        pendingCaret.current = start + inserted.length;
    };

    const effectiveKind = modeOverride === "auto" ? detectedKind : modeOverride;
    const canMark = interactiveEditEnabled && effectiveKind === "image";
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
                            {canMark ? (
                                <button type="button" className="attachment-mark" aria-label={`标注 ${imageReferenceLabel(index)} 要改的位置`} title="标注要改的位置（点选 / 框选）" onClick={() => setMarkerIndex(index)}>
                                    <ScanSearch />
                                </button>
                            ) : null}
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

            <ImageMarkerDialog
                open={markerIndex !== null}
                onClose={() => setMarkerIndex(null)}
                reference={markerIndex !== null ? (references[markerIndex] ?? null) : null}
                imageIndex={markerIndex ?? 0}
                label={imageReferenceLabel}
                onInsert={insertMarkerText}
            />
        </div>
    );
}
