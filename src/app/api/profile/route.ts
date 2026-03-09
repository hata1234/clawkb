import { NextResponse } from "next/server";
import { getSessionPrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializeUser, userWithGroupInclude } from "@/lib/users";

export async function GET() {
  const principal = await getSessionPrincipal();
  if (!principal?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: principal.id },
    include: userWithGroupInclude,
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ user: serializeUser(user) });
}

export async function PATCH(request: Request) {
  const principal = await getSessionPrincipal();
  if (!principal?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updated = await prisma.user.update({
    where: { id: principal.id },
    data: {
      displayName: body.displayName === undefined ? undefined : String(body.displayName || "").trim() || null,
      bio: body.bio === undefined ? undefined : String(body.bio || "").trim() || null,
      avatarUrl: body.avatarUrl === undefined ? undefined : String(body.avatarUrl || "").trim() || null,
    },
    include: userWithGroupInclude,
  });

  return NextResponse.json({ user: serializeUser(updated) });
}
