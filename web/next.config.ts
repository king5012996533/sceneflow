import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { parseChangelog } from "@/lib/release";

const webDir = dirname(fileURLToPath(import.meta.url));
const localVersion = readFileSync(resolve(webDir, "../VERSION"), "utf8").trim() || "dev";
const localChangelog = readFileSync(resolve(webDir, "../CHANGELOG.md"), "utf8");

export default function nextConfig(phase: string): NextConfig {
    const isDev = phase === PHASE_DEVELOPMENT_SERVER;
    const releases = parseChangelog(localChangelog);

    return {
        output: "standalone",
        // 2G 内存服务器：构建并发限制为 1，避免多个 worker 各占一块大堆内存；
        // webpack 兜底构建时在主子进程内编译（不另开 worker）并启用省内存模式。
        experimental: {
            cpus: 1,
            webpackBuildWorker: false,
            webpackMemoryOptimizations: true,
        },
        // 完整类型检查由提交前的 npm run typecheck 负责；服务器构建可设 SKIP_BUILD_TYPECHECK=1 跳过以省内存。
        typescript: {
            ignoreBuildErrors: process.env.SKIP_BUILD_TYPECHECK === "1",
        },
        allowedDevOrigins: isDev ? ["*.*.*.*"] : [],
        async headers() {
            return [
                {
                    source: "/(.*)",
                    headers: [
                        { key: "X-Content-Type-Options", value: "nosniff" },
                        { key: "X-Frame-Options", value: "SAMEORIGIN" },
                        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
                        ...(process.env.NODE_ENV === "production"
                            ? [
                                  {
                                      key: "Content-Security-Policy",
                                      value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss:; worker-src 'self' blob:;",
                                  },
                              ]
                            : []),
                    ],
                },
            ];
        },
        env: {
            NEXT_PUBLIC_APP_VERSION: localVersion,
            NEXT_PUBLIC_APP_RELEASES: JSON.stringify(releases),
        },
    };
}
