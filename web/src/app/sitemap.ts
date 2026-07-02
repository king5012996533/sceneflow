import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const base = "https://xingtudesign.com";
    return [
        { url: `${base}/canvas`, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
        { url: `${base}/canvas/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
        { url: `${base}/canvas/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
        { url: `${base}/canvas/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
        { url: `${base}/canvas/image`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
        { url: `${base}/canvas/video`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
        { url: `${base}/canvas/prompts`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    ];
}
