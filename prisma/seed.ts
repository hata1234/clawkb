import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: "postgresql://hata1234@localhost:5432/knowledge_hub" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existingUser = await prisma.user.findUnique({ where: { username: "boss" } });
  if (!existingUser) {
    const hash = await bcrypt.hash("Kn0wl3dg3Hub!2026", 12);
    await prisma.user.create({ data: { username: "boss", passwordHash: hash } });
    console.log("✅ Created user: boss");
  } else {
    console.log("ℹ️  User boss already exists");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
