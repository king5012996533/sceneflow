"use client";

import { useState } from "react";

/**
 * 提示词封面：无图或加载失败时显示占位（标题首字），避免破碎图片。
 * 上游封面统一经 /api/prompts/cover 代理，src 为空或代理返回 502 时走占位。
 */
export function PromptCoverImage({ src, alt, className = "aspect-[4/3] w-full" }: { src: string; alt: string; className?: string }) {
    const [failed, setFailed] = useState(false);
    const show = Boolean(src) && !failed;

    return (
        <div className={`${className} overflow-hidden bg-stone-200 dark:bg-stone-800`}>
            {show ? (
                <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
            ) : (
                <div className="flex h-full w-full items-center justify-center">
                    <span className="font-serif text-4xl text-stone-400 dark:text-stone-600">{alt.trim().charAt(0) || "S"}</span>
                </div>
            )}
        </div>
    );
}
