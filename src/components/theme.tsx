"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Icon from "~/components/icon";

export type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolved: Resolved;
  setTheme: (next: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const THEME_KEY = "zedu-theme";

const isTheme = (value: unknown): value is Theme =>
  value === "light" || value === "dark" || value === "system";

export const resolveTheme = (theme: Theme): Resolved => {
  if (theme === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }
  return theme;
};

/** Paint the document before React hydrates so there is no flash of dark. */
export const themeBootstrapScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"&&t!=="system"){t="dark"}var m=window.matchMedia("(prefers-color-scheme: light)");var r=t==="system"?(m.matches?"light":"dark"):t;var d=document.documentElement;d.dataset.theme=r;d.style.colorScheme=r}catch(e){}})()`;

export default function ThemeProvider({
  children,
  defaultTheme = "dark",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolved, setResolved] = useState<Resolved>("dark");

  /* read the stored preference once */
  useEffect(() => {
    let stored: Theme = defaultTheme;
    try {
      const raw = window.localStorage.getItem(THEME_KEY);
      if (isTheme(raw)) stored = raw;
    } catch {
      /* storage blocked — keep the default */
    }

    setThemeState(stored);
    const value = resolveTheme(stored);
    setResolved(value);
    document.documentElement.dataset.theme = value;
    document.documentElement.style.colorScheme = value;
  }, [defaultTheme]);

  /* follow the OS while the preference is "system" */
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      const next = resolveTheme("system");
      setResolved(next);
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    const value = resolveTheme(next);
    setResolved(value);
    document.documentElement.dataset.theme = value;
    document.documentElement.style.colorScheme = value;
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage blocked — the choice still applies for this session */
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "system" as Theme,
      resolved: "dark" as Resolved,
      setTheme: () => {},
    };
  }
  return ctx;
}

const APPEARANCE: Record<
  Theme,
  { label: string; icon: "monitor" | "sun" | "moon"; next: Theme }
> = {
  dark: { label: "Dark", icon: "moon", next: "light" },
  light: { label: "Light", icon: "sun", next: "system" },
  system: { label: "Match system", icon: "monitor", next: "dark" },
};

/** Rail-sized icon button for the studio: cycles dark → light → system. */
export function ThemeRailToggle() {
  const { theme, setTheme } = useTheme();
  const current = APPEARANCE[theme];

  return (
    <button
      type="button"
      className={`rail__btn${theme !== "dark" ? " is-on" : ""}`}
      onClick={() => setTheme(current.next)}
      title={`${current.label} — switch to ${APPEARANCE[current.next].label}`}
      aria-label={`Theme: ${current.label}. Switch to ${APPEARANCE[current.next].label}.`}
    >
      <Icon name={current.icon} />
    </button>
  );
}

/**
 * One button, three states: dark → light → system → dark. The icon shows
 * the current choice; the tooltip says what the next click will do.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const current = APPEARANCE[theme];
  const next = APPEARANCE[current.next];

  return (
    <button
      type="button"
      className={`theme-toggle${className ? ` ${className}` : ""}`}
      onClick={() => setTheme(current.next)}
      title={`${current.label} — switch to ${next.label}`}
      aria-label={`Theme: ${current.label}. Switch to ${next.label}.`}
    >
      <Icon name={current.icon} size={15} />
    </button>
  );
}
