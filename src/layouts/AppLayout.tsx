import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { AccountMenu } from "../components/AccountMenu";
import { BrandLogo } from "../components/BrandLogo";
import { LanguageToggle } from "../components/LanguageToggle";
import { RateTicker } from "../components/RateTicker";
import { useLanguage } from "../hooks/useLanguage";
import { useTheme } from "../hooks/useTheme";
import { clearPostAuthPath } from "../services/localAuth";
import type { TranslationKey } from "../i18n/translations";

const NAV: { to: string; labelKey: TranslationKey }[] = [
  { to: "/dashboard", labelKey: "nav.home" },
  { to: "/income", labelKey: "nav.income" },
  { to: "/expenses", labelKey: "nav.expenses" },
  { to: "/accounts", labelKey: "nav.accounts" },
  { to: "/budgets", labelKey: "nav.budgets" },
  { to: "/categories", labelKey: "nav.categories" },
  { to: "/settings", labelKey: "nav.settings" },
];

const BOTTOM_NAV: { to: string; icon: string; labelKey: TranslationKey }[] = [
  { to: "/dashboard", icon: "⌂", labelKey: "nav.home" },
  { to: "/income", icon: "↗", labelKey: "nav.income" },
  { to: "/expenses", icon: "↘", labelKey: "nav.expenses" },
  { to: "/accounts", icon: "▤", labelKey: "nav.accounts" },
  { to: "/budgets", icon: "▣", labelKey: "nav.budgets" },
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
};

export function AppLayout() {
  const { dark, toggle } = useTheme();
  const { t } = useLanguage();
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const isHome = location.pathname === "/dashboard";

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

  return (
    <div className={dark ? "app dark bank" : "app bank"}>
      {menuOpen ? <button className="nav-scrim" onClick={() => setMenuOpen(false)} aria-label={t("nav.closeMenu")} /> : null}

      <header className="site-header">
        <div className="util-bar">
          <div className="util-inner">
            <NavLink to="/dashboard" className="brand" aria-label={t("brand.name")}>
              <BrandLogo />
            </NavLink>
            <div className="util-tools">
              <NavLink to="/help" className="util-link">{t("nav.help")}</NavLink>
              <label className="search nav-search">
                <span>⌕</span>
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
              <LanguageToggle />
              <button className="icon-btn nav-icon" onClick={toggle} title={t("nav.toggleTheme")}>{dark ? "☀" : "☾"}</button>
              <AccountMenu />
              <button className="icon-btn menu-btn" onClick={() => setMenuOpen((value) => !value)} aria-label={t("nav.openMenu")}>☰</button>
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

      <nav className="bottom-nav" aria-label={t("nav.main")}>
        {BOTTOM_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? "bottom-nav-item active" : "bottom-nav-item")}
          >
            <span>{item.icon}</span>
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export type AppOutletContext = {
  search: string;
  setSearch: (value: string) => void;
};
