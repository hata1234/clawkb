"use client";

import useSWR from "swr";

export interface Branding {
  productName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  defaultTheme?: string;
  landingComponent?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Fetch branding overrides from plugin registry.
 */
export function useBranding() {
  const { data, isLoading } = useSWR<Branding>(
    "/api/plugins/branding",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300_000, // cache 5 minutes
      fallbackData: {},
    },
  );

  return {
    productName: data?.productName ?? "ClawKB",
    logoUrl: data?.logoUrl,
    faviconUrl: data?.faviconUrl,
    defaultTheme: data?.defaultTheme,
    isLoading,
  };
}
