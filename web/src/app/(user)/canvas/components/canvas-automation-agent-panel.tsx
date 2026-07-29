"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button, Switch } from "antd";
import { CheckCircle2, FileText, ImageIcon, ListChecks, Music2, Play, Video, WandSparkles } from "lucide-react";
import { nanoid } from "nanoid";

import type { AiConfig } from "@/stores/use-config-store";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { NODE_DEFAULT_SIZE } from "../constants";
import { CanvasNodeType, type CanvasNodeData } from "../types";
import type { CanvasAgentOp, CanvasAgentSnapshot } from "../utils/canvas-agent-ops";
import { summarizeCanvasAgentOps } from "../utils/canvas-agent-ops";

type CanvasAutomationAgentPanelProps = {
    snapshot: CanvasAgentSnapshot;
    config: AiConfig;
    onApplyOps: (ops: CanvasAgentOp[]) => CanvasAgentSnapshot;
};

type AutomationPlan = {
    title: string;
    summary: string;
    resources: AutomationResource[];
    shots: string[];
    ops: CanvasAgentOp[];
    runNodeIds: string[];
};

type AutomationResource = {
    id: string;
    type: CanvasNodeType.Image | CanvasNodeType.Video | CanvasNodeType.Audio | CanvasNodeType.Text;
    label: string;
    role: string;
    title: string;
};

const SAMPLE_PROMPT = `素材准备：
@图片 1：女主半身照
@图片 2：宿舍场景参考图
@视频 1：室内对话运镜参考
@音频 1：室内环境声或轻音乐

提示词：
@图片 1 中的女孩作为主角，@图片 2 作为宿舍场景风格参考，参考 @视频 1 的运镜方式。
镜头 1：傍晚时分，女孩脚步轻快地走到宿舍门口，镜头中景平稳跟拍，暖黄色日光从窗外洒进走廊。
镜头 2：女孩推开门走进宿舍，镜头切到室内中景，舍友们一边整理书本一边抬头看向她。
镜头 3：女孩先低头露出落寞表情，随后抬头憋不住笑意，舍友们追着打闹起来，镜头缓慢拉远。`;

export function CanvasAutomationAgentPanel({ snapshot, config, onApplyOps }: CanvasAutomationAgentPanelProps) {
    const themeName = useThemeStore((state) => state.theme);
    const theme = themeName === "dark" ? canvasThemes.dark : canvasThemes.light;
    const [prompt, setPrompt] = useState("");
    const [autoRun, setAutoRun] = useState(false);
    const [plan, setPlan] = useState<AutomationPlan | null>(null);
    const [applied, setApplied] = useState(false);

    const resourceCounts = useMemo(() => countResources(snapshot.nodes), [snapshot.nodes]);

    const buildPlan = () => {
        const text = prompt.trim();
        if (!text) return;
        const nextPlan = buildVideoShotAutomationPlan(text, snapshot, config, autoRun);
        setPlan(nextPlan);
        setApplied(false);
    };

    const executePlan = () => {
        if (!plan) return;
        onApplyOps(plan.ops);
        setApplied(true);
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="thin-scrollbar flex-1 space-y-4 overflow-auto p-4">
                <section className="rounded-lg border p-3" style={{ borderColor: theme.node.stroke, background: theme.toolbar.panel }}>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <WandSparkles className="size-4" />
                        自动化创作执行器
                    </div>
                    <p className="mt-2 text-xs leading-5" style={{ color: theme.node.muted }}>
                        输入一个创作目标，Agent 会读取当前画布素材，自动搭建视频镜头工作流、写入引用提示词、建立连线。需要时可以直接触发生成。
                    </p>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                        <ResourceStat icon={<ImageIcon className="size-3.5" />} label="图片" value={resourceCounts.image} theme={theme} />
                        <ResourceStat icon={<Video className="size-3.5" />} label="视频" value={resourceCounts.video} theme={theme} />
                        <ResourceStat icon={<Music2 className="size-3.5" />} label="音频" value={resourceCounts.audio} theme={theme} />
                        <ResourceStat icon={<FileText className="size-3.5" />} label="文本" value={resourceCounts.text} theme={theme} />
                    </div>
                </section>

                <section className="space-y-3">
                    <textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        placeholder="描述你要自动搭建的创作任务。可以使用 @图片 1、@视频 1、@音频 1 这类自然引用，也可以直接粘贴官方格式提示词。"
                        className="thin-scrollbar min-h-44 w-full resize-none rounded-xl border bg-transparent p-3 text-sm leading-6 outline-none"
                        style={{ borderColor: theme.node.stroke, color: theme.node.text }}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <button type="button" className="text-xs underline-offset-2 hover:underline" style={{ color: theme.node.muted }} onClick={() => setPrompt(SAMPLE_PROMPT)}>
                            填入示例
                        </button>
                        <label className="flex items-center gap-2 text-xs" style={{ color: theme.node.muted }}>
                            <Switch size="small" checked={autoRun} onChange={setAutoRun} />
                            执行后立即生成视频
                        </label>
                    </div>
                    <Button type="primary" block icon={<ListChecks className="size-4" />} disabled={!prompt.trim()} onClick={buildPlan}>
                        生成自动化计划
                    </Button>
                </section>

                {plan ? (
                    <section className="space-y-3 rounded-lg border p-3" style={{ borderColor: theme.node.stroke, background: theme.node.fill }}>
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="text-sm font-semibold">{plan.title}</div>
                                <div className="mt-1 text-xs leading-5" style={{ color: theme.node.muted }}>
                                    {plan.summary}
                                </div>
                            </div>
                            {applied ? <CheckCircle2 className="size-5 shrink-0 text-emerald-500" /> : null}
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs font-medium">引用素材</div>
                            {plan.resources.length ? (
                                <div className="grid gap-2">
                                    {plan.resources.map((resource) => (
                                        <div key={resource.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs" style={{ borderColor: theme.node.stroke }}>
                                            <span className="font-medium">{resource.label}</span>
                                            <span className="min-w-0 flex-1 truncate" style={{ color: theme.node.muted }}>
                                                {resource.role} · {resource.title}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-md border px-2 py-2 text-xs" style={{ borderColor: theme.node.stroke, color: theme.node.muted }}>
                                    未检测到可引用素材。仍会创建脚本和视频配置节点，你可以之后手动接入素材。
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs font-medium">镜头拆分</div>
                            {plan.shots.map((shot, index) => (
                                <div key={index} className="rounded-md border px-2 py-2 text-xs leading-5" style={{ borderColor: theme.node.stroke }}>
                                    {shot}
                                </div>
                            ))}
                        </div>

                        <div className="rounded-md border px-2 py-2 text-xs" style={{ borderColor: theme.node.stroke, color: theme.node.muted }}>
                            操作：{summarizeCanvasAgentOps(plan.ops) || "无"}
                        </div>
                        <Button type="primary" block icon={<Play className="size-4" />} onClick={executePlan}>
                            {applied ? "重新执行计划" : "执行到画布"}
                        </Button>
                    </section>
                ) : null}
            </div>
        </div>
    );
}

function ResourceStat({ icon, label, value, theme }: { icon: ReactNode; label: string; value: number; theme: (typeof canvasThemes)[keyof typeof canvasThemes] }) {
    return (
        <div className="flex items-center gap-1 rounded-md border px-2 py-1.5" style={{ borderColor: theme.node.stroke }}>
            {icon}
            <span style={{ color: theme.node.muted }}>{label}</span>
            <span className="ml-auto font-semibold">{value}</span>
        </div>
    );
}

function buildVideoShotAutomationPlan(goal: string, snapshot: CanvasAgentSnapshot, config: AiConfig, autoRun: boolean): AutomationPlan {
    const resources = detectAutomationResources(snapshot);
    const shots = extractShotPrompts(goal);
    const base = nextCanvasPosition(snapshot.nodes);
    const briefId = `auto-brief-${nanoid(8)}`;
    const scriptId = `auto-script-${nanoid(8)}`;
    const ops: CanvasAgentOp[] = [];
    const runNodeIds: string[] = [];

    const materialPrep = buildMaterialPrep(resources);
    const humanScript = `${materialPrep}\n\n提示词：\n${goal}`;
    const internalScript = replaceHumanResourceLabels(humanScript, resources);

    ops.push({
        type: "add_node",
        id: briefId,
        nodeType: CanvasNodeType.Text,
        title: "自动化 Brief",
        x: base.x,
        y: base.y,
        width: 380,
        height: 260,
        metadata: {
            content: `创作目标：\n${goal}\n\n执行策略：\n1. 识别画布素材引用。\n2. 拆分为镜头提示词。\n3. 为每个镜头创建视频生成配置。\n4. 将素材和脚本连接到配置节点。`,
            prompt: goal,
            status: "success",
            fontSize: 14,
            pipelineKind: "automation-brief",
            pipelineLabel: "自动化 Brief",
        },
    });

    ops.push({
        type: "add_node",
        id: scriptId,
        nodeType: CanvasNodeType.Text,
        title: "自动化镜头脚本",
        x: base.x + 460,
        y: base.y,
        width: 430,
        height: 340,
        metadata: {
            content: humanScript,
            prompt: internalScript,
            status: "success",
            fontSize: 14,
            pipelineKind: "automation-shot-script",
            pipelineLabel: "镜头脚本",
        },
    });
    ops.push({ type: "connect_nodes", fromNodeId: briefId, toNodeId: scriptId });

    shots.forEach((shot, index) => {
        const configId = `auto-video-${index + 1}-${nanoid(8)}`;
        const prompt = buildShotComposerPrompt(shot, resources, index + 1);
        const x = base.x + 980;
        const y = base.y + index * 320;
        runNodeIds.push(configId);
        ops.push({
            type: "add_node",
            id: configId,
            nodeType: CanvasNodeType.Config,
            title: `镜头 ${index + 1} · 视频生成`,
            x,
            y,
            width: NODE_DEFAULT_SIZE[CanvasNodeType.Config].width,
            height: NODE_DEFAULT_SIZE[CanvasNodeType.Config].height,
            metadata: {
                generationMode: "video",
                model: config.videoModel || config.model,
                size: "16:9",
                seconds: config.videoSeconds || "5",
                vquality: config.vquality || "720p",
                generateAudio: config.videoGenerateAudio,
                watermark: config.videoWatermark,
                composerContent: prompt,
                prompt,
                references: resources.map((resource) => resource.id),
                status: "idle",
                pipelineKind: "automation-video-shot",
                pipelineLabel: `镜头 ${index + 1}`,
                pipelineDescription: shot,
            },
        });
        ops.push({ type: "connect_nodes", fromNodeId: scriptId, toNodeId: configId });
        resources.forEach((resource) => ops.push({ type: "connect_nodes", fromNodeId: resource.id, toNodeId: configId }));
        if (autoRun) ops.push({ type: "run_generation", nodeId: configId, mode: "video", prompt });
    });

    ops.push({ type: "select_nodes", ids: runNodeIds.length ? runNodeIds : [scriptId] });

    return {
        title: "视频镜头工作流",
        summary: `将创建 1 个 Brief、1 个镜头脚本、${shots.length} 个视频配置节点，并连接 ${resources.length} 个参考素材。${autoRun ? "执行后会立即触发视频生成。" : "执行后先停留在可检查状态。"}`,
        resources,
        shots,
        ops,
        runNodeIds,
    };
}

function detectAutomationResources(snapshot: CanvasAgentSnapshot): AutomationResource[] {
    const selected = new Set(snapshot.selectedNodeIds);
    const nodes = [...snapshot.nodes].sort((a, b) => {
        const selectedDelta = Number(selected.has(b.id)) - Number(selected.has(a.id));
        if (selectedDelta) return selectedDelta;
        return a.position.x - b.position.x || a.position.y - b.position.y;
    });
    const counts: Record<string, number> = { image: 0, video: 0, audio: 0, text: 0 };
    return nodes
        .filter((node) => isReferenceNode(node))
        .slice(0, 12)
        .map((node) => {
            counts[node.type] += 1;
            return {
                id: node.id,
                type: node.type as AutomationResource["type"],
                label: resourceLabel(node.type, counts[node.type]),
                role: resourceRole(node, counts[node.type]),
                title: node.title || node.id,
            };
        });
}

function isReferenceNode(node: CanvasNodeData) {
    if (node.type === CanvasNodeType.Image || node.type === CanvasNodeType.Video || node.type === CanvasNodeType.Audio) return Boolean(node.metadata?.content || node.metadata?.storageKey);
    if (node.type === CanvasNodeType.Text) return Boolean(node.metadata?.content?.trim() || node.metadata?.prompt?.trim());
    return false;
}

function resourceLabel(type: CanvasNodeType, index: number) {
    if (type === CanvasNodeType.Image) return `@图片 ${index}`;
    if (type === CanvasNodeType.Video) return `@视频 ${index}`;
    if (type === CanvasNodeType.Audio) return `@音频 ${index}`;
    return `@文本 ${index}`;
}

function resourceRole(node: CanvasNodeData, index: number) {
    const text = `${node.title} ${node.metadata?.assetCategory || ""} ${node.metadata?.pipelineLabel || ""}`;
    if (node.type === CanvasNodeType.Image && /角色|人物|主角|女主|男主|character/i.test(text)) return "角色参考图";
    if (node.type === CanvasNodeType.Image && /场景|环境|宿舍|街|室内|scene/i.test(text)) return "场景参考图";
    if (node.type === CanvasNodeType.Video) return "运镜参考视频";
    if (node.type === CanvasNodeType.Audio) return "声音参考";
    if (node.type === CanvasNodeType.Text) return "文本参考";
    return index === 1 ? "主参考素材" : "辅助参考素材";
}

function countResources(nodes: CanvasNodeData[]) {
    return nodes.reduce(
        (acc, node) => {
            if (isReferenceNode(node)) acc[node.type as keyof typeof acc] += 1;
            return acc;
        },
        { image: 0, video: 0, audio: 0, text: 0 },
    );
}

function extractShotPrompts(goal: string) {
    const matches = goal.match(/镜头\s*\d+\s*[：:][\s\S]*?(?=\n\s*镜头\s*\d+\s*[：:]|$)/g);
    if (matches?.length) return matches.map((item) => item.trim()).slice(0, 8);
    const clean = goal.replace(/^素材准备：[\s\S]*?提示词：/m, "").trim() || goal.trim();
    return [
        `镜头 1：建立场景和主角状态。${clean}`,
        `镜头 2：推进核心动作和情绪变化。${clean}`,
        `镜头 3：完成情绪收束和画面定格。${clean}`,
    ];
}

function buildMaterialPrep(resources: AutomationResource[]) {
    if (!resources.length) return "素材准备：\n暂无已连接素材，后续可手动添加参考图、参考视频或参考音频。";
    return ["素材准备：", ...resources.map((resource) => `${resource.label}：${resource.role}（${resource.title}）`)].join("\n");
}

function buildShotComposerPrompt(shot: string, resources: AutomationResource[], shotIndex: number) {
    const prep = buildMaterialPrep(resources);
    const referenceLead = resources.length ? `${resources.map((resource) => `${resource.label} 作为${resource.role}`).join("，")}。` : "";
    const humanPrompt = `${prep}\n\n提示词：\n${referenceLead}\n${shot}\n\n全程画面高清电影纪实风，色调统一，光影自然；人物面部稳定不变形，动作自然流畅，无卡顿无闪烁；保持本镜头和前后镜头的角色、服装、场景连续性。`;
    return replaceHumanResourceLabels(humanPrompt.replace(/镜头\s*\d+/, `镜头 ${shotIndex}`), resources);
}

function replaceHumanResourceLabels(text: string, resources: AutomationResource[]) {
    return resources.reduce((acc, resource) => acc.split(resource.label).join(`@[node:${resource.id}]`), text);
}

function nextCanvasPosition(nodes: CanvasNodeData[]) {
    if (!nodes.length) return { x: 80, y: 80 };
    const maxX = Math.max(...nodes.map((node) => node.position.x + node.width));
    const minY = Math.min(...nodes.map((node) => node.position.y));
    return { x: maxX + 140, y: Number.isFinite(minY) ? minY : 80 };
}
