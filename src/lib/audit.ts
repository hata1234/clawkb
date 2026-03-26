import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface AuditLogInput {
  entityType: string;
  entityId?: number | null;
  action: string;
  actorId?: number | null;
  changes?: Record<string, { old?: unknown; new?: unknown }> | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Append an audit event. Fire-and-forget safe.
 * This is append-only — no UPDATE or DELETE should ever be performed on audit_events.
 */
export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        action: input.action,
        actorId: input.actorId ?? null,
        changes: input.changes ? (input.changes as unknown as Prisma.InputJsonValue) : undefined,
        metadata: input.metadata ? (input.metadata as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to write audit event:", err);
  }
}

/**
 * Compute a simple diff between old and new objects (shallow, top-level keys only).
 */
export function computeChanges(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fields?: string[],
): Record<string, { old: unknown; new: unknown }> | null {
  const keys = fields ?? [...new Set([...Object.keys(oldObj), ...Object.keys(newObj)])];
  const diff: Record<string, { old: unknown; new: unknown }> = {};

  for (const key of keys) {
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}
