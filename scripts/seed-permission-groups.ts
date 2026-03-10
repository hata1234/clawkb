/**
 * Seed built-in permission groups and migrate existing users.
 *
 * Usage: DATABASE_URL="postgresql://..." npx tsx scripts/seed-permission-groups.ts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DB_URL = process.env.DATABASE_URL ?? "postgresql://localhost:5432/clawkb";
const adapter = new PrismaPg({ connectionString: DB_URL });
const prisma = new PrismaClient({ adapter });

const BUILT_IN_GROUPS = [
  {
    name: "Administrators",
    description: "Full access to all features",
    permissions: [
      { action: "read", scope: "global" },
      { action: "create", scope: "global" },
      { action: "edit", scope: "global" },
      { action: "delete", scope: "global" },
      { action: "manage_settings", scope: "global" },
      { action: "manage_users", scope: "global" },
    ],
  },
  {
    name: "Editors",
    description: "Can create entries and edit/delete their own",
    permissions: [
      { action: "read", scope: "global" },
      { action: "create", scope: "global" },
      { action: "edit", scope: "own" },
      { action: "delete", scope: "own" },
    ],
  },
  {
    name: "Viewers",
    description: "Read-only access",
    permissions: [
      { action: "read", scope: "global" },
    ],
  },
];

async function main() {
  console.log("Seeding built-in permission groups...");

  for (const group of BUILT_IN_GROUPS) {
    const existing = await prisma.permissionGroup.findUnique({ where: { name: group.name } });
    if (existing) {
      console.log(`  [skip] "${group.name}" already exists (id=${existing.id})`);
      continue;
    }

    const created = await prisma.permissionGroup.create({
      data: {
        name: group.name,
        description: group.description,
        builtIn: true,
        permissions: {
          create: group.permissions.map((p) => ({
            action: p.action,
            scope: p.scope,
          })),
        },
      },
    });
    console.log(`  [created] "${group.name}" (id=${created.id}) with ${group.permissions.length} permissions`);
  }

  // Migrate existing users based on their role field
  console.log("\nMigrating existing users to permission groups...");

  const roleToGroup: Record<string, string> = {
    admin: "Administrators",
    editor: "Editors",
    viewer: "Viewers",
  };

  const users = await prisma.user.findMany({ select: { id: true, username: true, role: true } });

  for (const user of users) {
    const groupName = roleToGroup[user.role] || "Viewers";
    const group = await prisma.permissionGroup.findUnique({ where: { name: groupName } });
    if (!group) continue;

    const exists = await prisma.userGroup.findUnique({
      where: { userId_groupId: { userId: user.id, groupId: group.id } },
    });
    if (exists) {
      console.log(`  [skip] ${user.username} already in "${groupName}"`);
      continue;
    }

    await prisma.userGroup.create({ data: { userId: user.id, groupId: group.id } });
    console.log(`  [assigned] ${user.username} (role=${user.role}) → "${groupName}"`);
  }

  console.log("\nDone!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
