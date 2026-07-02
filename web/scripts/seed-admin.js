const { PrismaClient } = require("../src/generated/ic-prisma/client");
const bcrypt = require("bcryptjs");

async function main() {
  const prisma = new PrismaClient();
  const hashed = await bcrypt.hash("admin123", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin@xingtuai.cn" },
    update: {},
    create: {
      email: "admin@xingtuai.cn",
      password: hashed,
      name: "管理员",
      role: "admin",
    },
  });
  console.log("Created:", user.email, user.role);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
