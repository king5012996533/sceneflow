// GET /api/auth/github/callback — GitHub OAuth 回调
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/ic-prisma";
import { signToken } from "@/lib/auth";

// 从请求头构造外部 base URL（standalone 模式下 req.url 是 localhost）
function getExternalBase(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "xingtudesign.com";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/canvas/login?error=github_no_code", getExternalBase(req)));
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/canvas/login?error=github_not_configured", getExternalBase(req)));
  }

  try {
    // 用 code 换 access_token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      return NextResponse.redirect(new URL("/login?error=github_token_failed", req.url));
    }

    // 获取 GitHub 用户信息
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/json" },
    });
    const githubUser = await userRes.json();

    // 获取 GitHub 用户邮箱
    const emailRes = await fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: "application/json" },
    });
    const emails = await emailRes.json();
    const primaryEmail = emails.find((e: { primary: boolean; verified: boolean }) => e.primary && e.verified)?.email
      || emails.find((e: { verified: boolean }) => e.verified)?.email
      || `${githubUser.login}@github.local`;

    if (!prisma) {
      return NextResponse.redirect(new URL("/login?error=db_unavailable", req.url));
    }

    // 查找或创建用户
    let user = await prisma.user.findFirst({
      where: { OR: [{ githubId: String(githubUser.id) }, { email: primaryEmail }] },
    });

    if (user) {
      // 已有账号：关联 GitHub ID（如果还没有的话）
      if (!user.githubId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { githubId: String(githubUser.id), emailVerified: user.emailVerified || new Date() },
        });
      }
    } else {
      // 新账号：自动创建
      user = await prisma.user.create({
        data: {
          email: primaryEmail,
          name: githubUser.name || githubUser.login,
          avatarUrl: githubUser.avatar_url,
          githubId: String(githubUser.id),
          emailVerified: new Date(),
        },
      });
    }

    // 签发 JWT，设置 cookie
    const token = signToken({ userId: user.id, email: user.email });
    const base = getExternalBase(req);
    const response = NextResponse.redirect(new URL("/canvas", base));
    response.cookies.set("ic_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 604800,
      path: "/",
    });
    return response;
  } catch (err: unknown) {
    console.error("GitHub OAuth error:", err);
    return NextResponse.redirect(new URL("/canvas/login?error=github_failed", getExternalBase(req)));
  }
}
