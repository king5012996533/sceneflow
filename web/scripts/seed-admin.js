const { PrismaClient } = require("../src/generated/ic-prisma/client");
const bcrypt = require("bcryptjs");

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "Admin";

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required to seed an admin account.");
  }

  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters.");
  }

  const prisma = new PrismaClient();
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password: hashed,
      name,
      role: "admin",
    },
  });
  console.log("Created:", user.email, user.role);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
