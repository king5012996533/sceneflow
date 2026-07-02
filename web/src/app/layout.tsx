import type { Metadata } from "next";
import Script from "next/script";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AppProviders } from "@/components/layout/app-providers";
import "antd/dist/reset.css";
import "./globals.css";
import React from "react";

export const metadata: Metadata = {
    title: {
        default: "SceneFlow — AI 视觉内容生产工作台",
        template: "%s | SceneFlow",
    },
    description: "SceneFlow 是一款基于画布的 AI 视觉内容生产工具，支持图片生成、视频创作、角色设定、分镜规划，让创意从构思到交付在同一空间完成。",
    keywords: ["AI画布", "图片生成", "视频创作", "分镜规划", "角色设定", "视觉内容生产", "SceneFlow"],
    openGraph: {
        title: "SceneFlow — AI 视觉内容生产工作台",
        description: "基于画布的 AI 视觉内容生产工具，支持图片生成、视频创作、分镜规划。",
        url: "https://xingtudesign.com",
        siteName: "SceneFlow",
        locale: "zh_CN",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "SceneFlow — AI 视觉内容生产工作台",
        description: "基于画布的 AI 视觉内容生产工具，支持图片生成、视频创作、分镜规划。",
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="zh-CN" suppressHydrationWarning className="font-sans">
            <body
                className="bg-background text-foreground antialiased"
                style={{
                    fontFamily: '"SF Pro Display","SF Pro Text","PingFang SC","Microsoft YaHei","Helvetica Neue",sans-serif',
                }}
            >
                <Script
                    id="theme-script"
                    strategy="beforeInteractive"
                    dangerouslySetInnerHTML={{
                        __html: `try{var s=JSON.parse(localStorage.getItem("infinite-canvas:theme_store")||"{}");var t=s.state&&s.state.theme==="light"?"light":"dark";document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.style.colorScheme=t}catch(e){}`,
                    }}
                />
                <AntdRegistry>
                    <AppProviders>{children}</AppProviders>
                </AntdRegistry>
            </body>
        </html>
    );
}
