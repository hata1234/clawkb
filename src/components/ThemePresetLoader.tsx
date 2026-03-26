"use client";

import { useEffect } from "react";
import { useBranding } from "@/hooks/useBranding";

/**
 * Loads theme preset CSS from /themes/<preset>.css if a plugin specifies a defaultTheme.
 * Place this in the root layout.
 */
export default function ThemePresetLoader() {
  const { defaultTheme } = useBranding();

  useEffect(() => {
    if (!defaultTheme || defaultTheme === "craft") return; // craft is the built-in default

    const linkId = "theme-preset-css";
    let link = document.getElementById(linkId) as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }

    link.href = `/themes/${defaultTheme}.css`;

    return () => {
      // Don't remove on unmount — theme should persist
    };
  }, [defaultTheme]);

  return null;
}
