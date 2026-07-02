// verification-code.ts — 验证码存储与校验（邮箱 + 手机通用）
import { prisma } from "@/lib/ic-prisma";

const CODE_TTL_MS = 300_000; // 5 分钟

export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function storeCode(target: string, method: "email" | "phone", code: string): Promise<void> {
  if (!prisma) throw new Error("数据库不可用");
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await prisma.verificationCode.upsert({
    where: { target_method: { target, method } },
    update: { code, expiresAt },
    create: { target, method, code, expiresAt },
  });
}

export async function verifyCode(target: string, method: "email" | "phone", code: string): Promise<boolean> {
  if (!prisma) return false;
  const record = await prisma.verificationCode.findUnique({
    where: { target_method: { target, method } },
  });
  if (!record) return false;
  if (record.expiresAt < new Date()) {
    await prisma.verificationCode.delete({ where: { id: record.id } }).catch(() => {});
    return false;
  }
  const valid = record.code === code;
  if (valid) {
    await prisma.verificationCode.delete({ where: { id: record.id } }).catch(() => {});
  }
  return valid;
}
