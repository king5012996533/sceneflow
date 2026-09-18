// image-ratio.ts —— 上游「画幅写法」怪癖的纯逻辑
//
// 背景：画布的画幅预设是像素尺寸（16:9 → 1824x1024）。多数通道照单全收，但有的中转站
// 背后挂的是只认比例串的图像模型（实测 apimart 上的 gemini-3.1-flash-image-preview），
// 收到像素尺寸就回 400：
//   unsupported image aspect ratio "1824:1024", gemini-3.1-flash-image-preview
//   supported ratios: 16:9, 1:1, 1:4, 1:8, 21:9, 2:3, 3:2, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16, auto
//
// 这种请求是被上游直接拒收的（没有建任务、没有计费），所以可以照它自己列出的比例重投一次。
// 本模块只负责「读懂这句话 + 挑一个最接近的可用比例」，不碰网络，便于单测。

/** 比例 → 数值（无法解析返回 null）。 */
function ratioValue(ratio: string): number | null {
    const match = ratio.trim().match(/^(\d+)\s*:\s*(\d+)$/);
    if (!match) return null;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
    return width / height;
}

/** 上游是否明确在说「这个画幅不支持」（而不是别的 400：内容审核、参数缺失等）。 */
export function isAspectRejection(message: string): boolean {
    if (!message) return false;
    return /unsupported image aspect ratio|aspect ratio[\s\S]{0,40}not supported|unsupported aspect ratio|不支持的?(图片)?(画幅|宽高比|比例)/i.test(message);
}

/** 解析报错文案里上游接受的比例串（`supported ratios: 16:9, 1:1, auto` → ["16:9", "1:1", "auto"]）。 */
export function parseSupportedRatios(message: string): string[] {
    if (!message) return [];
    const match = message.match(/supported\s+ratios?\s*:?\s*([^.\n;]*)/i);
    if (!match) return [];
    const tokens = match[1]
        .split(",")
        .map((token) => token.trim().toLowerCase())
        .filter((token) => token === "auto" || /^\d+\s*:\s*\d+$/.test(token));
    return [...new Set(tokens.map((token) => token.replace(/\s+/g, "")))];
}

/**
 * 从上游列出的比例里挑一个最接近目标画幅的：
 * 1. 完全一致直接用；
 * 2. 否则取数值最接近的，横/竖同向优先（宁可差一点比例，也不要把横图变竖图）；
 * 3. 只有 auto 可选时返回 null —— 那等于放弃画幅意图，不如把上游原话抛给用户。
 */
export function pickSupportedRatio(desired: string | undefined, supported: string[]): string | null {
    const ratios = supported.filter((ratio) => ratioValue(ratio) !== null);
    if (!ratios.length) return null;

    const target = ratioValue(desired || "");
    if (target === null) return null;

    const exact = ratios.find((ratio) => Math.abs((ratioValue(ratio) as number) - target) < 1e-9);
    if (exact) return exact;

    let best: string | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const ratio of ratios) {
        const value = ratioValue(ratio) as number;
        // 横竖同向优先；再用对数距离衡量「差多少」，避免竖图被横图的大比值拉偏
        const sameOrientation = value >= 1 === target >= 1;
        const orientationPenalty = sameOrientation ? 0 : 1;
        const score = Math.abs(Math.log(value / target)) + orientationPenalty;
        if (score < bestScore) {
            bestScore = score;
            best = ratio;
        }
    }
    return best;
}
