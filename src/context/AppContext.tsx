import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import type { Language } from "../types/card";
import { copy, type CopyKey } from "../data/i18n";

type ThemeMode = "light" | "dark";

interface AppContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  t: (key: CopyKey) => string;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem("vizora.language"); } catch { /* storage can be unavailable */ }
    return stored === "tj" || stored === "en" ? stored : "ru";
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem("vizora.theme"); } catch { /* storage can be unavailable */ }
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try { localStorage.setItem("vizora.theme", theme); } catch { /* keep the interface usable */ }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem("vizora.language", language); } catch { /* keep the interface usable */ }
  }, [language]);

  const value = useMemo<AppContextValue>(
    () => ({
      language,
      setLanguage: setLanguageState,
      theme,
      toggleTheme: () =>
        setTheme((current) => (current === "light" ? "dark" : "light")),
      t: (key) => copy[language][key]
    }),
    [language, theme]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return context;
}
