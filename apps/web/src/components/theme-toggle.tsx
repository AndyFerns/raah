"use client";

import Script from "next/script";
import { useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("raah-theme", theme);
  } catch {
    /* storage disabled — no-op */
  }
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  // Server + first client render both use "light" so the tree matches during
  // hydration. The actual visible icon is controlled by CSS reading
  // `html[data-theme]`, which the pre-hydration script has already set — so
  // the correct icon shows from the first paint without any state drift.
  const [, setTheme] = useState<Theme>("light");

  const toggle = () => {
    const current =
      (typeof document !== "undefined"
        ? (document.documentElement.dataset.theme as Theme | undefined)
        : undefined) ?? "light";
    const next: Theme = current === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label="Toggle theme"
        title="Toggle theme"
        className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] hover:bg-[color:var(--surface-2)] transition-colors"
      >
        <span className="theme-icon-light inline-flex">
          <MoonIcon size={16} />
        </span>
        <span className="theme-icon-dark inline-flex">
          <SunIcon size={16} />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      className="w-full inline-flex items-center gap-3 h-10 px-3 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] hover:bg-[color:var(--surface-2)] transition-colors text-sm"
    >
      <span className="theme-icon-light inline-flex">
        <MoonIcon size={16} />
      </span>
      <span className="theme-icon-dark inline-flex">
        <SunIcon size={16} />
      </span>
      <span className="theme-label-light">Dark mode</span>
      <span className="theme-label-dark">Light mode</span>
    </button>
  );
}

/**
 * Inline theme-init script. Uses next/script with strategy="beforeInteractive"
 * so it runs before React hydrates and sets `html[data-theme]` — CSS variables
 * and the icon swap in ThemeToggle both key off that attribute.
 *
 * Render this in the root layout (not inside <head>).
 */
export function ThemeScript() {
  const src = `try{var t=localStorage.getItem('raah-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}`;
  return (
    <Script id="raah-theme-init" strategy="beforeInteractive">
      {src}
    </Script>
  );
}
