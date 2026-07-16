// auth.ts — 认证工具函数
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextResponse } from "next/server";

const TOKEN_EXPIRY = "7d";
const TOKEN_MAX_AGE = 604800;
export const AUTH_COOKIE_NAME = "ic_token";

function jwtSecret() {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET or NEXTAUTH_SECRET must be configured in production");
  }
  return "infinite-canvas-dev-secret-key";
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { userId: string; email: string }): string {
  return jwt.sign(payload, jwtSecret(), { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, jwtSecret()) as { userId: string; email: string };
  } catch {
    return null;
  }
}

export function applyPrivateNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, private, max-age=0");
  response.headers.set("Vary", "Cookie");
  return response;
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TOKEN_MAX_AGE,
    path: "/",
  });
  return applyPrivateNoStore(response);
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return applyPrivateNoStore(response);
}
