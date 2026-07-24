import { apiPath } from "@/lib/app-paths";
import { recordGeneration } from "@/lib/generation-quota";

export class QuotaExceededError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "QuotaExceededError";
    }
}

export type ClientGenerationKind = "image" | "video" | "audio" | "text" | "tool";

type GenerationJob = {
    id: string;
    requestKey: string;
    status: "running" | "succeeded" | "failed" | "cancelled";
};

export async function beginClientGeneration(kind: ClientGenerationKind, count = 1, metadata?: Record<string, unknown>) {
    const requestKey = createRequestKey(kind);
    const response = await fetch(apiPath("/api/generation/jobs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ requestKey, kind, count, metadata }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const msg = readError(payload, "生成权限检查失败");
        if (response.status === 403 || msg.includes("已用完")) throw new QuotaExceededError(msg);
        throw new Error(msg);
    }
    return payload?.job as GenerationJob;
}

export async function finishClientGeneration(jobId: string, status: "succeeded" | "failed" | "cancelled", error?: unknown, resultUrl?: string) {
    const response = await fetch(apiPath(`/api/generation/jobs/${encodeURIComponent(jobId)}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, error: errorMessage(error), resultUrl }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(readError(payload, "生成任务结算失败"));
    return payload?.job as GenerationJob;
}

export async function runGuardedGeneration<T>(
    kind: ClientGenerationKind,
    count: number,
    metadata: Record<string, unknown>,
    run: (job: GenerationJob) => Promise<T>,
) {
    const job = await beginClientGeneration(kind, count, metadata);
    try {
        const result = await run(job);
        const resultUrl = extractResultUrl(result);
        await finishClientGeneration(job.id, "succeeded", undefined, resultUrl);
        recordGeneration(count);
        return result;
    } catch (error) {
        const status = error instanceof DOMException && error.name === "AbortError" ? "cancelled" : "failed";
        await finishClientGeneration(job.id, status, error).catch((settlementError) => {
            console.error("[generation] failed to settle job", settlementError);
        });
        throw error;
    }
}

function createRequestKey(kind: ClientGenerationKind) {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${kind}:${id}`;
}

function readError(payload: unknown, fallback: string) {
    if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") return payload.error;
    return fallback;
}

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message.slice(0, 1000) : String(error || "").slice(0, 1000);
}

function extractResultUrl(result: unknown): string | undefined {
    if (!result || typeof result !== "object") return undefined;
    const r = result as Record<string, unknown>;
    if (typeof r.url === "string") return r.url;
    if (r.data && typeof r.data === "object" && typeof (r.data as Record<string, unknown>).url === "string") {
        return (r.data as Record<string, unknown>).url as string;
    }
    return undefined;
}
