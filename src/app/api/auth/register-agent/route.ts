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

  const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12);
  const user = await prisma.user.create({
    data: {
      username,
      displayName: agentName,
      passwordHash,
      avatarUrl,
      approvalStatus: "approved",
      emailVerifiedAt: new Date(),
      agent: true,
    },
    include: userWithGroupInclude,
  });

  const token = await issueUserToken(user.id, `${agentName} token`, "agent");

  return NextResponse.json(
    {
      user: serializeUser(user),
      apiToken: token.token,
      token: {
        id: token.id,
        prefix: token.token_prefix,
        type: token.token_type,
      },
    },
    { status: 201 },
  );
}
