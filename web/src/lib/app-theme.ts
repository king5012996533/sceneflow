import type { ThemeConfig } from "antd";
import { theme as antdTheme } from "antd";

const neutral = {
    light: {
        primary: "#4f5dff",
        primaryHover: "#3846e8",
        primaryText: "#ffffff",
        menuBg: "#f2ede4",
        menuText: "#172033",
        selectActiveBg: "#f3eee6",
        selectSelectedBg: "#ebe7ff",
        selectText: "#172033",
        tableSelectedBg: "rgba(79, 93, 255, 0.08)",
        tableSelectedHoverBg: "rgba(79, 93, 255, 0.12)",
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
            colorBgBase: dark ? "#0a0a0a" : "#f7f3ea",
            colorBgContainer: dark ? "#141414" : "#fffdfa",
            colorBgElevated: dark ? "#1a1a1a" : "#ffffff",
            colorBorder: dark ? "rgba(255,255,255,0.06)" : "#ded3c4",
            colorText: dark ? undefined : "#172033",
            colorTextSecondary: dark ? undefined : "#746b7a",
            borderRadius: 10,
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
                contentBg: dark ? "#141414" : "#fffefa",
                headerBg: dark ? "#141414" : "#fffefa",
                footerBg: dark ? "#141414" : "#fffefa",
            },
            Popover: {
                colorBgElevated: dark ? "#1a1a1a" : "#fffefa",
            },
            Drawer: {
                colorBgElevated: dark ? "#141414" : "#fffefa",
            },
            Card: {
                colorBgContainer: dark ? "#141414" : undefined,
            },
        },
    };
}
