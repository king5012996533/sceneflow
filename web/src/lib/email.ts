// email.ts — Resend 邮件发送（验证码）
import { Resend } from "resend";

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export async function sendVerificationEmail(email: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();
  if (!client) return { ok: false, error: "邮件服务未配置" };

  const from = process.env.RESEND_FROM_EMAIL || "noreply@xingtudesign.com";

  try {
    await client.emails.send({
      from,
      to: email,
      subject: "SceneFlow 验证码",
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f5;padding:40px 20px;text-align:center"><div style="max-width:400px;margin:0 auto;background:#fff;border-radius:12px;padding:40px 32px;box-shadow:0 2px 12px rgba(0,0,0,.08)"><h2 style="margin:0 0 8px;font-size:20px;color:#1a1a1a">SceneFlow</h2><p style="margin:0 0 24px;font-size:14px;color:#666">你的验证码是</p><div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#1a1a1a;padding:16px 0;border-top:1px solid #eee;border-bottom:1px solid #eee">${code}</div><p style="margin:24px 0 0;font-size:12px;color:#999">验证码 5 分钟内有效，请勿泄露给他人</p></div></body></html>`,
    });
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "邮件发送失败";
    return { ok: false, error: message };
  }
}
