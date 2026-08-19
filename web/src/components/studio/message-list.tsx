"use client";

import { Music2, Sparkles, VideoIcon } from "lucide-react";
import { Button } from "antd";

import type { StudioMessage } from "@/lib/studio/types";
import { ResultCard } from "./result-card";

const QUICK_PROMPTS = ["一只橘猫戴着飞行员眼镜，坐在云端，赛博朋克风格", "雨夜竹林，古风女侠持剑而立，电影感打斗镜头", "把参考图改成新海诚风格", "做一个 15 秒的镜头推进视频"];

type MessageListProps = {
    messages: StudioMessage[];
    onQuickPrompt: (text: string) => void;
    onUseAsReference: (message: StudioMessage) => void;
    onSaveToAssets: (message: StudioMessage) => void;
    onRetry: (message: StudioMessage) => void;
};

export function MessageList({ messages, onQuickPrompt, onUseAsReference, onSaveToAssets, onRetry }: MessageListProps) {
    if (!messages.length) {
        return (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-[#ded2c3] bg-[#fffdf8] shadow-[0_12px_40px_rgba(57,48,34,0.08)]">
                    <Sparkles className="size-7 text-[#9b5b32]" />
                </div>
                <h2 className="sf-serif text-xl font-semibold text-[#201914]">从一个想法开始</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#7a6d63]">直接描述你要的画面，图片和视频都在同一个对话里生成。生成后可以继续让它改：&ldquo;把背景换成办公室&rdquo;、&ldquo;换成新海诚风格&rdquo;。</p>
                <div className="mt-6 flex max-w-md flex-wrap justify-center gap-2">
                    {QUICK_PROMPTS.map((item) => (
                        <Button key={item} size="small" onClick={() => onQuickPrompt(item)}>
                            {item}
                        </Button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {messages.map((message) =>
                message.role === "user" ? (
                    <div key={message.id} className="flex justify-end">
                        <div className="max-w-[88%] rounded-2xl bg-black px-4 py-3 text-sm leading-6 text-white">
                            <div className="whitespace-pre-wrap break-words">{message.prompt}</div>
                            {message.references.length || message.videoReferences.length || message.audioReferences.length ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {message.references.map((ref, index) => (
                                        <div key={ref.id} className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/70">
                                            <img src={ref.dataUrl} alt={ref.name} className="size-7 rounded object-cover" />
                                            <span>参考图 {index + 1}</span>
                                        </div>
                                    ))}
                                    {message.videoReferences.map((ref, index) => (
                                        <div key={ref.id} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/70">
                                            <VideoIcon className="size-3.5" />
                                            <span>参考视频 {index + 1}</span>
                                        </div>
                                    ))}
                                    {message.audioReferences.map((ref, index) => (
                                        <div key={ref.id} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2 py-1 text-[11px] text-white/70">
                                            <Music2 className="size-3.5" />
                                            <span>参考音频 {index + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <div key={message.id} className="flex justify-start">
                        <ResultCard message={message} onUseAsReference={onUseAsReference} onSaveToAssets={onSaveToAssets} onRetry={onRetry} />
                    </div>
                ),
            )}
        </div>
    );
}
