import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

export type ActivityAction =
  | "entry.created"
  | "entry.updated"
  | "entry.deleted"
  | "entry.restored"
  | "comment.created";

export async function logActivity(
  action: ActivityAction,
  actorId: number | null,
  entryId: number | null,
  metadata: Record<string, unknown> = {},
) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        actorId,
        entryId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Fire-and-forget: don't let activity logging break main flows
  }
}
