import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AccountMenu } from "../components/AccountMenu";
import { BrandLogo } from "../components/BrandLogo";
import { ExperienceRedirect } from "../components/ExperienceRedirect";
import { Icon, type IconName } from "../components/Icon";
import { LanguageToggle } from "../components/LanguageToggle";
import { OfflineBanner } from "../components/OfflineBanner";
import { RateTicker } from "../components/RateTicker";
import { useLanguage } from "../hooks/useLanguage";
import { useTheme } from "../hooks/useTheme";
import { clearPostAuthPath } from "../services/localAuth";
import type { TranslationKey } from "../i18n/translations";

const NAV: { to: string; icon: IconName; labelKey: TranslationKey }[] = [
  { to: "/dashboard", icon: "home", labelKey: "nav.home" },
  { to: "/income", icon: "income", labelKey: "nav.income" },
  { to: "/expenses", icon: "expense", labelKey: "nav.expenses" },
  { to: "/accounts", icon: "accounts", labelKey: "nav.accounts" },
  { to: "/settings", icon: "settings", labelKey: "nav.settings" },
  { to: "/more", icon: "more", labelKey: "nav.more" },
];

const TITLES: Record<string, { title: TranslationKey; subtitle: TranslationKey }> = {
  "/dashboard": { title: "page.dashboard.title", subtitle: "page.dashboard.subtitle" },
  "/income": { title: "page.income.title", subtitle: "page.income.subtitle" },
  "/expenses": { title: "page.expenses.title", subtitle: "page.expenses.subtitle" },
  "/categories": { title: "page.categories.title", subtitle: "page.categories.subtitle" },
  "/accounts": { title: "page.accounts.title", subtitle: "page.accounts.subtitle" },
  "/budgets": { title: "page.budgets.title", subtitle: "page.budgets.subtitle" },
  "/settings": { title: "page.settings.title", subtitle: "page.settings.subtitle" },
  "/help": { title: "page.help.title", subtitle: "page.help.subtitle" },
  "/more": { title: "page.more.title", subtitle: "page.more.subtitle" },
};

const SEARCH_PATHS = new Set(["/dashboard", "/income", "/expenses"]);

export function AppLayout() {
  const { dark, toggle } = useTheme();
  const { t } = useLanguage();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const isHome = location.pathname === "/dashboard";
  const showSearch = SEARCH_PATHS.has(location.pathname);

  useEffect(() => {
    clearPostAuthPath();
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const meta = TITLES[location.pathname];

  const searchField = showSearch ? (
    <label className="search nav-search">
      <Icon name="search" />
      <input
        ref={searchRef}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("nav.search")}
      />
      {search ? (
        <button type="button" className="clear-search" onClick={() => setSearch("")}>{t("nav.clearSearch")}</button>
      ) : null}
    </label>
  ) : null;

  return (
    <div className={dark ? "app dark bank desktop-app" : "app bank desktop-app"}>
      <ExperienceRedirect />
      <OfflineBanner />
      {menuOpen ? <button className="nav-scrim" onClick={() => setMenuOpen(false)} aria-label={t("nav.closeMenu")} /> : null}

      <header className="site-header">
        <div className="util-bar">
          <div className="util-inner">
            <NavLink to="/dashboard" className="brand" aria-label={t("brand.name")}>
              <BrandLogo />
            </NavLink>
            {searchField}
            <div className="util-tools">
              <NavLink to="/help" className="util-link">{t("nav.help")}</NavLink>
              <LanguageToggle />
              <button className="icon-btn nav-icon" onClick={toggle} title={t("nav.toggleTheme")}>
                <Icon name={dark ? "sun" : "moon"} />
              </button>
              <AccountMenu />
              <button className="icon-btn menu-btn" onClick={() => setMenuOpen((value) => !value)} aria-label={t("nav.openMenu")}>
                <Icon name="menu" />
              </button>
            </div>
          </div>
        </div>
        <div className="menu-bar">
          <div className="menu-inner">
            <nav className={menuOpen ? "main-nav open" : "main-nav"} aria-label={t("nav.main")}>
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
                >
                  <Icon name={item.icon} />
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </nav>
            <RateTicker />
          </div>
        </div>
      </header>

      <main className="main">
        {isHome ? (
          <Outlet context={{ search, setSearch }} />
        ) : (
          <div className="page-wrap">
            <header className="page-head">
              <div className="topbar-copy">
                <div>
                  <h1>{t(meta?.title ?? "page.fallback.title")}</h1>
                  <p>{t(meta?.subtitle ?? "page.fallback.subtitle")}</p>
                </div>
              </div>
            </header>
            <Outlet context={{ search, setSearch }} />
          </div>
        )}
      </main>
    </div>
  );
}

export type AppOutletContext = {
  search: string;
  setSearch: (value: string) => void;
};
