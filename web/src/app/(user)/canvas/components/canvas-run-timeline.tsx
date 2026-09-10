"use client";

import { Loader2 } from "lucide-react";

import type { CanvasTheme } from "@/lib/canvas-theme";
import type { RunPhase, RunState, StageStatus } from "../engine/scheduler/run-state";
import { runProgress } from "../engine/scheduler/run-state";
import { getSubAgent } from "../utils/canvas-agent-registry";

/**
 * 生产运行时间线。
 *
 * 全自动生产是「黑箱跑几分钟」的交互，用户最需要知道的三件事：
 * 跑到哪了、哪个阶段失败了、还能不能继续。所以这里把 RunState 直接摊开成
 * 一张阶段表，而不是只显示一句"执行中"。
 */

const PHASE_LABELS: Record<RunPhase, string> = {
    running: "运行中",
    paused: "已暂停",
    completed: "已完成",
    failed: "未完成",
    interrupted: "已中断",
};

const STAGE_LABELS: Record<StageStatus, string> = {
    pending: "待跑",
    running: "进行中",
    done: "完成",
    failed: "失败",
    skipped: "已跳过",
};

function stageColor(status: StageStatus, theme: CanvasTheme): string {
    if (status === "done") return theme.type.image;
    if (status === "failed") return theme.type.danger;
    if (status === "running") return theme.type.text;
    return theme.node.faint;
}

function StageMark({ status, theme }: { status: StageStatus; theme: CanvasTheme }) {
    const color = stageColor(status, theme);
    if (status === "running") return <Loader2 className="size-3 shrink-0 animate-spin" style={{ color }} />;
    const glyph = status === "done" ? "✓" : status === "failed" ? "✗" : status === "skipped" ? "–" : "○";
    return (
        <span className="w-3 shrink-0 text-center text-[11px] leading-4" style={{ color }}>
            {glyph}
        </span>
    );
}

export function CanvasRunTimeline({ run, theme }: { run: RunState; theme: CanvasTheme }) {
    const progress = runProgress(run);
    const ratio = progress.total ? Math.round(((progress.done + progress.failed + progress.skipped) / progress.total) * 100) : 0;
    const phaseColor = run.phase === "failed" ? theme.type.danger : run.phase === "completed" ? theme.type.image : theme.node.muted;

    return (
        <div className="mb-3 rounded-lg border px-3 py-2.5" style={{ borderColor: theme.node.stroke, background: theme.node.fill }}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium" style={{ color: theme.node.text }}>
                    生产运行
                </span>
                <span className="text-[11px]" style={{ color: phaseColor }}>
                    {PHASE_LABELS[run.phase]}
                </span>
            </div>
            <div className="mt-1 text-[11px]" style={{ color: theme.node.muted }}>
                {progress.done}/{progress.total} 阶段完成
                {progress.failed ? ` · ${progress.failed} 失败` : ""}
                {progress.skipped ? ` · ${progress.skipped} 跳过` : ""}
                {progress.pending ? ` · ${progress.pending} 待跑` : ""}
                {progress.tokensUsed ? ` · 约 ${progress.tokensUsed.toLocaleString()} tokens` : ""}
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ background: theme.node.stroke }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${ratio}%`, background: phaseColor }} />
            </div>
            <div className="mt-2 space-y-1">
                {run.stages.map((stage) => {
                    const detail = stage.status === "done" ? stage.summary : stage.status === "failed" || stage.status === "skipped" ? stage.error : "";
                    return (
                        <div key={stage.stageKey} className="flex gap-1.5">
                            <StageMark status={stage.status} theme={theme} />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline gap-1.5 text-[11px]" style={{ color: stage.status === "pending" ? theme.node.faint : theme.node.text }}>
                                    <span className="truncate">{getSubAgent(stage.agentId)?.name || stage.agentId}</span>
                                    <span className="shrink-0 opacity-60">{stage.stageKey}</span>
                                    {stage.attempts > 1 ? <span className="shrink-0 opacity-60">第 {stage.attempts} 次</span> : null}
                                    {stage.status === "pending" || stage.status === "skipped" ? <span className="shrink-0 opacity-60">{STAGE_LABELS[stage.status]}</span> : null}
                                </div>
                                {detail ? (
                                    <div className="truncate text-[11px] opacity-60" style={{ color: theme.node.muted }} title={detail}>
                                        {detail}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
