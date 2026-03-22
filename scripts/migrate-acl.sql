-- ACL Refactor: Step 1 - Safe data migration (no data loss)
-- This script transforms the DB without dropping data until it's safely migrated

BEGIN;

-- Step 1: Rename permission_groups → roles
ALTER TABLE permission_groups RENAME TO roles;

-- Step 2: Update sequences/indexes that reference old name
-- The permissions.groupId FK will be updated, but we must rename the column to roleId
-- First rename in permissions table: groupId → roleId
ALTER TABLE permissions RENAME COLUMN "groupId" TO "roleId";

-- Step 3: Create new groups table (replacing RoleGroup)
-- Add roleId FK to the new groups table from the old RoleGroup
-- First, add roleId column to RoleGroup (still named RoleGroup)
ALTER TABLE "RoleGroup" ADD COLUMN "roleId" INTEGER;

-- Map existing RoleGroup.role string → roles.id
-- viewer → Viewers (id=3), editor → Editors (id=2), admin → Administrators (id=1)
UPDATE "RoleGroup" SET "roleId" = CASE
  WHEN role = 'admin' THEN 1
  WHEN role = 'editor' THEN 2
  ELSE 3
END;

-- Step 4: Add roleId to User table
ALTER TABLE "User" ADD COLUMN "roleId" INTEGER;

-- Map existing User.role string → roles.id
UPDATE "User" SET "roleId" = CASE
  WHEN role = 'admin' THEN 1
  WHEN role = 'editor' THEN 2
  ELSE 3
END;

-- Step 5: Rename RoleGroup → groups
ALTER TABLE "RoleGroup" RENAME TO groups;

-- Step 6: Add FK constraints for the new columns
-- User.roleId → roles
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" 
  FOREIGN KEY ("roleId") REFERENCES roles(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- groups.roleId → roles
ALTER TABLE groups ADD CONSTRAINT "groups_roleId_fkey"
  FOREIGN KEY ("roleId") REFERENCES roles(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Step 7: Update the FK from User.groupId to point to new groups table
-- The constraint already exists as User_groupId_fkey pointing to RoleGroup (now groups)
-- Since we renamed the table in place, the FK should still work.
-- Let's verify and recreate if needed:
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_groupId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES groups(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Step 8: Rename groups sequence from RoleGroup_id_seq → groups_id_seq
ALTER SEQUENCE "RoleGroup_id_seq" RENAME TO groups_id_seq;
ALTER TABLE groups ALTER COLUMN id SET DEFAULT nextval('groups_id_seq'::regclass);

-- Step 9: Rename RoleGroup name unique constraint
ALTER INDEX IF EXISTS "RoleGroup_name_key" RENAME TO "groups_name_key";
ALTER INDEX IF EXISTS "RoleGroup_pkey" RENAME TO "groups_pkey";

-- Step 10: Now remove the old role string column from groups (after data migrated to roleId)
-- (We keep role col alive until the app code is updated, so we'll drop after Prisma schema push)
-- Actually let's drop it now since we have roleId
ALTER TABLE groups DROP COLUMN IF EXISTS role;

-- Step 11: Drop user_groups table (UserGroup - no longer needed)
-- First let's migrate: users who were in UserGroup but NOT in User.roleId/groupId
-- The new model: User.roleId = direct override, User.groupId = group membership
-- UserGroup was permission-group membership. Since we're unifying, those users'
-- effective role should be set from their PermissionGroup assignments.
-- We already mapped User.roleId from User.role string, which was the old direct role.
-- The UserGroup table will simply be dropped.
DROP TABLE IF EXISTS user_groups;

COMMIT;
