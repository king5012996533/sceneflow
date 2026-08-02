import { nanoid } from "nanoid";

import { normalizeModelOptionValue, selectableModelsByCapability, type AiConfig } from "@/stores/use-config-store";
import { NODE_DEFAULT_SIZE } from "../constants";
import { CanvasNodeType, type CanvasNodeData } from "../types";
import { type CanvasAgentOp, type CanvasAgentSnapshot } from "./canvas-agent-ops";

export function objectDetail(value: unknown) {
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function describeCanvasSnapshot(snapshot: CanvasAgentSnapshot) {
    const counts = snapshot.nodes.reduce<Record<string, number>>((acc, node) => {
        acc[node.type] = (acc[node.type] || 0) + 1;
        return acc;
    }, {});
    return `画布有 ${snapshot.nodes.length} 个节点、${snapshot.connections.length} 条连接；文本 ${counts[CanvasNodeType.Text] || 0} 个，图片 ${counts[CanvasNodeType.Image] || 0} 个，生成配置 ${counts[CanvasNodeType.Config] || 0} 个，视频 ${counts[CanvasNodeType.Video] || 0} 个，音频 ${counts[CanvasNodeType.Audio] || 0} 个`;
}

export function parseToolArguments(value: string) {
    try {
        const parsed = JSON.parse(value || "{}");
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("工具参数必须是 JSON 对象");
        return parsed as Record<string, unknown>;
    } catch {
        throw new Error("工具参数不是合法 JSON 对象");
    }
}

export function onlineToolToOps(name: string, input: Record<string, unknown>, snapshot: CanvasAgentSnapshot, config: AiConfig): CanvasAgentOp[] {
    const nodeIds = new Set(snapshot.nodes.map((node) => node.id));
    if (name === "canvas_create_workflow_cards") return workflowCardOps(input, snapshot, config);
    if (name === "canvas_analyze_reference_image") return referenceAnalysisOps(input, snapshot);
    if (name === "canvas_apply_ops") {
        const ops = requireOps(input.ops);
        validateOpsAgainstSnapshot(ops, snapshot);
        return ops;
    }
    if (name === "canvas_create_node") {
        const nodeType = requireNodeType(input.nodeType);
        const x = numberOr(input.x, nextCanvasX(snapshot));
        const y = numberOr(input.y, 0);
        if (nodeType === CanvasNodeType.Config) return [configNodeOp(stringOptional(input.id) || `config-${nanoid()}`, { ...recordOptional(input.metadata), ...input }, x, y, config)];
        return [{ type: "add_node", nodeType, title: stringOptional(input.title), position: { x, y }, width: numberOptional(input.width), height: numberOptional(input.height), metadata: recordOptional(input.metadata) as CanvasNodeData["metadata"] }];
    }
    if (name === "canvas_create_text_node") return [textNodeOp(input, numberOr(input.x, nextCanvasX(snapshot)), numberOr(input.y, 0))];
    if (name === "canvas_create_text_nodes") {
        const items = requireRecordArray(input.items, "items");
        const x = numberOr(input.x, nextCanvasX(snapshot));
        const y = numberOr(input.y, 0);
        const gap = numberOr(input.gap, 40);
        const direction = input.direction === "row" ? "row" : "column";
        return items.map((item, index) => textNodeOp({ ...item, text: requireString(item.text, "text") }, numberOr(item.x, direction === "row" ? x + index * (NODE_DEFAULT_SIZE[CanvasNodeType.Text].width + gap) : x), numberOr(item.y, direction === "row" ? y : y + index * (NODE_DEFAULT_SIZE[CanvasNodeType.Text].height + gap))));
    }
    if (name === "canvas_create_image_prompt_flow") return generationFlowOps({ ...input, mode: "image" }, snapshot, config);
    if (name === "canvas_create_config_node") {
        const configId = `config-${nanoid()}`;
        const mode = generationMode(input.mode);
        return [configNodeOp(configId, input, numberOr(input.x, nextCanvasX(snapshot)), numberOr(input.y, 0), config), ...(input.autoRun ? [runGenerationOp(configId, mode, stringOptional(input.prompt))] : [])];
    }
    if (name === "canvas_create_generation_flow") return generationFlowOps(input, snapshot, config);
    if (name === "canvas_generate_text") return generationFlowOps({ ...input, mode: "text", autoRun: true }, snapshot, config);
    if (name === "canvas_generate_image") return generationFlowOps({ ...input, mode: "image", autoRun: true }, snapshot, config);
    if (name === "canvas_generate_video") return generationFlowOps({ ...input, mode: "video", autoRun: true }, snapshot, config);
    if (name === "canvas_generate_audio") return generationFlowOps({ ...input, mode: "audio", autoRun: true }, snapshot, config);
    if (name === "canvas_update_node") {
        const id = requireExistingNodeId(input.id, "id", nodeIds);
        return [{ type: "update_node", id, patch: recordOptional(input.patch) as Partial<CanvasNodeData> | undefined, metadata: recordOptional(input.metadata) as CanvasNodeData["metadata"] }];
    }
    if (name === "canvas_update_node_text") {
        const id = requireExistingNodeId(input.id, "id", nodeIds);
        return [{ type: "update_node", id, patch: stringOptional(input.title) ? { title: stringOptional(input.title) } : undefined, metadata: { content: requireString(input.text, "text"), status: "success" } }];
    }
    if (name === "canvas_move_nodes") {
        return requireRecordArray(input.items, "items").map((item) => {
            const id = requireExistingNodeId(item.id, "id", nodeIds);
            const current = snapshot.nodes.find((node) => node.id === id);
            return { type: "update_node", id, patch: { position: { x: numberOr(item.x, (current?.position.x || 0) + numberOr(item.dx, 0)), y: numberOr(item.y, (current?.position.y || 0) + numberOr(item.dy, 0)) } } };
        });
    }
    if (name === "canvas_resize_node") return [{ type: "update_node", id: requireExistingNodeId(input.id, "id", nodeIds), patch: { width: requireNumber(input.width, "width"), height: requireNumber(input.height, "height") }, metadata: typeof input.freeResize === "boolean" ? { freeResize: input.freeResize } : undefined }];
    if (name === "canvas_delete_nodes") return [{ type: "delete_node", ids: requireExistingNodeIds(input.ids, "ids", nodeIds) }];
    if (name === "canvas_connect_nodes") return requireRecordArray(input.connections, "connections").map((connection) => ({ type: "connect_nodes", fromNodeId: requireExistingNodeId(connection.fromNodeId, "fromNodeId", nodeIds), toNodeId: requireExistingNodeId(connection.toNodeId, "toNodeId", nodeIds) }));
    if (name === "canvas_select_nodes") return [{ type: "select_nodes", ids: requireExistingNodeIds(input.ids, "ids", nodeIds) }];
    if (name === "canvas_set_viewport") return [{ type: "set_viewport", viewport: requireViewport(input.viewport) }];
    if (name === "canvas_run_generation") return [runGenerationOp(requireExistingNodeId(input.nodeId, "nodeId", nodeIds), generationMode(input.mode), stringOptional(input.prompt))];
    if (name === "canvas_run_pipeline") return [{ type: "run_pipeline", nodeIds: requireExistingNodeIds(input.nodeIds, "nodeIds", nodeIds), resume: input.resume !== false }];
    if (name === "canvas_continue_video") return [{ type: "continue_video", nodeId: requireExistingNodeId(input.nodeId, "nodeId", nodeIds) }];
    throw new Error(`不支持的工具：${name}`);
}

function generationFlowOps(input: Record<string, unknown>, snapshot: CanvasAgentSnapshot, config: AiConfig): CanvasAgentOp[] {
    const mode = generationMode(input.mode);
    const prompt = requireString(input.prompt, "prompt");
    const x = numberOr(input.x, nextCanvasX(snapshot));
    const y = numberOr(input.y, 0);
    const textId = `text-${nanoid()}`;
    const configId = `config-${nanoid()}`;
    const nodeIds = new Set(snapshot.nodes.map((node) => node.id));
    const referenceNodeIds = Array.isArray(input.referenceNodeIds) ? requireExistingNodeIds(input.referenceNodeIds, "referenceNodeIds", nodeIds) : [];
    const tokens = [`@[node:${textId}]`, ...referenceNodeIds.map((id) => `@[node:${id}]`)];
    return [
        textNodeOp({ id: textId, text: prompt, title: stringOptional(input.title) || "提示词" }, x, y),
        configNodeOp(configId, { ...input, prompt: tokens.join("\n") }, x + NODE_DEFAULT_SIZE[CanvasNodeType.Text].width + 80, y, config),
        { type: "connect_nodes", fromNodeId: textId, toNodeId: configId },
        ...referenceNodeIds.map((fromNodeId) => ({ type: "connect_nodes" as const, fromNodeId, toNodeId: configId })),
        { type: "select_nodes", ids: [configId] },
        ...(input.autoRun ? [runGenerationOp(configId, mode, tokens.join("\n"))] : []),
    ];
}

type VisualWorkflowIntent = "fragment-video" | "full-script" | "character" | "scene" | "storyboard" | "image-to-video" | "asset-analysis" | "general-visual";
type WorkflowStage = {
    key: string;
    title: string;
    type: CanvasNodeType;
    mode?: "text" | "image" | "video" | "audio";
    label: string;
    description: string;
    prompt: (brief: string) => string;
    assetCategory?: "character" | "character-turnaround" | "scene" | "style" | "storyboard" | "keyframe" | "video-shot" | "prompt" | "template" | "reference" | "general";
    assetSource?: "generate" | "user-asset" | "platform-rental" | "platform-preset" | "manual";
    assetReusable?: boolean;
    width?: number;
    height?: number;
    size?: string;
    quality?: string;
    count?: number;
    seconds?: string;
    vquality?: string;
};

const workflowPresets: Record<VisualWorkflowIntent, WorkflowStage[]> = {
    "fragment-video": [
        stage("brief", "片段策划", CanvasNodeType.Text, "text", "结构拆解", "把一句话或一段戏拆成可执行制作清单。", (brief) => `请把这个视频片段拆成视觉生产策划：${brief}\n\n输出：一句话概述、出场角色、场景地点、情绪节奏、关键动作、镜头数量建议、需要生成的资产清单。`),
        stage("character-source", "角色来源决策", CanvasNodeType.Text, "text", "资产来源", "判断角色是新生成、调用用户资产，还是租赁平台角色。", (brief) => `请基于片段策划判断每个角色的来源策略：${brief}\n\n每个角色必须在三种来源中选择一种：新生成角色、使用用户已有资产、租赁平台角色。请给出选择理由、需要的参考图或三视图、授权风险、是否适合沉淀为长期角色资产。`, { assetCategory: "prompt", assetSource: "manual", assetReusable: true }),
        stage("character", "人物创建", CanvasNodeType.Image, "image", "角色设定", "先定脸、服装、发型和气质。", (brief) => `根据片段策划生成主要角色设定图。片段：${brief}\n\n要求：脸部特征清晰，服装结构明确，发型和配饰稳定，可作为后续三视图一致性参考。`, { size: "1024x1360", quality: "high", count: 2 }),
        stage("turnaround", "人物三视图", CanvasNodeType.Image, "image", "一致性锚点", "正面、侧面、背面同屏，降低角色漂移。", (brief) => `基于上游人物定稿图，生成同一角色三视图设定表。片段：${brief}\n\n要求：正面、侧面、背面全身站姿；同一服装、同一脸型、同一发型、同一配饰；白底或浅灰底；不要换人。`, { size: "1536x1024", quality: "high", count: 1 }),
        stage("scene", "场景设定", CanvasNodeType.Image, "image", "环境资产", "确定地点、天气和空间层次。", (brief) => `根据片段策划生成场景资产图。片段：${brief}\n\n要求：明确地点、时间、天气、空间层次，可复用于多个镜头；画面不要出现主要人物。`, { size: "1824x1024", quality: "high", count: 2 }),
        stage("style", "风格校准", CanvasNodeType.Text, "text", "风格资产", "统一画风、色调、构图和负面约束。", (brief) => `请基于片段策划、角色和场景资产输出风格校准规范：${brief}\n\n字段：整体画风、时代或类型、色调、光影、构图规则、镜头语言、角色一致性禁忌、场景一致性禁忌、通用正向提示词、通用负面提示词。`, { assetCategory: "style", assetSource: "manual", assetReusable: true }),
        stage("storyboard", "分镜表", CanvasNodeType.Text, "text", "镜头规划", "拆成镜头编号、景别、动作、台词、运动和秒数。", (brief) => `请根据片段策划、人物设定和场景资产，输出分镜表。片段：${brief}\n\n每个镜头包含：镜头编号、景别、画面描述、角色动作、台词或旁白、镜头运动、预计秒数、所需参考资产。控制在 6-10 个镜头。`),
        stage("keyframe", "镜头关键帧", CanvasNodeType.Image, "image", "关键帧", "生成适合转视频的单镜头画面。", (brief) => `基于上游分镜表、人物三视图和场景资产，生成一个镜头关键帧。片段：${brief}\n\n要求：角色一致、构图明确、动作准确、适合转视频；不要多余肢体、不要换服装、不要换脸。`, { size: "1824x1024", quality: "high", count: 1 }),
        stage("video", "镜头视频", CanvasNodeType.Video, "video", "图生视频", "把关键帧转成短视频。", (brief) => `基于上游镜头关键帧生成短视频。片段：${brief}\n\n要求：保持角色脸、服装、场景一致；动作自然，有镜头运动；不要大幅改变构图。`, { size: "16:9", seconds: "6", vquality: "720p" }),
        stage("asset-archive", "资产入库", CanvasNodeType.Text, "text", "资产回流", "把本次产物整理成可复用素材库清单。", (brief) => `请整理本次片段生产完成后需要入库的资产：${brief}\n\n按角色资产、三视图资产、场景资产、风格预设、分镜模板、关键帧、镜头视频分类输出。每项包含：资产名称、来源节点、建议标签、复用场景、授权状态、下次项目如何调用。`, { assetCategory: "template", assetSource: "manual", assetReusable: true }),
    ],
    "full-script": [
        stage("script", "剧本解析", CanvasNodeType.Text, "text", "结构拆解", "从外部剧本提取场次、角色、冲突和资产需求。", (brief) => `请解析这个外部剧本：${brief}\n\n输出：故事梗概、场次列表、主要角色、核心场景、视觉风格、资产清单、优先制作的片段。`),
        stage("characters", "角色表", CanvasNodeType.Text, "text", "角色资产规划", "列出角色和需要的设定图、三视图。", (brief) => `基于剧本解析输出角色资产表。剧本：${brief}\n\n字段：角色名、年龄气质、外貌、服装、道具、关系、需要的参考资产。`),
        stage("scenes", "场景表", CanvasNodeType.Text, "text", "场景资产规划", "列出可复用场景。", (brief) => `基于剧本解析输出场景资产表。剧本：${brief}\n\n字段：地点、时间、天气、空间层次、出现频次、所需画面资产。`),
        stage("storyboard", "重点片段分镜", CanvasNodeType.Text, "text", "镜头规划", "先拆最值得制作的一段。", (brief) => `从剧本中选择最适合先制作的 15-30 秒片段并输出分镜表。剧本：${brief}`),
        stage("keyframe", "重点片段关键帧", CanvasNodeType.Image, "image", "关键帧", "根据分镜和角色场景信息生成视频首帧。", (brief) => `根据剧本解析、角色表、场景表和重点片段分镜生成关键帧：${brief}\n\n要求：角色身份、服装、场景和构图稳定，画面适合继续生成视频。`, { size: "1824x1024", quality: "high", count: 1 }),
        stage("video", "重点片段视频", CanvasNodeType.Video, "video", "镜头成片", "将关键帧生成首段视频。", (brief) => `根据上游关键帧和分镜生成视频：${brief}\n\n保持角色、服装、场景和镜头方向一致，动作自然，不要突然切换身份。`, { size: "16:9", seconds: "6", vquality: "720p" }),
        stage("asset-archive", "资产入库", CanvasNodeType.Text, "text", "资产回流", "整理并沉淀本次剧本生产资产。", (brief) => `整理本次剧本生产可复用资产：${brief}\n\n按角色、场景、分镜模板、关键帧和镜头视频分类，补充标签、授权状态和复用建议。`, { assetCategory: "template", assetSource: "manual", assetReusable: true }),
    ],
    character: [
        stage("character-brief", "角色设定说明", CanvasNodeType.Text, "text", "角色说明", "整理角色文字设定。", (brief) => `整理角色设定：${brief}\n\n输出：外貌、发型、服装、配饰、气质、禁止变化、提示词。`),
        stage("character-image", "角色定稿图", CanvasNodeType.Image, "image", "首张定稿", "生成角色定稿图。", (brief) => `生成角色定稿图：${brief}\n\n要求：脸部清晰、服装稳定、可作为后续一致性参考。`, { size: "1024x1360", quality: "high", count: 2 }),
        stage("turnaround", "角色三视图", CanvasNodeType.Image, "image", "一致性锚点", "正侧背三视图。", (brief) => `基于角色定稿图生成三视图：${brief}\n\n正面、侧面、背面全身站姿，同一服装、同一脸型、同一发型。`, { size: "1536x1024", quality: "high", count: 1 }),
    ],
    scene: [
        stage("scene-brief", "场景设定说明", CanvasNodeType.Text, "text", "环境说明", "整理地点、时间、天气、空间。", (brief) => `整理场景设定：${brief}\n\n输出：地点、时间、天气、空间层次、色调、镜头可用角度、提示词。`),
        stage("scene-image", "场景资产图", CanvasNodeType.Image, "image", "环境资产", "生成可复用场景图。", (brief) => `生成场景资产图：${brief}\n\n要求：不出现主要人物，空间清晰，可复用于多个镜头。`, { size: "1824x1024", quality: "high", count: 2 }),
    ],
    storyboard: [
        stage("storyboard", "分镜表", CanvasNodeType.Text, "text", "镜头规划", "把内容拆成镜头表。", (brief) => `请把内容拆成分镜表：${brief}\n\n字段：镜头编号、景别、画面描述、角色动作、台词或旁白、镜头运动、预计秒数、所需参考资产。`),
        stage("keyframe", "关键帧生成", CanvasNodeType.Image, "image", "关键帧", "为分镜生成关键画面。", (brief) => `基于上游分镜生成关键帧。内容：${brief}\n\n要求：构图明确、动作准确、适合转视频。`, { size: "1824x1024", quality: "high", count: 1 }),
        stage("video", "镜头视频", CanvasNodeType.Video, "video", "镜头成片", "根据关键帧生成视频。", (brief) => `基于上游分镜和关键帧生成视频：${brief}\n\n保持主体、场景、服装和镜头方向一致。`, { size: "16:9", seconds: "6", vquality: "720p" }),
        stage("asset-archive", "资产入库", CanvasNodeType.Text, "text", "资产回流", "沉淀分镜、关键帧和视频。", (brief) => `整理本次分镜生产中的可复用资产：${brief}`, { assetCategory: "template", assetSource: "manual", assetReusable: true }),
    ],
    "image-to-video": [
        stage("image-analysis", "参考图分析", CanvasNodeType.Text, "text", "图像理解", "先分析首帧或参考图。", (brief) => `分析选中参考图并整理图生视频要求。补充说明：${brief}\n\n输出：主体、场景、风格、可动区域、禁止改变项、推荐镜头运动。`),
        stage("motion", "运镜设计", CanvasNodeType.Text, "text", "运动规划", "设计镜头运动和动作。", (brief) => `基于参考图分析设计图生视频方案：${brief}\n\n输出：动作、镜头运动、时长、节奏、负面约束。`),
        stage("video", "视频生成", CanvasNodeType.Video, "video", "图生视频", "生成短视频节点。", (brief) => `基于上游参考图和运镜设计生成短视频：${brief}\n\n保持主体、服装、场景一致，不要改变身份和构图。`, { size: "16:9", seconds: "6", vquality: "720p" }),
    ],
    "asset-analysis": [
        stage("asset-analysis", "素材结构化分析", CanvasNodeType.Text, "text", "素材分析", "把素材转成可复用描述。", (brief) => `结构化分析素材：${brief}\n\n输出：主体、外貌或场景、风格、可复用提示词、可作为角色/场景/关键帧的建议、风险点。`),
    ],
    "general-visual": [
        stage("brief", "视觉需求拆解", CanvasNodeType.Text, "text", "需求分析", "先把需求拆成可生产任务。", (brief) => `把这个视觉生产需求拆成可执行计划：${brief}\n\n输出：目标、素材需求、推荐流程、下一步卡片。`),
        stage("image", "图片生成", CanvasNodeType.Image, "image", "视觉产出", "生成首张视觉稿。", (brief) => `基于视觉需求生成首张视觉稿：${brief}`, { size: "1024x1024", quality: "high", count: 1 }),
    ],
};

function stage(key: string, title: string, type: CanvasNodeType, mode: "text" | "image" | "video" | "audio", label: string, description: string, prompt: (brief: string) => string, options: Partial<WorkflowStage> = {}): WorkflowStage {
    return { key, title, type, mode, label, description, prompt: (brief) => enhanceWorkflowPrompt({ key, title, type, mode, label }, prompt(brief)), ...options };
}

function enhanceWorkflowPrompt(stage: Pick<WorkflowStage, "key" | "title" | "type" | "mode" | "label">, basePrompt: string) {
    const base = basePrompt.trim();
    if (stage.mode === "text") return enhanceTextWorkflowPrompt(stage.key, base);
    if (stage.mode === "image") return enhanceImageWorkflowPrompt(stage.key, base);
    if (stage.mode === "video") return enhanceVideoWorkflowPrompt(stage.key, base);
    return base;
}

function enhanceTextWorkflowPrompt(key: string, basePrompt: string) {
    const common = [
        "你是 SceneFlow 的专业视觉制片 Agent，请把用户需求拆成可执行生产资料，不要写空泛建议。",
        "必须优先保证：剧本解析准确、角色一致、场景可复用、分镜可拍、提示词可直接用于生成。",
    ];
    const formats: Record<string, string[]> = {
        brief: ["输出格式：一句话概述、核心冲突、情绪节奏、出场角色、场景地点、关键动作、镜头数量建议、资产清单、下一步建议。"],
        script: ["输出格式：故事梗概、人物关系、场次拆解、核心冲突、视觉风格、可复用资产清单、优先制作片段、风险点。"],
        characters: ["输出角色资产表：角色名、身份定位、外貌锚点、发型、服装、道具、性格气质、关系、三视图需求、一致性禁忌。"],
        "character-brief": ["输出角色设定卡：身份、年龄感、脸部锚点、发型、服装结构、配饰、气质、正向提示词、负面提示词、一致性禁忌。"],
        "character-source": ["每个角色必须在三类来源中选择：新生成、用户已有资产、平台租赁角色。补充选择理由、授权风险、是否值得沉淀为长期资产。"],
        scenes: ["输出场景资产表：地点、时间、天气、空间层次、主要视觉元素、出现频次、可复用镜头角度、所需素材。"],
        "scene-brief": ["输出场景设定卡：地点、时代或类型、天气、空间层次、色调、光影、可用镜头角度、正向提示词、负面提示词。"],
        style: ["输出风格规范：整体画风、时代类型、色调、光影、构图规则、镜头语言、角色一致性禁忌、场景一致性禁忌、通用正向/负面提示词。"],
        storyboard: ["输出 Markdown 分镜表，列名固定为：镜头编号、景别、画面描述、角色动作、台词或旁白、镜头运动、预计秒数、所需参考资产、连续性备注。", "总时长优先控制在 15-30 秒；每个镜头必须能直接拆成关键帧和视频生成任务。"],
        "asset-archive": ["输出资产入库清单：资产名称、资产类型、来源节点、建议标签、授权状态、复用场景、下次项目调用方式。"],
        "asset-analysis": ["输出素材结构化分析：主体、外貌或场景、风格、可复用提示词、可作为角色/场景/关键帧的建议、风险点、禁止改变项。"],
        "image-analysis": ["输出首帧分析：主体、场景、风格、可动区域、不能改变的视觉锚点、推荐镜头运动、视频负面约束。"],
        motion: ["输出运镜方案：起始状态、结束状态、主体动作、镜头运动、节奏、时长、需要保持不变的元素、负面约束。"],
    };
    const specific = formats[key] || ["输出结构化结果，并明确下一步应该生成的卡片、素材或镜头。"];
    return [...common, "", basePrompt, "", ...specific].join("\n");
}

function enhanceImageWorkflowPrompt(key: string, basePrompt: string) {
    const common = [
        basePrompt,
        "",
        "画面生成要求：主体清晰，构图明确，材质和光影稳定，避免文字、水印、畸形肢体、脸部漂移、服装突变。",
        "如果上游提供角色、三视图、场景或风格参考，必须优先保持这些视觉锚点，不要自行换脸、换服装、换时代、换画风。",
    ];
    const specifics: Record<string, string[]> = {
        character: ["角色设定图重点：半身或全身清晰展示脸部、发型、服装结构、配饰和气质；背景保持简洁，方便后续三视图复用。"],
        "character-image": ["角色定稿图重点：脸部辨识度高，服装结构明确，造型不要过度复杂，方便后续保持一致。"],
        turnaround: ["三视图重点：同一角色正面、侧面、背面同屏，全身站姿，比例一致，白底或浅灰底，不要换人，不要换衣服。"],
        scene: ["场景资产重点：不要出现主要人物，空间层次清晰，能作为多个镜头的统一背景资产。"],
        "scene-image": ["场景资产重点：不要出现主要人物，保留可复用空间、天气、色调和镜头角度。"],
        keyframe: ["关键帧重点：只生成一个明确镜头画面，动作瞬间清楚，景别和机位稳定，适合图生视频。"],
        image: ["视觉稿重点：先产出一张可判断方向的高完成度主图。"],
    };
    return [...common, ...(specifics[key] || [])].join("\n");
}

function enhanceVideoWorkflowPrompt(key: string, basePrompt: string) {
    return [
        basePrompt,
        "",
        "视频生成要求：从参考图或上一个镜头状态自然开始，保持角色脸、服装、场景、光线、构图方向一致。",
        "动作要有明确起承转合，镜头运动克制自然；不要突然切场、换脸、换衣服、改变时代风格、生成无意义慢动作。",
        key === "video" ? "如果这是连续镜头，必须把上一镜头尾帧当作第一帧状态，只推进动作和情绪，不重置画面。" : "",
    ]
        .filter(Boolean)
        .join("\n");
}

export function buildWorkflowPlan(input: Record<string, unknown>, snapshot: CanvasAgentSnapshot) {
    const brief = requireString(input.brief, "brief");
    const intent = workflowIntent(input.intent, brief);
    const stages = workflowPresets[intent];
    const existingKinds = new Set(snapshot.nodes.map((node) => node.metadata?.pipelineKind).filter(Boolean));
    const missing = stages.filter((item) => !existingKinds.has(item.key)).map((item) => item.title);
    return {
        intent,
        outputGoal: stringOptional(input.outputGoal) || workflowGoal(intent),
        recommendedStages: stages.map((item) => ({ key: item.key, title: item.title, type: item.type, label: item.label })),
        missingStages: missing,
        nextStep: missing[0] ? `建议先创建「${missing[0]}」流程卡片。` : "当前流程卡片基本完整，可以选择具体节点确认提示词并生成。",
        shouldAutoRun: false,
        reason: "公测阶段默认先创建可确认流程卡片，避免误触发生成和浪费额度。",
        brief,
    };
}

export function workflowPlanMessage(plan: ReturnType<typeof buildWorkflowPlan>) {
    return [`识别意图：${intentLabel(plan.intent)}`, `目标：${plan.outputGoal}`, `推荐流程：${plan.recommendedStages.map((item) => item.title).join(" -> ")}`, `缺失阶段：${plan.missingStages.length ? plan.missingStages.join("、") : "无"}`, plan.nextStep].join("\n");
}

function workflowCardOps(input: Record<string, unknown>, snapshot: CanvasAgentSnapshot, config: AiConfig): CanvasAgentOp[] {
    const brief = requireString(input.brief, "brief");
    const intent = workflowIntent(input.intent, brief);
    const stages = workflowPresets[intent];
    const x = numberOr(input.x, nextCanvasX(snapshot));
    const y = numberOr(input.y, 0);
    const existingNodeIds = new Set(snapshot.nodes.map((node) => node.id));
    const sourceNodeId = stringOptional(input.sourceNodeId) ? requireExistingNodeId(input.sourceNodeId, "sourceNodeId", existingNodeIds) : "";
    const referenceNodeIds = Array.isArray(input.referenceNodeIds) ? requireExistingNodeIds(input.referenceNodeIds, "referenceNodeIds", existingNodeIds) : [];
    const stageNodeIds = stages.map((item) => `${item.key}-${nanoid(6)}`);
    const nodeIdByStageKey = new Map(stages.map((item, index) => [item.key, stageNodeIds[index]]));
    const ops: CanvasAgentOp[] = stages.map((item, index) => {
        const stageReferenceNodeIds = workflowStageReferenceKeys(intent, item.key)
            .map((key) => nodeIdByStageKey.get(key))
            .filter((id): id is string => Boolean(id));
        const externalReferenceNodeIds = workflowStageUsesExternalReferences(intent, item.key, index) ? [sourceNodeId, ...referenceNodeIds].filter((id): id is string => Boolean(id && snapshot.nodes.some((node) => node.id === id))) : [];
        const promptReferenceNodeIds = uniqueStrings([...externalReferenceNodeIds, ...stageReferenceNodeIds]);
        const prompt = withNodeReferenceTokens(item.prompt(brief), promptReferenceNodeIds);
        const metadata: CanvasNodeData["metadata"] = cleanRecord({
            content: "",
            prompt,
            composerContent: prompt,
            status: "idle",
            pipelineRunStatus: "waiting",
            generationMode: item.mode,
            pipelineKind: item.key,
            pipelineLabel: item.label,
            pipelineDescription: item.description,
            assetCategory: item.assetCategory || assetCategoryForPipeline(item.key, item.type),
            assetSource: item.assetSource || (item.type === CanvasNodeType.Image || item.type === CanvasNodeType.Video || item.type === CanvasNodeType.Audio ? "generate" : "manual"),
            assetReusable: item.assetReusable,
            assetLicense: item.assetSource === "platform-rental" ? "rented" : item.assetSource === "platform-preset" ? "platform" : "private",
            model: item.mode ? defaultGenerationModel(config, item.mode) : undefined,
            size: item.size || config.size,
            quality: item.quality || config.quality,
            count: item.count,
            seconds: item.seconds || config.videoSeconds,
            vquality: item.vquality || config.vquality,
            references: promptReferenceNodeIds.length ? promptReferenceNodeIds : undefined,
        }) as CanvasNodeData["metadata"];
        return {
            type: "add_node",
            id: stageNodeIds[index],
            nodeType: item.type,
            title: item.title,
            position: { x: x + index * 420, y: y + (index % 2) * 320 },
            width: item.width || NODE_DEFAULT_SIZE[item.type].width,
            height: item.height || NODE_DEFAULT_SIZE[item.type].height,
            metadata,
        };
    });
    const connectionOps: CanvasAgentOp[] = [];
    const pushConnection = (fromNodeId: string | undefined, toNodeId: string | undefined) => {
        if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) return;
        if (connectionOps.some((op) => op.type === "connect_nodes" && op.fromNodeId === fromNodeId && op.toNodeId === toNodeId)) return;
        connectionOps.push({ type: "connect_nodes", fromNodeId, toNodeId });
    };
    if (sourceNodeId) pushConnection(sourceNodeId, stageNodeIds[0]);
    referenceNodeIds.forEach((id) => pushConnection(id, stageNodeIds[0]));
    stageNodeIds.slice(0, -1).forEach((fromNodeId, index) => pushConnection(fromNodeId, stageNodeIds[index + 1]));
    stages.forEach((item, index) => {
        workflowStageReferenceKeys(intent, item.key)
            .map((key) => nodeIdByStageKey.get(key))
            .forEach((fromNodeId) => pushConnection(fromNodeId, stageNodeIds[index]));
        if (workflowStageUsesExternalReferences(intent, item.key, index)) {
            if (sourceNodeId) pushConnection(sourceNodeId, stageNodeIds[index]);
            referenceNodeIds.forEach((id) => pushConnection(id, stageNodeIds[index]));
        }
    });
    return [...ops, ...connectionOps, { type: "select_nodes", ids: [stageNodeIds[0]] }];
}

function withNodeReferenceTokens(prompt: string, nodeIds: string[]) {
    if (!nodeIds.length) return prompt;
    return `${prompt.trim()}\n\n上游引用：\n${nodeIds.map((id) => `@[node:${id}]`).join("\n")}`;
}

function workflowStageReferenceKeys(intent: VisualWorkflowIntent, key: string) {
    const map: Partial<Record<VisualWorkflowIntent, Record<string, string[]>>> = {
        "fragment-video": {
            "character-source": ["brief"],
            character: ["brief", "character-source"],
            turnaround: ["character"],
            scene: ["brief"],
            style: ["brief", "character", "turnaround", "scene"],
            storyboard: ["brief", "character-source", "turnaround", "scene", "style"],
            keyframe: ["storyboard", "turnaround", "scene", "style"],
            video: ["keyframe", "turnaround", "scene", "style", "storyboard"],
            "asset-archive": ["brief", "character", "turnaround", "scene", "style", "storyboard", "keyframe", "video"],
        },
        "full-script": {
            characters: ["script"],
            scenes: ["script"],
            storyboard: ["script", "characters", "scenes"],
            keyframe: ["storyboard", "characters", "scenes"],
            video: ["keyframe", "storyboard", "characters", "scenes"],
            "asset-archive": ["script", "characters", "scenes", "storyboard", "keyframe", "video"],
        },
        character: {
            "character-image": ["character-brief"],
            turnaround: ["character-brief", "character-image"],
        },
        scene: {
            "scene-image": ["scene-brief"],
        },
        storyboard: {
            keyframe: ["storyboard"],
            video: ["storyboard", "keyframe"],
            "asset-archive": ["storyboard", "keyframe", "video"],
        },
        "image-to-video": {
            motion: ["image-analysis"],
            video: ["image-analysis", "motion"],
        },
        "general-visual": {
            image: ["brief"],
        },
    };
    return map[intent]?.[key] || [];
}

function workflowStageUsesExternalReferences(intent: VisualWorkflowIntent, key: string, index: number) {
    if (index === 0) return true;
    if (intent === "image-to-video" && key === "video") return true;
    return false;
}

function uniqueStrings(values: string[]) {
    return Array.from(new Set(values));
}

function referenceAnalysisOps(input: Record<string, unknown>, snapshot: CanvasAgentSnapshot): CanvasAgentOp[] {
    const nodeId = requireString(input.nodeId, "nodeId");
    const source = snapshot.nodes.find((node) => node.id === nodeId);
    if (!source) throw new Error("找不到要分析的参考图节点");
    const brief = stringOptional(input.brief);
    const analysisType = stringOptional(input.analysisType) || "auto";
    const x = numberOr(input.x, source.position.x + source.width + 96);
    const y = numberOr(input.y, source.position.y);
    const id = `analysis-${nanoid(6)}`;
    const text = [
        `参考图分析类型：${analysisType}`,
        brief ? `补充说明：${brief}` : "",
        "",
        "请基于连接的参考图输出结构化分析：",
        "1. 主体、角色或场景是什么",
        "2. 外貌、服装、发型、道具或环境元素",
        "3. 画风、色调、构图、镜头语言",
        "4. 可复用提示词",
        "5. 后续可创建的卡片：角色设定、三视图、场景设定、关键帧或图生视频",
        "6. 一致性风险和禁止改变项",
    ].filter(Boolean).join("\n");
    return [
        {
            type: "add_node",
            id,
            nodeType: CanvasNodeType.Text,
            title: "参考图分析",
            position: { x, y },
            width: 380,
            height: 260,
            metadata: { content: text, status: "success", fontSize: 14, pipelineKind: "asset-analysis", pipelineLabel: "素材分析", pipelineDescription: "把参考图转成可复用视觉设定。" },
        },
        { type: "connect_nodes", fromNodeId: nodeId, toNodeId: id },
        { type: "select_nodes", ids: [id] },
    ];
}

function assetCategoryForPipeline(key: string, type: CanvasNodeType): NonNullable<WorkflowStage["assetCategory"]> {
    if (key === "character" || key === "character-image") return "character";
    if (key === "turnaround") return "character-turnaround";
    if (key === "scene" || key === "scene-image") return "scene";
    if (key === "style") return "style";
    if (key === "storyboard") return "storyboard";
    if (key === "keyframe") return "keyframe";
    if (key === "video") return "video-shot";
    if (key === "asset-archive") return "template";
    if (type === CanvasNodeType.Text) return "prompt";
    if (type === CanvasNodeType.Image) return "reference";
    return "general";
}

function workflowIntent(value: unknown, brief: string): VisualWorkflowIntent {
    if (value === "fragment-video" || value === "full-script" || value === "character" || value === "scene" || value === "storyboard" || value === "image-to-video" || value === "asset-analysis" || value === "general-visual") return value;
    const text = brief.toLowerCase();
    if (/图生视频|首帧|尾帧|运镜|动起来|视频/.test(brief)) return "image-to-video";
    if (/完整剧本|剧本|长篇|全集|多场|分集/.test(brief) && brief.length > 80) return "full-script";
    if (/分镜|镜头|镜头表|storyboard/.test(text)) return "storyboard";
    if (/角色|人物|三视图|设定/.test(brief)) return "character";
    if (/场景|环境|地点|空间/.test(brief)) return "scene";
    if (/片段|一段|打斗|名场面|pk|PK|动作戏|短片/.test(brief)) return "fragment-video";
    if (/参考图|素材|图片|分析/.test(brief)) return "asset-analysis";
    return "general-visual";
}

function workflowGoal(intent: VisualWorkflowIntent) {
    if (intent === "fragment-video") return "制作一段可进入图生视频的短片流程";
    if (intent === "full-script") return "把外部剧本拆成可生产的角色、场景和分镜资产";
    if (intent === "character") return "建立稳定角色设定和三视图";
    if (intent === "scene") return "建立可复用场景资产";
    if (intent === "storyboard") return "输出可执行分镜表和关键帧流程";
    if (intent === "image-to-video") return "把参考图转成视频生成流程";
    if (intent === "asset-analysis") return "把素材转成结构化视觉设定";
    return "拆解视觉生产任务并创建下一步卡片";
}

function intentLabel(intent: VisualWorkflowIntent) {
    if (intent === "fragment-video") return "片段视频";
    if (intent === "full-script") return "完整剧本";
    if (intent === "character") return "角色创建";
    if (intent === "scene") return "场景创建";
    if (intent === "storyboard") return "分镜规划";
    if (intent === "image-to-video") return "图生视频";
    if (intent === "asset-analysis") return "素材分析";
    return "通用视觉生产";
}

function textNodeOp(input: Record<string, unknown>, x: number, y: number): CanvasAgentOp {
    return { type: "add_node", id: stringOptional(input.id), nodeType: CanvasNodeType.Text, title: stringOptional(input.title), position: { x, y }, width: numberOptional(input.width), height: numberOptional(input.height), metadata: { content: stringOptional(input.text), status: "success", fontSize: 14 } };
}

function configNodeOp(id: string, input: Record<string, unknown>, x: number, y: number, config: AiConfig): CanvasAgentOp {
    const mode = generationMode(input.mode);
    const prompt = stringOptional(input.prompt);
    return {
        type: "add_node",
        id,
        nodeType: CanvasNodeType.Config,
        title: stringOptional(input.title) || generationTitle(mode),
        position: { x, y },
        width: numberOptional(input.width),
        height: numberOptional(input.height),
        metadata: cleanRecord({
            generationMode: mode,
            composerContent: prompt,
            prompt,
            status: "idle",
            model: resolveGenerationModel(config, mode, stringOptional(input.model)),
            size: stringOptional(input.size) || config.size,
            quality: stringOptional(input.quality) || config.quality,
            count: numberOptional(input.count) ?? generationCount(mode === "image" ? config.canvasImageCount || config.count : config.count),
            seconds: stringOptional(input.seconds) || config.videoSeconds,
            vquality: stringOptional(input.vquality) || config.vquality,
            generateAudio: stringOptional(input.generateAudio) || config.videoGenerateAudio,
            watermark: stringOptional(input.watermark) || config.videoWatermark,
            audioVoice: stringOptional(input.audioVoice) || config.audioVoice,
            audioFormat: stringOptional(input.audioFormat) || config.audioFormat,
            audioSpeed: stringOptional(input.audioSpeed) || config.audioSpeed,
            audioInstructions: stringOptional(input.audioInstructions) || config.audioInstructions,
        }) as CanvasNodeData["metadata"],
    };
}

function runGenerationOp(nodeId: string, mode: "text" | "image" | "video" | "audio", prompt?: string): CanvasAgentOp {
    return { type: "run_generation", nodeId, mode, prompt };
}

function validateOpsAgainstSnapshot(ops: CanvasAgentOp[], snapshot: CanvasAgentSnapshot) {
    const nodeIds = new Set(snapshot.nodes.map((node) => node.id));
    ops.forEach((op) => {
        if (op.type === "update_node") requireExistingNodeId(op.id, "id", nodeIds);
        if (op.type === "delete_node") {
            const ids = [...(op.ids || []), ...(op.id ? [op.id] : [])];
            if (ids.length) requireExistingNodeIds(ids, "ids", nodeIds);
        }
        if (op.type === "connect_nodes") {
            requireExistingNodeId(op.fromNodeId, "fromNodeId", nodeIds);
            requireExistingNodeId(op.toNodeId, "toNodeId", nodeIds);
        }
        if (op.type === "select_nodes") requireExistingNodeIds(op.ids, "ids", nodeIds);
        if (op.type === "run_generation") requireExistingNodeId(op.nodeId, "nodeId", nodeIds);
        if (op.type === "run_pipeline") requireExistingNodeIds(op.nodeIds, "nodeIds", nodeIds);
        if (op.type === "continue_video") requireExistingNodeId(op.nodeId, "nodeId", nodeIds);
    });
}

function requireExistingNodeId(value: unknown, field: string, nodeIds: Set<string>) {
    const id = requireString(value, field);
    if (!nodeIds.has(id)) throw new Error(`${field} 指向的节点不存在：${id}。请先读取画布状态，使用真实节点 id。`);
    return id;
}

function requireExistingNodeIds(value: unknown, field: string, nodeIds: Set<string>) {
    const ids = requireStringArray(value, field);
    const missing = ids.filter((id) => !nodeIds.has(id));
    if (missing.length) throw new Error(`${field} 包含不存在的节点：${missing.join(", ")}。请先读取画布状态，使用真实节点 id。`);
    return ids;
}

function requireStringArray(value: unknown, field: string): string[] {
    if (!Array.isArray(value)) throw new Error(`${field} 必须是字符串数组`);
    if (!value.every((item) => typeof item === "string" && Boolean(item))) throw new Error(`${field} 只能包含非空字符串`);
    return value as string[];
}

function requireOps(value: unknown): CanvasAgentOp[] {
    if (!Array.isArray(value)) throw new Error("ops 必须是数组");
    return value.map(toCanvasAgentOp);
}

function toCanvasAgentOp(value: unknown): CanvasAgentOp {
    const item = objectDetail(value);
    const type = item.type;
    if (type === "add_node") {
        return {
            type,
            id: stringOptional(item.id),
            nodeType: item.nodeType ? requireNodeType(item.nodeType) : undefined,
            title: stringOptional(item.title),
            position: recordOptional(item.position) ? { x: requireNumber(objectDetail(item.position).x, "position.x"), y: requireNumber(objectDetail(item.position).y, "position.y") } : undefined,
            x: numberOptional(item.x),
            y: numberOptional(item.y),
            width: numberOptional(item.width),
            height: numberOptional(item.height),
            metadata: recordOptional(item.metadata) as CanvasNodeData["metadata"],
        };
    }
    if (type === "update_node") return { type, id: requireString(item.id, "id"), patch: recordOptional(item.patch) as Partial<CanvasNodeData> | undefined, metadata: recordOptional(item.metadata) as CanvasNodeData["metadata"] };
    if (type === "delete_node") return { type, id: stringOptional(item.id), ids: Array.isArray(item.ids) ? requireStringArray(item.ids, "ids") : undefined };
    if (type === "delete_connections") return { type, id: stringOptional(item.id), ids: Array.isArray(item.ids) ? requireStringArray(item.ids, "ids") : undefined, all: typeof item.all === "boolean" ? item.all : undefined };
    if (type === "connect_nodes") return { type, id: stringOptional(item.id), fromNodeId: requireString(item.fromNodeId, "fromNodeId"), toNodeId: requireString(item.toNodeId, "toNodeId") };
    if (type === "set_viewport") return { type, viewport: requireViewport(item.viewport) };
    if (type === "select_nodes") return { type, ids: requireStringArray(item.ids, "ids") };
    if (type === "run_generation") return { type, nodeId: requireString(item.nodeId, "nodeId"), mode: generationMode(item.mode), prompt: stringOptional(item.prompt) };
    throw new Error("不支持的画布操作类型");
}

function requireRecordArray(value: unknown, field: string): Record<string, unknown>[] {
    if (!Array.isArray(value)) throw new Error(`${field} 必须是数组`);
    return value.map((item) => {
        const record = objectDetail(item);
        if (!Object.keys(record).length) throw new Error(`${field} 只能包含对象`);
        return record;
    });
}

function requireString(value: unknown, field: string) {
    if (typeof value !== "string" || !value) throw new Error(`${field} 必须是非空字符串`);
    return value;
}

function requireNumber(value: unknown, field: string) {
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${field} 必须是数字`);
    return value;
}

function requireNodeType(value: unknown): CanvasNodeType {
    if (Object.values(CanvasNodeType).includes(value as CanvasNodeType)) return value as CanvasNodeType;
    throw new Error("节点类型必须是 text、image、config、video 或 audio");
}

function requireViewport(value: unknown) {
    const item = objectDetail(value);
    return { x: requireNumber(item.x, "viewport.x"), y: requireNumber(item.y, "viewport.y"), k: requireNumber(item.k, "viewport.k") };
}

function recordOptional(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function stringOptional(value: unknown) {
    return typeof value === "string" ? value : "";
}

function numberOptional(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function numberOr(value: unknown, fallback: number) {
    return numberOptional(value) ?? fallback;
}

function nextCanvasX(snapshot: CanvasAgentSnapshot) {
    return snapshot.nodes.length ? Math.max(...snapshot.nodes.map((node) => node.position.x + node.width)) + 80 : 0;
}

function generationMode(value: unknown): "text" | "image" | "video" | "audio" {
    return value === "text" || value === "video" || value === "audio" ? value : "image";
}

function generationTitle(mode: "text" | "image" | "video" | "audio") {
    if (mode === "text") return "文本生成";
    if (mode === "video") return "视频生成";
    if (mode === "audio") return "音频生成";
    return "图片生成";
}

function defaultGenerationModel(config: AiConfig, mode: "text" | "image" | "video" | "audio") {
    if (mode === "image") return config.imageModel || config.model;
    if (mode === "video") return config.videoModel || config.model;
    if (mode === "audio") return config.audioModel || config.model;
    return config.textModel || config.model;
}

function resolveGenerationModel(config: AiConfig, mode: "text" | "image" | "video" | "audio", model?: string) {
    const normalized = normalizeModelOptionValue(model, config.channels);
    return normalized && selectableModelsByCapability(config, mode).includes(normalized) ? normalized : defaultGenerationModel(config, mode);
}

function generationCount(value: string) {
    return Math.max(1, Math.min(15, Math.floor(Math.abs(Number(value)) || 1)));
}

function cleanRecord(value: Record<string, unknown>) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== ""));
}

export function snapshotSignature(snapshot: CanvasAgentSnapshot) {
    return JSON.stringify({ nodes: snapshot.nodes, connections: snapshot.connections, selectedNodeIds: snapshot.selectedNodeIds, viewport: snapshot.viewport });
}

export function explainNoop(ops: CanvasAgentOp[], snapshot: CanvasAgentSnapshot) {
    if (!ops.length) return "没有可执行的画布操作";
    const nodeIds = new Set(snapshot.nodes.map((node) => node.id));
    const connectionIds = new Set(snapshot.connections.map((conn) => conn.id));
    const deleteConnectionOps = ops.filter((op): op is Extract<CanvasAgentOp, { type: "delete_connections" }> => op.type === "delete_connections");
    const connectOps = ops.filter((op): op is Extract<CanvasAgentOp, { type: "connect_nodes" }> => op.type === "connect_nodes");
    const deleteNodeOps = ops.filter((op): op is Extract<CanvasAgentOp, { type: "delete_node" }> => op.type === "delete_node");
    const updateOps = ops.filter((op): op is Extract<CanvasAgentOp, { type: "update_node" }> => op.type === "update_node");
    const selectOps = ops.filter((op): op is Extract<CanvasAgentOp, { type: "select_nodes" }> => op.type === "select_nodes");
    const generationOps = ops.filter((op): op is Extract<CanvasAgentOp, { type: "run_generation" }> => op.type === "run_generation");
    if (deleteConnectionOps.length && !snapshot.connections.length) return "当前画布没有可删除的连接";
    if (deleteConnectionOps.length && deleteConnectionOps.every((op) => !op.all && [...(op.ids || []), ...(op.id ? [op.id] : [])].every((id) => !connectionIds.has(id)))) return "要删除的连接不存在";
    if (connectOps.length && connectOps.every((op) => snapshot.connections.some((conn) => conn.fromNodeId === op.fromNodeId && conn.toNodeId === op.toNodeId))) return "这些节点之间已经存在连接";
    if (connectOps.length && connectOps.every((op) => !nodeIds.has(op.fromNodeId) || !nodeIds.has(op.toNodeId))) return "连接涉及的节点不存在";
    if (deleteNodeOps.length && deleteNodeOps.every((op) => op.nodeType === CanvasNodeType.Config) && !snapshot.nodes.some((node) => node.type === CanvasNodeType.Config)) return "当前画布没有生成配置节点";
    if (deleteNodeOps.length && deleteNodeOps.every((op) => [...(op.ids || []), ...(op.id ? [op.id] : [])].every((id) => !nodeIds.has(id)))) return "要删除的节点不存在";
    if (updateOps.length && updateOps.every((op) => !nodeIds.has(op.id))) return "要更新的节点不存在";
    if (selectOps.length && selectOps.every((op) => !(op.ids || []).some((id) => nodeIds.has(id)))) return "要选择的节点不存在";
    if (generationOps.length && generationOps.every((op) => !nodeIds.has(op.nodeId))) return "要生成的节点不存在";
    if (ops.every((op) => op.type === "set_viewport")) return "视图已经完成调整";
    if (selectOps.length && selectOps.every((op) => JSON.stringify(op.ids || []) === JSON.stringify(snapshot.selectedNodeIds))) return "节点已处于选中状态";
    return "工具已执行，但画布状态没有明显变化；请查看日志确认细节。";
}

export function compactSnapshot(snapshot: CanvasAgentSnapshot) {
    return {
        title: snapshot.title,
        viewport: snapshot.viewport,
        selectedNodeIds: snapshot.selectedNodeIds,
        nodes: snapshot.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            title: node.title,
            position: node.position,
            width: node.width,
            height: node.height,
            metadata: compactMetadata(node.metadata || {}),
        })),
        connections: snapshot.connections,
    };
}

function compactMetadata(metadata: CanvasNodeData["metadata"]) {
    return {
        content: String(metadata?.content || "").slice(0, 500),
        prompt: String(metadata?.prompt || metadata?.composerContent || "").slice(0, 500),
        status: metadata?.status,
        generationMode: metadata?.generationMode,
        model: metadata?.model,
        size: metadata?.size,
    };
}

