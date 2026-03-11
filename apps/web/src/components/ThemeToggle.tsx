"use client";

import { useState, useEffect } from "react";

type Theme = "light" | "dark" | "system";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) {
      setTheme(stored);
      applyTheme(stored);
    }
  }, []);

  function applyTheme(t: Theme) {
    const root = document.documentElement;
    if (t === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", t);
    }
  }

  function cycle() {
    const next: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setTheme(next);
    localStorage.setItem("theme", next);
    applyTheme(next);
  }

  const label = theme === "system" ? "Auto" : theme === "light" ? "Light" : "Dark";

  return (
    <button
      onClick={cycle}
      title={`Theme: ${label}`}
      style={{
        background: "none",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        color: "var(--muted)",
        cursor: "pointer",
        fontSize: "0.75rem",
        padding: "0.25rem 0.5rem",
        whiteSpace: "nowrap",
      }}
    >
      {theme === "light" ? "Sun" : theme === "dark" ? "Moon" : "Auto"}
    </button>
  );
}
