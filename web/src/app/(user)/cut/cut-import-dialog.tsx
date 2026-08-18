"use client";

import { useMemo, useState } from "react";
import { App, Empty, Modal, Spin, Tabs, Upload } from "antd";
import { InboxOutlined, PlayCircleOutlined } from "@ant-design/icons";

import { useAssetStore, type VideoAsset } from "@/stores/use-asset-store";
import { FALLBACK_DURATION_MS, readVideoMetaFromUrl } from "./cut-media";
import { useCutStore, type CutClip } from "./cut-store";

export default function CutImportDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const assets = useAssetStore((s) => s.assets);
    const videoAssets = useMemo(() => assets.filter((a): a is VideoAsset => a.kind === "video"), [assets]);
    const addClips = useCutStore((s) => s.addClips);
    const { message } = App.useApp();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [busy, setBusy] = useState(false);

    const closeDialog = () => {
        setSelectedIds(new Set());
        setBusy(false);
        onClose();
    };

    const handleAddAssets = async () => {
        const items = videoAssets.filter((a) => selectedIds.has(a.id));
        if (items.length === 0) return;
        setBusy(true);
        try {
            const clips: Omit<CutClip, "id">[] = [];
            for (const asset of items) {
                const meta = await readVideoMetaFromUrl(asset.data.url);
                const durationMs = meta.durationMs ?? FALLBACK_DURATION_MS;
                clips.push({
                    name: asset.title,
                    storageKey: asset.data.storageKey,
                    url: asset.data.url,
                    width: asset.data.width,
                    height: asset.data.height,
                    bytes: asset.data.bytes,
                    mimeType: asset.data.mimeType,
                    durationMs,
                    startMs: 0,
                    endMs: durationMs,
                });
            }
            addClips(clips);
            message.success(`已添加 ${clips.length} 个素材到时间轴`);
            closeDialog();
        } catch {
            message.error("读取素材信息失败，请重试");
            setBusy(false);
        }
    };

    const handleLocalFiles = async (files: File[]) => {
        if (files.length === 0) return;
        setBusy(true);
        try {
            const clips: Omit<CutClip, "id">[] = [];
            for (const file of files) {
                const url = URL.createObjectURL(file);
                const meta = await readVideoMetaFromUrl(url);
                const durationMs = meta.durationMs ?? FALLBACK_DURATION_MS;
                clips.push({
                    name: file.name.replace(/\.[^.]+$/, ""),
                    url,
                    width: meta.width,
                    height: meta.height,
                    bytes: file.size,
                    mimeType: file.type || "video/mp4",
                    durationMs,
                    startMs: 0,
                    endMs: durationMs,
                });
            }
            addClips(clips);
            message.success(`已添加 ${clips.length} 个素材到时间轴`);
            closeDialog();
        } catch {
            message.error("读取视频信息失败，请检查文件格式");
            setBusy(false);
        }
    };

    return (
        <Modal
            open={open}
            onCancel={closeDialog}
            onOk={handleAddAssets}
            okText={`添加到时间轴${selectedIds.size > 0 ? `（${selectedIds.size}）` : ""}`}
            okButtonProps={{ disabled: selectedIds.size === 0 || busy }}
            confirmLoading={busy}
            title="导入素材"
            width={640}
            destroyOnHidden
        >
            <Tabs
                items={[
                    {
                        key: "library",
                        label: "素材库",
                        children: videoAssets.length === 0 ? (
                            <Empty description="素材库还没有视频素材，先生成或上传一些吧" />
                        ) : (
                            <div className="grid max-h-[380px] grid-cols-3 gap-2 overflow-y-auto pr-1">
                                {videoAssets.map((asset) => {
                                    const selected = selectedIds.has(asset.id);
                                    return (
                                        <div
                                            key={asset.id}
                                            onClick={() => setSelectedIds((prev) => {
                                                const next = new Set(prev);
                                                if (next.has(asset.id)) next.delete(asset.id);
                                                else next.add(asset.id);
                                                return next;
                                            })}
                                            className={`cursor-pointer rounded-lg border p-1.5 transition-colors ${selected ? "border-[#9b5b32] bg-[#f3e6d8]" : "border-[#ded2c3] bg-white hover:border-[#c9b7a0]"}`}
                                        >
                                            <div className="relative aspect-video overflow-hidden rounded-md bg-black">
                                                {asset.coverUrl ? (
                                                    <img
                                                        src={asset.coverUrl}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => {
                                                            (e.currentTarget as HTMLImageElement).style.display = "none";
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center text-neutral-400">
                                                        <PlayCircleOutlined className="text-xl" />
                                                    </div>
                                                )}
                                                {selected && (
                                                    <div className="absolute right-1 top-1 rounded bg-[#9b5b32] px-1.5 py-0.5 text-[10px] text-white">
                                                        已选
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-1 truncate text-xs text-[#201914]">{asset.title}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        ),
                    },
                    {
                        key: "upload",
                        label: "本地上传",
                        children: (
                            <div className="py-2">
                                <Upload.Dragger
                                    accept="video/*"
                                    multiple
                                    showUploadList={false}
                                    beforeUpload={(file) => {
                                        void handleLocalFiles([file as File]);
                                        return false;
                                    }}
                                >
                                    <p className="ant-upload-drag-icon">
                                        <InboxOutlined />
                                    </p>
                                    <p className="ant-upload-text">点击或拖拽视频文件到这里</p>
                                    <p className="ant-upload-hint">
                                        支持 mp4 / webm / mov 等常见格式。本地导入的素材仅保存在当前页面，刷新后需重新导入；素材库里的素材会一直保留。
                                    </p>
                                </Upload.Dragger>
                                {busy && (
                                    <div className="mt-3 flex items-center justify-center gap-2 text-xs text-neutral-500">
                                        <Spin size="small" /> 正在读取视频信息…
                                    </div>
                                )}
                            </div>
                        ),
                    },
                ]}
            />
        </Modal>
    );
}
