import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

const neutral = {
    light: {
        primary: "#171717",
        primaryHover: "#000000",
        primaryText: "#ffffff",
        menuBg: "#f5f5f5",
        menuText: "#171717",
        selectActiveBg: "#f5f5f5",
        selectSelectedBg: "#f0f0f0",
        selectText: "#171717",
        tableSelectedBg: "rgba(17, 17, 17, 0.05)",
        tableSelectedHoverBg: "rgba(17, 17, 17, 0.08)",
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
            colorBgContainer: dark ? "#141414" : undefined,
            colorBgElevated: dark ? "#1a1a1a" : undefined,
            colorBorder: dark ? "rgba(255,255,255,0.06)" : undefined,
            borderRadius: 6,
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
                contentBg: dark ? "#141414" : undefined,
                headerBg: dark ? "#141414" : undefined,
            },
            Popover: {
                colorBgElevated: dark ? "#1a1a1a" : undefined,
            },
            Card: {
                colorBgContainer: dark ? "#141414" : undefined,
            },
        },
    };
}
