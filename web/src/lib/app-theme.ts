import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

const neutral = {
    light: {
        primary: "#4f6bff",
        primaryHover: "#3d5ce6",
        primaryText: "#ffffff",
        menuBg: "#f2f4f7",
        menuText: "#101828",
        selectActiveBg: "#f2f4f7",
        selectSelectedBg: "#eef1ff",
        selectText: "#101828",
        tableSelectedBg: "rgba(79, 107, 255, 0.08)",
        tableSelectedHoverBg: "rgba(79, 107, 255, 0.12)",
    },
    dark: {
        primary: "#f5f5f5",
        primaryHover: "#ffffff",
        primaryText: "#0a0a0a",
        menuBg: "#111111",
        menuText: "#f5f5f5",
        selectActiveBg: "#1a1a1a",
        selectSelectedBg: "#222222",
        selectText: "#f5f5f5",
        tableSelectedBg: "rgba(255, 255, 255, 0.06)",
        tableSelectedHoverBg: "rgba(255, 255, 255, 0.1)",
    },
};

export function getAntThemeConfig(dark: boolean): ThemeConfig {
    const color = dark ? neutral.dark : neutral.light;

    return {
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        cssVar: { key: dark ? "sceneflow-dark" : "sceneflow-light" },
        token: {
            colorPrimary: color.primary,
            colorInfo: color.primary,
            colorLink: color.primary,
            colorLinkHover: color.primaryHover,
            colorLinkActive: color.primary,
            colorTextLightSolid: color.primaryText,
            colorBgBase: dark ? "#0a0a0a" : "#f7f8fa",
            colorBgContainer: dark ? "#141414" : "#ffffff",
            colorBgElevated: dark ? "#1a1a1a" : "#ffffff",
            colorBorder: dark ? "rgba(255,255,255,0.06)" : "#e6e8ec",
            colorText: dark ? undefined : "#101828",
            colorTextSecondary: dark ? undefined : "#667085",
            borderRadius: 12,
            fontFamily: `"SF Pro Display","SF Pro Text","PingFang SC","Microsoft YaHei","Helvetica Neue",sans-serif`,
        },
        components: {
            Button: {
                primaryShadow: "none",
            },
            Menu: {
                itemActiveBg: color.menuBg,
                itemHoverBg: color.menuBg,
                itemSelectedBg: color.menuBg,
                itemSelectedColor: color.menuText,
                darkItemHoverBg: neutral.dark.menuBg,
                darkItemSelectedBg: neutral.dark.menuBg,
                darkItemSelectedColor: neutral.dark.menuText,
            },
            Select: {
                optionActiveBg: color.selectActiveBg,
                optionSelectedBg: color.selectSelectedBg,
                optionSelectedColor: color.selectText,
            },
            Table: {
                rowSelectedBg: color.tableSelectedBg,
                rowSelectedHoverBg: color.tableSelectedHoverBg,
            },
            Modal: {
                contentBg: dark ? "#141414" : "#ffffff",
                headerBg: dark ? "#141414" : "#ffffff",
                footerBg: dark ? "#141414" : "#ffffff",
            },
            Popover: {
                colorBgElevated: dark ? "#1a1a1a" : "#ffffff",
            },
            Drawer: {
                colorBgElevated: dark ? "#141414" : "#ffffff",
            },
            Card: {
                colorBgContainer: dark ? "#141414" : undefined,
            },
        },
    };
}
