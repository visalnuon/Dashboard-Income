import { Link, useNavigate } from "react-router-dom";
import { Icon, type IconName } from "../../components/Icon";
import { LanguageToggle } from "../../components/LanguageToggle";
import { useAuth } from "../../hooks/useAuth";
import { useLanguage } from "../../hooks/useLanguage";
import { useTheme } from "../../hooks/useTheme";
import type { TranslationKey } from "../../i18n/translations";

const LINKS: { to: string; icon: IconName; labelKey: TranslationKey }[] = [
  { to: "/mobile/accounts", icon: "accounts", labelKey: "nav.accounts" },
  { to: "/mobile/budget", icon: "budgets", labelKey: "nav.budgets" },
  { to: "/more", icon: "file", labelKey: "page.more.title" },
  { to: "/settings", icon: "settings", labelKey: "nav.settings" },
  { to: "/help", icon: "help", labelKey: "nav.help" },
];

export function MobileMorePage() {
  const { t } = useLanguage();
  const { dark, toggle } = useTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="mobile-stack">
      <header className="mobile-page-head">
        <h1>{t("nav.more")}</h1>
      </header>

      <section className="mobile-more-list">
        {LINKS.map((item) => (
          <Link key={item.to} to={item.to} className="mobile-more-row">
            <span className="mobile-more-ico"><Icon name={item.icon} /></span>
            <span>{t(item.labelKey)}</span>
            <Icon name="chevronRight" />
          </Link>
        ))}

        <div className="mobile-more-row static">
          <span className="mobile-more-ico"><Icon name="categories" /></span>
          <span>{t("mobile.language")}</span>
          <LanguageToggle />
        </div>

        <button type="button" className="mobile-more-row" onClick={toggle}>
          <span className="mobile-more-ico"><Icon name={dark ? "sun" : "moon"} /></span>
          <span>{t("nav.toggleTheme")}</span>
          <Icon name="chevronRight" />
        </button>

        <button
          type="button"
          className="mobile-more-row"
          onClick={() => navigate("/mobile", { state: { openWelcome: true } })}
        >
          <span className="mobile-more-ico"><Icon name="spark" /></span>
          <span>{t("welcome.about")}</span>
          <Icon name="chevronRight" />
        </button>

        <button
          type="button"
          className="mobile-more-row danger"
          onClick={async () => {
            await signOut();
            navigate("/login", { replace: true });
          }}
        >
          <span className="mobile-more-ico"><Icon name="logout" /></span>
          <span>{t("nav.logout")}</span>
        </button>
      </section>
    </div>
  );
}
