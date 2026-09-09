import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const STORAGE_KEY = "finora-ui-theme";

type ThemeContextValue = {
  dark: boolean;
  setDark: (value: boolean) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const next = stored ? stored === "dark" : false;
    document.documentElement.classList.toggle("dark", next);
    return next;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const value = useMemo(
    () => ({ dark, setDark, toggle: () => setDark((current) => !current) }),
    [dark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
