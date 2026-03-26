"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
export type ThemePreset = "craft" | "corporate" | "minimal";
export type Density = "comfortable" | "compact";

const ThemeContext = createContext<{
  theme: Theme;
  preset: ThemePreset;
  density: Density;
  toggleTheme: () => void;
  setPreset: (p: ThemePreset) => void;
  setDensity: (d: Density) => void;
}>({
  theme: "dark",
  preset: "craft",
  density: "comfortable",
  toggleTheme: () => {},
  setPreset: () => {},
  setDensity: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function loadPresetCSS(preset: ThemePreset) {
  const linkId = "theme-preset-css";
  let link = document.getElementById(linkId) as HTMLLinkElement | null;

  if (preset === "craft") {
    // craft is the built-in default — remove any loaded preset
    link?.remove();
    return;
  }

  if (!link) {
    link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = `/themes/${preset}.css`;
}

function applyDensity(density: Density) {
  document.documentElement.setAttribute("data-density", density);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [preset, setPresetState] = useState<ThemePreset>("craft");
  const [density, setDensityState] = useState<Density>("comfortable");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem("clawkb-theme") as Theme | null;
    if (storedTheme === "light" || storedTheme === "dark") setTheme(storedTheme);

    const storedPreset = localStorage.getItem("clawkb-preset") as ThemePreset | null;
    if (storedPreset === "craft" || storedPreset === "corporate" || storedPreset === "minimal") {
      setPresetState(storedPreset);
      loadPresetCSS(storedPreset);
    }

    const storedDensity = localStorage.getItem("clawkb-density") as Density | null;
    if (storedDensity === "comfortable" || storedDensity === "compact") {
      setDensityState(storedDensity);
      applyDensity(storedDensity);
    }

    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("clawkb-theme", theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (!mounted) return;
    loadPresetCSS(preset);
    localStorage.setItem("clawkb-preset", preset);
  }, [preset, mounted]);

  useEffect(() => {
    if (!mounted) return;
    applyDensity(density);
    localStorage.setItem("clawkb-density", density);
  }, [density, mounted]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  const setPreset = (p: ThemePreset) => setPresetState(p);
  const setDensity = (d: Density) => setDensityState(d);

  return (
    <ThemeContext.Provider value={{ theme, preset, density, toggleTheme, setPreset, setDensity }}>
      {children}
    </ThemeContext.Provider>
  );
}
