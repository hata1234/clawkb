import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/agent-status?username=xxx
 *
 * Public endpoint (no auth required) for agents to poll their registration status.
 * Returns:
 * - pending_approval: agent registered, waiting for admin approval
 * - approved: agent approved — includes API token(s)
 * - rejected: agent rejected
 * - not_found: no agent with that username
 *
 * This is intentionally minimal — only returns status and token prefix/type.
 * Full tokens are only returned once at approval time via the admin API response,
 * or can be read here if the agent was auto-approved.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username")?.trim();

  if (!username) {
    return NextResponse.json({ error: "username query parameter is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      agent: true,
      approvalStatus: true,
      createdAt: true,
    },
  });

  if (!user || !user.agent) {
    return NextResponse.json({ status: "not_found" });
  }

  if (user.approvalStatus !== "approved") {
    return NextResponse.json({
      status: user.approvalStatus,
      username: user.username,
      displayName: user.displayName,
      registeredAt: user.createdAt,
    });
  }

  // Agent is approved — fetch their tokens
  const tokens = await prisma.apiToken.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      tokenPrefix: true,
      tokenType: true,
      name: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    status: "approved",
    username: user.username,
    displayName: user.displayName,
    registeredAt: user.createdAt,
    tokens: tokens.map((t) => ({
      id: t.id,
      prefix: t.tokenPrefix,
      type: t.tokenType,
      name: t.name,
      createdAt: t.createdAt,
    })),
  });
}
