"use client";

import { create } from "zustand";
import { persist, type PersistStorage, type StorageValue } from "zustand/middleware";

import { nanoid } from "nanoid";
import { localForageStorage } from "@/lib/localforage-storage";
import { resolveMediaUrl } from "@/services/file-storage";

export type CutClip = {
    id: string;
    name: string;
    /** 素材库持久化存储的 key；本地导入的临时素材没有该字段 */
    storageKey?: string;
    url: string;
    width: number;
    height: number;
    durationMs: number;
    /** 裁剪起点（素材内时间，毫秒） */
    startMs: number;
    /** 裁剪终点（素材内时间，毫秒，不含） */
    endMs: number;
    mimeType: string;
    bytes: number;
};

/** 单段素材允许的最短时长 */
export const MIN_CLIP_MS = 500;

export type ClipBoundary = { startMs: number; endMs: number };

/** 按裁剪后时长计算每段素材在时间轴上的位置 */
export function getBoundaries(clips: CutClip[]): { boundaries: ClipBoundary[]; totalMs: number } {
    const boundaries: ClipBoundary[] = [];
    let cursor = 0;
    for (const clip of clips) {
        const startMs = cursor;
        const endMs = cursor + Math.max(MIN_CLIP_MS, clip.endMs - clip.startMs);
        boundaries.push({ startMs, endMs });
        cursor = endMs;
    }
    return { boundaries, totalMs: cursor };
}

type CutEditorState = {
    hydrated: boolean;
    clips: CutClip[];
    selectedId: string | null;
    playheadMs: number;
    isPlaying: boolean;
    /** 外部（时间轴/进度条）发起的跳转信号，预览组件监听后执行跳转 */
    seekSignal: { seq: number; ms: number } | null;
    addClips: (clips: Omit<CutClip, "id">[]) => void;
    removeClip: (id: string) => void;
    clearAll: () => void;
    selectClip: (id: string | null) => void;
    reorderClip: (fromIndex: number, toIndex: number) => void;
    setTrim: (id: string, patch: { startMs?: number; endMs?: number }) => void;
    renameClip: (id: string, name: string) => void;
    setPlayhead: (ms: number) => void;
    setIsPlaying: (playing: boolean) => void;
    requestSeek: (ms: number) => void;
};

const CUT_STORE_KEY = "sceneflow:cut_editor";

const cutStorage: PersistStorage<CutEditorState> = {
    getItem: async (name) => {
        const value = await localForageStorage.getItem(name);
        if (!value) return null;
        const parsed = JSON.parse(value) as StorageValue<CutEditorState>;
        parsed.state.clips = await Promise.all(
            parsed.state.clips.map(async (clip) => ({ ...clip, url: await resolveMediaUrl(clip.storageKey, clip.url) })),
        );
        return parsed;
    },
    setItem: (name, value) => localForageStorage.setItem(name, JSON.stringify(value)),
    removeItem: (name) => localForageStorage.removeItem(name),
};

export const useCutStore = create<CutEditorState>()(
    persist(
        (set) => ({
            hydrated: false,
            clips: [],
            selectedId: null,
            playheadMs: 0,
            isPlaying: false,
            seekSignal: null,
            addClips: (incoming) => set((state) => ({ clips: [...state.clips, ...incoming.map((clip) => ({ ...clip, id: nanoid() }))] })),
            removeClip: (id) =>
                set((state) => ({
                    clips: state.clips.filter((clip) => clip.id !== id),
                    selectedId: state.selectedId === id ? null : state.selectedId,
                })),
            clearAll: () => set({ clips: [], selectedId: null, playheadMs: 0, isPlaying: false }),
            selectClip: (id) => set({ selectedId: id }),
            reorderClip: (fromIndex, toIndex) =>
                set((state) => {
                    const { clips } = state;
                    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= clips.length || toIndex >= clips.length) return {};
                    const next = [...clips];
                    const [moved] = next.splice(fromIndex, 1);
                    next.splice(toIndex, 0, moved);
                    return { clips: next };
                }),
            setTrim: (id, patch) =>
                set((state) => ({
                    clips: state.clips.map((clip) => {
                        if (clip.id !== id) return clip;
                        const rawStart = patch.startMs !== undefined ? patch.startMs : clip.startMs;
                        const rawEnd = patch.endMs !== undefined ? patch.endMs : clip.endMs;
                        const startMs = Math.round(Math.max(0, Math.min(rawStart, clip.durationMs - MIN_CLIP_MS)));
                        const endMs = Math.round(Math.min(clip.durationMs, Math.max(rawEnd, startMs + MIN_CLIP_MS)));
                        return { ...clip, startMs, endMs };
                    }),
                })),
            renameClip: (id, name) =>
                set((state) => ({
                    clips: state.clips.map((clip) => (clip.id === id ? { ...clip, name } : clip)),
                })),
            setPlayhead: (ms) => set({ playheadMs: Math.max(0, ms) }),
            setIsPlaying: (playing) => set({ isPlaying: playing }),
            requestSeek: (ms) =>
                set((state) => {
                    const clamped = Math.max(0, ms);
                    return { playheadMs: clamped, seekSignal: { seq: (state.seekSignal?.seq ?? 0) + 1, ms: clamped } };
                }),
        }),
        {
            name: CUT_STORE_KEY,
            storage: cutStorage,
            partialize: (state) => ({ clips: state.clips }) as StorageValue<CutEditorState>["state"],
            onRehydrateStorage: () => () => {
                useCutStore.setState({ hydrated: true });
            },
        },
    ),
);
