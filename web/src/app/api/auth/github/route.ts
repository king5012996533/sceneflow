// GET /api/auth/github — 重定向到 GitHub OAuth 授权页
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GitHub OAuth 未配置" }, { status: 503 });
  }

  const configuredBase = process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://xingtudesign.com/canvas";
  const baseUrl = configuredBase.replace(/\/+$/, "");
  const redirectUri = `${baseUrl}/api/auth/github/callback`;

  // 生成一次性随机 state，存 HttpOnly cookie，防 OAuth CSRF / 账号绑定攻击
  const state = randomUUID();
  const response = NextResponse.redirect(`https://github.com/login/oauth/authorize?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "user:email",
    state,
  })}`);

  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 分钟
  });

  return response;
}
