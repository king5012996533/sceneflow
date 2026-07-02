import { NextRequest, NextResponse } from "next/server";

// 公开路径（免登录）
const PUBLIC_PATHS = [
    "/",
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
    "/showcase",
];

// 静态资源前缀
const STATIC_PREFIXES = ["/_next", "/favicon", "/icon.png", "/apple-icon", "/opengraph-image", "/logo.svg", "/robots.txt", "/sitemap.xml"];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 公开路径放行
    if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
        return NextResponse.next();
    }
    // 静态资源放行
    if (STATIC_PREFIXES.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    const token = request.cookies.get("ic_token")?.value;
    if (!token || token.length < 20) {
        // API 请求返回 JSON 错误
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "请先登录" }, { status: 401 });
        }
        // 页面请求跳转登录
        const loginUrl = new URL("/canvas/login", request.url);
        loginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
