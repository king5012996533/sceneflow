import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

/**
 * SceneFlow 暖色编辑风 antd 主题（与导航/定价页/管理后台同一套品牌语言）。
 * cssVar key 需要每个独立 ConfigProvider 唯一，避免跨页面 token 串扰。
 */
export function sceneflowTheme(cssVarKey: string): ThemeConfig {
    return {
        algorithm: antdTheme.defaultAlgorithm,
        cssVar: { key: cssVarKey },
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
                defaultBg: "#fffdf8",
                defaultBorderColor: "#ded2c3",
                defaultColor: "#201914",
                defaultHoverBg: "#f1e3cf",
                defaultHoverBorderColor: "#9b5b32",
                defaultHoverColor: "#201914",
                dangerShadow: "none",
            },
            Select: {
                optionSelectedBg: "#f1e3cf",
                optionActiveBg: "#faf4ea",
                selectorBg: "#fffdf8",
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
            Checkbox: {
                colorPrimary: "#9b5b32",
            },
            // Drawer/Modal 的容器背景走全局 colorBgElevated（#fffdf8），antd 6 不再暴露 contentBg token
        },
    };
}
