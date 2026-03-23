import { prisma } from "./prisma";

/**
 * Generate a document number for an entry based on its collection's prefix.
 * Uses atomic increment to prevent race conditions.
 *
 * @param collectionIds - Array of collection IDs the entry belongs to
 * @returns Generated doc number like "QP-RAW-0001", or null if no prefix configured
 */
export async function generateDocNumber(
  collectionIds: number[]
): Promise<string | null> {
  if (!collectionIds || collectionIds.length === 0) return null;

  // Find the first collection that has a docPrefix
  const collections = await prisma.collection.findMany({
    where: { id: { in: collectionIds }, docPrefix: { not: null } },
    select: { id: true, docPrefix: true },
    take: 1,
  });

  if (collections.length === 0) return null;

  const collection = collections[0];
  if (!collection.docPrefix) return null;

  // Atomically increment the counter and get the new value
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.collection.update({
      where: { id: collection.id },
      data: { docSeqCounter: { increment: 1 } },
      select: { docSeqCounter: true, docPrefix: true },
    });
    return result;
  });

  const seq = String(updated.docSeqCounter).padStart(4, "0");
  return `${updated.docPrefix}-${seq}`;
}
