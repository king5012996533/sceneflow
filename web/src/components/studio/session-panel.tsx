"use client";

import { MessageSquareText, Plus, Trash2 } from "lucide-react";
import { Button } from "antd";

import type { StudioSessionMeta } from "@/lib/studio/session-store";

type SessionPanelProps = {
    sessions: StudioSessionMeta[];
    activeId: string | null;
    onSelect: (id: string) => void;
    onCreate: () => void;
    onDelete: (id: string) => void;
};

function formatSessionTime(timestamp: number) {
    const date = new Date(timestamp);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    if (sameDay) return time;
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `昨天 ${time}`;
    return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function SessionPanel({ sessions, activeId, onSelect, onCreate, onDelete }: SessionPanelProps) {
    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                    <p className="sf-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9b5b32]">Studio · 创作台</p>
                    <h2 className="sf-serif mt-1 text-lg font-semibold text-[#201914]">创作会话</h2>
                </div>
                <Button size="small" type="primary" icon={<Plus className="size-3.5" />} onClick={onCreate} className="!shrink-0">
                    新建
                </Button>
            </div>

            <div className="thin-scrollbar -mx-2 min-h-0 flex-1 space-y-1 overflow-y-auto px-2">
                {sessions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#ded2c3] px-3 py-6 text-center text-xs leading-5 text-[#b7a99b]">
                        还没有会话
                        <br />
                        点「新建」开始第一段创作
                    </div>
                ) : (
                    sessions.map((session) => {
                        const active = session.id === activeId;
                        return (
                            <div
                                key={session.id}
                                className={`group flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 transition ${active ? "border-[#9b5b32]/40 bg-[#f6efe4]" : "border-transparent hover:bg-[#f6efe4]/60"}`}
                                onClick={() => onSelect(session.id)}
                            >
                                <MessageSquareText className={`size-4 shrink-0 ${active ? "text-[#9b5b32]" : "text-[#b7a99b]"}`} />
                                <div className="min-w-0 flex-1">
                                    <p className={`truncate text-[13px] ${active ? "font-semibold text-[#201914]" : "text-[#4a413a]"}`}>{session.title || "未命名会话"}</p>
                                    <p className="sf-mono mt-0.5 text-[10px] text-[#b7a99b]">
                                        {session.messageCount} 条 · {formatSessionTime(session.updatedAt)}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    aria-label="删除会话"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onDelete(session.id);
                                    }}
                                    className="shrink-0 rounded-full p-1 text-[#b7a99b] opacity-0 transition hover:bg-[#fdf1ec] hover:text-[#b3423a] group-hover:opacity-100"
                                >
                                    <Trash2 className="size-3.5" />
                                </button>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
