import type { CanvasAgentOp, CanvasAgentSnapshot } from "../utils/canvas-agent-ops";

/**
 * 画布 Agent 引擎契约层。
 *
 * 目标：把「读快照 / 改画布 / 触发生成」三件事从 React 组件里抽出来，
 * 让 记忆层 / 调度层 / 执行层 都只依赖这份契约，而不依赖任何 UI 代码。
 * 这里只放类型，不放实现。
 */

/** 工具风险档：决定默认是否需要用户确认 */
export type ToolRisk = "read" | "write" | "generate" | "orchestrate";

/**
 * 统一工具回执。
 *
 * 所有工具（读 / 写 / 生成 / 编排）都返回这个形状。
 * 关键约定：
 *  - 写类工具**必须**回填 ops 与 createdNodeIds —— 这是上层归约、下游阶段引用、
 *    以及模型「看见自己行为后果」的唯一来源。
 *  - 读类工具用 data / observation 回填结果。
 */
export type ToolResult = {
    ok: boolean;
    message: string;
    /** 本次调用产生的画布操作（写类工具必有），供上层统一归约 */
    ops?: CanvasAgentOp[];
    /** 本次调用实际创建或影响的节点 ID，供下游阶段直接引用 */
    createdNodeIds?: string[];
    /** 结构化产物（读类工具的画布快照、规划结果等） */
    data?: unknown;
    /** 给模型看的观察文本（画布状态、生成结果摘要） */
    observation?: string;
    /** 本次调用消耗，用于预算控制与计费 */
    cost?: { credits?: number; tokens?: number; durationMs?: number };
    /** 失败原因（ok=false 时必填） */
    error?: string;
};

/**
 * 引擎事件流。
 *
 * 只保留引擎真正会发出的事件：画布变更与错误。
 * 运行级的进度不重复走这里——调度层的 RunState 才是它的唯一真相（含落盘与续跑）。
 */
export type EngineEvent = { type: "ops_applied"; runId: string; ops: CanvasAgentOp[]; createdNodeIds: string[] } | { type: "error"; runId: string; message: string };

/**
 * 引擎运行上下文：引擎与宿主（浏览器 / 未来服务端）之间的唯一接口。
 * 实现方负责把这三件事接到真实画布上；引擎本身不关心是 React 还是别的。
 */
export type CanvasEngineContext = {
    /** 读取当前画布快照 */
    getSnapshot: () => CanvasAgentSnapshot;
    /** 提交一批画布操作，返回变更后的快照（纯归约 + 副作用派发由实现方保证） */
    applyOps: (ops: CanvasAgentOp[]) => CanvasAgentSnapshot;
    /** 发出引擎事件 */
    emit: (event: EngineEvent) => void;
    /** 中断信号 */
    signal?: AbortSignal;
};

/** 唯一工具注册表的条目定义（不含实现） */
export type ToolDefinition = {
    name: string;
    description: string;
    /** JSON Schema（与 OpenAI function calling 的 parameters 同构） */
    parameters: Record<string, unknown>;
    risk: ToolRisk;
    /** 显式要求确认；缺省时按 risk 判定 */
    requiresConfirmation?: boolean;
};

/** 按风险档判定是否需要用户确认（除非条目显式覆盖） */
export function toolNeedsConfirmation(tool: Pick<ToolDefinition, "risk" | "requiresConfirmation">) {
    if (typeof tool.requiresConfirmation === "boolean") return tool.requiresConfirmation;
    return tool.risk === "generate" || tool.risk === "write";
}
