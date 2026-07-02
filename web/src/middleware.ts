import { NextRequest, NextResponse } from "next/server";

const BASE_PATH = "/canvas";

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
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    if (PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
        return NextResponse.next();
    }

    if (pathname.startsWith("/_next") || pathname.startsWith("/showcase") || pathname === "/favicon.ico") {
        return NextResponse.next();
    }

    const token = request.cookies.get("ic_token")?.value;
    if (!token || token.length < 10) {
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "请先登录" }, { status: 401 });
        }
        return NextResponse.redirect(new URL(`${BASE_PATH}/login`, request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
