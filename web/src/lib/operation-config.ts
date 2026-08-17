import { prisma } from "@/lib/ic-prisma";

/**
 * OperationConfig 读取方（目前该表只有 admin 写入、无任何消费方）。
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

export function invalidateOperationConfigCache(key?: string) {
    if (key) cache.delete(key);
    else cache.clear();
}
