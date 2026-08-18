"use client";

import { useMemo, useState } from "react";
import { App, Button, ConfigProvider, Input, Modal, Popconfirm, Progress, Slider, Tag } from "antd";
import { ClearOutlined, CloudDownloadOutlined, DeleteOutlined, ImportOutlined, ScissorOutlined } from "@ant-design/icons";
import { saveAs } from "file-saver";

import { sceneflowTheme } from "@/lib/sceneflow-theme";
import { uploadMediaFile } from "@/services/file-storage";
import { useAssetStore } from "@/stores/use-asset-store";
import { formatMs } from "./cut-media";
import { exportCutVideo } from "./cut-export";
import { useCutStore, type CutClip } from "./cut-store";
import CutImportDialog from "./cut-import-dialog";
import CutPreview from "./cut-preview";
import CutTimeline from "./cut-timeline";

export default function CutEditorPage() {
    return (
        <ConfigProvider theme={sceneflowTheme("sceneflow-cut")}>
            <App>
                <CutEditor />
            </App>
        </ConfigProvider>
    );
}

function CutEditor() {
    const clips = useCutStore((s) => s.clips);
    const selectedId = useCutStore((s) => s.selectedId);
    const clearAll = useCutStore((s) => s.clearAll);
    const { message } = App.useApp();

    const [importOpen, setImportOpen] = useState(false);
    const [exporting, setExporting] = useState<{ open: boolean; percent: number; step: string }>({ open: false, percent: 0, step: "" });

    const selectedClip = useMemo(() => clips.find((clip) => clip.id === selectedId) ?? null, [clips, selectedId]);
    const totalMs = useMemo(() => clips.reduce((sum, clip) => sum + Math.max(0, clip.endMs - clip.startMs), 0), [clips]);

    const handleExport = async () => {
        if (clips.length === 0) {
            message.warning("时间轴还没有素材，先导入一些吧");
            return;
        }
        setExporting({ open: true, percent: 0, step: "正在读取素材…" });
        try {
            const result = await exportCutVideo(clips, (progress) => {
                const percent = Math.min(1, Math.max(0, progress));
                const step = percent < 0.1 ? "正在加载编码器与素材…" : percent < 1 ? "正在合成视频，请稍候…" : "正在生成文件…";
                setExporting({ open: true, percent, step });
            });
            setExporting((prev) => ({ ...prev, percent: 1, step: "正在保存…" }));
            saveAs(result.blob, "剪辑导出.mp4");
            const uploaded = await uploadMediaFile(result.blob, "cut");
            useAssetStore.getState().addAsset({
                kind: "video",
                title: `剪辑导出 ${new Date().toLocaleString("zh-CN")}`,
                coverUrl: "",
                tags: ["剪辑"],
                source: "后期剪辑器",
                data: {
                    url: uploaded.url,
                    storageKey: uploaded.storageKey,
                    width: result.width,
                    height: result.height,
                    bytes: uploaded.bytes,
                    mimeType: uploaded.mimeType,
                },
            });
            message.success("导出完成：已下载，并保存了一份到素材库");
        } catch (error) {
            message.error(error instanceof Error ? error.message : "导出失败，请重试");
        } finally {
            setExporting({ open: false, percent: 0, step: "" });
        }
    };

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[#f6efe4] text-[#201914]">
            <header className="flex flex-wrap items-center gap-3 border-b border-[#ded2c3] bg-white/60 px-4 py-3">
                <div className="flex items-center gap-2.5">
                    <ScissorOutlined className="text-2xl text-[#9b5b32]" />
                    <div>
                        <div className="flex items-center gap-2 text-base font-semibold">
                            后期剪辑器
                            <Tag color="volcano" className="m-0">
                                MVP
                            </Tag>
                        </div>
                        <div className="text-xs text-neutral-500">时间轴拼接 + 裁剪，浏览器端合成导出，不占用服务器资源</div>
                    </div>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    <span className="text-xs text-neutral-500">
                        总时长 {formatMs(totalMs)} · {clips.length} 个素材
                    </span>
                    <Button type="primary" icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
                        导入素材
                    </Button>
                    <Button icon={<CloudDownloadOutlined />} onClick={handleExport} disabled={clips.length === 0}>
                        导出 MP4
                    </Button>
                    <Popconfirm
                        title="清空时间轴"
                        description="将移除全部素材，此操作不可撤销"
                        onConfirm={() => {
                            clearAll();
                            message.success("时间轴已清空");
                        }}
                        okText="清空"
                        cancelText="取消"
                        okButtonProps={{ danger: true }}
                    >
                        <Button danger icon={<ClearOutlined />} disabled={clips.length === 0}>
                            清空
                        </Button>
                    </Popconfirm>
                </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
                <CutPreview />
                <CutTimeline />
                {selectedClip && <SelectedClipPanel clip={selectedClip} />}
            </div>

            <CutImportDialog open={importOpen} onClose={() => setImportOpen(false)} />

            <Modal open={exporting.open} closable={false} maskClosable={false} footer={null} title="导出 MP4" width={420}>
                <div className="flex flex-col gap-3 py-3">
                    <Progress percent={Math.round(exporting.percent * 100)} status="active" />
                    <div className="text-center text-sm text-neutral-500">{exporting.step}</div>
                    <div className="text-center text-xs text-neutral-400">合成过程完全在浏览器本地进行，请保持页面开启</div>
                </div>
            </Modal>
        </div>
    );
}

function SelectedClipPanel({ clip }: { clip: CutClip }) {
    const renameClip = useCutStore((s) => s.renameClip);
    const setTrim = useCutStore((s) => s.setTrim);
    const removeClip = useCutStore((s) => s.removeClip);

    return (
        <div className="flex flex-wrap items-center gap-4 rounded-xl bg-white/70 px-4 py-3">
            <div className="text-sm font-medium">素材设置</div>
            <Input
                className="w-48"
                value={clip.name}
                onChange={(e) => renameClip(clip.id, e.target.value)}
                placeholder="素材名称"
            />
            <div className="flex min-w-[260px] flex-1 items-center gap-2">
                <span className="shrink-0 text-xs text-neutral-500">裁剪范围</span>
                <Slider
                    className="flex-1"
                    range
                    min={0}
                    max={Math.max(clip.durationMs, 1)}
                    value={[clip.startMs, clip.endMs]}
                    onChange={(v) => setTrim(clip.id, { startMs: v[0], endMs: v[1] })}
                    tooltip={{ formatter: (val) => formatMs(val as number) }}
                />
                <span className="shrink-0 font-mono text-xs text-neutral-500">{formatMs(clip.endMs - clip.startMs)}</span>
            </div>
            <Button danger icon={<DeleteOutlined />} onClick={() => removeClip(clip.id)}>
                移除
            </Button>
        </div>
    );
}
