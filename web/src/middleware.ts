import { NextRequest, NextResponse } from "next/server";
import { aliasOldUrl } from "./lib/old-url-aliases";

const PUBLIC_PATHS = [
    "/login",
    "/register",
    "/pricing",
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/session",
    "/api/auth/logout",
    "/api/auth/send-code",
    "/api/auth/verify-code",
    "/api/auth/github",
    "/api/auth/github/callback",
    "/api/payments/callback",
    "/api/prompts",
    "/api/billing/packages", // 积分包价目公开（定价页展示用）；下单接口仍保护
];

const STATIC_PREFIXES = [
    "/_next",
    "/canvas/_next",
    "/favicon",
    "/icon.png",
    "/apple-icon",
    "/opengraph-image",
    "/logo.svg",
    "/robots.txt",
    "/sitemap.xml",
    "/hero-frame.webp",
    "/character-asset.webp",
    "/commerce-visual.webp",
    "/brand-visual.webp",
    "/canvas/logo.svg",
    "/canvas/robots.txt",
    "/canvas/sitemap.xml",
    "/canvas/hero-frame.webp",
    "/canvas/character-asset.webp",
    "/canvas/commerce-visual.webp",
    "/canvas/brand-visual.webp",
    "/landing",
    "/fonts",
    "/canvas/landing",
    "/canvas/fonts",
];

const NOINDEX_HEADER = "noindex, nofollow";

/** 把请求重写到目标路径（保留查询串）。 */
function rewritten(request: NextRequest, target: string) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    return NextResponse.rewrite(url);
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 应用已从 basePath "/canvas" 迁移为无前缀路由。旧 /canvas/... 外链在这里先归一化，
    // 再按归一化后的路径统一判断公开/静态/鉴权，最后重写到目标路由。
    const alias = aliasOldUrl(pathname);
    const path = alias ?? pathname;

    // 落地页公开
    if (path === "/") {
        return alias ? rewritten(request, alias) : NextResponse.next();
    }

    if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
        return alias ? rewritten(request, alias) : NextResponse.next();
    }

    if (STATIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
        return alias ? rewritten(request, alias) : NextResponse.next();
    }

    // 登录后才能访问的页面（产品页）对搜索引擎声明不收录
    const noindex = (res: NextResponse) => {
        res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
        return res;
    };

    const token = request.cookies.get("ic_token")?.value;
    if (!token || token.length < 20) {
        if (path.startsWith("/api/")) {
            return NextResponse.json({ error: "请先登录" }, { status: 401 });
        }

        // from 用用户访问的原始路径回跳，登录后 router.push 能正确命中（含旧 /canvas/... 别名）
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("from", pathname);
        return noindex(NextResponse.redirect(loginUrl));
    }

    return noindex(alias ? rewritten(request, alias) : NextResponse.next());
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
