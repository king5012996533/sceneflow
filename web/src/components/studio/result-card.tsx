"use client";

import { Bookmark, Download, Maximize2, RotateCw, TriangleAlert, WandSparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { saveAs } from "file-saver";

import type { StudioMessage, StudioResult } from "@/lib/studio/types";

type ResultCardProps = {
    message: StudioMessage;
    onUseAsReference: (message: StudioMessage) => void;
    onSaveToAssets: (message: StudioMessage) => void;
    onRetry: (message: StudioMessage) => void;
    onPreview?: (payload: { src: string; caption: string }) => void;
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

function formatBytes(bytes: number | undefined) {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function resultDuration(results: StudioResult[]) {
    const first = results[0];
    if (!first) return "";
    return formatElapsed(first.durationMs);
}

export function ResultCard({ message, onUseAsReference, onSaveToAssets, onRetry, onPreview }: ResultCardProps) {
    const elapsed = useElapsed(message.status === "pending", message.createdAt);
    const kindLabel = message.kind === "image" ? "图片" : "视频";

    if (message.status === "pending") {
        return (
            <div className="generation-card">
                <div className="generation-main">
                    <div className="loader-ring" />
                    <strong>正在生成{kindLabel}…</strong>
                    <p>已耗时 {formatElapsed(elapsed)}</p>
                </div>
                <div className="generation-status">
                    <span>请稍候，模型正在创作</span>
                    <strong>SceneFlow</strong>
                </div>
            </div>
        );
    }

    if (message.status === "failed") {
        return (
            <div className="failure-card">
                <div className="failure-icon">
                    <TriangleAlert />
                </div>
                <div className="failure-copy">
                    <strong>生成失败</strong>
                    <span>{message.error || "未知错误，请重试"}</span>
                </div>
                <button type="button" className="retry-button" onClick={() => onRetry(message)}>
                    <RotateCw />
                    重试
                </button>
            </div>
        );
    }

    const images = message.results.filter((result) => result.kind === "image");
    const videos = message.results.filter((result) => result.kind === "video");

    if (message.kind === "video" || videos.length) {
        return (
            <div className="w-full max-w-[620px]">
                {videos.map((result, index) => (
                    <div key={result.id} className="video-result">
                        <div className="video-stage">
                            <video src={result.url} controls preload="metadata" />
                        </div>
                        <div className="video-meta">
                            <strong>{message.prompt}</strong>
                            <span>{formatElapsed(result.durationMs || 0)}</span>
                        </div>
                        <div className="video-actions">
                            <button type="button" className="result-link save-trigger" onClick={() => onSaveToAssets(message)}>
                                <Bookmark />
                                保存到素材库
                            </button>
                            <button type="button" className="result-link" onClick={() => saveAs(result.url, `video-${result.id}.mp4`)}>
                                <Download />
                                下载
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!images.length) return null;

    return (
        <div className="result-group">
            {images.map((result, index) => (
                <article key={result.id} className="result-card">
                    <div className="result-media">
                        <img className="previewable" src={result.dataUrl} alt={message.prompt} onClick={() => onPreview?.({ src: result.dataUrl, caption: `${kindLabel} · ${String(index + 1).padStart(2, "0")}` })} />
                        <div className="result-overlay">
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <div className="overlay-actions">
                                <button type="button" className="overlay-button preview-trigger" aria-label="预览图片" onClick={() => onPreview?.({ src: result.dataUrl, caption: `${kindLabel} · ${String(index + 1).padStart(2, "0")}` })}>
                                    <Maximize2 />
                                </button>
                                <button type="button" className="overlay-button save-trigger" aria-label="保存到素材库" onClick={() => onSaveToAssets(message)}>
                                    <Bookmark />
                                </button>
                                <button type="button" className="overlay-button" aria-label="下载图片" onClick={() => saveAs(result.dataUrl, `image-${result.id}.png`)}>
                                    <Download />
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="result-info">
                        <strong>{message.prompt}</strong>
                        <span>
                            {result.width}×{result.height}
                            {formatBytes(result.bytes) ? ` · ${formatBytes(result.bytes)}` : ""}
                        </span>
                    </div>
                    <div className="result-footer">
                        <span>{resultDuration(message.results)}</span>
                        <button type="button" className="result-link continue-trigger" onClick={() => onUseAsReference(message)}>
                            <WandSparkles />
                            继续编辑
                        </button>
                    </div>
                </article>
            ))}
        </div>
    );
}
