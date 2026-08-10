import type { MetadataRoute } from "next";

// 只收录可公开访问、无需登录的页面。受登录保护的画布/工具页已在 middleware 中声明 noindex。
export default function sitemap(): MetadataRoute.Sitemap {
    const base = "https://xingtudesign.com";
    const now = new Date();
    return [
        { url: `${base}/canvas`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
        { url: `${base}/canvas/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    ];
}
