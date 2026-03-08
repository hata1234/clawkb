"use client";

import { useState, useEffect } from "react";
import type { AllSettings } from "./settings";

// Shared module-level cache so multiple components in the same page don't re-fetch
let cached: AllSettings | null = null;
let fetchPromise: Promise<AllSettings> | null = null;

function doFetch(): Promise<AllSettings> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/settings")
    .then(r => r.json())
    .then((data: AllSettings) => { cached = data; fetchPromise = null; return data; })
    .catch(() => { fetchPromise = null; return null as unknown as AllSettings; });
  return fetchPromise;
}

export function useSettings(): AllSettings | null {
  const [settings, setSettings] = useState<AllSettings | null>(cached);

  useEffect(() => {
    if (cached) { setSettings(cached); return; }
    doFetch().then(s => s && setSettings(s));
  }, []);

  return settings;
}

/** Invalidate cache (call after saving settings) */
export function invalidateSettings() {
  cached = null;
  fetchPromise = null;
}
