import { useLanguage } from "../hooks/useLanguage";

export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="lang-toggle" role="group" aria-label={t("language.label")}>
      <button type="button" className={lang === "km" ? "active" : ""} aria-pressed={lang === "km"} onClick={() => setLang("km")}>
        <span className="flag" aria-hidden>🇰🇭</span>
        {t("language.khmer")}
      </button>
      <button type="button" className={lang === "en" ? "active" : ""} aria-pressed={lang === "en"} onClick={() => setLang("en")}>
        <span className="flag" aria-hidden>🇬🇧</span>
        {t("language.english")}
      </button>
    </div>
  );
}
