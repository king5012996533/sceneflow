// POST /api/auth/logout — 登出
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("ic_token", "", { maxAge: 0, path: "/" });
  return response;
}
