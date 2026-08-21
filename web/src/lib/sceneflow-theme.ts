import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

/**
 * SceneFlow 灰绿主题 antd 主题（与导航/定价页/管理后台同一套品牌语言）。
 * cssVar key 需要每个独立 ConfigProvider 唯一，避免跨页面 token 串扰。
 */
export function sceneflowTheme(cssVarKey: string): ThemeConfig {
    return {
        algorithm: antdTheme.defaultAlgorithm,
        cssVar: { key: cssVarKey },
        token: {
            colorPrimary: "#a0713f",
            colorInfo: "#a0713f",
            colorLink: "#a0713f",
            colorLinkHover: "#8a5e33",
            colorLinkActive: "#7a5230",
            colorText: "#2a3330",
            colorTextSecondary: "#67726b",
            colorTextTertiary: "#9aa49e",
            colorBgBase: "#f4f6f2",
            colorBgContainer: "#ffffff",
            colorBgElevated: "#ffffff",
            colorBorder: "#dde2dc",
            colorBorderSecondary: "#e9eee9",
            colorSplit: "#e9eee9",
            borderRadius: 10,
        },
        components: {
            Button: {
                primaryShadow: "none",
                defaultBg: "#ffffff",
                defaultBorderColor: "#dde2dc",
                defaultColor: "#2a3330",
                defaultHoverBg: "#e7ece8",
                defaultHoverBorderColor: "#a0713f",
                defaultHoverColor: "#2a3330",
                dangerShadow: "none",
            },
            Select: {
                optionSelectedBg: "#e7ece8",
                optionActiveBg: "#f7f9f5",
                selectorBg: "#ffffff",
            },
            Switch: {
                colorPrimary: "#a0713f",
            },
            Tag: {
                defaultBg: "#f7f9f5",
                defaultColor: "#3c4742",
            },
            Modal: {
                contentBg: "#ffffff",
                headerBg: "#ffffff",
                footerBg: "#ffffff",
            },
            Input: {
                activeBorderColor: "#a0713f",
                hoverBorderColor: "#75827c",
            },
            InputNumber: {
                activeBorderColor: "#a0713f",
                hoverBorderColor: "#75827c",
            },
            Checkbox: {
                colorPrimary: "#a0713f",
            },
            // Drawer/Modal 的容器背景走全局 colorBgElevated（#ffffff），antd 6 不再暴露 contentBg token
        },
    };
}
