const { PrismaClient } = require("/root/infinite-canvas/src/generated/ic-prisma/client");
const { PrismaPg } = require("/root/infinite-canvas/node_modules/@prisma/adapter-pg");

async function main() {
  const p = new PrismaClient({
    adapter: new PrismaPg({ connectionString: "postgresql://genxing:genxing_prod_2026@127.0.0.1:5432/genxing" }),
  });
  const users = await p.user.findMany();
  console.log("Users:", users.length);
  users.forEach(u => console.log(" -", u.email, u.role));
  await p.$disconnect();
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
