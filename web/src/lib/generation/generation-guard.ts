import { apiPath } from "@/lib/app-paths";

/** 积分不足（服务端 403）：由 /api/generation/jobs 返回"积分不足…"时抛出 */
export class InsufficientCreditsError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InsufficientCreditsError";
    }
}

export type ClientGenerationKind = "image" | "video" | "audio" | "text" | "tool";

type GenerationJob = {
    id: string;
    requestKey: string;
    status: "running" | "succeeded" | "failed" | "cancelled";
    resultUrl?: string | null;
    resultData?: unknown;
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
        if (response.status === 403 || msg.includes("已用完")) throw new InsufficientCreditsError(msg);
        throw new Error(msg);
    }
    return payload?.job as GenerationJob;
}

export async function finishClientGeneration(jobId: string, status: "succeeded" | "failed" | "cancelled", error?: unknown, resultUrl?: string) {
    return retryGenerationSettlement(async () => {
        const response = await fetch(apiPath(`/api/generation/jobs/${encodeURIComponent(jobId)}`), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status, error: errorMessage(error), resultUrl }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(readError(payload, "generation job settlement failed"));
        return payload?.job as GenerationJob;
    });
}

/**
 * 包住一次生成：先占额度（begin），跑完再结算（finish）。
 *
 * `recover` 是给「我们这侧失败、但服务端其实已经收下成品」准备的：上游出了图、
 * 代理层已经归档、任务在服务端被改判成功，可浏览器这条长连接断了。
 * 这时候用户该看到的是图，不是「请求失败」——所以把成品取回来当结果返回。
 *
 * 2026-09-18 又补了一种情形：结算被**暂缓**（服务端返回 status 仍是 running）。
 * 浏览器那条长连接断了就报失败，可我们发往上游的请求还在飞、上游还在出图（见 upstream-inflight.ts）。
 * 服务端这时不退钱也不判死，客户端就该等它出结论，而不是急着把「请求失败」甩给用户。
 */
export async function runGuardedGeneration<T>(
    kind: ClientGenerationKind,
    count: number,
    metadata: Record<string, unknown>,
    run: (job: GenerationJob) => Promise<T>,
    recover?: (job: GenerationJob) => Promise<T | undefined>,
    options?: { signal?: AbortSignal },
) {
    const job = await beginClientGeneration(kind, count, metadata);
    try {
        const result = await run(job);
        const resultUrl = extractResultUrl(result);
        await finishClientGeneration(job.id, "succeeded", undefined, resultUrl);
        return result;
    } catch (error) {
        const status = error instanceof DOMException && error.name === "AbortError" ? "cancelled" : "failed";
        const settled = await finishClientGeneration(job.id, status, error).catch((settlementError) => {
            console.error("[generation] failed to settle job", settlementError);
            return undefined;
        });
        if (recover && settled?.status === "succeeded") {
            const recovered = await recover(settled).catch((recoverError) => {
                console.error("[generation] failed to recover delivered result", recoverError);
                return undefined;
            });
            if (recovered) return recovered;
        }
        // 服务端还没结账（我们的上游调用仍在飞）：等它自己出结论 —— 出成品就照常出图，真没成品才报失败。
        // 连结算请求本身都发不出去（整个断网）时同样要问：那一刻谁也说不清任务死没死，
        // 而服务端手里的成品不会因为浏览器断网就消失，联网恢复后应该照样把图交出来。
        if (recover && status === "failed" && (!settled || settled.status === "running")) {
            const awaited = await awaitDeferredSettlement(job.id, options?.signal);
            if (awaited?.status === "succeeded") {
                const recovered = await recover(awaited).catch((recoverError) => {
                    console.error("[generation] failed to recover delivered result", recoverError);
                    return undefined;
                });
                if (recovered) return recovered;
            }
            if (!awaited || awaited.status === "running") throw new Error(settled ? DEFERRED_PENDING_MESSAGE : UNREACHABLE_SETTLEMENT_MESSAGE);
        }
        throw error;
    }
}

/** 连接断了但上游仍在生成：这一刻的真相还不确定，别让用户以为白花钱 */
const DEFERRED_PENDING_MESSAGE = "这条连接中断了，但上游仍在生成：结果出来后会出现在「生成记录」里，积分不会白扣。";

/** 连结算都没送到服务端（断网）：任务生死未知，别断言失败 */
const UNREACHABLE_SETTLEMENT_MESSAGE = "网络中断，这次生成的状态还没能同步到服务端：请稍后到「生成记录」里确认结果，积分不会白扣。";

/** 等上游出结论的上限：慢中转单次出图 5-15 分钟，等太久不如让用户先去记录页 */
const DEFERRED_WAIT_MS = 5 * 60 * 1000;
const DEFERRED_POLL_MS = 5_000;

/** 轮询任务状态直到它不再是 running（或超出等待上限、或用户取消） */
async function awaitDeferredSettlement(jobId: string, signal?: AbortSignal): Promise<GenerationJob | undefined> {
    const deadline = Date.now() + DEFERRED_WAIT_MS;
    while (Date.now() < deadline) {
        if (signal?.aborted) return undefined;
        await sleep(DEFERRED_POLL_MS);
        if (signal?.aborted) return undefined;
        const job = await readGenerationJob(jobId).catch(() => undefined);
        // 读不到（网络抖动）继续等：这条路径本来就是「连接不稳」时的兜底
        if (job && job.status !== "running") return job;
    }
    return undefined;
}

async function readGenerationJob(jobId: string): Promise<GenerationJob | undefined> {
    const response = await fetch(apiPath(`/api/generation/jobs/${encodeURIComponent(jobId)}`), { credentials: "include" });
    if (!response.ok) return undefined;
    const payload = await response.json().catch(() => null);
    return (payload?.job as GenerationJob) ?? undefined;
}

async function retryGenerationSettlement<T>(settle: () => Promise<T>) {
    const delays = [0, 700, 1800, 4000, 8000];
    let lastError: unknown;
    for (const delay of delays) {
        if (delay) await sleep(delay);
        try {
            return await settle();
        } catch (error) {
            lastError = error;
            if (!isRetriableSettlementError(error)) break;
        }
    }
    throw lastError;
}

function isRetriableSettlementError(error: unknown) {
    if (!(error instanceof Error)) return false;
    return /Failed to fetch|NetworkError|ERR_NETWORK|Load failed|Network request failed|fetch/i.test(error.message);
}

function sleep(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
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
