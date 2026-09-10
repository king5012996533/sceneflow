import type { ResponseFunctionTool } from "@/lib/generation/generation-request";

import { CANVAS_TOOL_SCHEMAS } from "./schemas";
import type { ToolDefinition, ToolRisk } from "../types";

/**
 * 唯一工具注册表。
 *
 * 这是所有工具元信息（风险档 / 确认策略 / 显示名）的**唯一来源**，
 * 参数 schema 来自同目录的 schemas.ts（那也是唯一来源）。
 * 此前这些信息散落在三处并已分叉：
 *   - utils/online-agent-tools.ts   → schema 定义（29 个）
 *   - utils/canvas-agent-executor.ts → REGISTRY_TOOL_DEFS（9 个，schema 与上面不一致）
 *   - hooks/use-online-agent-runner.ts → ALWAYS_CONFIRM_TOOLS / AUTO_RUN_CAPABLE_TOOLS / toolCallLabel
 * 现在统一到这里，其他地方一律通过本模块查询。
 */

type ToolPolicy = {
    risk: ToolRisk;
    /** 显式要求确认（即使全局关闭了工具确认也要确认） */
    requiresConfirmation?: boolean;
    /** 该工具带 autoRun 参数时，autoRun=true 需要确认 */
    autoRunCapable?: boolean;
    /** 用户可读的中文名 */
    label: string;
};

/**
 * 工具策略表。**每个注册的工具都必须在这里出现**，否则开发环境会报错提醒，
 * 生产环境回退为 write（即跟随全局确认开关），不会静默降级。
 */
const TOOL_POLICIES: Record<string, ToolPolicy> = {
    // ---- 读：永不确认 ----
    canvas_get_state: { risk: "read", label: "读取画布" },
    canvas_get_selection: { risk: "read", label: "读取选区" },
    canvas_export_snapshot: { risk: "read", label: "导出画布快照" },

    // ---- 编排：只产出计划、不改画布，但仍跟随全局确认开关（历史上即如此）----
    canvas_plan_workflow: { risk: "orchestrate", label: "规划生产流程" },

    // ---- 生成：一律确认（消耗额度）----
    canvas_generate_text: { risk: "generate", requiresConfirmation: true, label: "生成文本" },
    canvas_generate_image: { risk: "generate", requiresConfirmation: true, label: "生成图片" },
    canvas_generate_video: { risk: "generate", requiresConfirmation: true, label: "生成视频" },
    canvas_generate_audio: { risk: "generate", requiresConfirmation: true, label: "生成音频" },
    canvas_run_generation: { risk: "generate", requiresConfirmation: true, label: "触发生成" },
    canvas_run_pipeline: { risk: "generate", requiresConfirmation: true, label: "执行流水线" },
    canvas_continue_video: { risk: "generate", requiresConfirmation: true, label: "续写镜头" },

    // ---- 写：危险操作强制确认 ----
    canvas_delete_nodes: { risk: "write", requiresConfirmation: true, label: "删除节点" },
    canvas_apply_ops: { risk: "write", requiresConfirmation: true, label: "批量画布操作" },

    // ---- 写：跟随全局确认开关 ----
    canvas_create_node: { risk: "write", label: "创建节点" },
    canvas_create_text_node: { risk: "write", label: "创建文本节点" },
    canvas_create_text_nodes: { risk: "write", label: "批量创建文本节点" },
    canvas_create_config_node: { risk: "write", autoRunCapable: true, label: "创建生成配置节点" },
    canvas_create_image_prompt_flow: { risk: "write", autoRunCapable: true, label: "创建生图流程" },
    canvas_create_generation_flow: { risk: "write", autoRunCapable: true, label: "创建生成流程" },
    canvas_create_reverse_prompt_flow: { risk: "write", autoRunCapable: true, label: "创建反推提示词流程" },
    canvas_create_workflow_cards: { risk: "write", label: "创建流程卡片" },
    canvas_analyze_reference_image: { risk: "write", label: "分析参考图" },
    canvas_update_node: { risk: "write", label: "更新节点" },
    canvas_update_node_text: { risk: "write", label: "更新节点文本" },
    canvas_move_nodes: { risk: "write", label: "移动节点" },
    canvas_resize_node: { risk: "write", label: "调整节点尺寸" },
    canvas_connect_nodes: { risk: "write", label: "连接节点" },
    canvas_select_nodes: { risk: "write", label: "选中节点" },
    canvas_set_viewport: { risk: "write", label: "调整视口" },
};

function buildRegistry(): ToolDefinition[] {
    const missing = CANVAS_TOOL_SCHEMAS.map((tool) => tool.function.name).filter((name) => !TOOL_POLICIES[name]);

    if (missing.length && process.env.NODE_ENV !== "production") {
        // 开发环境快速失败：新增工具后忘记登记策略会立刻暴露，而不是悄悄退回 write
        throw new Error(`工具策略缺失（请在 engine/tools/registry.ts 的 TOOL_POLICIES 中登记）：${missing.join(", ")}`);
    }

    return CANVAS_TOOL_SCHEMAS.map((tool) => {
        const policy = TOOL_POLICIES[tool.function.name];
        return {
            name: tool.function.name,
            description: tool.function.description ?? "",
            parameters: (tool.function.parameters ?? {}) as Record<string, unknown>,
            risk: policy?.risk ?? "write",
            requiresConfirmation: policy?.requiresConfirmation,
        };
    });
}

export const TOOL_REGISTRY: ToolDefinition[] = buildRegistry();

const REGISTRY_BY_NAME = new Map(TOOL_REGISTRY.map((tool) => [tool.name, tool]));

export function getToolDefinition(name: string): ToolDefinition | undefined {
    return REGISTRY_BY_NAME.get(name);
}

export function isRegisteredTool(name: string): boolean {
    return REGISTRY_BY_NAME.has(name);
}

export function isReadOnlyTool(name: string): boolean {
    return REGISTRY_BY_NAME.get(name)?.risk === "read";
}

/** 按名称解析工具定义；未注册的工具会被**丢弃并报错**，不再静默降级为空参数 stub */
export function resolveToolDefinitions(names: readonly string[]): ToolDefinition[] {
    const resolved: ToolDefinition[] = [];
    for (const name of names) {
        const def = getToolDefinition(name);
        if (!def) {
            console.warn(`[canvas-engine] 未注册的工具被忽略：${name}`);
            continue;
        }
        resolved.push(def);
    }
    return resolved;
}

/** 工具清单 → 模型可用的 function 定义 */
export function toResponseFunctionTools(defs: readonly ToolDefinition[]): ResponseFunctionTool[] {
    return defs.map((def) => ({
        type: "function" as const,
        function: {
            name: def.name,
            description: def.description,
            parameters: def.parameters,
            additionalProperties: false,
        },
    }));
}

/** 全部工具（模型可见形式） */
export function allResponseFunctionTools(): ResponseFunctionTool[] {
    return toResponseFunctionTools(TOOL_REGISTRY);
}

/** 仅只读工具 */
export function readOnlyResponseFunctionTools(): ResponseFunctionTool[] {
    return toResponseFunctionTools(TOOL_REGISTRY.filter((tool) => tool.risk === "read"));
}

/**
 * 是否需要用户确认。完整复刻原有语义：
 *   读 → 不确认；显式要求确认 → 确认；autoRun 能力且 autoRun=true → 确认；否则跟随全局开关。
 */
export function toolNeedsConfirmation(name: string, args: Record<string, unknown>, confirmTools: boolean): boolean {
    const def = getToolDefinition(name);
    if (!def) return confirmTools;
    if (def.risk === "read") return false;
    if (def.requiresConfirmation) return true;
    if (TOOL_POLICIES[name]?.autoRunCapable && args.autoRun === true) return true;
    return confirmTools;
}

/** 工具的中文显示名（取代原先散落在 runner 里的英文标签 switch） */
export function toolLabel(name: string): string {
    return TOOL_POLICIES[name]?.label ?? getToolDefinition(name)?.description ?? name;
}

export function toolRisk(name: string): ToolRisk {
    return getToolDefinition(name)?.risk ?? "write";
}
