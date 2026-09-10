import type { AiConfig } from "@/stores/use-config-store";

import { summarizeCanvasAgentOps, type CanvasAgentOp, type CanvasAgentSnapshot } from "../utils/canvas-agent-ops";
import { buildWorkflowPlan, compactSnapshot, describeCanvasSnapshot, explainNoop, onlineToolToOps, snapshotSignature, workflowPlanMessage } from "../utils/online-agent-tool-ops";
import { describeMemoryForPrompt, summarizeMemory, type CanvasProjectMemory, type MemoryPatch } from "./memory/project-memory";
import { getToolDefinition, toolLabel } from "./tools/registry";
import type { CanvasEngineContext, ToolResult } from "./types";

/**
 * 画布执行引擎。
 *
 * 职责：把「工具调用 → 画布操作 → 结构化回执」这条链路收在一处，
 * 使 online runner 与 orchestrator 共用同一套执行与回执语义，
 * 并且不再依赖任何 React 组件（宿主通过 host 注入读写能力）。
 */

export type ApplyOpsResult = {
    snapshot: CanvasAgentSnapshot;
    ops: CanvasAgentOp[];
    /** 本次操作实际新建的节点 ID —— 下游阶段引用上游产出的唯一依据 */
    createdNodeIds: string[];
    changed: boolean;
    ranGeneration: boolean;
    noopReason: string;
};

export type CanvasEngineHost = CanvasEngineContext & {
    /** 读取当前生成配置（比例、模型、时长等由工具参数推导 ops 时使用） */
    getConfig: () => AiConfig;
    /** 读取本工程的长期记忆 */
    getMemory: () => CanvasProjectMemory;
    /** 增量写入工程记忆，返回写入后的记忆 */
    applyMemory: (patch: MemoryPatch) => CanvasProjectMemory;
    /** 可选：当前运行 ID，用于事件流 */
    getRunId?: () => string;
};

export type CanvasEngine = {
    getSnapshot(): CanvasAgentSnapshot;
    /** 提交一批画布操作，返回带 createdNodeIds 的完整结果 */
    applyOps(ops: CanvasAgentOp[]): ApplyOpsResult;
    /** 执行一次工具调用，返回统一回执（写类工具必带 ops 与 createdNodeIds） */
    executeTool(name: string, args: Record<string, unknown>): ToolResult;
    /** 是否为已注册工具 */
    hasTool(name: string): boolean;
};

export function createCanvasEngine(host: CanvasEngineHost): CanvasEngine {
    const currentRunId = () => host.getRunId?.() ?? "engine";

    const applyOps = (ops: CanvasAgentOp[]): ApplyOpsResult => {
        const before = host.getSnapshot();
        const beforeIds = new Set(before.nodes.map((node) => node.id));
        const beforeSignature = snapshotSignature(before);

        const next = host.applyOps(ops);

        const createdNodeIds = next.nodes.filter((node) => !beforeIds.has(node.id)).map((node) => node.id);
        const ranGeneration = ops.some((op) => op.type === "run_generation" && Boolean(op.nodeId));
        const changed = beforeSignature !== snapshotSignature(next) || ranGeneration;

        const result: ApplyOpsResult = {
            snapshot: next,
            ops,
            createdNodeIds,
            changed,
            ranGeneration,
            noopReason: changed ? "" : explainNoop(ops, before),
        };

        if (changed) {
            host.emit({ type: "ops_applied", runId: currentRunId(), ops, createdNodeIds });
        }

        return result;
    };

    const executeTool = (name: string, args: Record<string, unknown>): ToolResult => {
        const definition = getToolDefinition(name);
        if (!definition) {
            const message = `未注册的工具：${name}`;
            host.emit({ type: "error", runId: currentRunId(), message });
            return { ok: false, message, error: message };
        }

        try {
            const snapshot = host.getSnapshot();

            // ---- 读类工具 ----
            if (name === "canvas_get_state" || name === "canvas_export_snapshot") {
                const description = describeCanvasSnapshot(snapshot);
                return { ok: true, message: description, observation: description, data: compactSnapshot(snapshot) };
            }
            if (name === "canvas_get_selection") {
                const ids = new Set(snapshot.selectedNodeIds || []);
                const selected = compactSnapshot({ ...snapshot, nodes: snapshot.nodes.filter((node) => ids.has(node.id)) });
                const message = `当前选中 ${ids.size} 个节点。`;
                return { ok: true, message, observation: message, data: { nodes: selected.nodes } };
            }
            if (name === "canvas_plan_workflow") {
                const plan = buildWorkflowPlan(args, snapshot);
                const message = workflowPlanMessage(plan);
                return { ok: true, message, observation: message, data: plan };
            }

            // ---- 记忆层：不改画布、不消耗额度，直接读写工程记忆 ----
            if (name === "canvas_memory_read") {
                const memory = host.getMemory();
                const detail = describeMemoryForPrompt(memory, true);
                return { ok: true, message: summarizeMemory(memory), observation: detail || "工程记忆为空。", data: { empty: !detail } };
            }
            if (name === "canvas_memory_write") {
                const next = host.applyMemory(args as MemoryPatch);
                const message = `已写入工程记忆：${summarizeMemory(next)}`;
                return { ok: true, message, observation: `${message}\n${describeMemoryForPrompt(next, true)}` };
            }

            // ---- 写 / 生成类工具：工具名 → 画布操作 → 提交 ----
            const ops = onlineToolToOps(name, args, snapshot, host.getConfig());
            const applied = applyOps(ops);
            const observation = `已执行「${toolLabel(name)}」：画布现有 ${applied.snapshot.nodes.length} 个节点、${applied.snapshot.connections.length} 条连线。`;
            // data 只回填轻量摘要：完整快照会被上层序列化进模型上下文，必须避免节点图整体搬运
            const data = {
                changed: applied.changed,
                createdNodeIds: applied.createdNodeIds,
                ranGeneration: applied.ranGeneration,
                noopReason: applied.noopReason,
            };

            if (!applied.changed) {
                return {
                    ok: false,
                    message: applied.noopReason || "操作未产生任何变化。",
                    ops,
                    createdNodeIds: [],
                    observation,
                    data,
                };
            }

            return {
                ok: true,
                message: summarizeCanvasAgentOps(ops) || "画布操作已执行。",
                ops,
                createdNodeIds: applied.createdNodeIds,
                observation,
                data,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : "工具执行失败";
            host.emit({ type: "error", runId: currentRunId(), message: `「${toolLabel(name)}」执行失败：${message}` });
            return { ok: false, message, error: message };
        }
    };

    return {
        getSnapshot: host.getSnapshot,
        applyOps,
        executeTool,
        hasTool: (name: string) => Boolean(getToolDefinition(name)),
    };
}
