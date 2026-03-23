export const TYPE_OPTIONS = ["opportunity", "report", "reference", "project_note"] as const;

export const SOURCE_OPTIONS = ["nightly-recon", "stock-daily", "reddit", "web", "manual"] as const;

export const STATUS_OPTIONS = ["new", "interested", "in_progress", "done", "dismissed"] as const;

export type EntryType = (typeof TYPE_OPTIONS)[number];
export type EntrySource = (typeof SOURCE_OPTIONS)[number];
export type EntryStatus = (typeof STATUS_OPTIONS)[number];

export const TYPE_ICONS: Record<string, string> = {
  opportunity: "💡",
  report: "📊",
  reference: "📚",
  project_note: "📝",
};

export const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  interested: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  in_progress: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  done: "bg-green-500/20 text-green-400 border-green-500/30",
  dismissed: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export const TYPE_COLORS: Record<string, string> = {
  opportunity: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  report: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  reference: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  project_note: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeDate(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
