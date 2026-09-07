import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en, km, type Lang, type TranslationKey } from "../i18n/translations";
import type { FieldErrors } from "../utils/validation";

const STORAGE_KEY = "finora-lang";

export type TranslateFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

type LanguageContextValue = {
  lang: Lang;
  locale: string;
  setLang: (lang: Lang) => void;
  t: TranslateFn;
  te: (errors: FieldErrors) => FieldErrors;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}

function readStoredLang(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "km" || stored === "en" ? stored : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readStoredLang);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang === "km" ? "km" : "en";
  }, [lang]);

  const value = useMemo<LanguageContextValue>(() => {
    const table = lang === "km" ? km : en;
    const t: TranslateFn = (key, vars) => interpolate(table[key] ?? en[key], vars);
    return {
      lang,
      locale: lang === "km" ? "km-KH" : "en-US",
      setLang,
      t,
      te: (errors) => {
        const next: FieldErrors = {};
        for (const [field, message] of Object.entries(errors)) {
          next[field] = t(message as TranslationKey);
        }
        return next;
      },
    };
  }, [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
