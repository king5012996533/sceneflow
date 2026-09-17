"use client";

import { useMemo, useState } from "react";

// 无图/加载失败时的设计化封面：v2 暖纸编辑部同源色系 + 标题排版，
// 每张封面按标题+分类哈希从色板中稳定取色，不会出现"出错感"的灰块。
const COVER_PALETTES = [
    { bg: "#f6f4f2", bg2: "#e9e6e4", ink: "#332f2a" },
    { bg: "#eeece9", bg2: "#dbd8d4", ink: "#332f2a" },
    { bg: "#f9f7f5", bg2: "#e7e2d3", ink: "#47423c" },
    { bg: "#332f2a", bg2: "#433f3a", ink: "#f6f4f2" },
    { bg: "#a0713f", bg2: "#8a5e33", ink: "#ffffff" },
    { bg: "#e2dfdc", bg2: "#ccc9c6", ink: "#332f2a" },
];

function hashSeed(value: string) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

export function PromptCoverImage({ src, alt, category = "", className = "aspect-[4/3] w-full" }: { src: string; alt: string; category?: string; className?: string }) {
    const [failed, setFailed] = useState(false);
    const show = Boolean(src) && !failed;
    const palette = useMemo(() => COVER_PALETTES[hashSeed(alt + category) % COVER_PALETTES.length], [alt, category]);

    if (show) {
        return (
            <div className={`${className} overflow-hidden bg-stone-200 dark:bg-stone-800`}>
                <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" onError={() => setFailed(true)} />
            </div>
        );
    }

    return (
        <div className={`${className} relative overflow-hidden`} style={{ background: `linear-gradient(135deg, ${palette.bg} 0%, ${palette.bg2} 100%)` }}>
            <div className="absolute inset-0 flex flex-col justify-between p-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: palette.ink, opacity: 0.75 }}>
                    {category || "Prompt"}
                </span>
                <span className="font-serif text-lg leading-snug" style={{ color: palette.ink }}>
                    {alt}
                </span>
            </div>
            <span className="absolute bottom-1.5 right-2.5 font-mono text-[10px]" style={{ color: palette.ink, opacity: 0.4 }}>
                SF
            </span>
        </div>
    );
}
