import { apiPath } from "@/lib/app-paths";

export async function startServerReplicateJob(jobId: string, model: string, input: Record<string, unknown>, signal?: AbortSignal) {
    const response = await fetch(apiPath(`/api/generation/jobs/${encodeURIComponent(jobId)}/replicate`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ model, input }),
        signal,
    });
    const payload = await response.json().catch(() => null) as { error?: unknown } | null;
    if (!response.ok) throw new Error(typeof payload?.error === "string" ? payload.error : "Replicate 任务创建失败");
    return waitForServerReplicateJob(jobId, signal);
}

async function waitForServerReplicateJob(jobId: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
    const response = await fetch(apiPath(`/api/generation/jobs/${encodeURIComponent(jobId)}/events`), {
        method: "GET",
        credentials: "include",
        headers: { Accept: "text/event-stream" },
        signal,
    });
    if (!response.ok || !response.body) throw new Error("Replicate 任务状态连接失败");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
        while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            buffer += decoder.decode(chunk.value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() || "";
            for (const event of events) {
                const dataLine = event.split("\n").find((line) => line.startsWith("data: "));
                if (!dataLine) continue;
                const data = JSON.parse(dataLine.slice(6)) as Record<string, unknown>;
                if (data.error) throw new Error(String(data.error));
                const status = String(data.status || "");
                if (status === "succeeded") return data;
                if (status === "failed" || status === "cancelled") throw new Error(String(data.error || "Replicate 任务失败"));
            }
        }
    } finally {
        reader.releaseLock();
    }
    throw new Error("Replicate 状态连接提前关闭");
}

export function archivedMediaUrls(job: Record<string, unknown>): string[] {
    const resultData = job.resultData;
    if (!resultData || typeof resultData !== "object" || Array.isArray(resultData)) return [];
    const items = (resultData as { items?: unknown }).items;
    if (!Array.isArray(items)) return [];
    return items.map((item, index) => {
        if (!item || typeof item !== "object") return "";
        const archiveKey = (item as { archiveKey?: unknown }).archiveKey;
        return typeof archiveKey === "string" ? apiPath(`/api/generation/jobs/${encodeURIComponent(String(job.id))}/media/${index}`) : "";
    }).filter(Boolean);
}
