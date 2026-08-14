import { NextRequest, NextResponse } from "next/server";

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
    "/api/billing/plans",
    "/api/payments/callback",
    "/api/prompts",
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

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // The app is deployed under basePath "/canvas"; the external "/canvas" URL maps to
    // the internal "/" landing page. The internal "/canvas" path (external "/canvas/canvas")
    // is the canvas project list and must stay protected like other product pages.
    if (pathname === "/") {
        return NextResponse.next();
    }

    if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
        return NextResponse.next();
    }

    if (STATIC_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
        return NextResponse.next();
    }

    // 登录后才能访问的页面（产品页）对搜索引擎声明不收录
    const noindex = (res: NextResponse) => {
        res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
        return res;
    };

    const token = request.cookies.get("ic_token")?.value;
    if (!token || token.length < 20) {
        if (pathname.startsWith("/api/") || pathname.startsWith("/canvas/api/")) {
            return NextResponse.json({ error: "请先登录" }, { status: 401 });
        }

        const loginUrl = new URL("/canvas/login", request.url);
        loginUrl.searchParams.set("from", pathname);
        return noindex(NextResponse.redirect(loginUrl));
    }

    return noindex(NextResponse.next());
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
