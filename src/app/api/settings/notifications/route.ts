import { NextRequest, NextResponse } from "next/server";
import { getRequestPrincipal } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePrefs, DEFAULT_PREFS, NotificationPrefs } from "@/lib/notification-prefs";

export async function GET(req: NextRequest) {
  const principal = await getRequestPrincipal(req);
  if (!principal?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: principal.id },
    select: { notificationPrefs: true },
  });

  return NextResponse.json({ prefs: resolvePrefs(user?.notificationPrefs) });
}

export async function PATCH(req: NextRequest) {
  const principal = await getRequestPrincipal(req);
  if (!principal?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const current = await prisma.user.findUnique({
    where: { id: principal.id },
    select: { notificationPrefs: true },
  });

  const prefs = resolvePrefs(current?.notificationPrefs);

  const validValues = ["all", "inapp", "off"];
  for (const key of Object.keys(DEFAULT_PREFS) as (keyof NotificationPrefs)[]) {
    if (body[key] && validValues.includes(body[key])) {
      prefs[key] = body[key];
    }
  }

  await prisma.user.update({
    where: { id: principal.id },
    data: { notificationPrefs: prefs as unknown as Record<string, string> },
  });

  return NextResponse.json({ prefs });
}
