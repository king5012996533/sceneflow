import { type ClientEntitlements } from "./client-entitlements";
import { apiPath } from "./app-paths";

const USAGE_KEY = "sceneflow:generation_usage";
const FREE_MONTHLY_LIMIT = 3;

type UsageRecord = { year: number; month: number; count: number };

function currentPeriod() {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function getCurrentUsage(): UsageRecord {
    const period = currentPeriod();

    try {
        const raw = localStorage.getItem(USAGE_KEY);
        if (!raw) return { ...period, count: 0 };

        const parsed = JSON.parse(raw) as UsageRecord;
        if (parsed.year !== period.year || parsed.month !== period.month) return { ...period, count: 0 };
        return parsed;
    } catch {
        return { ...period, count: 0 };
    }
}

function saveUsage(record: UsageRecord) {
    try {
        localStorage.setItem(USAGE_KEY, JSON.stringify(record));
    } catch {}
}

export function getGenerationCount(): number {
    return getCurrentUsage().count;
}

export function getGenerationLimit(entitlements: ClientEntitlements | null, userRole?: string): number | null {
    if (userRole === "admin") return null;
    if (!entitlements) return FREE_MONTHLY_LIMIT;

    // Generation count is not stored as a plan entitlement yet; free users get a small trial quota.
    if (entitlements.projects !== null && entitlements.projects <= 3) return FREE_MONTHLY_LIMIT;
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
    const res = await fetch(apiPath("/api/billing/usage/generation"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ count }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
        const message = typeof data?.error === "string" ? data.error : "生成额度检查失败";
        throw new Error(message);
    }

    recordGeneration(count);
    return data?.usage as { allowed: boolean; used: number; reserved: number; remaining: number; limit: number | null } | undefined;
}
