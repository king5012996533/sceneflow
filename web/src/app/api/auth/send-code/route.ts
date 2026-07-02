import { NextRequest, NextResponse } from "next/server";

import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendSmsVerifyCode } from "@/lib/sms";
import { generateCode, storeCode } from "@/lib/verification-code";

const PHONE_REGEX = /^1\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
    try {
        const { target, method } = await req.json();

        if (!target || !method) return NextResponse.json({ error: "参数不完整" }, { status: 400 });
        if (method !== "email" && method !== "phone") return NextResponse.json({ error: "验证方式无效" }, { status: 400 });
        if (method === "phone" && !PHONE_REGEX.test(target)) return NextResponse.json({ error: "手机号格式不正确" }, { status: 400 });
        if (method === "email" && !EMAIL_REGEX.test(target)) return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });

        const ip = getClientIp(req);
        const ipAllowed = await checkRateLimit(`auth:ip:${ip}`, { windowMs: 60_000, maxRequests: 1 });
        if (!ipAllowed) return NextResponse.json({ error: "发送太频繁，请稍后再试" }, { status: 429 });

        const targetAllowed = await checkRateLimit(`auth:target:${target}`, { windowMs: 300_000, maxRequests: 1 });
        if (!targetAllowed) return NextResponse.json({ error: "验证码已发送，请查收", retryAfter: 300 }, { status: 429 });

        const code = generateCode();

        if (method === "email") {
            await storeCode(target, "email", code);
            const result = await sendVerificationEmail(target, code);
            if (!result.ok) {
                if (process.env.NODE_ENV !== "production") {
                    console.log(`[DEV] 邮箱验证码 ${target}: ${code}`);
                    return NextResponse.json({ ok: true, dev: true });
                }
                return NextResponse.json({ error: result.error || "邮件发送失败" }, { status: 502 });
            }
            return NextResponse.json({ ok: true });
        }

        const hasAliyun = !!process.env.ALIYUN_SMS_ACCESS_KEY_ID;
        if (hasAliyun) {
            const result = await sendSmsVerifyCode(target, code);
            if (!result.ok) return NextResponse.json({ error: result.error || "短信发送失败" }, { status: 502 });
            await storeCode(target, "phone", code);
            return NextResponse.json({ ok: true });
        }

        await storeCode(target, "phone", code);
        if (process.env.NODE_ENV !== "production") {
            console.log(`[DEV] 短信验证码 ${target}: ${code}`);
            return NextResponse.json({ ok: true, dev: true });
        }

        return NextResponse.json({ error: "短信服务未配置" }, { status: 503 });
    } catch (err: unknown) {
        console.error("send-code error:", err);
        return NextResponse.json({ error: "发送失败" }, { status: 500 });
    }
}
