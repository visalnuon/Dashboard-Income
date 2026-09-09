import { useState, type FormEvent } from "react";
import { BrandLogo } from "../components/BrandLogo";
import { CreateUserForm } from "../components/CreateUserForm";
import { Icon } from "../components/Icon";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { useToast } from "../hooks/useToast";
import { validateLogin, type FieldErrors } from "../utils/validation";

export function LoginPage() {
  const { signIn } = useAuth();
  const { notify } = useToast();
  const { t, te } = useLanguage();
  const [method, setMethod] = useState<"password" | "create">("password");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const nextErrors = te(validateLogin({ username, password }));
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      await signIn(username.trim(), password, remember);
      notify(t("toast.welcome"));
    } catch {
      setFormError(t("toast.badLogin"));
      setSubmitting(false);
    }
  }

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
          <h1>{method === "create" ? t("auth.registerTitle") : t("auth.welcome")}</h1>
          <p>{method === "create" ? t("auth.registerBody") : t("auth.signInBody")}</p>

          <div className="login-methods" role="tablist" aria-label={t("auth.signIn")}>
            <button
              type="button"
              role="tab"
              className={method === "password" ? "active" : ""}
              aria-selected={method === "password"}
              onClick={() => setMethod("password")}
            >
              {t("auth.signIn")}
            </button>
            <button
              type="button"
              role="tab"
              className={method === "create" ? "active" : ""}
              aria-selected={method === "create"}
              onClick={() => setMethod("create")}
            >
              {t("auth.createUser")}
            </button>
          </div>

          {method === "create" ? (
            <CreateUserForm />
          ) : (
            <form onSubmit={handleSubmit} className="login-form">
              <label>
                {t("auth.username")}
                <input
                  value={username}
                  autoComplete="username"
                  className={errors.username ? "invalid" : undefined}
                  onChange={(event) => setUsername(event.target.value)}
                />
                {errors.username ? <small className="field-error">{errors.username}</small> : null}
              </label>
              <label className="login-password">
                {t("auth.password")}
                <span className="login-password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    autoComplete="current-password"
                    className={errors.password ? "invalid" : undefined}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="login-eye"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} />
                  </button>
                </span>
                {errors.password ? <small className="field-error">{errors.password}</small> : null}
              </label>
              <label className="login-remember">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                {t("auth.remember")}
              </label>
              {formError ? <p className="login-form-error">{formError}</p> : null}
              <button className="primary-btn full login-submit" type="submit" disabled={submitting}>
                {submitting ? t("auth.signingIn") : t("auth.signIn")}
              </button>
            </form>
          )}
        </section>
      </div>
      <p className="login-footer">{t("auth.footer")}</p>
    </div>
  );
}
