/**
 * 生成等待。
 *
 * 调度层最容易犯的错是「发出生成请求就当阶段完成」，然后下游阶段拿着一张
 * 还没画出来的图去生成视频——产出必然是废的。所以阶段结束前必须等这一批
 * 生成真正落地（成功或失败），再决定下游能不能开工。
 *
 * 这里分成两层：
 *  - classifyGenerationNodes：纯函数，把节点状态归类成 待完成/成功/失败；
 *  - waitForGeneration：轮询直到全部终结或超时，可被用户中断。
 *
 * 只有「生成明确失败」才算阶段失败；超时不算——超时可能只是模型慢，
 * 把阶段判死会导致用户重跑一遍已经花过钱的生成。超时如实上报，由用户决定。
 * 本模块不依赖任何 UI 与网络，纯靠注入的状态读取器工作。
 */

export type GenerationWaitSnapshot = {
    /** 仍在生成中的节点 */
    pending: string[];
    succeeded: string[];
    failed: string[];
};

/** 节点状态取自画布节点 metadata.status：loading 视为进行中，idle/缺失视为尚未开始（同样按进行中处理） */
export function classifyGenerationNodes(nodeIds: string[], statuses: Record<string, string | undefined>): GenerationWaitSnapshot {
    const snapshot: GenerationWaitSnapshot = { pending: [], succeeded: [], failed: [] };
    for (const nodeId of nodeIds) {
        const status = statuses[nodeId];
        if (status === "success") snapshot.succeeded.push(nodeId);
        else if (status === "error") snapshot.failed.push(nodeId);
        else snapshot.pending.push(nodeId);
    }
    return snapshot;
}

export function isGenerationSettled(snapshot: GenerationWaitSnapshot): boolean {
    return snapshot.pending.length === 0;
}

export const DEFAULT_GENERATION_TIMEOUT_MS = 8 * 60_000;
export const DEFAULT_GENERATION_POLL_MS = 2500;

export type WaitForGenerationOptions = {
    /** 读取节点当前状态（缺省视为未完成） */
    getStatuses: () => Record<string, string | undefined>;
    timeoutMs?: number;
    pollMs?: number;
    signal?: AbortSignal;
    onTick?: (snapshot: GenerationWaitSnapshot) => void;
};

export type GenerationWaitResult = GenerationWaitSnapshot & { timedOut: boolean; aborted: boolean };

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function waitForGeneration(nodeIds: string[], options: WaitForGenerationOptions): Promise<GenerationWaitResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_GENERATION_TIMEOUT_MS;
    const pollMs = options.pollMs ?? DEFAULT_GENERATION_POLL_MS;
    const deadline = Date.now() + timeoutMs;

    for (;;) {
        const snapshot = classifyGenerationNodes(nodeIds, options.getStatuses());
        options.onTick?.(snapshot);
        if (isGenerationSettled(snapshot)) return { ...snapshot, timedOut: false, aborted: false };
        if (options.signal?.aborted) return { ...snapshot, timedOut: false, aborted: true };
        if (Date.now() >= deadline) return { ...snapshot, timedOut: true, aborted: false };
        await sleep(Math.min(pollMs, Math.max(0, deadline - Date.now())));
    }
}

/** 供日志/摘要使用的一句话描述 */
export function describeGenerationWait(result: GenerationWaitResult): string {
    const parts: string[] = [];
    if (result.succeeded.length) parts.push(`${result.succeeded.length} 个生成成功`);
    if (result.failed.length) parts.push(`${result.failed.length} 个生成失败`);
    if (result.pending.length) parts.push(`${result.pending.length} 个仍在生成中（已超时未等待）`);
    return parts.join("，") || "无需等待生成";
}
