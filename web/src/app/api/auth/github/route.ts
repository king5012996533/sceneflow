// GET /api/auth/github — 重定向到 GitHub OAuth 授权页
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GitHub OAuth 未配置" }, { status: 503 });
  }

  const baseUrl = req.nextUrl.origin;
  const redirectUri = `${baseUrl}/api/auth/github/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "user:email",
    state: "sceneflow",
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
