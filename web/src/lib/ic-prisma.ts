// ic-prisma.ts — Prisma Client 单例（数据库不可用时降级为 null）
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/ic-prisma";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("DATABASE_URL 未配置，数据库功能不可用");
    return null;
  }

  try {
    return new PrismaClient({
      adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5000 }),
    });
  } catch (err) {
    console.warn("数据库连接失败:", (err as Error).message);
    return null;
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
