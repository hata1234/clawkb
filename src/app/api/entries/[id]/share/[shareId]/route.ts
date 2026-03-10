import { prisma } from "@/lib/prisma";
import { getRequestPrincipal, jsonError } from "@/lib/auth";

// DELETE - Revoke a share link
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; shareId: string }> }) {
  const principal = await getRequestPrincipal(request);
  if (!principal) return jsonError("Unauthorized", 401);

  const { id, shareId } = await params;
  const entryId = Number(id);
  const linkId = Number(shareId);
  if (isNaN(entryId) || isNaN(linkId)) return jsonError("Invalid ID", 400);

  const link = await prisma.shareLink.findFirst({
    where: { id: linkId, entryId },
  });
  if (!link) return jsonError("Share link not found", 404);

  await prisma.shareLink.update({
    where: { id: linkId },
    data: { revokedAt: new Date() },
  });

  return new Response(null, { status: 204 });
}
