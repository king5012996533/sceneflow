// rate-limit.ts — IP 级别 API 限流（数据库持久化）
import { prisma } from "@/lib/ic-prisma";

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<boolean> {
  if (!prisma) return true; // 数据库不可用时放行
  const now = new Date();
  const entry = await prisma.rateLimitEntry.findUnique({ where: { key } });

  if (!entry || entry.resetAt <= now) {
    await prisma.rateLimitEntry.upsert({
      where: { key },
      update: { count: 1, resetAt: new Date(now.getTime() + config.windowMs) },
      create: { key, count: 1, resetAt: new Date(now.getTime() + config.windowMs) },
    });
    return true;
  }
  if (entry.count >= config.maxRequests) return false;
  await prisma.rateLimitEntry.update({ where: { key }, data: { count: entry.count + 1 } });
  return true;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
