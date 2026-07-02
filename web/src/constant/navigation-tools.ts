import { CreditCard, FileText, ImagePlus, Images, Maximize2, Shield, Video } from "lucide-react";

export const navigationTools = [
    {
        slug: "canvas",
        label: "我的画布",
        icon: Maximize2,
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
        slug: "pricing",
        label: "价格套餐",
        icon: CreditCard,
    },
    {
        slug: "admin",
        label: "管理后台",
        icon: Shield,
    },
] as const;

export type NavigationToolSlug = (typeof navigationTools)[number]["slug"];
