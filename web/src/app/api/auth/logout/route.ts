// POST /api/auth/logout — 登出
import { NextResponse } from "next/server";

import { clearAuthCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  return clearAuthCookie(response);
}
