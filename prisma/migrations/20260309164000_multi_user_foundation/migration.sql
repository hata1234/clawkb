-- Multi-user foundation.
-- Generated from schema diff because `prisma migrate dev --create-only`
-- could not connect to the local PostgreSQL instance in this workspace.

ALTER TABLE "User"
  ADD COLUMN "agent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN "avatarUrl" TEXT,
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "createdById" INTEGER,
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "emailVerificationExpires" TIMESTAMP(3),
  ADD COLUMN "emailVerificationToken" TEXT,
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "groupId" INTEGER,
  ADD COLUMN "role" TEXT NOT NULL DEFAULT 'viewer',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Entry"
  ADD COLUMN "authorId" INTEGER;

CREATE TABLE "RoleGroup" (
  "id" SERIAL NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "role" TEXT NOT NULL DEFAULT 'viewer',
  CONSTRAINT "RoleGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EntryComment" (
  "id" SERIAL NOT NULL,
  "entryId" INTEGER NOT NULL,
  "authorId" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EntryComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RoleGroup_name_key" ON "RoleGroup"("name");
CREATE INDEX "EntryComment_entryId_createdAt_idx" ON "EntryComment"("entryId", "createdAt");
CREATE INDEX "EntryComment_authorId_idx" ON "EntryComment"("authorId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User"("emailVerificationToken");

ALTER TABLE "User"
  ADD CONSTRAINT "User_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "RoleGroup"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User"
  ADD CONSTRAINT "User_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Entry"
  ADD CONSTRAINT "Entry_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EntryComment"
  ADD CONSTRAINT "EntryComment_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "Entry"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EntryComment"
  ADD CONSTRAINT "EntryComment_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "User"
SET "role" = 'admin',
    "updatedAt" = COALESCE("updatedAt", "createdAt");

-- api_tokens: migrate from raw SQL table to Prisma-managed
-- Create only if not exists (may already exist from auth-token.ts raw SQL)
CREATE TABLE IF NOT EXISTS "api_tokens" (
  "id" SERIAL NOT NULL,
  "name" VARCHAR(100),
  "token_hash" VARCHAR(64) NOT NULL,
  "token_prefix" VARCHAR(12) NOT NULL,
  "user_id" INTEGER,
  "token_type" VARCHAR(32) NOT NULL DEFAULT 'legacy',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_used_at" TIMESTAMPTZ,
  "revoked" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "api_tokens_token_hash_key" ON "api_tokens"("token_hash");
