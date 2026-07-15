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
    "/api/experience-agent",
    "/api/agent-lab",
    "/agent-lab",
    "/showcase",
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
    "/hero-frame.png",
    "/character-asset.png",
    "/commerce-visual.png",
    "/brand-visual.png",
    "/canvas/logo.svg",
    "/canvas/robots.txt",
    "/canvas/sitemap.xml",
    "/canvas/hero-frame.png",
    "/canvas/character-asset.png",
    "/canvas/commerce-visual.png",
    "/canvas/brand-visual.png",
    "/canvas/showcase",
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // The app is deployed under basePath "/canvas"; that external path maps to
    // the public landing page. Keep "/canvas/canvas" and product pages protected.
    if (pathname === "/" || pathname === "/canvas") {
        return NextResponse.next();
    }

    if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
        return NextResponse.next();
    }

    if (STATIC_PREFIXES.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
        return NextResponse.next();
    }

    const token = request.cookies.get("ic_token")?.value;
    if (!token || token.length < 20) {
        if (pathname.startsWith("/api/") || pathname.startsWith("/canvas/api/")) {
            return NextResponse.json({ error: "请先登录" }, { status: 401 });
        }

        const loginUrl = new URL("/canvas/login", request.url);
        loginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
