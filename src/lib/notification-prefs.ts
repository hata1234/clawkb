// Notification preference types and defaults

export interface NotificationPrefs {
  comment_on_entry: "all" | "inapp" | "off";      // Someone comments on my entry
  favorite_updated: "all" | "inapp" | "off";       // A favorited entry is updated
  webhook_failed: "all" | "inapp" | "off";         // Webhook delivery failed (admin)
}

export const DEFAULT_PREFS: NotificationPrefs = {
  comment_on_entry: "all",       // in-app + email by default
  favorite_updated: "inapp",     // in-app only by default
  webhook_failed: "inapp",       // in-app only by default
};

export function resolvePrefs(raw: unknown): NotificationPrefs {
  const prefs = { ...DEFAULT_PREFS };
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    for (const key of Object.keys(DEFAULT_PREFS) as (keyof NotificationPrefs)[]) {
      const val = obj[key];
      if (val === "all" || val === "inapp" || val === "off") {
        prefs[key] = val;
      }
    }
  }
  return prefs;
}

/**
 * Given a notification type (e.g. "comment"), determine the pref key
 */
export function prefKeyForType(type: string): keyof NotificationPrefs | null {
  switch (type) {
    case "comment": return "comment_on_entry";
    case "favorite_updated": return "favorite_updated";
    case "webhook_failed": return "webhook_failed";
    default: return null;
  }
}
