import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "postgresql://localhost:5432/clawkb" });
const prisma = new PrismaClient({ adapter });

const SEED_USERNAME = process.env.SEED_USERNAME ?? "admin";
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "change-me-on-first-login";

async function main() {
  const existingUser = await prisma.user.findUnique({ where: { username: SEED_USERNAME } });
  if (!existingUser) {
    const hash = await bcrypt.hash(SEED_PASSWORD, 12);
    await prisma.user.create({
      data: {
        username: SEED_USERNAME,
        displayName: SEED_USERNAME,
        passwordHash: hash,
        role: "admin",
        approvalStatus: "approved",
      },
    });
    console.log(`✅ Created user: ${SEED_USERNAME}`);
  } else {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: "admin",
        approvalStatus: "approved",
        displayName: existingUser.displayName || existingUser.username,
      },
    });
    console.log(`ℹ️  User ${SEED_USERNAME} already exists`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
