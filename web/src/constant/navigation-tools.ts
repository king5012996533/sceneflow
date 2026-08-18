import { CreditCard, FileText, ImagePlus, Images, Maximize2, Scissors, Shield, Video } from "lucide-react";

export const navigationTools = [
    {
        slug: "canvas",
        label: "我的画布",
        icon: Maximize2,
        // 画布库的入口 URL：/canvas 已映射为旧版落地页，库页使用旧外链形式 /canvas/canvas
        path: "/canvas/canvas",
    },
    {
        slug: "image",
        label: "生图工作台",
        icon: ImagePlus,
    },
    {
        slug: "video",
        label: "视频创作台",
        icon: Video,
    },
    {
        slug: "prompts",
        label: "提示词库",
        icon: FileText,
    },
    {
        slug: "assets",
        label: "我的素材",
        icon: Images,
    },
    {
        slug: "cut",
        label: "后期剪辑器",
        icon: Scissors,
    },
    {
        slug: "pricing",
        label: "积分充值",
        icon: CreditCard,
    },
    {
        slug: "admin",
        label: "管理后台",
        icon: Shield,
        adminOnly: true,
    },
] as const;

export type NavigationTool = (typeof navigationTools)[number] & { path?: string };
export type NavigationToolSlug = NavigationTool["slug"];

export function getVisibleNavigationTools(role?: string | null) {
    return navigationTools.filter((tool) => !("adminOnly" in tool && tool.adminOnly) || role === "admin");
}
