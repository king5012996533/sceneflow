import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

const neutral = {
    light: {
        primary: "#a0713f",
        primaryHover: "#8a5e33",
        primaryText: "#ffffff",
        menuBg: "#f9f7f5",
        menuText: "#332f2a",
        selectActiveBg: "#f9f7f5",
        selectSelectedBg: "rgba(160, 113, 63, 0.10)",
        selectText: "#332f2a",
        tableSelectedBg: "rgba(160, 113, 63, 0.08)",
        tableSelectedHoverBg: "rgba(160, 113, 63, 0.12)",
    },
    dark: {
        primary: "#c08e4f",
        primaryHover: "#d0a75c",
        primaryText: "#201c18",
        menuBg: "#2a2723",
        menuText: "#ebe9e7",
        selectActiveBg: "#2a2723",
        selectSelectedBg: "rgba(192, 142, 79, 0.14)",
        selectText: "#ebe9e7",
        tableSelectedBg: "rgba(192, 142, 79, 0.1)",
        tableSelectedHoverBg: "rgba(192, 142, 79, 0.16)",
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
            colorBgBase: dark ? "#1a1816" : "#f6f4f2",
            colorBgContainer: dark ? "#22201d" : "#ffffff",
            colorBgElevated: dark ? "#2a2723" : "#ffffff",
            colorBorder: dark ? "#33302c" : "#e2dfdc",
            colorText: dark ? undefined : "#332f2a",
            colorTextSecondary: dark ? undefined : "#726d67",
            borderRadius: 12,
            fontFamily: '"HarmonyOS Sans SC","MiSans","PingFang SC","Noto Sans SC","Microsoft YaHei","SF Pro Text",sans-serif',
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
                contentBg: dark ? "#22201d" : "#ffffff",
                headerBg: dark ? "#22201d" : "#ffffff",
                footerBg: dark ? "#22201d" : "#ffffff",
            },
            Popover: {
                colorBgElevated: dark ? "#2a2723" : "#ffffff",
            },
            Drawer: {
                colorBgElevated: dark ? "#22201d" : "#ffffff",
            },
            Card: {
                colorBgContainer: dark ? "#22201d" : undefined,
            },
        },
    };
}
