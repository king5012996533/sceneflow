import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/ic-prisma";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | null | undefined;
};

function createPrismaClient() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.warn("[ic-prisma] DATABASE_URL is not configured; database features are disabled.");
        return null;
    }

    try {
        const adapter = new PrismaPg({ connectionString, connectionTimeoutMillis: 5000 });
        const client = new PrismaClient({ adapter });
        client.$connect().catch((err: Error) => {
            console.warn("[ic-prisma] Database connection failed:", err.message);
        });
        return client;
    } catch (err) {
        console.warn("[ic-prisma] Failed to create Prisma client:", (err as Error).message);
        return null;
    }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
