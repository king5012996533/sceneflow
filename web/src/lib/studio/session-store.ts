"use client";

import { createScopedLocalForageStore } from "@/lib/user-data-scope";
import { deleteStoredImages, resolveImageUrl } from "@/services/image-storage";
import { deleteStoredMedia, resolveMediaUrl } from "@/services/file-storage";
import type { StudioSession } from "./types";

export type StudioSessionMeta = {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    messageCount: number;
};

const SESSIONS_INDEX_KEY = "sceneflow:studio:sessions";
const SESSION_PREFIX = "session:";

const store = () => createScopedLocalForageStore("studio_sessions");
const sessionKey = (id: string) => `${SESSION_PREFIX}${id}`;

// ========== 会话索引（侧栏列表用的轻量元数据） ==========

export async function readSessionMetas(): Promise<StudioSessionMeta[]> {
    if (typeof window === "undefined") return [];
    try {
        const metas = (await store().getItem<StudioSessionMeta[]>(SESSIONS_INDEX_KEY)) || [];
        return metas.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
        return [];
    }
}

async function writeSessionMetas(metas: StudioSessionMeta[]) {
    try {
        await store().setItem(SESSIONS_INDEX_KEY, metas);
    } catch {
        // 索引写失败不影响主流程（会话本体仍可读写）
    }
}

async function upsertSessionMeta(session: StudioSession) {
    const metas = await readSessionMetas();
    const next = metas.filter((item) => item.id !== session.id);
    next.push({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.messages.length,
    });
    await writeSessionMetas(next);
}

// ========== 会话本体读写 ==========

export async function readSession(id: string): Promise<StudioSession | null> {
    if (typeof window === "undefined") return null;
    try {
        const raw = await store().getItem<StudioSession>(sessionKey(id));
        if (!raw) return null;
        return await deserializeSession(raw);
    } catch {
        return null;
    }
}

export async function saveSession(session: StudioSession): Promise<void> {
    if (typeof window === "undefined") return;
    try {
        await store().setItem(sessionKey(session.id), serializeSession(session));
    } catch {
        // 单个会话写失败（如配额满）时静默，避免阻塞对话
    }
    await upsertSessionMeta(session);
}

export async function deleteSession(session: StudioSession): Promise<void> {
    if (typeof window === "undefined") return;
    const mediaKeys = collectSessionMediaKeys(session);
    await Promise.all([deleteStoredImages(mediaKeys.imageKeys), deleteStoredMedia(mediaKeys.mediaKeys)]);
    try {
        await store().removeItem(sessionKey(session.id));
    } catch {
        // 忽略删除失败
    }
    const metas = (await readSessionMetas()).filter((item) => item.id !== session.id);
    await writeSessionMetas(metas);
}

// ========== 序列化 / 反序列化 ==========
// 图片存 dataUrl、视频/音频存 url；有 storageKey 时把 dataUrl/url 置空，
// 读取时用 resolveImageUrl / resolveMediaUrl 还原（与 image/video 页日志同一套模式）。

function serializeSession(session: StudioSession): StudioSession {
    return {
        ...session,
        messages: session.messages.map((message) => ({
            ...message,
            references: message.references.map((ref) => ({ ...ref, dataUrl: ref.storageKey ? "" : ref.dataUrl })),
            videoReferences: message.videoReferences.map((ref) => (ref.storageKey ? { ...ref, url: "" } : ref)),
            audioReferences: message.audioReferences.map((ref) => (ref.storageKey ? { ...ref, url: "" } : ref)),
            results: message.results.map((result) => (result.kind === "image" ? { ...result, dataUrl: result.storageKey ? "" : result.dataUrl } : { ...result, url: result.storageKey ? "" : result.url })),
        })),
    };
}

async function deserializeSession(raw: StudioSession): Promise<StudioSession> {
    const messages = await Promise.all(
        raw.messages.map(async (message) => ({
            ...message,
            references: await Promise.all(message.references.map(async (ref) => ({ ...ref, dataUrl: await resolveImageUrl(ref.storageKey, ref.dataUrl) }))),
            videoReferences: await Promise.all(message.videoReferences.map(async (ref) => ({ ...ref, url: ref.storageKey ? await resolveMediaUrl(ref.storageKey, ref.url) : ref.url }))),
            audioReferences: await Promise.all(message.audioReferences.map(async (ref) => ({ ...ref, url: ref.storageKey ? await resolveMediaUrl(ref.storageKey, ref.url) : ref.url }))),
            results: await Promise.all(
                message.results.map(async (result) =>
                    result.kind === "image" ? { ...result, dataUrl: await resolveImageUrl(result.storageKey, result.dataUrl) } : { ...result, url: result.storageKey ? await resolveMediaUrl(result.storageKey, result.url) : result.url },
                ),
            ),
        })),
    );
    return { ...raw, messages };
}

// ========== 媒体清理 ==========

function collectSessionMediaKeys(session: StudioSession) {
    const imageKeys = new Set<string>();
    const mediaKeys = new Set<string>();
    for (const message of session.messages) {
        for (const ref of message.references) {
            if (ref.storageKey) imageKeys.add(ref.storageKey);
        }
        for (const ref of message.videoReferences) {
            if (ref.storageKey) mediaKeys.add(ref.storageKey);
        }
        for (const ref of message.audioReferences) {
            if (ref.storageKey) mediaKeys.add(ref.storageKey);
        }
        for (const result of message.results) {
            if (result.storageKey) {
                if (result.kind === "image") imageKeys.add(result.storageKey);
                else mediaKeys.add(result.storageKey);
            }
        }
    }
    return { imageKeys: [...imageKeys], mediaKeys: [...mediaKeys] };
}
