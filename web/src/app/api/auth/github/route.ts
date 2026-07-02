// GET /api/auth/github — 重定向到 GitHub OAuth 授权页
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "GitHub OAuth 未配置" }, { status: 503 });
  }

  // 从 Host / x-forwarded-host 构造外部 URL（standalone 模式下 req.nextUrl.origin 是 localhost）
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "xingtudesign.com";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const basePath = "/canvas";
  const baseUrl = `${proto}://${host}${basePath}`;
  const redirectUri = `${baseUrl}/api/auth/github/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "user:email",
    state: "sceneflow",
  });

  return NextResponse.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
