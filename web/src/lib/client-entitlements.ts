import { apiPath } from "@/lib/app-paths";

export type ClientEntitlements = {
    planId: string;
    projects: number | null;
    storageGb: number | null;
    concurrentJobs: number | null;
    dailyGenerations: number | null;
    hdExport: boolean;
    privateCharacters: number | null;
    teamMembers: number | null;
};

const defaultFreeEntitlements: ClientEntitlements = {
    planId: "free",
    projects: 3,
    storageGb: 1,
    concurrentJobs: 1,
    dailyGenerations: 3,
    hdExport: false,
    privateCharacters: 0,
    teamMembers: 1,
};

const unlimitedEntitlements: ClientEntitlements = {
    planId: "enterprise",
    projects: null,
    storageGb: null,
    concurrentJobs: null,
    dailyGenerations: null,
    hdExport: true,
    privateCharacters: null,
    teamMembers: null,
};

function parseLimit(value?: string) {
    if (!value || value === "custom" || value === "unlimited") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchClientEntitlements(): Promise<ClientEntitlements> {
    try {
        const res = await fetch(apiPath("/api/billing/subscription"), { credentials: "include", cache: "no-store" });
        if (!res.ok) return defaultFreeEntitlements;
        const data = await res.json();
        if (data?.user?.role === "admin") return unlimitedEntitlements;
        const entries = data.subscription?.plan?.entitlements || [];
        const byKey = new Map<string, string>(entries.map((item: { key: string; value: string }) => [item.key, item.value]));
        return {
            planId: data.subscription?.planId || data.subscription?.plan?.id || "free",
            projects: parseLimit(byKey.get("projects")),
            storageGb: parseLimit(byKey.get("storage_gb")),
            concurrentJobs: parseLimit(byKey.get("concurrent_jobs")),
            dailyGenerations: parseLimit(byKey.get("daily_generations")),
            hdExport: byKey.get("hd_export") === "true",
            privateCharacters: parseLimit(byKey.get("private_characters")),
            teamMembers: parseLimit(byKey.get("team_members")),
        };
    } catch {
        return defaultFreeEntitlements;
    }
}

export function isOverLimit(used: number, limit: number | null) {
    return limit !== null && used >= limit;
}
