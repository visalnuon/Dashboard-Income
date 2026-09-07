import { Link } from "react-router-dom";
import { BrandLogo } from "../components/BrandLogo";
import { CreateUserForm } from "../components/CreateUserForm";
import { useLanguage } from "../hooks/useLanguage";

export function RegisterPage() {
  const { t } = useLanguage();

  return (
    <div className="login-page">
      <div className="login-card">
        <aside className="login-brand">
          <BrandLogo className="login-logo" />
          <p className="login-kicker">{t("auth.brandKicker")}</p>
          <h2>{t("brand.name")}</h2>
          <p>{t("brand.tag")}</p>
        </aside>

        <section className="login-panel">
          <h1>{t("auth.registerTitle")}</h1>
          <p>{t("auth.registerBody")}</p>
          <CreateUserForm />
          <p className="login-switch">
            {t("auth.haveAccount")} <Link to="/login">{t("auth.signIn")}</Link>
          </p>
        </section>
      </div>
      <p className="login-footer">{t("auth.footer")}</p>
    </div>
  );
}
