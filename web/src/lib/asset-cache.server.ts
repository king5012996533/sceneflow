// asset-cache.server.ts —— 成品素材的服务端副本（服务端专用）
//
// 背景：上游（中转站 CDN，如 getapib.org）把成品图挂在自己的域名下，并会在 24 小时后清理。
// 前端取图必须经 /api/proxy/asset 由服务端下载，而这条链路会抖：
//   * 同一域名解析出多个 IP，个别 IP 在境内根本连不通（实测 getapib.org 的 IP 里有一个必挂），
//     而一次请求只钉第一个解析结果 → 同一张图时好时坏；
//   * 上游已经出图并计费，前端却取不回来 —— 用户看到的就是「后台已扣费出图，前端没有图」。
// 下载是幂等 GET，同一张图会被反复取（生成时归档一次、画布/列表渲染再取多次），
// 所以第一次取成功后在本机留一份，之后直接回本地副本：既不再赌那条 CDN，也不受上游 24 小时清理影响。
//
// 目录规则与 media-store 一致（见 media-store.server.ts 里 2026-09-16 的线上事故注释）：
// 只由主目录推导，绝不用 process.cwd() —— 生产 PM2 的 cwd 就是 .next/standalone，
// next build 的 cleanDistDir 会把整个 .next 删掉重来，存在那里等于每次部署都被清空。

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** 本地保留时长：上游 24 小时清理，这里留 3 天余量（用户隔天再打开画布仍取得到） */
export const ASSET_CACHE_TTL_MS = 72 * 60 * 60 * 1000;
/** 条数与总量上限：缓存是「省一次下载」的副本，不是归档，越界就按最旧的删 */
export const ASSET_CACHE_MAX_ENTRIES = 600;
export const ASSET_CACHE_MAX_BYTES = 1200 * 1024 * 1024;
/** 落盘文件名里的键格式（同时用于目录扫描时过滤出本模块写的文件） */
export const ASSET_CACHE_KEY_PATTERN = /^[a-f0-9]{32}$/;

/**
 * 解析缓存目录（纯函数，便于单测锁定「不许落在构建产物里」这条约束）。
 * 默认落到用户主目录下的持久目录；ASSET_CACHE_DIR 可覆盖，相对路径按主目录展开，
 * 避免配一个相对路径又把缓存写回构建产物。
 */
export function resolveAssetCacheDir(configured?: string | null, home: string = os.homedir()) {
    const raw = (configured || "").trim();
    if (!raw) return path.join(home, ".sceneflow", "asset-cache");
    return path.isAbsolute(raw) ? path.normalize(raw) : path.join(home, raw);
}

export const ASSET_CACHE_DIR = resolveAssetCacheDir(process.env.ASSET_CACHE_DIR);

/** 缓存键：URL 的 sha256 前 32 位十六进制（与 media-store 的 id 位数一致，文件名安全） */
export function assetCacheKey(url: string) {
    return createHash("sha256").update(url).digest("hex").slice(0, 32);
}

export type AssetCacheEntry = { key: string; bytes: number; storedAt: number };
export type AssetCacheLimits = { ttlMs?: number; maxEntries?: number; maxBytes?: number };
export type AssetCacheOptions = AssetCacheLimits & { dir?: string; now?: number };

function cachePaths(url: string, dir: string) {
    const key = assetCacheKey(url);
    return { key, bin: path.join(dir, `${key}.bin`), meta: path.join(dir, `${key}.json`) };
}

/** 副本是否还在保质期内（时间戳不合法一律视为过期，宁可回源下载） */
export function isAssetCacheFresh(storedAt: unknown, now: number, ttlMs: number = ASSET_CACHE_TTL_MS) {
    return typeof storedAt === "number" && Number.isFinite(storedAt) && storedAt > 0 && now - storedAt < ttlMs;
}

/**
 * 算出该删哪些键（纯函数）：先清过期，再按「最旧优先」清到条数与总量都在上限内。
 * 注意总量只统计仍新鲜的条目 —— 过期项本轮就会被删，不该再占配额。
 */
export function pickAssetCacheEvictions(entries: AssetCacheEntry[], now: number, limits: AssetCacheLimits = {}): string[] {
    const ttlMs = limits.ttlMs ?? ASSET_CACHE_TTL_MS;
    const maxEntries = limits.maxEntries ?? ASSET_CACHE_MAX_ENTRIES;
    const maxBytes = limits.maxBytes ?? ASSET_CACHE_MAX_BYTES;

    const evict = new Set<string>();
    const fresh: AssetCacheEntry[] = [];
    for (const entry of entries) {
        if (!entry || !ASSET_CACHE_KEY_PATTERN.test(String(entry.key))) continue;
        if (!isAssetCacheFresh(entry.storedAt, now, ttlMs)) {
            evict.add(entry.key);
            continue;
        }
        fresh.push(entry);
    }

    fresh.sort((left, right) => left.storedAt - right.storedAt);
    let count = fresh.length;
    let bytes = fresh.reduce((sum, entry) => sum + Math.max(0, Number(entry.bytes) || 0), 0);
    for (const entry of fresh) {
        if (count <= maxEntries && bytes <= maxBytes) break;
        evict.add(entry.key);
        count -= 1;
        bytes -= Math.max(0, Number(entry.bytes) || 0);
    }
    return [...evict];
}

/** 读本地副本；缺失、过期、元信息与 URL 对不上、文件被截断都返回 null（调用方回源） */
export async function readCachedAsset(url: string, options: AssetCacheOptions = {}): Promise<{ body: Buffer; contentType: string; storedAt: number } | null> {
    const dir = options.dir ?? ASSET_CACHE_DIR;
    const now = options.now ?? Date.now();
    const { bin, meta } = cachePaths(url, dir);

    let parsed: { url?: unknown; contentType?: unknown; storedAt?: unknown; bytes?: unknown };
    try {
        parsed = JSON.parse(await readFile(meta, "utf8")) as typeof parsed;
    } catch {
        return null;
    }
    // 键是 URL 哈希，理论上不会撞；真撞了就宁可不认，避免把别人的图当自己的回给用户
    if (parsed.url !== url) return null;
    if (!isAssetCacheFresh(parsed.storedAt, now, options.ttlMs)) return null;

    try {
        const body = await readFile(bin);
        if (!body.byteLength) return null;
        // 元信息记了字节数就核对一下，防止写一半的文件被当成完整副本
        if (typeof parsed.bytes === "number" && parsed.bytes !== body.byteLength) return null;
        return { body, contentType: typeof parsed.contentType === "string" && parsed.contentType ? parsed.contentType : "application/octet-stream", storedAt: parsed.storedAt as number };
    } catch {
        return null;
    }
}

/** 写本地副本（先写体、再原子换名写元信息：元信息在，副本才算完整） */
export async function writeCachedAsset(url: string, input: { body: Buffer; contentType: string }, options: AssetCacheOptions = {}) {
    const dir = options.dir ?? ASSET_CACHE_DIR;
    const now = options.now ?? Date.now();
    const { key, bin, meta } = cachePaths(url, dir);
    await mkdir(dir, { recursive: true });

    const binTmp = `${bin}.${process.pid}.tmp`;
    await writeFile(binTmp, input.body);
    await rename(binTmp, bin);

    const metaTmp = `${meta}.${process.pid}.tmp`;
    await writeFile(metaTmp, JSON.stringify({ url, contentType: input.contentType, storedAt: now, bytes: input.body.byteLength, key }));
    await rename(metaTmp, meta);
    return { key, bytes: input.body.byteLength };
}

/** 清理过期与超限条目（best-effort：目录不存在或读写失败都不该影响素材下载本身） */
export async function pruneAssetCache(options: AssetCacheOptions = {}) {
    const dir = options.dir ?? ASSET_CACHE_DIR;
    const now = options.now ?? Date.now();

    let names: string[];
    try {
        names = await readdir(dir);
    } catch {
        return 0;
    }

    const entries: AssetCacheEntry[] = [];
    for (const name of names) {
        if (!name.endsWith(".json")) continue;
        const key = name.slice(0, -".json".length);
        if (!ASSET_CACHE_KEY_PATTERN.test(key)) continue;
        try {
            const parsed = JSON.parse(await readFile(path.join(dir, name), "utf8")) as { storedAt?: unknown; bytes?: unknown };
            entries.push({ key, storedAt: Number(parsed.storedAt) || 0, bytes: Number(parsed.bytes) || 0 });
        } catch {
            // 元信息读不动（半截文件/手工放的文件）→ 直接当垃圾清掉
            entries.push({ key, storedAt: 0, bytes: 0 });
        }
    }

    const evictions = pickAssetCacheEvictions(entries, now, options);
    for (const key of evictions) {
        await rm(path.join(dir, `${key}.bin`), { force: true }).catch(() => undefined);
        await rm(path.join(dir, `${key}.json`), { force: true }).catch(() => undefined);
    }
    return evictions.length;
}
