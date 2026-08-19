"use client";

import { Download, FolderPlus, ImageIcon, LoaderCircle, RefreshCw, VideoIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Image, Tag, Tooltip } from "antd";
import { saveAs } from "file-saver";

import type { StudioMessage } from "@/lib/studio/types";

type ResultCardProps = {
    message: StudioMessage;
    onUseAsReference: (message: StudioMessage) => void;
    onSaveToAssets: (message: StudioMessage) => void;
    onRetry: (message: StudioMessage) => void;
};

function useElapsed(active: boolean, startedAt: number) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!active) return;
        setNow(Date.now());
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [active]);
    return active ? Math.max(0, now - startedAt) : 0;
}

function formatElapsed(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ResultCard({ message, onUseAsReference, onSaveToAssets, onRetry }: ResultCardProps) {
    const elapsed = useElapsed(message.status === "pending", message.createdAt);
    const kindLabel = message.kind === "image" ? "图片" : "视频";
    const KindIcon = message.kind === "image" ? ImageIcon : VideoIcon;

    return (
        <div className="w-full max-w-[560px] rounded-2xl border border-[#ded2c3] bg-[#fffdf8] p-4 shadow-[0_12px_40px_rgba(57,48,34,0.08)]">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <Tag className="!m-0 !flex !shrink-0 !items-center !gap-1 !rounded-full !border-[#ded2c3] !bg-[#f6efe4] !px-2.5 !py-0.5 !text-[11px] !text-[#9b5b32]">
                        <KindIcon className="size-3" />
                        {kindLabel}
                    </Tag>
                    <p className="sf-mono truncate text-[11px] leading-5 text-[#7a6d63]">{message.prompt}</p>
                </div>
                <span className="shrink-0 text-[11px] text-[#b7a99b]">{formatElapsed(message.results[0]?.durationMs || elapsed)}</span>
            </div>

            {message.status === "pending" ? (
                <div className="flex items-center gap-3 rounded-xl bg-[#f6efe4] px-4 py-6 text-sm text-[#7a6d63]">
                    <LoaderCircle className="size-5 animate-spin text-[#9b5b32]" />
                    <span>
                        正在生成{kindLabel}… 已耗时 {formatElapsed(elapsed)}
                    </span>
                </div>
            ) : message.status === "failed" ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-[#fdf1ec] px-4 py-3 text-sm text-[#b3423a]">
                    <span className="min-w-0 break-words">{message.error || "生成失败"}</span>
                    <Button size="small" icon={<RefreshCw className="size-3.5" />} onClick={() => onRetry(message)} className="!shrink-0">
                        重试
                    </Button>
                </div>
            ) : message.kind === "image" ? (
                <Image.PreviewGroup>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {message.results.map((result) =>
                            result.kind === "image" ? (
                                <div key={result.id} className="group relative overflow-hidden rounded-xl border border-[#ded2c3]">
                                    <Image src={result.dataUrl} alt={message.prompt} className="aspect-square w-full object-cover" />
                                    <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/50 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                                        <Tooltip title="下载">
                                            <Button size="small" className="!h-6 !min-w-6 !rounded-full !bg-white/90 !p-0" icon={<Download className="size-3.5" />} onClick={() => saveAs(result.dataUrl, `image-${result.id}.png`)} />
                                        </Tooltip>
                                        <Tooltip title="保存到素材库">
                                            <Button size="small" className="!h-6 !min-w-6 !rounded-full !bg-white/90 !p-0" icon={<FolderPlus className="size-3.5" />} onClick={() => onSaveToAssets(message)} />
                                        </Tooltip>
                                    </div>
                                </div>
                            ) : null,
                        )}
                    </div>
                </Image.PreviewGroup>
            ) : (
                <div>
                    {message.results.map((result) =>
                        result.kind === "video" ? (
                            <div key={result.id} className="space-y-2">
                                <video src={result.url} controls className="w-full rounded-xl border border-[#ded2c3] bg-black" />
                                <div className="flex justify-end gap-2">
                                    <Button size="small" icon={<Download className="size-3.5" />} onClick={() => saveAs(result.url, "video.mp4")}>
                                        下载
                                    </Button>
                                    <Button size="small" icon={<FolderPlus className="size-3.5" />} onClick={() => onSaveToAssets(message)}>
                                        保存到素材库
                                    </Button>
                                </div>
                            </div>
                        ) : null,
                    )}
                </div>
            )}

            {message.status === "success" ? (
                <div className="mt-3 flex justify-end">
                    <Button size="small" type="primary" ghost onClick={() => onUseAsReference(message)}>
                        继续编辑这张{kindLabel} →
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
