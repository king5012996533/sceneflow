import { type ClientEntitlements } from "./client-entitlements";
import { scopedStorageKey } from "@/lib/user-data-scope";

const USAGE_KEY = "sceneflow:generation_usage:daily";
const FREE_DAILY_LIMIT = 3;

type UsageRecord = { year: number; month: number; day: number; count: number };

function currentPeriod() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

function getCurrentUsage(): UsageRecord {
    const period = currentPeriod();
    try {
        const raw = localStorage.getItem(scopedStorageKey(USAGE_KEY));
        if (!raw) return { ...period, count: 0 };
        const parsed = JSON.parse(raw) as UsageRecord;
        if (parsed.year !== period.year || parsed.month !== period.month || parsed.day !== period.day) return { ...period, count: 0 };
        return parsed;
    } catch {
        return { ...period, count: 0 };
    }
}

function saveUsage(record: UsageRecord) {
    try {
        localStorage.setItem(scopedStorageKey(USAGE_KEY), JSON.stringify(record));
    } catch {}
}

export function getGenerationCount(): number {
    return getCurrentUsage().count;
}

export function getGenerationLimit(entitlements: ClientEntitlements | null, userRole?: string): number | null {
    if (userRole === "admin") return null;
    if (!entitlements) return FREE_DAILY_LIMIT;
    if (entitlements.projects !== null && entitlements.projects <= 3) return FREE_DAILY_LIMIT;
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

export async function reserveGenerationQuota(count = 1) {
    // Compatibility shim. The unified generation layer now performs the
    // authoritative reservation atomically in /api/generation/jobs.
    return { allowed: true, used: getGenerationCount(), reserved: count, remaining: -1, limit: null };
}
