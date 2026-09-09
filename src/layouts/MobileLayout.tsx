import { NavLink, Outlet } from "react-router-dom";
import { OfflineBanner } from "../components/OfflineBanner";
import { ExperienceRedirect } from "../components/ExperienceRedirect";
import { Icon, type IconName } from "../components/Icon";
import { useLanguage } from "../hooks/useLanguage";
import { useTheme } from "../hooks/useTheme";
import type { TranslationKey } from "../i18n/translations";

const MOBILE_NAV: { to: string; icon: IconName; labelKey: TranslationKey; end?: boolean }[] = [
  { to: "/mobile", icon: "home", labelKey: "nav.home", end: true },
  { to: "/mobile/activity", icon: "expense", labelKey: "nav.activity" },
  { to: "/mobile/transfer", icon: "transfer", labelKey: "nav.transfer" },
  { to: "/mobile/goals", icon: "target", labelKey: "nav.goals" },
  { to: "/mobile/more", icon: "more", labelKey: "nav.more" },
];

export function MobileLayout() {
  const { dark } = useTheme();
  const { t } = useLanguage();

  return (
    <div className={dark ? "app dark bank mobile-app" : "app bank mobile-app"}>
      <ExperienceRedirect />
      <OfflineBanner />
      <main className="mobile-main">
        <Outlet />
      </main>
      <nav className="mobile-tabbar" aria-label={t("nav.main")}>
        {MOBILE_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? "mobile-tab active" : "mobile-tab")}
          >
            <Icon name={item.icon} />
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
