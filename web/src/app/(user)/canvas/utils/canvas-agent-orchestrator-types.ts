import type { CanvasAgentOp, CanvasAgentSnapshot } from "./canvas-agent-ops";

/** 子 Agent 的人格设定（原先寄生在已删除的 agent-lab 模块里） */
export type SubAgentPersona = {
    id: string;
    name: string;
    description: string;
    prompt: string;
};

export type SubAgentDef = {
    id: string;
    name: string;
    persona: SubAgentPersona;
    toolNames: string[];
    outputContract: {
        nodeTypes: string[];
        metadataKeys: string[];
        summaryFields: string[];
    };
    preferredModel?: string;
    maxSteps: number;
    timeoutMs: number;
};

export type SubAgentTask = {
    agentId: string;
    stageKey: string;
    input: {
        brief: string;
        upstreamNodeIds?: string[];
        derivedContext?: Record<string, string>;
    };
    dependencies: string[];
    layout?: { x: number; y: number };
};

export type SubAgentResult = {
    agentId: string;
    stageKey: string;
    ok: boolean;
    error?: string;
    summary: string;
    createdNodeIds: string[];
    metadata: Record<string, unknown>;
    derivedContext: Record<string, string>;
    ops: CanvasAgentOp[];
    tokensUsed: number;
    stepsUsed: number;
};

export type ProductionPlan = {
    id: string;
    intent: string;
    brief: string;
    stages: SubAgentTask[];
    status: "planning" | "running" | "completed" | "failed" | "interrupted";
    results: Record<string, SubAgentResult>;
    currentStageIndex: number;
    startedAt: number;
    completedAt?: number;
    snapshot?: CanvasAgentSnapshot;
};

export const ORCHESTRATOR_CONSTANTS = {
    MAX_CONCURRENT_AGENTS: 3,
    MAX_TOTAL_STEPS: 40,
    MAX_TOKENS_PER_AGENT: 32000,
    DEFAULT_AGENT_TIMEOUT_MS: 120_000,
};

export function hasCircularDependency(stages: SubAgentTask[]): boolean {
    const visited = new Set<string>();
    const inStack = new Set<string>();
    function dfs(id: string): boolean {
        if (inStack.has(id)) return true;
        if (visited.has(id)) return false;
        visited.add(id);
        inStack.add(id);
        const stage = stages.find((s) => s.stageKey === id);
        if (stage) {
            for (const dep of stage.dependencies) {
                if (dfs(dep)) return true;
            }
        }
        inStack.delete(id);
        return false;
    }
    for (const stage of stages) {
        if (dfs(stage.stageKey)) return true;
    }
    return false;
}

export function topSortStages(stages: SubAgentTask[]): SubAgentTask[][] {
    const byId = new Map(stages.map((s) => [s.stageKey, s]));
    const inDegree = new Map<string, number>();
    const children = new Map<string, string[]>();
    for (const stage of stages) {
        inDegree.set(stage.stageKey, 0);
        children.set(stage.stageKey, []);
    }
    for (const stage of stages) {
        for (const dep of stage.dependencies) {
            const list = children.get(dep) || [];
            list.push(stage.stageKey);
            children.set(dep, list);
            inDegree.set(stage.stageKey, (inDegree.get(stage.stageKey) || 0) + 1);
        }
    }
    const levels: SubAgentTask[][] = [];
    let queue = stages.filter((s) => (inDegree.get(s.stageKey) || 0) === 0).map((s) => s.stageKey);
    while (queue.length) {
        const level: SubAgentTask[] = [];
        const next: string[] = [];
        for (const key of queue) {
            const stage = byId.get(key);
            if (stage) level.push(stage);
            for (const child of children.get(key) || []) {
                const deg = (inDegree.get(child) || 1) - 1;
                inDegree.set(child, deg);
                if (deg === 0) next.push(child);
            }
        }
        if (level.length) levels.push(level);
        queue = next;
    }
    return levels;
}
