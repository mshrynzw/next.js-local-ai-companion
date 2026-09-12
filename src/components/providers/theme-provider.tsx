"use client";

import * as React from "react";

export type ThemeMode = "dark" | "light" | "system";
export type AccentColor = "indigo" | "cyan" | "violet" | "blue";

const THEME_KEY = "local-ai-companion:theme";
const ACCENT_KEY = "local-ai-companion:accent";

export const ACCENT_OPTIONS: { value: AccentColor; label: string; swatch: string }[] = [
  { value: "indigo", label: "Indigo", swatch: "#818cf8" },
  { value: "cyan", label: "Cyan", swatch: "#22d3ee" },
  { value: "violet", label: "Violet", swatch: "#a78bfa" },
  { value: "blue", label: "Blue", swatch: "#60a5fa" },
];

interface Preferences {
  theme: ThemeMode;
  accent: AccentColor;
}

const SERVER_SNAPSHOT: Preferences = { theme: "dark", accent: "indigo" };

/**
 * Tiny external store (read via `useSyncExternalStore`) so persisted
 * preferences can be read on mount without ever calling `setState`
 * inside an effect. `getServerSnapshot` deliberately matches what the
 * server renders (dark / indigo), so hydration is safe: React quietly
 * reconciles once the real, possibly different, client value is read.
 */
function readInitialPreferences(): Preferences {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;

  const storedTheme = window.localStorage.getItem(THEME_KEY);
  const theme: ThemeMode =
    storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
      ? storedTheme
      : "dark";

  const storedAccent = window.localStorage.getItem(ACCENT_KEY);
  const accent: AccentColor = ACCENT_OPTIONS.some((o) => o.value === storedAccent)
    ? (storedAccent as AccentColor)
    : "indigo";

  return { theme, accent };
}

let preferences: Preferences = readInitialPreferences();
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return preferences;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

function commit(next: Partial<Preferences>) {
  preferences = { ...preferences, ...next };
  listeners.forEach((l) => l());
}

function setTheme(theme: ThemeMode) {
  window.localStorage.setItem(THEME_KEY, theme);
  commit({ theme });
}

function setAccent(accent: AccentColor) {
  window.localStorage.setItem(ACCENT_KEY, accent);
  commit({ accent });
}

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return mode === "dark";
}

function applyTheme(mode: ThemeMode) {
  const isDark = resolveIsDark(mode);
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.classList.toggle("light", !isDark);
}

function applyAccent(accent: AccentColor) {
  document.documentElement.setAttribute("data-accent", accent);
}

export function useTheme() {
  const { theme } = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { theme, setTheme };
}

export function useAccent() {
  const { accent } = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { accent, setAccent };
}

/**
 * Keeps the <html> element in sync with the current preferences. This
 * only needs to run once near the root; the inline script below already
 * applies the persisted values before hydration to avoid a flash.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, accent } = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  React.useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [theme]);

  React.useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  return <>{children}</>;
}

/** Inline, pre-hydration script that avoids a flash of the wrong theme/accent. */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = window.localStorage.getItem("${THEME_KEY}") || "dark";
    var isDark = theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : theme === "dark";
    var root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
    var accent = window.localStorage.getItem("${ACCENT_KEY}") || "indigo";
    root.setAttribute("data-accent", accent);
  } catch (e) {}
})();
`;
