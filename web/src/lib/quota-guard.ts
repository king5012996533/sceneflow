import { apiPath } from "@/lib/app-paths";

/**
 * 检查生成配额是否足够。
 * 返回 { allowed, remaining, limit }。
 * 如果 allowed=false，调用方应弹出付费引导。
 */
export async function checkGenerationQuota(): Promise<{ allowed: boolean; remaining: number; limit: number | null }> {
    try {
        const res = await fetch(apiPath("/api/generation/quota"), { credentials: "include" });
        if (!res.ok) return { allowed: true, remaining: -1, limit: null };
        const data = await res.json();
        return { allowed: data.allowed, remaining: data.remaining, limit: data.limit };
    } catch {
        return { allowed: true, remaining: -1, limit: null };
    }
}

/**
 * 判断错误是否为配额不足（403）。
 */
export function isQuotaExceededError(error: unknown): boolean {
    if (error instanceof Error && error.message.includes("已用完")) return true;
    return false;
}
