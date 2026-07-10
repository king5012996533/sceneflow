import type { CanvasShotPackLayout, CanvasShotPackShot } from "../types";

type ComposeOptions = {
    layout: CanvasShotPackLayout;
    showIndex: boolean;
    showCaption: boolean;
    title?: string;
};

type LoadedShot = CanvasShotPackShot & { image: HTMLImageElement };

const GAP = 22;
const PADDING = 34;
const HEADER_HEIGHT = 58;
const CAPTION_HEIGHT = 64;
const CELL_WIDTH = 520;
const CELL_HEIGHT = 320;
const STRIP_CELL_WIDTH = 430;
const STRIP_CELL_HEIGHT = 250;

export async function composeShotPackBlob(shots: CanvasShotPackShot[], options: ComposeOptions): Promise<Blob> {
    if (!shots.length) throw new Error("镜头包里还没有镜头图");
    const loaded = await Promise.all(shots.map(async (shot) => ({ ...shot, image: await loadImage(shot.imageUrl) })));
    const layout = resolveLayout(options.layout, loaded.length);
    const cell = options.layout === "strip" ? { width: STRIP_CELL_WIDTH, height: STRIP_CELL_HEIGHT } : { width: CELL_WIDTH, height: CELL_HEIGHT };
    const captionHeight = options.showCaption ? CAPTION_HEIGHT : 0;
    const width = PADDING * 2 + layout.cols * cell.width + (layout.cols - 1) * GAP;
    const height = PADDING * 2 + HEADER_HEIGHT + layout.rows * (cell.height + captionHeight) + (layout.rows - 1) * GAP;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("浏览器不支持图片合成");

    ctx.fillStyle = "#f7f4ef";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#111827";
    ctx.font = "600 30px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(options.title || "镜头包参考图", PADDING, 46);
    ctx.fillStyle = "#6b7280";
    ctx.font = "16px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText("按从左到右、从上到下的顺序阅读，用于视频模型理解连续分镜。", PADDING + 230, 45);

    loaded.forEach((shot, index) => {
        const row = Math.floor(index / layout.cols);
        const col = index % layout.cols;
        const x = PADDING + col * (cell.width + GAP);
        const y = PADDING + HEADER_HEIGHT + row * (cell.height + captionHeight + GAP);
        drawCell(ctx, shot, index, x, y, cell.width, cell.height, captionHeight, options.showIndex, options.showCaption);
    });

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("镜头包导出失败"))), "image/png", 0.94);
    });
}

export async function splitImageGrid(sourceUrl: string, rows: number, cols: number): Promise<Blob[]> {
    if (rows < 1 || cols < 1) throw new Error("切分行列不正确");
    const image = await loadImage(sourceUrl);
    const cellWidth = Math.floor(image.naturalWidth / cols);
    const cellHeight = Math.floor(image.naturalHeight / rows);
    const blobs: Blob[] = [];
    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
            const canvas = document.createElement("canvas");
            canvas.width = cellWidth;
            canvas.height = cellHeight;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("浏览器不支持九宫格切分");
            ctx.drawImage(image, col * cellWidth, row * cellHeight, cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);
            blobs.push(await canvasToBlob(canvas));
        }
    }
    return blobs;
}

function resolveLayout(layout: CanvasShotPackLayout, count: number) {
    if (layout === "grid-2") return { cols: 2, rows: Math.ceil(count / 2) };
    if (layout === "grid-3") return { cols: 3, rows: Math.ceil(count / 3) };
    if (layout === "horizontal") return { cols: count, rows: 1 };
    if (layout === "vertical") return { cols: 1, rows: count };
    if (layout === "strip") return { cols: Math.min(count, 4), rows: Math.ceil(count / Math.min(count, 4)) };
    const cols = count <= 4 ? 2 : 3;
    return { cols, rows: Math.ceil(count / cols) };
}

function drawCell(ctx: CanvasRenderingContext2D, shot: LoadedShot, index: number, x: number, y: number, width: number, height: number, captionHeight: number, showIndex: boolean, showCaption: boolean) {
    roundedRect(ctx, x, y, width, height + captionHeight, 18, "#ffffff", "#ded8cd");
    const imageBox = { x: x + 10, y: y + 10, width: width - 20, height: height - 20 };
    drawContainedImage(ctx, shot.image, imageBox.x, imageBox.y, imageBox.width, imageBox.height);
    if (showIndex) {
        ctx.fillStyle = "rgba(17, 24, 39, .76)";
        roundFill(ctx, x + 20, y + 20, 74, 34, 17);
        ctx.fillStyle = "#ffffff";
        ctx.font = "600 16px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
        ctx.fillText(`镜头 ${String(index + 1).padStart(2, "0")}`, x + 34, y + 43);
    }
    if (!showCaption) return;
    const captionY = y + height + 18;
    ctx.fillStyle = "#111827";
    ctx.font = "600 16px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.fillText(shot.title || `镜头 ${index + 1}`, x + 18, captionY);
    ctx.fillStyle = "#4b5563";
    ctx.font = "14px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    wrapText(ctx, [shot.description, shot.camera, shot.duration ? `${shot.duration}s` : ""].filter(Boolean).join(" / "), x + 18, captionY + 24, width - 36, 20, 2);
}

function drawContainedImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
    ctx.save();
    roundClip(ctx, x, y, width, height, 12);
    ctx.fillStyle = "#ede9e0";
    ctx.fillRect(x, y, width, height);
    const ratio = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * ratio;
    const drawHeight = image.naturalHeight * ratio;
    ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
    ctx.restore();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
    if (!text) return;
    const chars = Array.from(text);
    let line = "";
    let lines = 0;
    for (const char of chars) {
        const next = line + char;
        if (ctx.measureText(next).width > maxWidth && line) {
            ctx.fillText(line, x, y + lines * lineHeight);
            lines += 1;
            line = char;
            if (lines >= maxLines) return;
        } else {
            line = next;
        }
    }
    if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
}

function loadImage(src: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("镜头图读取失败"));
        image.src = src;
    });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("图片导出失败"))), "image/png", 0.94);
    });
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string, stroke: string) {
    ctx.save();
    roundPath(ctx, x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
}

function roundFill(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    roundPath(ctx, x, y, width, height, radius);
    ctx.fill();
}

function roundClip(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    roundPath(ctx, x, y, width, height, radius);
    ctx.clip();
}

function roundPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}
