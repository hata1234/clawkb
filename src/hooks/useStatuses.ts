"use client";

import useSWR from "swr";

export interface StatusDef {
  key: string;
  label: string;
  color?: string;
  icon?: string;
  allowedTransitions?: string[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Fetch status definitions from the plugin registry.
 * Falls back to built-in defaults if API is unavailable.
 */
export function useStatuses() {
  const { data, error, isLoading } = useSWR<{ statuses: StatusDef[] }>(
    "/api/plugins/statuses",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000, // cache for 1 minute
      fallbackData: {
        statuses: [
          { key: "new", label: "New", color: "#facc15" },
          { key: "interested", label: "Interested", color: "#60a5fa" },
          { key: "in_progress", label: "In Progress", color: "#c084fc" },
          { key: "done", label: "Done", color: "#4ade80" },
          { key: "dismissed", label: "Dismissed", color: "#71717a" },
        ],
      },
    },
  );

  const statuses = data?.statuses ?? [];
  const statusMap = new Map(statuses.map((s) => [s.key, s]));

  return {
    statuses,
    statusMap,
    getStatus: (key: string) => statusMap.get(key),
    getColor: (key: string) => statusMap.get(key)?.color ?? "#71717a",
    getLabel: (key: string) => statusMap.get(key)?.label ?? key.replace(/_/g, " "),
    isLoading,
    error,
  };
}
