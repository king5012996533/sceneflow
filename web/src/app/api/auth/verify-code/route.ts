import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { checkSmsVerifyCode } from "@/lib/sms";
import { verifyCode } from "@/lib/verification-code";

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
