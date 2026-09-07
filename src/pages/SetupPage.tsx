import { useLanguage } from "../hooks/useLanguage";

export function SetupBanner() {
  const { t } = useLanguage();
  return (
    <div className="setup-banner">
      <strong>{t("setup.title")}</strong>
      <span>{t("setup.body")}</span>
    </div>
  );
}
