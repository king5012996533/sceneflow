import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { checkSmsVerifyCode } from "@/lib/sms";
import { verifyCode } from "@/lib/verification-code";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const VERIFY_TOKEN_EXPIRY = "10m";

function verifyTokenSecret() {
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (secret) return secret;
    if (process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET or NEXTAUTH_SECRET must be configured in production");
    }
    return "infinite-canvas-dev-secret-key";
}

export async function POST(req: NextRequest) {
    try {
        const { target, method, code } = await req.json();

        if (!target || !method || !code) return NextResponse.json({ error: "参数不完整" }, { status: 400 });
        if (!/^\d{4,6}$/.test(code)) return NextResponse.json({ error: "验证码格式不正确" }, { status: 400 });

        // 防暴力破解：按 IP 限流 + 每个目标 5 分钟内最多 5 次尝试（与验证码 TTL 对齐）
        const ip = getClientIp(req);
        const ipAllowed = await checkRateLimit(`auth:verify:ip:${ip}`, { windowMs: 60_000, maxRequests: 10 });
        if (!ipAllowed) return NextResponse.json({ error: "尝试过于频繁，请稍后再试" }, { status: 429 });
        const targetAllowed = await checkRateLimit(`auth:verify:target:${method}:${target}`, { windowMs: 300_000, maxRequests: 5 });
        if (!targetAllowed) return NextResponse.json({ error: "验证码尝试次数过多，请重新获取验证码" }, { status: 429 });

        let valid = false;

        if (method === "email") {
            valid = await verifyCode(target, "email", code);
        } else if (method === "phone") {
            valid = await verifyCode(target, "phone", code);

            if (!valid && process.env.ALIYUN_SMS_ACCESS_KEY_ID) {
                const result = await checkSmsVerifyCode(target, code);
                valid = result.ok;
                if (!result.ok) console.warn("[verify-code] aliyun fallback failed:", result.error);
            }
        } else {
            return NextResponse.json({ error: "不支持的验证方式" }, { status: 400 });
        }

        if (!valid) return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });

        const token = jwt.sign({ target, method, purpose: "register" }, verifyTokenSecret(), {
            expiresIn: VERIFY_TOKEN_EXPIRY,
        });

        return NextResponse.json({ ok: true, token });
    } catch (err: unknown) {
        console.error("verify-code error:", err);
        const errorMessage = err instanceof Error ? err.message : String(err || "");
        if (/database|prisma|connection (terminated|reset|refused|closed|timeout)|can't reach|timed?\s*out/i.test(errorMessage)) {
            return NextResponse.json({ error: "数据库暂时不可用，请稍后再试" }, { status: 503 });
        }
        return NextResponse.json({ error: "验证码服务暂时不可用，请稍后再试" }, { status: 503 });
    }
}
