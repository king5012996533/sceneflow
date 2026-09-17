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
            colorText: "#332f2a",
            colorTextSecondary: "#726d67",
            colorTextTertiary: "#a49f9a",
            colorBgBase: "#f6f4f2",
            colorBgContainer: "#ffffff",
            colorBgElevated: "#ffffff",
            colorBorder: "#e2dfdc",
            colorBorderSecondary: "#eeece9",
            colorSplit: "#eeece9",
            borderRadius: 10,
        },
        components: {
            Button: {
                primaryShadow: "none",
                defaultBg: "#ffffff",
                defaultBorderColor: "#e2dfdc",
                defaultColor: "#332f2a",
                defaultHoverBg: "#eceae7",
                defaultHoverBorderColor: "#a0713f",
                defaultHoverColor: "#332f2a",
                dangerShadow: "none",
            },
            Select: {
                optionSelectedBg: "#eceae7",
                optionActiveBg: "#f9f7f5",
                selectorBg: "#ffffff",
            },
            Switch: {
                colorPrimary: "#a0713f",
            },
            Tag: {
                defaultBg: "#f9f7f5",
                defaultColor: "#47423c",
            },
            Modal: {
                contentBg: "#ffffff",
                headerBg: "#ffffff",
                footerBg: "#ffffff",
            },
            Input: {
                activeBorderColor: "#a0713f",
                hoverBorderColor: "#a0713f",
            },
            InputNumber: {
                activeBorderColor: "#a0713f",
                hoverBorderColor: "#a0713f",
            },
            Checkbox: {
                colorPrimary: "#a0713f",
            },
            // Drawer/Modal 的容器背景走全局 colorBgElevated（#ffffff），antd 6 不再暴露 contentBg token
        },
    };
}
