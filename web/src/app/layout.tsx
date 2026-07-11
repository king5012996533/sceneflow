import type { Metadata } from "next";
import Script from "next/script";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import React from "react";

import { AppProviders } from "@/components/layout/app-providers";

import "antd/dist/reset.css";
import "./globals.css";

export const metadata: Metadata = {
    title: {
        default: "SceneFlow｜AI 视觉生产系统",
        template: "%s | SceneFlow",
    },
    description: "SceneFlow 是面向电商视觉、品牌内容、虚拟角色、分镜和视频创作的 AI 视觉生产系统。",
    keywords: ["AI 画布", "图片生成", "视频创作", "分镜规划", "角色设定", "视觉内容生产", "SceneFlow"],
    openGraph: {
        title: "SceneFlow｜AI 视觉生产系统",
        description: "从剧本、角色、分镜到关键帧与视频，把每一次创作沉淀为可复用的视觉资产。",
        url: "https://xingtudesign.com",
        siteName: "SceneFlow",
        locale: "zh_CN",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "SceneFlow｜AI 视觉生产系统",
        description: "把创意、角色与镜头沉淀在同一个可持续生产的视觉系统里。",
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
                        __html: `try{var s=JSON.parse(localStorage.getItem("infinite-canvas:theme_store")||"{}");var t=s.state&&s.state.theme==="dark"?"dark":"light";document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.style.colorScheme=t}catch(e){}`,
                    }}
                />
                <AntdRegistry>
                    <AppProviders>{children}</AppProviders>
                </AntdRegistry>
            </body>
        </html>
    );
}
