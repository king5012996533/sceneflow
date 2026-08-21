import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

const neutral = {
    light: {
        primary: "#75827c",
        primaryHover: "#5f6d66",
        primaryText: "#ffffff",
        menuBg: "#f7f9f5",
        menuText: "#2a3330",
        selectActiveBg: "#f7f9f5",
        selectSelectedBg: "#e7ece8",
        selectText: "#2a3330",
        tableSelectedBg: "rgba(117, 130, 124, 0.08)",
        tableSelectedHoverBg: "rgba(117, 130, 124, 0.12)",
    },
    dark: {
        primary: "#90a098",
        primaryHover: "#a5b3ab",
        primaryText: "#18201c",
        menuBg: "#232a26",
        menuText: "#e7ebe8",
        selectActiveBg: "#232a26",
        selectSelectedBg: "#29332e",
        selectText: "#e7ebe8",
        tableSelectedBg: "rgba(144, 160, 152, 0.1)",
        tableSelectedHoverBg: "rgba(144, 160, 152, 0.16)",
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
            colorBgBase: dark ? "#161a18" : "#f4f6f2",
            colorBgContainer: dark ? "#1d221f" : "#ffffff",
            colorBgElevated: dark ? "#232a26" : "#ffffff",
            colorBorder: dark ? "#2c332f" : "#dde2dc",
            colorText: dark ? undefined : "#2a3330",
            colorTextSecondary: dark ? undefined : "#67726b",
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
                contentBg: dark ? "#1d221f" : "#ffffff",
                headerBg: dark ? "#1d221f" : "#ffffff",
                footerBg: dark ? "#1d221f" : "#ffffff",
            },
            Popover: {
                colorBgElevated: dark ? "#232a26" : "#ffffff",
            },
            Drawer: {
                colorBgElevated: dark ? "#1d221f" : "#ffffff",
            },
            Card: {
                colorBgContainer: dark ? "#1d221f" : undefined,
            },
        },
    };
}
