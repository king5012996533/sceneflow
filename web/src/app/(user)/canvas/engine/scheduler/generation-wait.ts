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

import type { CanvasAgentOp } from "../../utils/canvas-agent-ops";

export type GenerationWaitSnapshot = {
    /** 仍在生成中的节点 */
    pending: string[];
    succeeded: string[];
    failed: string[];
};

/**
 * 从一批工具回执里挑出真正派发了生成的节点。
 *
 * run_generation 的 nodeId 指向「生成配置节点」——它会在生成过程中被置为
 * loading、结束时置为 success/error，所以它同时是派发凭据和落地信号。
 * 在线对话与全自动生产都用这一个判定，避免两边规则漂移。
 */
export function dispatchedGenerationNodeIds(results: Array<{ ops?: CanvasAgentOp[] }>): string[] {
    const ids: string[] = [];
    for (const result of results) {
        for (const op of result.ops || []) {
            if (op.type === "run_generation" && op.nodeId) ids.push(op.nodeId);
        }
    }
    return [...new Set(ids)];
}

/** 画布节点 → 状态表：只取关心的节点，避免整图搬运 */
export function nodeStatusesOf(nodes: Array<{ id: string; metadata?: { status?: string } }>, nodeIds: string[]): Record<string, string | undefined> {
    const wanted = new Set(nodeIds);
    const statuses: Record<string, string | undefined> = {};
    for (const node of nodes) {
        if (wanted.has(node.id)) statuses[node.id] = node.metadata?.status;
    }
    return statuses;
}

/** 状态是否算「已经在生成链路里了」：loading 进行中、success/error 已终结 */
function hasEnteredGeneration(status: string | undefined): boolean {
    return status === "loading" || status === "success" || status === "error";
}

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
/**
 * 启动宽限：派发之后、真正开始生成之前，节点会短暂停在 idle。
 * 但如果一直停在 idle，那不是「还没开始」，而是压根没派出去（没有可用模型、
 * 生成入口未挂载等）——照常等下去只会把界面和下游卡满超时，所以单独识别。
 */
export const DEFAULT_GENERATION_START_GRACE_MS = 30_000;

export type WaitForGenerationOptions = {
    /** 读取节点当前状态（缺省视为未完成） */
    getStatuses: () => Record<string, string | undefined>;
    /**
     * 额外的等待对象（可随轮询增长）。
     * 有些生成模式在派发当刻就把配置节点标成成功，真正还在跑的是它新建出来的媒体节点；
     * 只看配置节点会「秒完成」，把还在渲染的视频当成已经做完了。调用方按自己的领域规则给出这些 id。
     */
    getWatchedIds?: () => string[];
    timeoutMs?: number;
    pollMs?: number;
    /** 多久仍无任何节点进入生成，就判定「没启动」 */
    startGraceMs?: number;
    signal?: AbortSignal;
    onTick?: (snapshot: GenerationWaitSnapshot) => void;
};

export type GenerationWaitResult = GenerationWaitSnapshot & {
    timedOut: boolean;
    aborted: boolean;
    /** 是否观察到至少有节点进入生成（loading/success/error）。false 且 pending 非空 = 根本没启动 */
    started: boolean;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function waitForGeneration(nodeIds: string[], options: WaitForGenerationOptions): Promise<GenerationWaitResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_GENERATION_TIMEOUT_MS;
    const pollMs = options.pollMs ?? DEFAULT_GENERATION_POLL_MS;
    const startGraceMs = options.startGraceMs ?? DEFAULT_GENERATION_START_GRACE_MS;
    const deadline = Date.now() + timeoutMs;
    const startDeadline = Date.now() + startGraceMs;
    let started = false;

    for (;;) {
        const statuses = options.getStatuses();
        const watched = options.getWatchedIds ? [...new Set([...nodeIds, ...options.getWatchedIds()])] : nodeIds;
        const snapshot = classifyGenerationNodes(watched, statuses);
        // 一旦观察到过生成状态就一直算已启动，避免中途的瞬时态把它翻回去
        if (!started && watched.some((nodeId) => hasEnteredGeneration(statuses[nodeId]))) started = true;
        options.onTick?.(snapshot);
        if (isGenerationSettled(snapshot)) return { ...snapshot, timedOut: false, aborted: false, started };
        if (options.signal?.aborted) return { ...snapshot, timedOut: false, aborted: true, started };
        if (!started && Date.now() >= startDeadline) return { ...snapshot, timedOut: false, aborted: false, started: false };
        if (Date.now() >= deadline) return { ...snapshot, timedOut: true, aborted: false, started };
        await sleep(Math.min(pollMs, Math.max(0, deadline - Date.now())));
    }
}

/** 供日志/摘要使用的一句话描述 */
export function describeGenerationWait(result: GenerationWaitResult): string {
    if (result.pending.length && !result.started) return `派发的 ${result.pending.length} 个生成没有真正启动（节点一直停在空闲状态）`;
    const parts: string[] = [];
    if (result.succeeded.length) parts.push(`${result.succeeded.length} 个生成成功`);
    if (result.failed.length) parts.push(`${result.failed.length} 个生成失败`);
    if (result.pending.length) parts.push(`${result.pending.length} 个仍在生成中（已超时未等待）`);
    return parts.join("，") || "无需等待生成";
}
