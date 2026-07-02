// generation-quota.ts — 生成功能配额检查（客户端）
import { fetchClientEntitlements, isOverLimit, type ClientEntitlements } from "./client-entitlements";

const USAGE_KEY = "sceneflow:generation_usage";
const FREE_MONTHLY_LIMIT = 3;

type UsageRecord = { year: number; month: number; count: number };

function getCurrentUsage(): UsageRecord {
    try {
        const raw = localStorage.getItem(USAGE_KEY);
        if (!raw) return { year: new Date().getFullYear(), month: new Date().getMonth() + 1, count: 0 };
        const parsed = JSON.parse(raw) as UsageRecord;
        const now = new Date();
        if (parsed.year !== now.getFullYear() || parsed.month !== now.getMonth() + 1) {
            return { year: now.getFullYear(), month: now.getMonth() + 1, count: 0 };
        }
        return parsed;
    } catch {
        return { year: new Date().getFullYear(), month: new Date().getMonth() + 1, count: 0 };
    }
}

function saveUsage(record: UsageRecord) {
    try { localStorage.setItem(USAGE_KEY, JSON.stringify(record)); } catch {}
}

export function getGenerationCount(): number {
    return getCurrentUsage().count;
}

export function getGenerationLimit(entitlements: ClientEntitlements | null, userRole?: string): number | null {
    if (userRole === "admin") return null; // admin 不限
    if (!entitlements) return FREE_MONTHLY_LIMIT;
    // generations 不在 entitlements 里，free 固定 3 次
    if (entitlements.projects !== null && entitlements.projects <= 3) return FREE_MONTHLY_LIMIT;
    // creator 及以上不限
    return null;
}

export function checkGenerationQuota(entitlements: ClientEntitlements | null, count = 1, userRole?: string): { allowed: boolean; remaining: number; limit: number | null } {
    const usage = getCurrentUsage();
    const limit = getGenerationLimit(entitlements, userRole);
    if (limit === null) return { allowed: true, remaining: -1, limit: null };
    const remaining = limit - usage.count;
    return { allowed: remaining >= count, remaining, limit };
}

export function recordGeneration(count = 1): number {
    const usage = getCurrentUsage();
    usage.count += count;
    saveUsage(usage);
    return usage.count;
}
