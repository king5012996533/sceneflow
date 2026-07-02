import { nanoid } from "nanoid";

import type { AiConfig } from "@/stores/use-config-store";
import { CanvasNodeType, type CanvasConnection, type CanvasNodeData, type CanvasNodeMetadata, type Position } from "../types";

export type MangaPipelineKind = "source" | "scene-plan" | "character" | "character-sheet" | "scene" | "storyboard" | "shot-image" | "shot-video";

type MangaWorkflowTemplate = {
    kind: MangaPipelineKind;
    type: CanvasNodeType;
    title: string;
    label: string;
    description: string;
    x: number;
    y: number;
    width: number;
    height: number;
    metadata: CanvasNodeMetadata;
};

const templates: MangaWorkflowTemplate[] = [
    {
        kind: "source",
        type: CanvasNodeType.Text,
        title: "外部剧本 / 片段",
        label: "剧本输入",
        description: "粘贴完整剧本、单场戏或一句创意，不限制来源。",
        x: -900,
        y: -120,
        width: 360,
        height: 240,
        metadata: {
            content: "在这里粘贴你的剧本、片段或一句场面描述。例如：东方不败与风清扬在竹林中交手，剑气纵横，节奏紧张。",
            status: "success",
            fontSize: 15,
            generationMode: "text",
        },
    },
    {
        kind: "scene-plan",
        type: CanvasNodeType.Text,
        title: "片段策划",
        label: "结构拆解",
        description: "把输入内容拆成角色、情绪、冲突、镜头节奏和关键画面。",
        x: -480,
        y: -120,
        width: 360,
        height: 240,
        metadata: {
            prompt: "请把上游剧本或片段拆成漫剧制作策划。输出：一句话概述、出场角色、场景地点、情绪节奏、关键动作、镜头数量建议、需要生成的资产清单。只输出可执行清单。",
            generationMode: "text",
            status: "idle",
        },
    },
    {
        kind: "character",
        type: CanvasNodeType.Image,
        title: "人物创建",
        label: "角色设定",
        description: "生成角色首张定稿图，确定脸、服装、发型、气质。",
        x: -60,
        y: -260,
        width: 340,
        height: 240,
        metadata: {
            prompt: "根据上游片段策划，生成主要角色的正面半身设定图。要求：东方武侠漫剧风格，面部特征清晰，服装结构明确，发型和配饰稳定，可作为后续三视图一致性参考。",
            generationMode: "image",
            status: "idle",
            size: "1024x1360",
            quality: "high",
            count: 2,
        },
    },
    {
        kind: "character-sheet",
        type: CanvasNodeType.Image,
        title: "人物三视图",
        label: "一致性锚点",
        description: "正面、侧面、背面同屏，用作角色一致性参考。",
        x: 360,
        y: -260,
        width: 380,
        height: 260,
        metadata: {
            prompt: "基于上游人物定稿图，生成同一角色三视图设定表。要求：正面、侧面、背面全身站姿，同一服装、同一脸型、同一发型、同一配饰；白底或浅灰底；不要换人、不要多余角色、不要剧情动作。",
            generationMode: "image",
            status: "idle",
            size: "1536x1024",
            quality: "high",
            count: 1,
        },
    },
    {
        kind: "scene",
        type: CanvasNodeType.Image,
        title: "场景资产",
        label: "环境设定",
        description: "生成竹林、屋檐、山崖等场景基准图。",
        x: -60,
        y: 100,
        width: 340,
        height: 240,
        metadata: {
            prompt: "根据上游片段策划，生成漫剧场景资产图。要求：明确地点、时间、天气、空间层次、可重复用于多个镜头；画面不要出现主要人物。",
            generationMode: "image",
            status: "idle",
            size: "1824x1024",
            quality: "high",
            count: 2,
        },
    },
    {
        kind: "storyboard",
        type: CanvasNodeType.Text,
        title: "分镜表",
        label: "镜头规划",
        description: "把片段拆成镜头表，包含景别、动作、台词、时长。",
        x: 360,
        y: 100,
        width: 380,
        height: 260,
        metadata: {
            prompt: "请根据片段策划、人物和场景资产，输出漫剧分镜表。每个镜头包含：镜头编号、景别、画面描述、角色动作、台词/旁白、镜头运动、预计秒数、所需参考资产。控制在 6-10 个镜头。",
            generationMode: "text",
            status: "idle",
        },
    },
    {
        kind: "shot-image",
        type: CanvasNodeType.Image,
        title: "镜头画面",
        label: "关键帧",
        description: "根据分镜生成单个镜头关键帧。",
        x: 820,
        y: -80,
        width: 360,
        height: 240,
        metadata: {
            prompt: "基于上游分镜表、人物三视图和场景资产，生成一个镜头关键帧。要求：角色一致、构图明确、动作准确、适合转视频；不要出现多余肢体、不要换服装、不要换脸。",
            generationMode: "image",
            status: "idle",
            size: "1824x1024",
            quality: "high",
            count: 1,
        },
    },
    {
        kind: "shot-video",
        type: CanvasNodeType.Video,
        title: "镜头视频",
        label: "图生视频",
        description: "用关键帧生成单镜头视频，可逐镜头批量制作。",
        x: 1260,
        y: -80,
        width: 420,
        height: 236,
        metadata: {
            prompt: "基于上游镜头关键帧生成短视频。要求：保持角色脸、服装、场景一致；动作自然、有镜头运动；不要大幅改变构图；适合漫剧剪辑。",
            generationMode: "video",
            status: "idle",
            size: "16:9",
            seconds: "6",
            vquality: "720p",
            generateAudio: "false",
            watermark: "false",
        },
    },
];

const workflowEdges: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [1, 4],
    [1, 5],
    [3, 5],
    [4, 5],
    [3, 6],
    [4, 6],
    [5, 6],
    [6, 7],
];

export function createMangaWorkflow(center: Position, config: AiConfig): { nodes: CanvasNodeData[]; connections: CanvasConnection[] } {
    const nodeIds = templates.map((template) => `${template.kind}-${Date.now()}-${nanoid(5)}`);
    const nodes = templates.map((template, index): CanvasNodeData => {
        const metadata: CanvasNodeMetadata = {
            ...template.metadata,
            pipelineKind: template.kind,
            pipelineLabel: template.label,
            pipelineDescription: template.description,
            model: template.type === CanvasNodeType.Image ? config.imageModel || config.model : template.type === CanvasNodeType.Video ? config.videoModel || config.model : template.type === CanvasNodeType.Text ? config.textModel || config.model : config.model,
        };

        return {
            id: nodeIds[index],
            type: template.type,
            title: template.title,
            position: { x: center.x + template.x, y: center.y + template.y },
            width: template.width,
            height: template.height,
            metadata,
        };
    });
    const connections = workflowEdges.map(([from, to]) => ({
        id: `conn-${Date.now()}-${nanoid(5)}`,
        fromNodeId: nodeIds[from],
        toNodeId: nodeIds[to],
    }));

    return { nodes, connections };
}
