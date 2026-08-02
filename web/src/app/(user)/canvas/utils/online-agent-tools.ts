import type { ResponseFunctionTool } from "@/lib/generation/generation-request";

const MANGA_PRODUCTION_SKILL = [
    "SceneFlow 漫剧生产规范：",
    "1. 标准链路：剧本/片段解析 -> 人物创建提示词 -> 人物三视图提示词 -> 场景设定 -> 风格校准 -> 分镜表 -> 关键帧 -> 视频生成 -> 资产入库。",
    "2. 人物创建必须先锁定角色锚点：脸部、发型、服装、配饰、道具、气质、禁止变化项；不要直接跳到视频。",
    "3. 人物三视图必须基于人物定稿图生成，要求正面、侧面、背面同屏，同脸、同衣服、同发型。",
    "4. 分镜表必须可执行，固定包含：镜头编号、景别、画面描述、角色动作、台词/旁白、镜头运动、预计秒数、所需参考资产、连续性备注。",
    "5. 关键帧必须同时引用分镜表、人物三视图、场景设定和风格校准。",
    "6. 视频生成必须同时引用多个上游资产：关键帧、人物三视图、场景/风格、分镜表。提示词必须写清起始状态、动作推进、镜头运动、结束状态和禁止改变项。",
    "7. 除非用户明确要求立即生成，否则只创建可确认流程卡，先让用户检查提示词、模型、比例、画质和时长。",
    "8. 用户上传外部剧本或片段时，先解析和拆分；角色来源必须判断是新生成、用户资产复用，还是平台租赁。",
    "9. 生成人设、三视图、场景、风格、分镜、关键帧、视频后，都要建议回流素材库。",
].join("\n");

const BASE_ONLINE_AGENT_PROMPT = [
    "你是 SceneFlow 的 AI 创作助手。先像一个正常、聪明、有耐心的人一样理解用户，再决定怎么回答。",
    "默认自然语言对话，不调用工具。只有用户明确要求你操作画布，例如创建卡片、放到画布、读取当前画布、修改节点、连线、生成、重跑、删除、续写视频时，才调用画布工具。",
    "如果用户只是问产品怎么用、API 怎么接、为什么报错、图片怎么样、想听建议、陪聊或判断方向，直接回答，不要套固定创作模板。",
    "用户发图片并说“帮我看一下/我需要提示词/怎么优化”时，先说明你看到什么，再按问题回答；只有用户明确要求提示词时才输出提示词。",
    "涉及已有节点、选中节点、参考图、连线关系、删除、修改、重跑、续写或图生视频时，必须先读取画布状态或选区，再执行写操作。",
    "用户要求创作内容时，先判断类型：剧情灵感、提示词、分镜、角色设定、视频镜头、产品答疑、故障排查。只输出当前类型需要的内容，不要把所有模块都塞给用户。",
    "聊天面板较窄，优先短句、短段落、编号列表。除非用户明确要表格，否则不要输出宽 Markdown 表格。",
    "不要提到 [object Object]、页面对象、数据传输错误、误传输格式或内部实现。遇到不清楚输入时，用正常人的方式说：我先按你现在给的信息理解为……",
    "如果用户意图不明确，先给当前理解和一个最小下一步，不要连续追问很多问题。",
    "工具参数涉及已有节点时必须使用真实 id；缺少必要 id 或意图不明确时，说明需要用户选择或补充，不要猜测。不要输出 JSON ops，不要编造执行结果。工具返回后，根据真实结果回复。",
].join("\n");

export const ONLINE_AGENT_PROMPT = `${BASE_ONLINE_AGENT_PROMPT}\n\n以下漫剧生产规范只在用户明确要求制作漫剧、分镜、角色三视图、关键帧或视频流水线时参考；普通聊天、看图问答、产品咨询、API 排错时不要套用：\n${MANGA_PRODUCTION_SKILL}`;

export const CANVAS_TOOL_INTENT_PATTERN =
    /(创建|新建|放到画布|落到画布|生成节点|创建卡片|连线|连接|读取画布|当前画布|看一下画布|选中|删除|移动|调整节点|修改节点|执行|运行|重跑|重新生成|续写|尾帧|帮我操作|改画布|更新节点|开始生成|立即生成|生成图片|生成视频|生成音频|图生视频|帮我生成|生成一张|生成一段|出一张|做一张|画一张)/;
export const CHAT_ONLY_INTENT_PATTERN = /(提示词|想法|建议|规划|剧本|剧情|片段|分镜|怎么看|帮我看|分析|优化|怎么做|怎么开始|聊|在吗|你好|谢谢|难用|不会|卡住)/;

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

export const ONLINE_READ_TOOLS = new Set(["canvas_get_state", "canvas_get_selection", "canvas_export_snapshot"]);

function toolDefinition(name: string, description: string, properties: Record<string, unknown>, required: string[] = [], strict = false): ResponseFunctionTool {
    return { type: "function", function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false }, strict } };
}

function generationToolDefinition(name: string, description: string, mode?: "text" | "image" | "video" | "audio") {
    return toolDefinition(
        name,
        description,
        { prompt: { type: "string" }, title: { type: "string" }, x: { type: "number" }, y: { type: "number" }, referenceNodeIds: { type: "array", items: { type: "string" } }, ...(mode ? {} : { mode: GENERATION_MODE_SCHEMA }), autoRun: { type: "boolean" }, ...GENERATION_OPTION_PROPERTIES },
        ["prompt"],
    );
}

export const ONLINE_AGENT_TOOLS: ResponseFunctionTool[] = [
    toolDefinition("canvas_get_state", "读取当前画布的节点、连线、选区和视口。", {}),
    toolDefinition("canvas_get_selection", "读取当前选中的节点。", {}),
    toolDefinition("canvas_export_snapshot", "导出当前画布快照，用于理解布局。", {}),
    toolDefinition("canvas_plan_workflow", "识别用户的视觉生产意图，并返回推荐流程、缺失阶段和下一步建议；只做规划，不改动画布。", { brief: { type: "string" }, intent: WORKFLOW_INTENT_SCHEMA, outputGoal: { type: "string" } }, ["brief"]),
    toolDefinition("canvas_create_workflow_cards", "按视觉生产意图创建一组可确认流程卡片，不自动生成内容。适合片段视频、完整剧本、角色、场景、分镜、图生视频和素材分析。", { brief: { type: "string" }, intent: WORKFLOW_INTENT_SCHEMA, sourceNodeId: { type: "string" }, referenceNodeIds: { type: "array", items: { type: "string" } }, x: { type: "number" }, y: { type: "number" } }, ["brief"]),
    toolDefinition("canvas_analyze_reference_image", "为指定参考图创建结构化分析卡片，输出角色外貌、服装、风格、场景、可复用提示词和风险点。", { nodeId: { type: "string" }, brief: { type: "string" }, analysisType: { type: "string", enum: ["character", "scene", "style", "shot", "auto"] }, x: { type: "number" }, y: { type: "number" } }, ["nodeId"]),
    toolDefinition("canvas_apply_ops", "批量操作当前画布。支持 add_node、update_node、delete_node、delete_connections、connect_nodes、set_viewport、select_nodes、run_generation。", { ops: { type: "array", items: CANVAS_OP_SCHEMA } }, ["ops"], false),
    toolDefinition("canvas_create_node", "创建任意类型节点：text、image、config、video、audio。适合创建占位图、媒体占位、配置节点或自定义 metadata 节点。", { nodeType: NODE_TYPE_SCHEMA, title: { type: "string" }, x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" }, metadata: JSON_RECORD_SCHEMA }, ["nodeType"]),
    toolDefinition("canvas_create_text_node", "在画布创建单个文本节点。", { text: { type: "string" }, x: { type: "number" }, y: { type: "number" }, title: { type: "string" }, width: { type: "number" }, height: { type: "number" } }, ["text"]),
    toolDefinition("canvas_create_text_nodes", "批量创建文本节点，适合标题、段落、脚本、说明等内容块。", { items: { type: "array", minItems: 1, items: { type: "object", properties: { text: { type: "string" }, title: { type: "string" }, x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" } }, required: ["text"], additionalProperties: false } }, x: { type: "number" }, y: { type: "number" }, gap: { type: "number" }, direction: { type: "string", enum: ["row", "column"] } }, ["items"]),
    toolDefinition("canvas_create_config_node", "创建生成配置节点，可指定 text/image/video/audio 模式和生成参数，可选择立即触发生成。", { prompt: { type: "string" }, mode: GENERATION_MODE_SCHEMA, title: { type: "string" }, x: { type: "number" }, y: { type: "number" }, width: { type: "number" }, height: { type: "number" }, autoRun: { type: "boolean" }, ...GENERATION_OPTION_PROPERTIES }),
    toolDefinition("canvas_create_image_prompt_flow", "创建提示词文本节点和图片生成配置节点，并自动连线，可选择立即触发生图。", { prompt: { type: "string" }, x: { type: "number" }, y: { type: "number" }, autoRun: { type: "boolean" }, ...GENERATION_OPTION_PROPERTIES }, ["prompt"]),
    generationToolDefinition("canvas_create_generation_flow", "创建通用生成流程：提示词文本节点、生成配置节点、参考节点连线，可用于文案、生图、视频或音频。"),
    generationToolDefinition("canvas_generate_text", "创建文本生成流程并立即触发生成。", "text"),
    generationToolDefinition("canvas_generate_image", "创建图片生成流程并立即触发生成。", "image"),
    generationToolDefinition("canvas_generate_video", "创建视频生成流程并立即触发生成。", "video"),
    generationToolDefinition("canvas_generate_audio", "创建音频生成流程并立即触发生成。", "audio"),
    toolDefinition("canvas_update_node", "更新节点基础字段或 metadata。", { id: { type: "string" }, patch: JSON_RECORD_SCHEMA, metadata: JSON_RECORD_SCHEMA }, ["id"]),
    toolDefinition("canvas_update_node_text", "更新文本节点内容和标题。", { id: { type: "string" }, text: { type: "string" }, title: { type: "string" } }, ["id", "text"]),
    toolDefinition("canvas_move_nodes", "移动一个或多个节点，支持绝对坐标或 dx/dy 偏移。", { items: { type: "array", minItems: 1, items: { type: "object", properties: { id: { type: "string" }, x: { type: "number" }, y: { type: "number" }, dx: { type: "number" }, dy: { type: "number" } }, required: ["id"], additionalProperties: false } } }, ["items"]),
    toolDefinition("canvas_resize_node", "调整节点尺寸。", { id: { type: "string" }, width: { type: "number" }, height: { type: "number" }, freeResize: { type: "boolean" } }, ["id", "width", "height"]),
    toolDefinition("canvas_delete_nodes", "删除指定节点及相关连线。", { ids: { type: "array", items: { type: "string" }, minItems: 1 } }, ["ids"]),
    toolDefinition("canvas_connect_nodes", "批量连接节点。", { connections: { type: "array", minItems: 1, items: { type: "object", properties: { fromNodeId: { type: "string" }, toNodeId: { type: "string" } }, required: ["fromNodeId", "toNodeId"], additionalProperties: false } } }, ["connections"]),
    toolDefinition("canvas_select_nodes", "设置当前选中节点。", { ids: { type: "array", items: { type: "string" } } }, ["ids"]),
    toolDefinition("canvas_set_viewport", "调整画布视口。", { viewport: VIEWPORT_SCHEMA }, ["viewport"]),
    toolDefinition("canvas_run_generation", "触发指定节点生成，通常用于配置节点或文本/图片/视频/音频节点。", { nodeId: { type: "string" }, mode: GENERATION_MODE_SCHEMA, prompt: { type: "string" } }, ["nodeId"]),
    toolDefinition("canvas_run_pipeline", "按顺序执行一组已确认的流程节点。成功节点会跳过，失败时停止，再次调用可从断点继续。该工具会消耗生成额度，只有用户明确要求执行时才能调用。", { nodeIds: { type: "array", items: { type: "string" }, minItems: 1 }, resume: { type: "boolean" } }, ["nodeIds"]),
    toolDefinition("canvas_continue_video", "提取指定视频节点尾帧，并创建已连接的下一镜头视频节点。需要用户确认后执行。", { nodeId: { type: "string" } }, ["nodeId"]),
];
