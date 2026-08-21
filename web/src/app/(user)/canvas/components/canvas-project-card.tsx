"use client";

import { Check, Download, Pencil, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { App, Button, Input } from "antd";

import { useCanvasStore, type CanvasProject } from "../stores/use-canvas-store";
import { useCanvasUiStore } from "../stores/use-canvas-ui-store";
import { exportCanvasProjects } from "../utils/canvas-export";

const NODE_COLORS = ["#a0713f", "#6b6a4a", "#5f7a52", "#2a3330", "#8a5e33", "#67726b"];
const PREVIEW_W = 340;
const PREVIEW_H = 66;

export function CanvasProjectCard({ project }: { project: CanvasProject }) {
    const { message } = App.useApp();
    const router = useRouter();
    const searchParams = useSearchParams();
    const renameProject = useCanvasStore((state) => state.renameProject);
    const selectedIds = useCanvasUiStore((state) => state.selectedProjectIds);
    const editingId = useCanvasUiStore((state) => state.editingProjectId);
    const editingTitle = useCanvasUiStore((state) => state.editingProjectTitle);
    const startEditing = useCanvasUiStore((state) => state.startEditingProject);
    const setEditingTitle = useCanvasUiStore((state) => state.setEditingProjectTitle);
    const stopEditing = useCanvasUiStore((state) => state.stopEditingProject);
    const toggleSelected = useCanvasUiStore((state) => state.toggleSelectedProjectId);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);
    const editing = editingId === project.id;
    const selected = selectedIds.includes(project.id);
    const open = () => router.push(`/canvas/${project.id}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`);
    const saveTitle = () => {
        renameProject(project.id, editingTitle);
        stopEditing();
    };

    return (
        <article
            className="group relative flex min-h-44 cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#dde2dc] bg-[#ffffff] shadow-[0_6px_18px_rgba(57,48,34,0.05)] transition-all duration-150 hover:-translate-y-[3px] hover:border-[#a0713f] hover:shadow-[0_18px_44px_rgba(57,48,34,0.12)]"
            onClick={() => !editing && open()}
        >
            <div className="relative h-[66px] shrink-0 overflow-hidden border-b border-[#eee4d5]">
                <MiniCanvasPreview project={project} />
                <input
                    type="checkbox"
                    checked={selected}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => toggleSelected(project.id, event.target.checked)}
                    className={`absolute left-3 top-3 z-10 size-4 cursor-pointer accent-[#a0713f] transition-opacity ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    aria-label={`选择 ${project.title}`}
                />
            </div>
            <div className="min-w-0 flex-1 px-4 pb-2 pt-3">
                {editing ? (
                    <Input className="min-w-0" value={editingTitle} onClick={(event) => event.stopPropagation()} onChange={(event) => setEditingTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveTitle()} autoFocus />
                ) : (
                    <button
                        type="button"
                        className="min-w-0 cursor-pointer text-left"
                        onClick={(event) => {
                            event.stopPropagation();
                            open();
                        }}
                    >
                        <h2 className="sf-serif truncate text-base font-semibold leading-6 tracking-[0.01em]">{project.title}</h2>
                        <p className="sf-mono mt-1.5 flex items-center gap-2.5 text-[10.5px] font-semibold tracking-[0.12em] text-[#67726b]">
                            {String(project.nodes.length).padStart(2, "0")} NODES
                            <i className="size-[3px] rounded-full bg-[#dde2dc]" />
                            {String(project.connections.length).padStart(2, "0")} LINKS
                        </p>
                    </button>
                )}
            </div>
            <div className="mt-auto flex items-center justify-between gap-3 px-4 py-2.5" onClick={(event) => event.stopPropagation()}>
                <p className="sf-mono text-[10.5px] text-[#9aa49e]">更新 {new Date(project.updatedAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                <div className={`flex items-center gap-0.5 transition-opacity ${editing ? "" : "opacity-0 group-hover:opacity-100"}`}>
                    {editing ? (
                        <>
                            <Button type="text" size="small" shape="circle" icon={<Check className="size-4" />} onClick={saveTitle} aria-label="保存名称" />
                            <Button type="text" size="small" shape="circle" icon={<X className="size-4" />} onClick={stopEditing} aria-label="取消重命名" />
                        </>
                    ) : (
                        <>
                            <Button
                                type="text"
                                size="small"
                                shape="circle"
                                icon={<Download className="size-4" />}
                                onClick={async () => {
                                    try {
                                        await exportCanvasProjects([project], project.title || "无限画布");
                                    } catch (err) {
                                        message.error(err instanceof Error ? err.message : "导出失败");
                                    }
                                }}
                                aria-label="导出"
                            />
                            <Button type="text" size="small" shape="circle" icon={<Pencil className="size-4" />} onClick={() => startEditing(project.id, project.title)} aria-label="重命名" />
                            <Button type="text" size="small" shape="circle" icon={<Trash2 className="size-4" />} onClick={() => setDeleteIds([project.id])} aria-label="删除" />
                        </>
                    )}
                </div>
            </div>
        </article>
    );
}

/** 微缩画布预览：按节点数确定性摆布色块节点 + 连线，背景跟随画布底纹 */
function MiniCanvasPreview({ project }: { project: CanvasProject }) {
    const nodes = project.nodes.slice(0, 6);
    const patternId = `mini-${project.id.replace(/[^a-zA-Z0-9]/g, "")}`;
    const lineColor = "#dde2dc";
    const positions = nodes.map((node, index) => {
        const width = 28 + (index % 3) * 6;
        const height = 22 + (index % 2) * 4;
        const x = 26 + (index / Math.max(1, nodes.length - 1)) * (PREVIEW_W - 60 - width);
        const y = 12 + ((index * 17) % 28);
        return { node, index, width, height, x, y, color: NODE_COLORS[index % NODE_COLORS.length] };
    });

    return (
        <svg viewBox={`0 0 ${PREVIEW_W} ${PREVIEW_H}`} preserveAspectRatio="none" className="block size-full">
            <defs>
                {project.backgroundMode === "dots" ? (
                    <pattern id={patternId} width="14" height="14" patternUnits="userSpaceOnUse">
                        <circle cx="1" cy="1" r="1" fill="#d9cdbc" />
                    </pattern>
                ) : project.backgroundMode === "lines" ? (
                    <pattern id={patternId} width="12" height="12" patternUnits="userSpaceOnUse">
                        <path d="M0 0h12v12" stroke="#e3d8c7" fill="none" />
                    </pattern>
                ) : null}
            </defs>
            {project.backgroundMode !== "blank" ? <rect width={PREVIEW_W} height={PREVIEW_H} fill={`url(#${patternId})`} /> : <rect width={PREVIEW_W} height={PREVIEW_H} fill="#f4f6f2" />}
            {positions.map((item, index) => {
                const next = positions[index + 1];
                if (!next) return null;
                return <line key={`line-${index}`} x1={item.x + item.width} y1={item.y + item.height / 2} x2={next.x} y2={next.y + next.height / 2} stroke={lineColor} strokeWidth="1" />;
            })}
            {positions.map((item) => (
                <rect key={`node-${item.index}`} x={item.x} y={item.y} width={item.width} height={item.height} rx="5" fill={item.color} opacity="0.85" />
            ))}
        </svg>
    );
}
