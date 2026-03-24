import crypto from "crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { issueUserToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_AUTH, getSetting } from "@/lib/settings";
import { serializeUser, userWithGroupInclude } from "@/lib/users";

export async function POST(request: Request) {
  const settings = await getSetting("auth", DEFAULT_AUTH);
  if (!settings.allowAgentRegistration) {
    return NextResponse.json({ error: "Agent registration is disabled" }, { status: 403 });
  }

  const body = await request.json();
  const agentName = String(body.name || "").trim();
  const avatarUrl = body.avatarUrl ? String(body.avatarUrl) : null;

  if (!agentName) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const usernameBase =
    agentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "agent";
  let username = usernameBase;
  let suffix = 1;
  while (await prisma.user.findUnique({ where: { username } })) {
    suffix += 1;
    username = `${usernameBase}-${suffix}`;
  }

  const requireApproval = settings.requireAdminApproval !== false;
  const approvalStatus = requireApproval ? "pending_approval" : "approved";

  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12);
  const user = await prisma.user.create({
    data: {
      username,
      displayName: agentName,
      passwordHash,
      avatarUrl,
      approvalStatus,
      emailVerifiedAt: new Date(),
      agent: true,
    },
    include: userWithGroupInclude,
  });

  // Only issue token if auto-approved
  let apiToken: string | null = null;
  let tokenInfo: { id: number; prefix: string; type: string } | null = null;
  if (approvalStatus === "approved") {
    const token = await issueUserToken(user.id, `${agentName} token`, "agent");
    apiToken = token.token;
    tokenInfo = { id: token.id, prefix: token.token_prefix, type: token.token_type };
  }

  return NextResponse.json(
    {
      user: serializeUser(user),
      ...(apiToken && { apiToken }),
      ...(tokenInfo && { token: tokenInfo }),
      requiresAdminApproval: requireApproval,
    },
    { status: 201 },
  );
}
