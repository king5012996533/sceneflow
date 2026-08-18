import { prisma } from "@/lib/ic-prisma";
import type { PricingDefaults } from "@/lib/credit-pricing";

/**
 * OperationConfig 读取方（admin 写入，服务端读取）。
 * 提供带 TTL 的进程内缓存，避免每个请求都打库；admin 修改后最多 30s 生效。
 */

const CACHE_TTL_MS = 30_000;
const cache = new Map<string, { value: unknown; expiresAt: number }>();

export async function getOperationConfigValue(key: string, fallback: unknown = null): Promise<unknown> {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    let value: unknown = fallback;
    if (prisma) {
        try {
            const row = await prisma.operationConfig.findUnique({ where: { key } });
            if (row) value = row.value ?? fallback;
        } catch (error) {
            console.warn(`[operation-config] 读取 ${key} 失败:`, (error as Error).message);
        }
    }
    cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
}

export async function getOperationFlag(key: string, fallback = false): Promise<boolean> {
    const value = await getOperationConfigValue(key, fallback);
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value === "true" || value === "1";
    return Boolean(value);
}

export async function getOperationNumber(key: string, fallback = 0): Promise<number> {
    const value = await getOperationConfigValue(key, fallback);
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * 全局默认定价（后台「运营配置」配置，逐模型定价之下、内置草案之上）。
 * 只返回已配置的键（数值 ≥0 整数）；未配置的键返回 undefined，调用方走内置草案。
 */
export async function getPricingDefaults(): Promise<PricingDefaults> {
    const pick = async (key: string): Promise<number | undefined> => {
        const value = await getOperationConfigValue(key);
        if (value === null || value === undefined || value === "") return undefined; // 未配置 → 跳过本层，走内置草案
        const parsed = Math.floor(Number(value));
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
    };
    return {
        imageCredits: await pick("image_credit"),
        videoCredits: await pick("video_credit"),
        audioCredits: await pick("audio_credit"),
        textCredits: await pick("text_credit"),
    };
}

export function invalidateOperationConfigCache(key?: string) {
    if (key) cache.delete(key);
    else cache.clear();
}
