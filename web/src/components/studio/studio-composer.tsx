"use client";

import { BookOpen, ClipboardPaste, FolderPlus, Music2, Send, SlidersHorizontal, Upload, VideoIcon, X } from "lucide-react";
import { useRef } from "react";
import { Button, Input, Segmented, Tooltip } from "antd";

import type { ReferenceImage } from "@/types/image";
import type { ReferenceAudio, ReferenceVideo } from "@/types/media";
import type { StudioKind } from "@/lib/studio/types";

export type StudioMode = StudioKind | "auto";

type StudioComposerProps = {
    draft: string;
    references: ReferenceImage[];
    videoReferences: ReferenceVideo[];
    audioReferences: ReferenceAudio[];
    modeOverride: StudioMode;
    detectedKind: StudioKind;
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
};

export function StudioComposer({
    draft,
    references,
    videoReferences,
    audioReferences,
    modeOverride,
    detectedKind,
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
}: StudioComposerProps) {
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    const effectiveKind = modeOverride === "auto" ? detectedKind : modeOverride;

    return (
        <div className="rounded-2xl border border-[#ded2c3] bg-[#fffdf8] p-3 shadow-[0_12px_40px_rgba(57,48,34,0.08)]">
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

            {references.length || videoReferences.length || audioReferences.length ? (
                <div className="mb-3 flex flex-wrap gap-2">
                    {references.map((ref, index) => (
                        <div key={ref.id} className="group relative">
                            <img src={ref.dataUrl} alt={ref.name} className="size-12 rounded-lg border border-[#ded2c3] object-cover" />
                            <button
                                type="button"
                                aria-label="移除参考图"
                                onClick={() => onRemoveReference(index)}
                                className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                            >
                                <X className="size-3" />
                            </button>
                        </div>
                    ))}
                    {videoReferences.map((ref, index) => (
                        <div key={ref.id} className="flex items-center gap-1.5 rounded-lg border border-[#ded2c3] bg-[#f6efe4] px-2 py-1 text-[11px] text-[#7a6d63]">
                            <VideoIcon className="size-3.5" />
                            <span className="max-w-24 truncate">{ref.name}</span>
                            <button type="button" aria-label="移除参考视频" onClick={() => onRemoveVideoReference(index)} className="text-[#b7a99b] hover:text-[#201914]">
                                <X className="size-3" />
                            </button>
                        </div>
                    ))}
                    {audioReferences.map((ref, index) => (
                        <div key={ref.id} className="flex items-center gap-1.5 rounded-lg border border-[#ded2c3] bg-[#f6efe4] px-2 py-1 text-[11px] text-[#7a6d63]">
                            <Music2 className="size-3.5" />
                            <span className="max-w-24 truncate">{ref.name}</span>
                            <button type="button" aria-label="移除参考音频" onClick={() => onRemoveAudioReference(index)} className="text-[#b7a99b] hover:text-[#201914]">
                                <X className="size-3" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : null}

            <Input.TextArea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                onPressEnter={(event) => {
                    if (!event.shiftKey) {
                        event.preventDefault();
                        onSend();
                    }
                }}
                autoSize={{ minRows: 2, maxRows: 6 }}
                placeholder="描述你要的画面，例如：一只橘猫戴着飞行员眼镜坐在云端，赛博朋克风格。Enter 发送，Shift+Enter 换行。"
                disabled={sending}
                className="!border-0 !bg-transparent !px-1 !shadow-none focus:!shadow-none"
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0e8dc] pt-2">
                <div className="flex flex-wrap items-center gap-1.5">
                    <Segmented
                        size="small"
                        value={modeOverride}
                        onChange={(value) => onModeChange(value as StudioMode)}
                        options={[
                            { label: "自动", value: "auto" },
                            { label: "图片", value: "image" },
                            { label: "视频", value: "video" },
                        ]}
                    />
                    <Tooltip title="上传参考图片（最多 9 张）">
                        <Button size="small" type="text" icon={<Upload className="size-4" />} onClick={() => imageInputRef.current?.click()} disabled={sending} />
                    </Tooltip>
                    <Tooltip title="上传参考视频（最多 3 个）">
                        <Button size="small" type="text" icon={<VideoIcon className="size-4" />} onClick={() => videoInputRef.current?.click()} disabled={sending} />
                    </Tooltip>
                    <Tooltip title="上传参考音频（最多 3 个）">
                        <Button size="small" type="text" icon={<Music2 className="size-4" />} onClick={() => audioInputRef.current?.click()} disabled={sending} />
                    </Tooltip>
                    <Tooltip title="粘贴剪切板图片">
                        <Button size="small" type="text" icon={<ClipboardPaste className="size-4" />} onClick={onPasteClipboard} disabled={sending} />
                    </Tooltip>
                    <Tooltip title="从素材库选择">
                        <Button size="small" type="text" icon={<FolderPlus className="size-4" />} onClick={onOpenAssetPicker} disabled={sending} />
                    </Tooltip>
                    <Tooltip title="提示词库">
                        <Button size="small" type="text" icon={<BookOpen className="size-4" />} onClick={onOpenPromptDialog} disabled={sending} />
                    </Tooltip>
                    <Tooltip title="生成参数">
                        <Button size="small" type="text" icon={<SlidersHorizontal className="size-4" />} onClick={onOpenSettings} />
                    </Tooltip>
                </div>

                <div className="flex items-center gap-2">
                    <span className="sf-mono text-[11px] text-[#b7a99b]">
                        {modeOverride === "auto" ? `自动 · ${effectiveKind === "image" ? "将生成图片" : "将生成视频"}` : effectiveKind === "image" ? "图片模式" : "视频模式"}
                        {creditCost !== null ? ` · ≈${creditCost} 积分/次` : ""}
                    </span>
                    <Button type="primary" icon={<Send className="size-4" />} onClick={onSend} loading={sending} className="!rounded-xl">
                        生成
                    </Button>
                </div>
            </div>
        </div>
    );
}
