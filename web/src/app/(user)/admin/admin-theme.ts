import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

/** 管理后台暖色编辑风主题（与导航/定价页同一套品牌语言） */
export const adminTheme: ThemeConfig = {
    algorithm: antdTheme.defaultAlgorithm,
    cssVar: { key: "sceneflow-admin" },
    token: {
        colorPrimary: "#9b5b32",
        colorInfo: "#9b5b32",
        colorLink: "#9b5b32",
        colorLinkHover: "#8a4f2b",
        colorLinkActive: "#7d4726",
        colorText: "#201914",
        colorTextSecondary: "#7a6d63",
        colorTextTertiary: "#b7a99b",
        colorBgBase: "#f6efe4",
        colorBgContainer: "#fffdf8",
        colorBgElevated: "#fffdf8",
        colorBorder: "#ded2c3",
        colorBorderSecondary: "#eee4d5",
        colorSplit: "#eee4d5",
        borderRadius: 10,
    },
    components: {
        Button: {
            primaryShadow: "none",
        },
        Tabs: {
            inkBarColor: "#9b5b32",
            itemColor: "#7a6d63",
            itemHoverColor: "#201914",
            itemSelectedColor: "#201914",
        },
        Table: {
            headerBg: "#fffdf8",
            headerColor: "#7a6d63",
            headerSplitColor: "transparent",
            rowHoverBg: "#faf4ea",
            borderColor: "#eee4d5",
        },
        Select: {
            optionSelectedBg: "#f1e3cf",
            optionActiveBg: "#faf4ea",
        },
        Switch: {
            colorPrimary: "#9b5b32",
        },
        Tag: {
            defaultBg: "#f7f1e6",
            defaultColor: "#5a4f47",
        },
        Modal: {
            contentBg: "#fffdf8",
            headerBg: "#fffdf8",
            footerBg: "#fffdf8",
        },
        Input: {
            activeBorderColor: "#9b5b32",
            hoverBorderColor: "#c6a88f",
        },
        InputNumber: {
            activeBorderColor: "#9b5b32",
            hoverBorderColor: "#c6a88f",
        },
    },
};
