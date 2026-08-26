// rate-limit.ts — IP 级别 API 限流（数据库持久化）
import { prisma } from "@/lib/ic-prisma";

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<boolean> {
  if (!prisma) return false; // 生产数据库不可用时拒绝敏感请求，避免限流失效
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
    // nginx 用 $remote_addr 覆写 X-Real-IP，客户端无法伪造；优先用它。
    // X-Forwarded-For 取最后一段（nginx 的 $proxy_add_x_forwarded_for 会把真实 IP 追加在末尾），
    // 不要取第一段——那是客户端可任意伪造的。
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
        const parts = forwarded.split(",").map((item) => item.trim()).filter(Boolean);
        if (parts.length) return parts[parts.length - 1];
    }
    return "unknown";
}
