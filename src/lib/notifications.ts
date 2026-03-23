import { prisma } from "./prisma";
import { sendNotificationEmail } from "./email";
import { getSmtpConfig } from "./email";
import { resolvePrefs, prefKeyForType } from "./notification-prefs";

export async function createNotification(
  userId: number,
  data: { type: string; title: string; body?: string; link?: string },
) {
  return prisma.notification.create({
    data: {
      userId,
      type: data.type,
      title: data.title,
      body: data.body,
      link: data.link,
    },
  });
}

export async function getUserNotifications(
  userId: number,
  opts: { unreadOnly?: boolean; limit?: number; offset?: number } = {},
) {
  const where: { userId: number; read?: boolean } = { userId };
  if (opts.unreadOnly) where.read = false;

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: opts.limit || 50,
    skip: opts.offset || 0,
  });
}

export async function markAsRead(notificationId: number, userId: number) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllAsRead(userId: number) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function getUnreadCount(userId: number): Promise<number> {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

export async function dispatchNotification(
  userId: number,
  data: { type: string; title: string; body?: string; link?: string },
) {
  try {
    // Load user + prefs
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, displayName: true, username: true, notificationPrefs: true },
    });
    if (!user) return;

    const prefs = resolvePrefs(user.notificationPrefs);
    const prefKey = prefKeyForType(data.type);
    const pref = prefKey ? prefs[prefKey] : "all"; // unknown types default to all

    // If off, skip entirely
    if (pref === "off") return;

    // Create in-app notification
    const notification = await createNotification(userId, data);

    // Send email if pref is "all", SMTP is enabled, and user has email
    if (pref === "all") {
      const smtpCfg = await getSmtpConfig();
      if (smtpCfg.enabled && user.email) {
        const emailBody = data.body
          ? `<p><strong>${data.title}</strong></p><p>${data.body}</p>`
          : `<p>${data.title}</p>`;
        const sent = await sendNotificationEmail(
          user as { email: string; displayName: string | null; username: string },
          `[ClawKB] ${data.title}`,
          emailBody,
        );
        if (sent) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: { emailSent: true },
          });
        }
      }
    }

    return notification;
  } catch (err) {
    console.error("[notifications] dispatchNotification failed:", err);
  }
}
