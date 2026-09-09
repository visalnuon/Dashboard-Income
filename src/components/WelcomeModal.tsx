import { Icon, type IconName } from "./Icon";
import { useLanguage } from "../hooks/useLanguage";
import type { TranslationKey } from "../i18n/translations";

const FEATURES: { icon: IconName; key: TranslationKey }[] = [
  { icon: "income", key: "welcome.featIncome" },
  { icon: "expense", key: "welcome.featExpenses" },
  { icon: "accounts", key: "welcome.featAccounts" },
  { icon: "budgets", key: "welcome.featBudget" },
  { icon: "categories", key: "welcome.featSpending" },
  { icon: "compare", key: "welcome.featTrends" },
  { icon: "target", key: "welcome.featGoals" },
  { icon: "spark", key: "welcome.featInsights" },
];

type WelcomeModalProps = {
  onStart: () => void;
  onDontShow: () => void;
};

export function WelcomeModal({ onStart, onDontShow }: WelcomeModalProps) {
  const { t } = useLanguage();

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal welcome-modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <div className="welcome-modal-head">
          <span className="welcome-badge"><Icon name="spark" /></span>
          <h2 id="welcome-title">{t("welcome.title")}</h2>
          <p>{t("welcome.subtitle")}</p>
        </div>
        <ul className="welcome-features">
          {FEATURES.map((item) => (
            <li key={item.key}>
              <span className="welcome-feat-icon"><Icon name={item.icon} /></span>
              {t(item.key)}
            </li>
          ))}
        </ul>
        <div className="modal-actions welcome-actions">
          <button type="button" className="ghost-btn bordered" onClick={onDontShow}>{t("welcome.dontShow")}</button>
          <button type="button" className="primary-btn" onClick={onStart}>{t("welcome.start")}</button>
        </div>
      </div>
    </div>
  );
}
