"use client";

import { AudioLines, Clapperboard, Sparkles } from "lucide-react";

import { getStylePreset } from "@/lib/studio/style-presets";
import type { StudioMessage } from "@/lib/studio/types";
import { ResultCard } from "./result-card";

const QUICK_PROMPTS = ["雨夜竹林，古风女侠持剑而立，电影感打斗镜头", "把参考图改成新海诚风格", "做一个 15 秒的镜头推进视频"];

type PreviewPayload = { src: string; caption: string };

type MessageListProps = {
    messages: StudioMessage[];
    onQuickPrompt: (text: string) => void;
    onUseAsReference: (message: StudioMessage) => void;
    onSaveToAssets: (message: StudioMessage) => void;
    onRetry: (message: StudioMessage) => void;
    onPreview?: (payload: PreviewPayload) => void;
};

function formatTime(timestamp: number) {
    const date = new Date(timestamp);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function MessageList({ messages, onQuickPrompt, onUseAsReference, onSaveToAssets, onRetry, onPreview }: MessageListProps) {
    const today = new Date();
    const divider = today.getHours() < 6 ? "凌晨" : today.getHours() < 12 ? "上午" : today.getHours() < 18 ? "下午" : "晚上";

    return (
        <>
            {messages.length ? <div className="date-divider">{divider}</div> : null}

            {messages.length === 0 ? (
                <section className="empty-state">
                    <div className="empty-mark">
                        <Sparkles />
                    </div>
                    <h1>从一个想法开始</h1>
                    <p>直接描述你要的画面，图片和视频都在同一个对话里生成。生成后可以继续让它改：「把背景换成办公室」「换成新海诚风格」。</p>
                    <div className="example-grid">
                        {QUICK_PROMPTS.map((item) => (
                            <button key={item} type="button" className="example-chip" onClick={() => onQuickPrompt(item)}>
                                {item}
                            </button>
                        ))}
                    </div>
                </section>
            ) : (
                messages.map((message) =>
                    message.role === "user" ? (
                        <div key={message.id} className="message user">
                            <div className="message-stack">
                                <div className="message-label">
                                    {formatTime(message.createdAt)}
                                    {message.stylePreset && message.stylePreset !== "none" ? ` · ${getStylePreset(message.stylePreset).label}` : ""}
                                </div>
                                <div className="user-bubble">
                                    <div className="prompt-text">{message.prompt}</div>
                                    {message.references.length || message.videoReferences.length || message.audioReferences.length ? (
                                        <div className="ref-strip" aria-label="参考素材">
                                            {message.references.map((ref) => (
                                                <div key={ref.id} className="ref-thumb" title={ref.name}>
                                                    <img src={ref.dataUrl} alt={ref.name} />
                                                    <span className="ref-type">图</span>
                                                </div>
                                            ))}
                                            {message.videoReferences.map((ref) => (
                                                <div key={ref.id} className="ref-thumb" title={ref.name} style={{ display: "grid", placeItems: "center" }}>
                                                    <Clapperboard className="size-4 text-[#8a7d70]" />
                                                    <span className="ref-type">视频</span>
                                                </div>
                                            ))}
                                            {message.audioReferences.map((ref) => (
                                                <div key={ref.id} className="ref-thumb" title={ref.name} style={{ display: "grid", placeItems: "center" }}>
                                                    <AudioLines className="size-4 text-[#8a7d70]" />
                                                    <span className="ref-type">音频</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div key={message.id} className="message ai">
                            <div className="avatar">
                                <Sparkles />
                            </div>
                            <div className="message-stack">
                                <div className="ai-intro">
                                    <strong>{message.status === "pending" ? "正在生成" : message.status === "failed" ? "生成失败" : `已生成${message.kind === "image" ? "图片" : "视频"}`}</strong>
                                    <span>
                                        {formatTime(message.createdAt)}
                                        {message.status === "success" ? ` · ${message.results.length} 个结果` : ""}
                                    </span>
                                </div>
                                {message.status !== "failed" ? (
                                    <p className="ai-copy">
                                        {message.status === "pending" ? "模型正在创作，请稍候……" : message.kind === "image" ? "图片已生成，悬停卡片可预览 / 下载，或点击「继续编辑」带入参考。" : "视频已生成，可直接播放；也可以继续编辑或保存到素材库。"}
                                    </p>
                                ) : null}
                                <ResultCard message={message} onUseAsReference={onUseAsReference} onSaveToAssets={onSaveToAssets} onRetry={onRetry} onPreview={onPreview} />
                            </div>
                        </div>
                    ),
                )
            )}
        </>
    );
}
