export type CanvasColorTheme = "light" | "dark" | "warm";
export type CanvasBackgroundMode = "dots" | "lines" | "blank";

export const canvasThemes = {
    light: {
        canvas: {
            background: "#f4f2ed",
            dot: "rgba(68,64,60,.28)",
            line: "rgba(68,64,60,.12)",
            selectionStroke: "#1c1917",
            selectionFill: "rgba(28,25,23,.06)",
        },
        node: {
            label: "#57534e",
            fill: "#e7e5df",
            panel: "#fbfaf7",
            stroke: "#d6d3ca",
            activeStroke: "#1c1917",
            placeholder: "#8a8479",
            text: "#292524",
            muted: "#78716c",
            faint: "#a8a29e",
        },
        toolbar: {
            panel: "rgba(251,250,247,.96)",
            border: "#d6d3ca",
            item: "#57534e",
            itemHover: "#e7e5df",
            activeBg: "#e7e5df",
            activeText: "#292524",
        },
    },
    dark: {
        canvas: {
            background: "#181715",
            dot: "rgba(245,245,244,.24)",
            line: "rgba(245,245,244,.10)",
            selectionStroke: "#fafaf9",
            selectionFill: "rgba(250,250,249,.10)",
        },
        node: {
            label: "#d6d3d1",
            fill: "#292524",
            panel: "#1f1d1a",
            stroke: "#44403c",
            activeStroke: "#fafaf9",
            placeholder: "#a8a29e",
            text: "#f5f5f4",
            muted: "#d6d3d1",
            faint: "#78716c",
        },
        toolbar: {
            panel: "rgba(31,29,26,.96)",
            border: "#44403c",
            item: "#d6d3d1",
            itemHover: "#292524",
            activeBg: "#3a3631",
            activeText: "#f5f5f4",
        },
    },
    // 创作台暖色编辑风（与导航/定价页/管理后台同一套品牌语言）
    warm: {
        canvas: {
            background: "#f6efe4",
            dot: "rgba(155,91,50,.20)",
            line: "rgba(155,91,50,.12)",
            selectionStroke: "#201914",
            selectionFill: "rgba(32,25,20,.06)",
        },
        node: {
            label: "#7a6d63",
            fill: "#f1e3cf",
            panel: "#fffdf8",
            stroke: "#ded2c3",
            activeStroke: "#9b5b32",
            placeholder: "#b7a99b",
            text: "#201914",
            muted: "#7a6d63",
            faint: "#b7a99b",
        },
        toolbar: {
            panel: "rgba(255,253,248,.96)",
            border: "#ded2c3",
            item: "#7a6d63",
            itemHover: "#f1e3cf",
            activeBg: "#f1e3cf",
            activeText: "#201914",
        },
    },
} as const;

export type CanvasTheme = (typeof canvasThemes)[CanvasColorTheme];
