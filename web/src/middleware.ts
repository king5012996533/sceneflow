// middleware.ts — 路由鉴权（Edge Runtime，不能用 jsonwebtoken）
import { NextRequest, NextResponse } from "next/server";

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
  "/api/prompts",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路径放行
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // 静态资源放行
  if (pathname.startsWith("/_next") || pathname.startsWith("/showcase") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // 检查登录 cookie
  const token = request.cookies.get("ic_token")?.value;
  if (!token || token.length < 10) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
