import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";

export function AccountMenu() {
  const { profile, user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const name = profile?.email || user?.email || profile?.full_name || "admin";

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function handleLogout() {
    setOpen(false);
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="account-menu" ref={wrapRef}>
      <button
        type="button"
        className="icon-btn nav-icon"
        aria-expanded={open}
        aria-haspopup="menu"
        title={t("nav.settings")}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="settings" />
      </button>
      {open ? (
        <div className="account-dropdown" role="menu">
          <p className="account-logged">{t("nav.loggedInAs")}</p>
          <strong className="account-name">{name}</strong>
          <NavLink to="/settings" className="account-settings" role="menuitem" onClick={() => setOpen(false)}>
            <Icon name="settings" />
            {t("nav.settings")}
          </NavLink>
          <button type="button" className="account-logout" role="menuitem" onClick={() => void handleLogout()}>
            <Icon name="logout" />
            {t("nav.logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
