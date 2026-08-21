"use client";

import { Aperture, BookOpen, Box, MoonStar, Plus, Trash2, Waves, type LucideIcon } from "lucide-react";

import type { StudioSessionMeta } from "@/lib/studio/session-store";

const GLYPHS: LucideIcon[] = [Aperture, Box, Waves, MoonStar, BookOpen];

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

type SessionPanelProps = {
    sessions: StudioSessionMeta[];
    activeId: string | null;
    onSelect: (id: string) => void;
    onCreate: () => void;
    onDelete: (id: string) => void;
};

export function SessionPanel({ sessions, activeId, onSelect, onCreate, onDelete }: SessionPanelProps) {
    const today = new Date().toDateString();
    const recent = sessions.filter((item) => new Date(item.updatedAt).toDateString() === today);
    const earlier = sessions.filter((item) => new Date(item.updatedAt).toDateString() !== today);

    const renderItem = (session: StudioSessionMeta, index: number) => {
        const active = session.id === activeId;
        const Glyph = GLYPHS[index % GLYPHS.length];
        return (
            <button key={session.id} type="button" className={`session-item ${active ? "is-active" : ""}`} onClick={() => onSelect(session.id)}>
                <span className="session-glyph">
                    <Glyph />
                </span>
                <span className="session-copy">
                    <strong>{session.title || "未命名会话"}</strong>
                    <span className="session-meta">
                        <span>{session.messageCount} 条</span>
                        <span>{formatSessionTime(session.updatedAt)}</span>
                    </span>
                </span>
                <span
                    className="session-delete"
                    role="button"
                    aria-label="删除会话"
                    onClick={(event) => {
                        event.stopPropagation();
                        onDelete(session.id);
                    }}
                >
                    <Trash2 />
                </span>
            </button>
        );
    };

    return (
        <div className="flex h-full min-h-0 flex-col gap-4">
            <button type="button" className="new-session" onClick={onCreate}>
                <Plus />
                <span>新会话</span>
            </button>

            <div className="session-list thin-scrollbar">
                {sessions.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs leading-5 text-[#67726b]">
                        还没有会话
                        <br />
                        点「新会话」开始第一段创作
                    </div>
                ) : (
                    <>
                        {recent.length ? (
                            <>
                                <div className="section-label">最近</div>
                                {recent.map((session, index) => renderItem(session, index))}
                            </>
                        ) : null}
                        {earlier.length ? (
                            <>
                                <div className="section-label">更早</div>
                                {earlier.map((session, index) => renderItem(session, recent.length + index))}
                            </>
                        ) : null}
                    </>
                )}
            </div>
        </div>
    );
}
