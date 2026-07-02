import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { hashPassword, signToken } from "@/lib/auth";
import { prisma } from "@/lib/ic-prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const VERIFY_TOKEN_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || "infinite-canvas-secret-key";
const PHONE_REGEX = /^1\d{10}$/;

export async function POST(req: NextRequest) {
    try {
        if (!prisma) return NextResponse.json({ error: "数据库不可用" }, { status: 503 });

        const { email, password, name, verificationToken } = await req.json();

        const ip = getClientIp(req);
        const allowed = await checkRateLimit(`auth:register:${ip}`, { windowMs: 60_000, maxRequests: 3 });
        if (!allowed) return NextResponse.json({ error: "注册太频繁，请稍后再试" }, { status: 429 });

        if (!email) return NextResponse.json({ error: "邮箱或手机号不能为空" }, { status: 400 });
        if (!verificationToken) return NextResponse.json({ error: "请先完成验证码验证" }, { status: 400 });

        let payload: { target: string; method: string; purpose: string };
        try {
            payload = jwt.verify(verificationToken, VERIFY_TOKEN_SECRET) as { target: string; method: string; purpose: string };
        } catch {
            return NextResponse.json({ error: "验证码已过期，请重新验证" }, { status: 400 });
        }

        if (payload.purpose !== "register") return NextResponse.json({ error: "验证码无效" }, { status: 400 });

        const isPhoneRegister = payload.method === "phone";
        const expectedPhoneEmail = `${payload.target}@phone.local`;
        const targetMatches = isPhoneRegister ? email === payload.target || email === expectedPhoneEmail : email === payload.target;
        if (!targetMatches) return NextResponse.json({ error: "验证码无效" }, { status: 400 });

        if (password && password.length < 6) return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });

        const userEmail = isPhoneRegister ? expectedPhoneEmail : email;
        const existing = await prisma.user.findUnique({ where: { email: userEmail } });
        if (existing) return NextResponse.json({ error: isPhoneRegister ? "该手机号已注册" : "该邮箱已注册" }, { status: 409 });

        const hashed = password ? await hashPassword(password) : null;
        const user = await prisma.user.create({
            data: {
                email: userEmail,
                password: hashed,
                name: name || (isPhoneRegister && PHONE_REGEX.test(payload.target) ? payload.target.slice(-4) : userEmail.split("@")[0]),
                emailVerified: payload.method === "email" ? new Date() : undefined,
                phoneVerified: payload.method === "phone" ? new Date() : undefined,
                phone: payload.method === "phone" ? payload.target : undefined,
            },
        });

        const token = signToken({ userId: user.id, email: user.email });
        const response = NextResponse.json({
            user: { id: user.id, email: user.email, name: user.name, role: user.role },
        });
        response.cookies.set("ic_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 604800,
            path: "/",
        });
        return response;
    } catch (err: any) {
        console.error("Register error:", err);
        if (err?.code === "P1008" || String(err?.message || "").includes("timed out")) {
            return NextResponse.json({ error: "数据库连接超时" }, { status: 503 });
        }
        return NextResponse.json({ error: "注册失败" }, { status: 500 });
    }
}
