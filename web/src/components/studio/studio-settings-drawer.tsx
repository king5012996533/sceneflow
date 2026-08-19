"use client";

import { Drawer, Typography } from "antd";

import { ImageSettingsPanel } from "@/components/image-settings-panel";
import { ModelPicker } from "@/components/model-picker";
import { VideoSettingsPanel } from "@/components/video-settings-panel";
import { canvasThemes } from "@/lib/canvas-theme";
import type { AiConfig } from "@/stores/use-config-store";
import type { StudioKind } from "@/lib/studio/types";

type StudioSettingsDrawerProps = {
    open: boolean;
    onClose: () => void;
    kind: StudioKind;
    config: AiConfig;
    onModelChange: (model: string) => void;
    onConfigChange: <K extends keyof AiConfig>(key: K, value: AiConfig[K]) => void;
};

export function StudioSettingsDrawer({ open, onClose, kind, config, onModelChange, onConfigChange }: StudioSettingsDrawerProps) {
    const model = kind === "image" ? config.imageModel : config.videoModel;
    const handleModelChange = (next: string) => onModelChange(next);

    const handleImageConfigChange = (key: "quality" | "size" | "count", value: string) => onConfigChange(key, value);
    const handleVideoConfigChange = (key: "vquality" | "size" | "videoSeconds" | "videoGenerateAudio" | "videoWatermark" | "videoDraft", value: string) => onConfigChange(key, value);

    return (
        <Drawer title={kind === "image" ? "图片生成参数" : "视频生成参数"} placement="right" width={380} open={open} onClose={onClose}>
            <div className="space-y-5">
                <div className="flex items-center justify-between rounded-xl border border-[#f0e8dc] bg-[#fbf7f0] px-3 py-2.5">
                    <div>
                        <div className="text-[13px] font-semibold text-[#201914]">生成模型</div>
                        <div className="mt-0.5 text-[11px] text-[#b7a99b]">当前为{kind === "image" ? "图片" : "视频"}模式；切换模式在输入框上方</div>
                    </div>
                </div>

                <ModelPicker config={config} value={model} onChange={handleModelChange} capability={kind === "image" ? "image" : "video"} fullWidth placeholder="选择模型" />

                {kind === "image" ? <ImageSettingsPanel config={config} onConfigChange={handleImageConfigChange} theme={canvasThemes.warm} /> : <VideoSettingsPanel config={config} onConfigChange={handleVideoConfigChange} theme={canvasThemes.warm} />}

                <Typography.Text type="secondary" className="block text-[11px] leading-5">
                    参数随会话保存；切换图片 / 视频模式时，尺寸会在「比例」与「像素」之间自动换算。
                </Typography.Text>
            </div>
        </Drawer>
    );
}
