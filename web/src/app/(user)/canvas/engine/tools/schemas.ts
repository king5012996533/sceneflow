import type { ResponseFunctionTool } from "@/lib/generation/generation-request";

/**
 * 画布工具的参数 schema 目录（唯一来源）。
 *
 * 这里只描述「模型能调用什么、参数长什么样」；风险档、确认策略、中文名
 * 在同目录的 registry.ts 里登记。两者合起来构成完整的工具注册表。
 * online 助手与 orchestrator 子 Agent 都从这里取定义，不再各写一份。
 */

const JSON_RECORD_SCHEMA = { type: "object", additionalProperties: true };
const POSITION_SCHEMA = { type: "object", properties: { x: { type: "number" }, y: { type: "number" } }, required: ["x", "y"], additionalProperties: false };
const VIEWPORT_SCHEMA = { type: "object", properties: { x: { type: "number" }, y: { type: "number" }, k: { type: "number" } }, required: ["x", "y", "k"], additionalProperties: false };
const NODE_TYPE_SCHEMA = { type: "string", enum: ["image", "text", "config", "video", "audio"] };
const GENERATION_MODE_SCHEMA = { type: "string", enum: ["text", "image", "video", "audio"] };
const WORKFLOW_INTENT_SCHEMA = { type: "string", enum: ["fragment-video", "full-script", "character", "scene", "storyboard", "image-to-video", "asset-analysis", "general-visual"] };
const GENERATION_OPTION_PROPERTIES = {
    model: { type: "string" },
    size: { type: "string" },
    quality: { type: "string" },
    count: { type: "number" },
    seconds: { type: "string" },
    vquality: { type: "string" },
    generateAudio: { type: "string" },
    watermark: { type: "string" },
    audioVoice: { type: "string" },
    audioFormat: { type: "string" },
    audioSpeed: { type: "string" },
    audioInstructions: { type: "string" },
};
const CANVAS_OP_SCHEMA = {
    type: "object",
    properties: {
        type: { type: "string", enum: ["add_node", "update_node", "delete_node", "delete_connections", "connect_nodes", "set_viewport", "select_nodes", "run_generation", "run_pipeline", "continue_video"] },
        id: { type: "string" },
        ids: { type: "array", items: { type: "string" } },
        nodeType: NODE_TYPE_SCHEMA,
        title: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        width: { type: "number" },
        height: { type: "number" },
        position: POSITION_SCHEMA,
        metadata: JSON_RECORD_SCHEMA,
        patch: JSON_RECORD_SCHEMA,
        all: { type: "boolean" },
        fromNodeId: { type: "string" },
        toNodeId: { type: "string" },
        viewport: VIEWPORT_SCHEMA,
        nodeId: { type: "string" },
        mode: GENERATION_MODE_SCHEMA,
        prompt: { type: "string" },
        nodeIds: { type: "array", items: { type: "string" } },
        resume: { type: "boolean" },
    },
    required: ["type"],
    additionalProperties: false,
};

function toolDefinition(name: string, description: string, properties: Record<string, unknown>, required: string[] = [], strict = false): ResponseFunctionTool {
    return { type: "function", function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false }, strict } };
}

function generationToolDefinition(name: string, description: string, mode?: "text" | "image" | "video" | "audio") {
    return toolDefinition(
        name,
        description,
        {
            prompt: { type: "string" },
            title: { type: "string" },
            x: { type: "number" },
            y: { type: "number" },
            referenceNodeIds: { type: "array", items: { type: "string" } },
            ...(mode ? {} : { mode: GENERATION_MODE_SCHEMA }),
            autoRun: { type: "boolean" },
            ...GENERATION_OPTION_PROPERTIES,
        },
        ["prompt"],
    );
}

export const CANVAS_TOOL_SCHEMAS: ResponseFunctionTool[] = [
    toolDefinition("canvas_get_state", "读取当前画布的节点、连接、选区和视口。", {}),
    toolDefinition("canvas_get_selection", "读取当前选中的节点。", {}),
    toolDefinition("canvas_export_snapshot", "导出当前画布快照，用于理解布局。", {}),
    toolDefinition("canvas_plan_workflow", "识别用户的视觉生产意图，并返回推荐流程、缺失阶段和下一步建议；只做规划，不改动画布。", { brief: { type: "string" }, intent: WORKFLOW_INTENT_SCHEMA, outputGoal: { type: "string" } }, ["brief"]),
    toolDefinition(
        "canvas_create_workflow_cards",
        "按视觉生产意图创建一组可确认流程卡片，不自动生成内容。适合片段视频、完整剧本、角色、场景、分镜、图生视频和素材分析。",
        { brief: { type: "string" }, intent: WORKFLOW_INTENT_SCHEMA, sourceNodeId: { type: "string" }, referenceNodeIds: { type: "array", items: { type: "string" } }, x: { type: "number" }, y: { type: "number" } },
        ["brief"],
    ),
    toolDefinition(
        "canvas_analyze_reference_image",
        "为指定参考图创建结构化分析卡片，输出角色外貌、服装、风格、场景、可复用提示词和风险点。",
        { nodeId: { type: "string" }, brief: { type: "string" }, analysisType: { type: "string", enum: ["character", "scene", "style", "shot", "auto"] }, x: { type: "number" }, y: { type: "number" } },
        ["nodeId"],
    ),
    toolDefinition(
        "canvas_create_reverse_prompt_flow",
        "基于指定图片节点创建反推提示词流程：参考图 -> 反推说明文本 -> 文本生成配置，可选择立即运行。用户要求从图片反推/倒推/提取提示词时优先使用。",
        { nodeId: { type: "string" }, brief: { type: "string" }, x: { type: "number" }, y: { type: "number" }, autoRun: { type: "boolean" } },
        ["nodeId"],
    ),
    toolDefinition("canvas_apply_ops", "批量操作当前画布。支持 add_node、update_node、delete_node、delete_connections、connect_nodes、set_viewport、select_nodes、run_generation。", { ops: { type: "array", items: CANVAS_OP_SCHEMA } }, ["ops"], false),
    toolDefinition(
        "canvas_create_node",
        "创建任意类型节点：text、image、config、video、audio。适合创建占位图、媒体占位、配置节点或自定义 metadata 节点。",
        { nodeType: NODE_TYPE_SCHEMA, title: { type: "string" }, x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" }, metadata: JSON_RECORD_SCHEMA },
        ["nodeType"],
    ),
    toolDefinition("canvas_create_text_node", "在画布创建单个文本节点。", { text: { type: "string" }, x: { type: "number" }, y: { type: "number" }, title: { type: "string" }, width: { type: "number" }, height: { type: "number" } }, ["text"]),
    toolDefinition(
        "canvas_create_text_nodes",
        "批量创建文本节点，适合标题、段落、脚本、说明等内容块。",
        {
            items: {
                type: "array",
                minItems: 1,
                items: {
                    type: "object",
                    properties: { text: { type: "string" }, title: { type: "string" }, x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" } },
                    required: ["text"],
                    additionalProperties: false,
                },
            },
            x: { type: "number" },
            y: { type: "number" },
            gap: { type: "number" },
            direction: { type: "string", enum: ["row", "column"] },
        },
        ["items"],
    ),
    toolDefinition("canvas_create_config_node", "创建生成配置节点，可指定 text/image/video/audio 模式和生成参数，可选择立即触发生成。", {
        prompt: { type: "string" },
        mode: GENERATION_MODE_SCHEMA,
        title: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        width: { type: "number" },
        height: { type: "number" },
        autoRun: { type: "boolean" },
        ...GENERATION_OPTION_PROPERTIES,
    }),
    toolDefinition(
        "canvas_create_image_prompt_flow",
        "创建提示词文本节点和图片生成配置节点，并自动连线，可选择立即触发生图。",
        { prompt: { type: "string" }, x: { type: "number" }, y: { type: "number" }, autoRun: { type: "boolean" }, ...GENERATION_OPTION_PROPERTIES },
        ["prompt"],
    ),
    generationToolDefinition("canvas_create_generation_flow", "创建通用生成流程：提示词文本节点、生成配置节点、参考节点连线，可用于文案、生图、视频或音频。"),
    generationToolDefinition("canvas_generate_text", "创建文本生成流程并立即触发生成。", "text"),
    generationToolDefinition("canvas_generate_image", "创建图片生成流程并立即触发生成。", "image"),
    generationToolDefinition("canvas_generate_video", "创建视频生成流程并立即触发生成。", "video"),
    generationToolDefinition("canvas_generate_audio", "创建音频生成流程并立即触发生成。", "audio"),
    toolDefinition("canvas_update_node", "更新节点基础字段或 metadata。", { id: { type: "string" }, patch: JSON_RECORD_SCHEMA, metadata: JSON_RECORD_SCHEMA }, ["id"]),
    toolDefinition("canvas_update_node_text", "更新文本节点内容和标题。", { id: { type: "string" }, text: { type: "string" }, title: { type: "string" } }, ["id", "text"]),
    toolDefinition(
        "canvas_move_nodes",
        "移动一个或多个节点，支持绝对坐标或 dx/dy 偏移。",
        {
            items: {
                type: "array",
                minItems: 1,
                items: { type: "object", properties: { id: { type: "string" }, x: { type: "number" }, y: { type: "number" }, dx: { type: "number" }, dy: { type: "number" } }, required: ["id"], additionalProperties: false },
            },
        },
        ["items"],
    ),
    toolDefinition("canvas_resize_node", "调整节点尺寸。", { id: { type: "string" }, width: { type: "number" }, height: { type: "number" }, freeResize: { type: "boolean" } }, ["id", "width", "height"]),
    toolDefinition("canvas_delete_nodes", "删除指定节点及相关连线。", { ids: { type: "array", items: { type: "string" }, minItems: 1 } }, ["ids"]),
    toolDefinition(
        "canvas_connect_nodes",
        "批量连接节点。",
        { connections: { type: "array", minItems: 1, items: { type: "object", properties: { fromNodeId: { type: "string" }, toNodeId: { type: "string" } }, required: ["fromNodeId", "toNodeId"], additionalProperties: false } } },
        ["connections"],
    ),
    toolDefinition("canvas_select_nodes", "设置当前选中节点。", { ids: { type: "array", items: { type: "string" } } }, ["ids"]),
    toolDefinition("canvas_set_viewport", "调整画布视口。", { viewport: VIEWPORT_SCHEMA }, ["viewport"]),
    toolDefinition("canvas_run_generation", "触发指定节点生成，通常用于配置节点或文本/图片/视频/音频节点。", { nodeId: { type: "string" }, mode: GENERATION_MODE_SCHEMA, prompt: { type: "string" } }, ["nodeId"]),
    toolDefinition(
        "canvas_run_pipeline",
        "按顺序执行一组已确认的流程节点。成功节点会跳过，失败时停止，再次调用可以从断点继续。该工具会消耗生成额度，只有用户明确要求执行时才能调用。",
        { nodeIds: { type: "array", items: { type: "string" }, minItems: 1 }, resume: { type: "boolean" } },
        ["nodeIds"],
    ),
    toolDefinition("canvas_continue_video", "提取指定视频节点尾帧，并创建已连接的下一镜头视频节点。需要用户确认后执行。", { nodeId: { type: "string" } }, ["nodeId"]),
];
