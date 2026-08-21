"use client";

import { useEffect } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { ImageSettingsPanel } from "@/components/image-settings-panel";
import { ModelPicker } from "@/components/model-picker";
import { VideoSettingsPanel } from "@/components/video-settings-panel";
import { canvasThemes } from "@/lib/canvas-theme";
import { STUDIO_STYLE_PRESETS } from "@/lib/studio/style-presets";
import type { StudioKind, StudioStylePresetId } from "@/lib/studio/types";
import type { AiConfig } from "@/stores/use-config-store";

type StudioSettingsDrawerProps = {
    open: boolean;
    onClose: () => void;
    kind: StudioKind;
    config: AiConfig;
    stylePreset: StudioStylePresetId;
    onStylePresetChange: (id: StudioStylePresetId) => void;
    onModelChange: (model: string) => void;
    onConfigChange: <K extends keyof AiConfig>(key: K, value: AiConfig[K]) => void;
};

const STYLE_GRADIENTS: Record<StudioStylePresetId, string> = {
    none: "linear-gradient(135deg, #e8e2d8 0%, #f4f0e8 48%, #b5a898 100%)",
    "wuxia-film": "linear-gradient(135deg, #d7b59b 0%, #ede0cc 48%, #776355 100%)",
    "wuxia-hardlight": "linear-gradient(135deg, #bf8e71 0%, #e9cab4 48%, #684d43 100%)",
};

export function StudioSettingsDrawer({ open, onClose, kind, config, stylePreset, onStylePresetChange, onModelChange, onConfigChange }: StudioSettingsDrawerProps) {
    const model = kind === "image" ? config.imageModel : config.videoModel;
    const handleModelChange = (next: string) => onModelChange(next);

    const handleImageConfigChange = (key: "quality" | "size" | "count", value: string) => onConfigChange(key, value);
    const handleVideoConfigChange = (key: "vquality" | "size" | "videoSeconds" | "videoGenerateAudio" | "videoWatermark" | "videoDraft", value: string) => onConfigChange(key, value);

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    return (
        <>
            <div className={`drawer-scrim ${open ? "is-open" : ""}`} onClick={onClose} />
            <aside className={`settings-drawer ${open ? "is-open" : ""}`} aria-label="参数设置">
                <div className="drawer-header">
                    <div className="drawer-title">
                        <SlidersHorizontal className="size-4 text-[#5f6d66]" />
                        <h2>{kind === "image" ? "图片生成参数" : "视频生成参数"}</h2>
                        <span>{kind === "image" ? "图片模式" : "视频模式"}</span>
                    </div>
                    <button type="button" className="icon-button" aria-label="关闭参数设置" onClick={onClose}>
                        <X />
                    </button>
                </div>
                <div className="drawer-content thin-scrollbar">
                    <section className="setting-section">
                        <h3 className="setting-heading">生成模型</h3>
                        <ModelPicker config={config} value={model} onChange={handleModelChange} capability={kind === "image" ? "image" : "video"} fullWidth placeholder="选择模型" />
                        <p className="drawer-footnote">当前为{kind === "image" ? "图片" : "视频"}模式；切换模式在输入框上方。</p>
                    </section>

                    <section className="setting-section">
                        <h3 className="setting-heading">风格预设</h3>
                        <p className="drawer-footnote" style={{ marginTop: -4 }}>
                            选中后自动把风格关键词追加到提示词末尾，随会话保存。
                        </p>
                        <div className="style-scroll thin-scrollbar" style={{ marginTop: 10 }}>
                            {STUDIO_STYLE_PRESETS.map((preset) => {
                                const active = preset.id === stylePreset;
                                return (
                                    <button key={preset.id} type="button" className={`style-card ${active ? "is-active" : ""}`} onClick={() => onStylePresetChange(preset.id)}>
                                        <span className="style-preview" style={{ background: STYLE_GRADIENTS[preset.id] }} />
                                        <strong>{preset.label}</strong>
                                        <span>{preset.desc}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className="setting-section" style={{ borderBottom: 0, marginBottom: 0 }}>
                        <h3 className="setting-heading">生成参数</h3>
                        {kind === "image" ? (
                            <ImageSettingsPanel config={config} onConfigChange={handleImageConfigChange} theme={canvasThemes.warm} showTitle={false} className="w-full space-y-4" />
                        ) : (
                            <VideoSettingsPanel config={config} onConfigChange={handleVideoConfigChange} theme={canvasThemes.warm} showTitle={false} className="w-full space-y-4" />
                        )}
                    </section>
                </div>
            </aside>
        </>
    );
}
