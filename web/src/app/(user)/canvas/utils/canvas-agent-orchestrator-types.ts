import type { AgentLabPersona } from "@/lib/agent-lab/types";
import type { AiConfig } from "@/stores/use-config-store";
import type { CanvasAgentOp, CanvasAgentSnapshot } from "./canvas-agent-ops";

export type OrchestratorMode = "auto" | "semi-auto" | "manual";

export type SubAgentDef = {
    id: string;
    name: string;
    persona: AgentLabPersona;
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

export type OrchestratorState = {
    plan: ProductionPlan | null;
    mode: OrchestratorMode;
    running: boolean;
    paused: boolean;
    totalTokensUsed: number;
    aborted: boolean;
};

export const ORCHESTRATOR_CONSTANTS = {
    MAX_CONCURRENT_AGENTS: 3,
    MAX_TOTAL_STEPS: 40,
    MAX_TOKENS_PER_AGENT: 32000,
    DEFAULT_AGENT_TIMEOUT_MS: 120_000,
    DEFAULT_AGENT_MAX_STEPS: 8,
    PLAN_STAGES: [
        "analyze",
        "character-source",
        "character",
        "turnaround",
        "scene",
        "style",
        "storyboard",
        "keyframe",
        "video",
        "asset-archive",
    ] as const,
};

export function createEmptyPlan(brief: string, intent: string): ProductionPlan {
    return {
        id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        intent,
        brief,
        stages: [],
        status: "planning",
        results: {},
        currentStageIndex: 0,
        startedAt: Date.now(),
    };
}

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
