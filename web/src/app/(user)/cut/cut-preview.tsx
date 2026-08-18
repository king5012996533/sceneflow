"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { Button, Slider, Tag } from "antd";
import { PauseOutlined, PlayCircleFilled, ReloadOutlined, VideoCameraOutlined } from "@ant-design/icons";

import { formatMs } from "./cut-media";
import { getBoundaries, useCutStore, type ClipBoundary } from "./cut-store";

function findClipIndex(ms: number, boundaries: ClipBoundary[]): number {
    if (boundaries.length === 0) return -1;
    const idx = boundaries.findIndex((b) => ms >= b.startMs && ms < b.endMs);
    if (idx !== -1) return idx;
    return ms < boundaries[0].startMs ? 0 : boundaries.length - 1;
}

export default function CutPreview() {
    const clips = useCutStore((s) => s.clips);
    const playheadMs = useCutStore((s) => s.playheadMs);
    const isPlaying = useCutStore((s) => s.isPlaying);
    const setPlayhead = useCutStore((s) => s.setPlayhead);
    const setIsPlaying = useCutStore((s) => s.setIsPlaying);
    const requestSeek = useCutStore((s) => s.requestSeek);
    const seekSignal = useCutStore((s) => s.seekSignal);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const { boundaries, totalMs } = useMemo(() => getBoundaries(clips), [clips]);

    // 事件回调里读取最新状态，避免闭包过期
    const stateRef = useRef({ clips, boundaries });
    stateRef.current = { clips, boundaries };

    const targetIndexRef = useRef(-1);
    const intentRef = useRef<{ index: number; localMs: number; autoplay: boolean } | null>(null);
    const lastPlayheadUpdateRef = useRef(0);

    const applyIntent = useCallback(() => {
        const video = videoRef.current;
        const intent = intentRef.current;
        if (!video || !intent) return;
        const clip = stateRef.current.clips[intent.index];
        if (!clip) return;
        targetIndexRef.current = intent.index;
        const localMs = Math.min(clip.durationMs, Math.max(0, intent.localMs));
        try {
            video.currentTime = localMs / 1000;
        } catch {}
        if (intent.autoplay) {
            void video.play().catch(() => {});
        }
    }, []);

    const loadClipAt = useCallback(
        (index: number, localMs: number, autoplay: boolean) => {
            const video = videoRef.current;
            const clip = stateRef.current.clips[index];
            if (!video || !clip) return;
            intentRef.current = { index, localMs, autoplay };
            if (video.src === clip.url) {
                applyIntent();
            } else {
                video.src = clip.url;
            }
        },
        [applyIntent],
    );

    const handleTimeUpdate = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;
        const s = stateRef.current;
        const idx = targetIndexRef.current;
        if (idx < 0 || idx >= s.clips.length) return;
        const clip = s.clips[idx];
        const boundary = s.boundaries[idx];
        if (!boundary) return;
        const localMs = video.currentTime * 1000;
        const endMs = Math.min(clip.endMs, clip.durationMs);
        if (localMs >= endMs - 30 || localMs >= clip.durationMs - 30) {
            const next = idx + 1;
            if (next < s.clips.length) {
                setPlayhead(s.boundaries[next].startMs);
                loadClipAt(next, s.clips[next].startMs, true);
            } else {
                setPlayhead(s.boundaries[idx].endMs);
                setIsPlaying(false);
                video.pause();
            }
            return;
        }
        const globalMs = boundary.startMs + (localMs - clip.startMs);
        const now = performance.now();
        if (now - lastPlayheadUpdateRef.current >= 50) {
            lastPlayheadUpdateRef.current = now;
            setPlayhead(globalMs);
        }
    }, [loadClipAt, setPlayhead, setIsPlaying]);

    // 外部跳转（时间轴/进度条点击）信号
    useEffect(() => {
        if (!seekSignal) return;
        const s = stateRef.current;
        if (s.clips.length === 0) return;
        const idx = findClipIndex(seekSignal.ms, s.boundaries);
        const clip = s.clips[idx];
        const boundary = s.boundaries[idx];
        loadClipAt(idx, clip.startMs + (seekSignal.ms - boundary.startMs), useCutStore.getState().isPlaying);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seekSignal]);

    // 素材列表变化时兜底：清空或把越界的播放头拉回末尾
    useEffect(() => {
        const s = stateRef.current;
        const video = videoRef.current;
        if (s.clips.length === 0) {
            if (video) {
                video.pause();
                video.removeAttribute("src");
                video.load();
            }
            targetIndexRef.current = -1;
            intentRef.current = null;
            setPlayhead(0);
            setIsPlaying(false);
            return;
        }
        const total = s.boundaries[s.boundaries.length - 1]?.endMs ?? 0;
        const current = useCutStore.getState().playheadMs;
        if (current > total) {
            setPlayhead(total);
            const last = s.clips.length - 1;
            loadClipAt(last, s.clips[last].endMs - 20, false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clips]);

    const togglePlay = useCallback(() => {
        const s = stateRef.current;
        if (s.clips.length === 0) return;
        const willPlay = !useCutStore.getState().isPlaying;
        setIsPlaying(willPlay);
        if (willPlay) {
            let currentMs = useCutStore.getState().playheadMs;
            const lastEnd = s.boundaries[s.boundaries.length - 1]?.endMs ?? 0;
            if (currentMs >= lastEnd - 50) {
                currentMs = 0;
                setPlayhead(0);
            }
            const idx = findClipIndex(currentMs, s.boundaries);
            if (idx < 0) return;
            const clip = s.clips[idx];
            const boundary = s.boundaries[idx];
            loadClipAt(idx, clip.startMs + (currentMs - boundary.startMs), true);
        } else {
            videoRef.current?.pause();
        }
    }, [loadClipAt, setIsPlaying]);

    const restart = useCallback(() => {
        const s = stateRef.current;
        if (s.clips.length === 0) return;
        setPlayhead(0);
        loadClipAt(0, s.clips[0].startMs, useCutStore.getState().isPlaying);
    }, [loadClipAt, setPlayhead]);

    const hasClips = clips.length > 0;
    const sliderMax = Math.max(1, totalMs);

    return (
        <div className="flex flex-col gap-2">
            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-black">
                <video
                    ref={videoRef}
                    className="max-h-full max-w-full"
                    playsInline
                    preload="auto"
                    onLoadedMetadata={applyIntent}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => {
                        setPlayhead(totalMs);
                        setIsPlaying(false);
                    }}
                />
                {!hasClips && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-neutral-400">
                        <VideoCameraOutlined className="text-4xl" />
                        <span className="text-sm">导入素材后，这里会显示预览画面</span>
                    </div>
                )}
                {isPlaying && (
                    <Tag className="absolute left-3 top-3" color="green">
                        播放中
                    </Tag>
                )}
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/70 px-4 py-2">
                <Button type="text" icon={<ReloadOutlined />} onClick={restart} disabled={!hasClips} title="回到开头" />
                <Button
                    type="primary"
                    shape="circle"
                    icon={isPlaying ? <PauseOutlined /> : <PlayCircleFilled />}
                    onClick={togglePlay}
                    disabled={!hasClips}
                />
                <span className="w-14 text-right font-mono text-xs text-neutral-500">{formatMs(playheadMs)}</span>
                <Slider
                    className="flex-1"
                    min={0}
                    max={sliderMax}
                    value={Math.min(playheadMs, sliderMax)}
                    onChange={(v) => requestSeek(v)}
                    tooltip={{ formatter: (v) => formatMs(v as number) }}
                />
                <span className="w-14 font-mono text-xs text-neutral-500">{formatMs(totalMs)}</span>
            </div>
        </div>
    );
}
