// 旧版部署在 next.config 里配置了 basePath = "/canvas"，所有外部 URL 都带 /canvas 前缀
//（如 /canvas/image 即现在的 /image，/canvas/canvas 是画布库，/canvas 是落地页）。
// 移除 basePath 后，用这份别名表保持旧外链可访问，同时新的无前缀 URL 直接可用。
//
// 匹配规则：无尾斜杠条目只做精确匹配；带尾斜杠条目做前缀匹配并保留剩余路径。
// 注意：裸 /canvas/<id> 是画布项目页（动态路由 /canvas/[id]），绝不能落入通配别名，
// 因此这里只列旧版页面与固定前缀，不写 /canvas/:path* 通配。

const EXACT_ALIASES: Record<string, string> = {
    "/canvas": "/", // 旧落地页（basePath 时代的 /canvas = 内部 /）
    "/canvas/": "/",
    "/canvas/canvas": "/canvas", // 旧画布库
    "/canvas/cut": "/cut",
    "/canvas/image": "/image",
    "/canvas/video": "/video",
    "/canvas/login": "/login",
    "/canvas/register": "/register",
    "/canvas/pricing": "/pricing",
    "/canvas/prompts": "/prompts",
    "/canvas/billing": "/billing",
    "/canvas/assets": "/assets",
    "/canvas/agent-lab": "/agent-lab",
    "/canvas/admin": "/admin",
    "/canvas/webdav-proxy": "/webdav-proxy",
    "/canvas/sitemap.xml": "/sitemap.xml",
    "/canvas/robots.txt": "/robots.txt",
};

const PREFIX_ALIASES: Array<[string, string]> = [
    ["/canvas/canvas/", "/canvas/"], // 旧项目页 /canvas/canvas/<id>
    ["/canvas/api/", "/api/"], // 旧 API 路由（含 GitHub OAuth 回调）
    ["/canvas/_next/", "/_next/"], // 旧构建产物 / 图片优化地址
    ["/canvas/landing/", "/landing/"], // 旧公开资源
    ["/canvas/fonts/", "/fonts/"],
];

/** 把旧 /canvas/... 外部路径归一化为新的无前缀路径；不是旧路径则返回 null。 */
export function aliasOldUrl(pathname: string): string | null {
    const exact = EXACT_ALIASES[pathname];
    if (exact) return exact;
    for (const [from, to] of PREFIX_ALIASES) {
        if (pathname.startsWith(from)) return `${to}${pathname.slice(from.length)}`;
    }
    return null;
}
