/**
 * 交互编辑的标记语言（火山方舟 Seedream 5.0 pro，按官方《实现交互编辑指南》实现，2026-09-20）。
 *
 * 官方口径（不是我们发明的，改之前先去翻文档）：
 *   - 坐标是**归一化到 1000×1000 网格**的整数，取值 [0,999]；左上角是 0,0，右下角是 999,999；
 *     换算 x = round(x_px / 图宽 * 1000)、y = round(y_px / 图高 * 1000)，框选四个值都算完再一起夹到 999。
 *   - 点选写 `<point>x y</point>`（点到多大范围由模型自己判断）；
 *     框选写 `<bbox>x1 y1 x2 y2</bbox>`（左上 + 右下两个角）。
 *   - 标记**嵌在句子中间，图片编号写在标记前面**：
 *     `把图1 <bbox>120 180 640 760</bbox> 区域替换成花园`；跨图可以一句里出现两张图的标记。
 *   - 拖拽位移小于 4px 视为误触（丢弃）；点选与框选可以混用；
 *     框里不止一个主体要在句子里点名；**要保持不变的对象也要框出来**并在后面写「保持不变」。
 *
 * 本模块只做「像素 → 归一化 → 标记文字」这一段纯计算，不碰 DOM、不碰 React、不带任何 import：
 * 面板、画布与单测共用同一份换算口径。坐标写歪一位不会报错，只会安静地改错地方（框 A 改 B），
 * 所以这里的每个分支都有单测钉着。
 *
 * 图片编号的**词汇**（我们这边是 `@图片 N`）由调用方以 label / tokenSource 注入 ——
 * 与官方文档的 `图N` 用哪套是待标定项，换词汇只应该改注入处，而不是这个文件。
 */

/** 官方归一化网格：坐标是 0..999 的整数 */
export const MARKER_GRID = 1000;
/** 归一化坐标上限（网格 1000 但取值到 999 为止 —— 999 表示"最后一行/列"） */
export const MARKER_MAX_VALUE = MARKER_GRID - 1;
/** 拖拽小于这个像素数视为误触，不生成标记（官方口径） */
export const MARKER_MIN_DRAG_PX = 4;
/** 从标记往前找图片编号时的回溯窗口（足够覆盖 `把 @图片 1 ` 这种前缀） */
const IMAGE_TOKEN_LOOKBACK = 48;

export type ImageMarkerKind = "point" | "bbox";

export type ImageMarker = { kind: "point"; imageIndex: number; x: number; y: number; keepUnchanged?: boolean } | { kind: "bbox"; imageIndex: number; x1: number; y1: number; x2: number; y2: number; keepUnchanged?: boolean };
/** 点选标记（markerFromPoint 的返回类型）：面板渲染不必再判 kind */
export type ImageMarkerPoint = Extract<ImageMarker, { kind: "point" }>;
/** 框选标记（markerFromBox 的返回类型） */
export type ImageMarkerBox = Extract<ImageMarker, { kind: "bbox" }>;

export type Point2D = { x: number; y: number };
export type Box2D = { x1: number; y1: number; x2: number; y2: number };
/** 图片的像素尺寸：既可以是原图尺寸，也可以是面板上渲染出来的尺寸（比例一样，换算等价） */
export type MarkerImageSize = { width: number; height: number };

/** 单点 → 归一化整数：夹在 [0,999]，尺寸非法（0 / 负 / NaN）时返回 0 而不是 NaN */
export function normalizeMarkerCoordinate(px: number, size: number): number {
    if (!Number.isFinite(px) || !Number.isFinite(size) || size <= 0) return 0;
    const value = Math.round((px / size) * MARKER_GRID);
    return Math.max(0, Math.min(MARKER_MAX_VALUE, value));
}

/** 拖拽是不是太小（两个方向都不到 4px = 当成点了一下，不生成框） */
export function isDragTooSmall(from: Point2D, to: Point2D, minPx: number = MARKER_MIN_DRAG_PX): boolean {
    return Math.abs(to.x - from.x) < minPx && Math.abs(to.y - from.y) < minPx;
}

/** 点选：像素点 → `<point>` 的归一化坐标 */
export function markerFromPoint(imageIndex: number, point: Point2D, image: MarkerImageSize, keepUnchanged = false): ImageMarkerPoint | null {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || image.width <= 0 || image.height <= 0) return null;
    return {
        kind: "point",
        imageIndex,
        x: normalizeMarkerCoordinate(point.x, image.width),
        y: normalizeMarkerCoordinate(point.y, image.height),
        ...(keepUnchanged ? { keepUnchanged: true } : {}),
    };
}

/**
 * 框选：像素框 → `<bbox>` 的归一化坐标。
 * 两件事必须在这里做掉，否则就是"标记看起来对、改的却是别的地方"：
 *   1. **两个角的先后顺序要摆正**（用户可以从右下往左上拖），四个值都算完再排序；
 *   2. **退化成一条线/一个点的框直接丢掉**（宽或高归一化后为 0）—— 那种框上游理解不了，
 *      而用户会以为「我把这块框住了」。
 */
export function markerFromBox(imageIndex: number, box: Box2D, image: MarkerImageSize, keepUnchanged = false): ImageMarkerBox | null {
    if (image.width <= 0 || image.height <= 0) return null;
    const xs = [normalizeMarkerCoordinate(box.x1, image.width), normalizeMarkerCoordinate(box.x2, image.width)].sort((a, b) => a - b);
    const ys = [normalizeMarkerCoordinate(box.y1, image.height), normalizeMarkerCoordinate(box.y2, image.height)].sort((a, b) => a - b);
    const [x1, x2] = xs;
    const [y1, y2] = ys;
    if (x1 === x2 || y1 === y2) return null;
    return { kind: "bbox", imageIndex, x1, y1, x2, y2, ...(keepUnchanged ? { keepUnchanged: true } : {}) };
}

/** 标记 → 官方标记文字（图片编号在前，「保持不变」写在标记后面） */
export function formatImageMarker(marker: ImageMarker, label: (imageIndex: number) => string): string {
    const head = label(marker.imageIndex);
    const tag = marker.kind === "point" ? `<point>${marker.x} ${marker.y}</point>` : `<bbox>${marker.x1} ${marker.y1} ${marker.x2} ${marker.y2}</bbox>`;
    const keep = marker.keepUnchanged ? " 保持不变" : "";
    return `${head} ${tag}${keep}`;
}

/** 多个标记拼成一段可插入提示词的文字（标记之间用空格分隔，同一个句子里按先后顺序读） */
export function formatImageMarkers(markers: ImageMarker[], label: (imageIndex: number) => string): string {
    return markers.map((marker) => formatImageMarker(marker, label)).join(" ");
}

/**
 * 提示词里的标记体检（三种"钱照扣、图不对"的静默失败，全部在提交前挡住）：
 *   - 有标记、但一个参考图都没有 → 上游无从下手（noReferences）；
 *   - 标记前面找不到图片编号 → 模型不知道该改哪张图（noImageToken）；
 *   - 图片编号超出已挂参考图的范围（删掉参考图后最容易出现）→ 指到了不存在的图（outOfRange）。
 * 返回值是问题清单，空数组 = 没问题。词汇（`@图片 N` 还是 `图N`）由 tokenSource 注入。
 */
export type MarkerIssue = { reason: "noReferences" | "noImageToken" | "outOfRange"; token: string; imageIndex?: number };

export function validateMarkerReferences(text: string, options: { referenceCount: number; tokenSource: string }): MarkerIssue[] {
    const issues: MarkerIssue[] = [];
    if (!text) return issues;
    const tokenPattern = new RegExp(options.tokenSource, "g");
    const markerPattern = /<(point|bbox)>[^<>]*<\/\1>/g;
    let match: RegExpExecArray | null;
    while ((match = markerPattern.exec(text)) !== null) {
        const token = match[0];
        const head = text.slice(Math.max(0, match.index - IMAGE_TOKEN_LOOKBACK), match.index);
        const found = [...head.matchAll(tokenPattern)].pop();
        if (!found) {
            issues.push({ reason: options.referenceCount ? "noImageToken" : "noReferences", token });
            continue;
        }
        const imageIndex = Number(found[1]);
        if (options.referenceCount === 0) issues.push({ reason: "noReferences", token, imageIndex });
        else if (!Number.isFinite(imageIndex) || imageIndex < 1 || imageIndex > options.referenceCount) issues.push({ reason: "outOfRange", token, imageIndex });
    }
    return issues;
}

/** 提示词里有没有标记（决定要不要做支持性检查 / 提示） */
export function hasImageMarkers(text: string): boolean {
    return /<(point|bbox)>[^<>]*<\/\1>/.test(text ?? "");
}

/** 给用户看的体检结论（同一句话在各入口复用，避免三处各写一版文案） */
export const MARKER_ISSUE_HINT: Record<MarkerIssue["reason"], string> = {
    noReferences: "提示词里有交互编辑的坐标标记，但没有参考图：请先添加要编辑的图片，或删掉标记。",
    noImageToken: "提示词里的坐标标记前面没有图片编号：请写成「@图片 1 <bbox>…</bbox>」这种形式，让模型知道改哪张图。",
    outOfRange: "提示词里的坐标标记指向的参考图不存在（可能刚删过参考图）：请改回正确的编号，或删掉这条标记。",
};

/**
 * 模型不支持交互编辑、提示词里却带着标记时的说明。
 * 必须拦住而不是照发：上游对提示词里读不懂的内容是**静默忽略**的 —— 用户以为在改局部，
 * 实际得到一张重新画的图，钱照扣。
 */
export const MARKER_UNSUPPORTED_HINT = "当前模型不支持交互编辑：提示词里的 <point> / <bbox> 坐标标记不会被理解。请换用支持交互编辑的模型（标注入口只在那些模型上出现），或删掉标记。";
