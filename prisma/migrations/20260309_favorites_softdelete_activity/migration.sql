-- Add soft delete fields to Entry
ALTER TABLE "Entry" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Entry" ADD COLUMN "deletedBy" INTEGER;

-- Create UserFavorite table
CREATE TABLE "user_favorites" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "entryId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_favorites_userId_entryId_key" ON "user_favorites"("userId", "entryId");

ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_favorites" ADD CONSTRAINT "user_favorites_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create ActivityLog table
CREATE TABLE "activity_log" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" INTEGER,
    "entryId" INTEGER,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activity_log_createdAt_idx" ON "activity_log"("createdAt");
CREATE INDEX "activity_log_entryId_idx" ON "activity_log"("entryId");

ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
