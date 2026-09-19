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
            // 中间件会把请求体复制一份带下去，超过这个上限就**截断**：
            // Next 16 的默认是 10MB（body-streams.js 的 DEFAULT_BODY_CLONE_SIZE_LIMIT），
            // 于是所有「大素材」通道在自己上限之内就已经被截断了——表现为 route 里
            // req.json()/formData() 解析失败，报错却指向模型或输入，极难排查。
            // 2026-09-19 线上即为此：两张参考图打 Replicate 通道，日志出现
            // 「Request body exceeded 10MB … Only the first 10MB will be available」。
            // 链路要一层比一层宽，中间件才不会变成隐藏的天花板：
            //   nginx client_max_body_size 50m > 这里 52mb > 应用自设上限（41MB 信封 / 32MB 代理 / 16MB Replicate）
            // 代价：单个大请求在中间件拷贝期间最多占 ~2×52MB 内存；nginx 已把请求体卡在 50MB，不会更糟。
            // （键名：Next 16 用 experimental.proxyClientMaxBodySize，旧的 middlewareClientMaxBodySize 已废弃，两者不许同时设。）
            proxyClientMaxBodySize: "52mb",
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
                                      value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; media-src 'self' blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss: data: blob:; worker-src 'self' blob:;",
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
