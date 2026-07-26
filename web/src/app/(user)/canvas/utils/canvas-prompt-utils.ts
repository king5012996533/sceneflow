// canvas-prompt-utils.ts — 提示词构建函数和配置辅助函数

import { buildNodeGenerationConfig } from "@/lib/generation/generation-config";
import { NODE_DEFAULT_SIZE } from "../constants";
import { nodeSizeFromRatio } from "./canvas-node-size";
import { CanvasNodeType } from "../types";
import type { CanvasNodeData, CanvasShotPackShot } from "../types";
import type { CanvasImageAngleParams } from "../components/canvas-node-angle-dialog";
import type { AiConfig } from "@/stores/use-config-store";

// ========== 数字/配置辅助函数 ==========

export function getGenerationCount(count: string) {
    return Math.max(1, Math.min(15, Math.floor(Math.abs(Number(count)) || 1)));
}

export function applyNodeConfigPatch(node: CanvasNodeData, patch: Partial<CanvasNodeData["metadata"]>) {
    const safePatch = patch || {};
    const next = { ...node, metadata: { ...node.metadata, ...safePatch } };
    const spec = node.type === CanvasNodeType.Video ? NODE_DEFAULT_SIZE[CanvasNodeType.Video] : NODE_DEFAULT_SIZE[CanvasNodeType.Image];
    const size = typeof safePatch.size === "string" && !node.metadata?.content ? nodeSizeFromRatio(safePatch.size, spec.width, spec.height) : null;
    return size && (node.type === CanvasNodeType.Image || node.type === CanvasNodeType.Video) ? { ...next, ...size, position: { x: node.position.x + node.width / 2 - size.width / 2, y: node.position.y + node.height / 2 - size.height / 2 } } : next;
}

export function buildGenerationConfig(config: AiConfig, node: CanvasNodeData | undefined, mode: "image" | "video" | "audio" | "text") {
    return buildNodeGenerationConfig(config, node, mode);
}

// ========== Shot Pack / 分镜函数 ==========

export function buildShotPackPrompt(shots: CanvasShotPackShot[]) {
    const lines = shots.map((shot, index) => {
        const parts = [`${String(index + 1).padStart(2, "0")} ${shot.title || "未命名镜头"}`];
        if (shot.description) parts.push(shot.description);
        if (shot.camera) parts.push(`镜头: ${shot.camera}`);
        if (shot.duration) parts.push(`时长: ${shot.duration}s`);
        return parts.join(" / ");
    });
    return [`参考图是一组连续分镜，请按从左到右、从上到下的顺序理解镜头变化，保持角色、服装、场景一致。`, ...lines].join("\n");
}

// ========== 提示词构建函数 ==========

export function buildContinuationPrompt(previousPrompt?: string) {
    const base = previousPrompt?.trim();
    return [
        "这是连续叙事镜头，请以上一段视频尾帧作为下一段视频第一帧状态。",
        "必须保持：角色身份、脸部特征、服装、发型、道具、场景、光线、构图方向、镜头轴线一致。",
        "只推进下一段 15 秒的动作、表情、镜头运动和情绪变化；不要重置场景，不要换脸，不要换衣服，不要突然切换画风。",
        "输出给视频模型的提示词请包含：起始状态、动作推进、镜头运动、结束状态、连续性禁忌。",
        base ? `上一段镜头参考：${base}` : "",
    ]
        .filter(Boolean)
        .join("\n");
}

export function buildAngleLabel(params: CanvasImageAngleParams) {
    const horizontal = params.horizontalAngle === 0 ? "正面视角" : params.horizontalAngle > 0 ? `向右旋转 ${params.horizontalAngle} 度` : `向左旋转 ${Math.abs(params.horizontalAngle)} 度`;
    const pitch = params.pitchAngle === 0 ? "水平视角" : params.pitchAngle > 0 ? `俯视 ${params.pitchAngle} 度` : `仰视 ${Math.abs(params.pitchAngle)} 度`;
    return `AI 多角度：${horizontal}，${pitch}，镜头距离 ${params.cameraDistance.toFixed(1)}，${params.wideAngle ? "广角" : "标准"}镜头`;
}

export function buildAnglePrompt(params: CanvasImageAngleParams) {
    return `基于参考图重新生成同一主体的新视角，保持主体、颜色、材质和画面风格一致，不要只做透视变形。${buildAngleLabel(params)}。`;
}

// ========== 文件扩展名函数 ==========

export function imageExtension(dataUrl: string) {
    return dataUrl.match(/^data:image[/]([^;]+)/)?.[1] || dataUrl.match(/image[/]([^;]+)/)?.[1] || "png";
}

export function audioExtension(mimeType?: string) {
    if (mimeType?.includes("wav")) return "wav";
    if (mimeType?.includes("opus")) return "opus";
    if (mimeType?.includes("aac")) return "aac";
    if (mimeType?.includes("flac")) return "flac";
    if (mimeType?.includes("pcm")) return "pcm";
    return "mp3";
}
