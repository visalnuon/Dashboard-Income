import { useState, type FormEvent } from "react";
import { Icon } from "./Icon";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { useToast } from "../hooks/useToast";
import { localizeError } from "../i18n/localize";
import { setPostAuthPath } from "../services/localAuth";
import { validateRegister, type FieldErrors } from "../utils/validation";

export function CreateUserForm() {
  const { signUp } = useAuth();
  const { notify } = useToast();
  const { t, te } = useLanguage();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const nextErrors = te(validateRegister({ fullName, username, password }));
    setErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      setPostAuthPath("/income");
      const result = await signUp(fullName.trim(), username.trim(), password);
      if (result.needsConfirmation) {
        notify(t("toast.confirmEmail"));
      } else {
        notify(t("toast.accountCreated"));
      }
    } catch (error) {
      const message = error instanceof Error ? localizeError(error.message, t) : t("toast.registerFail");
      setFormError(message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <label>
        {t("auth.fullName")}
        <input
          value={fullName}
          autoComplete="name"
          className={errors.fullName ? "invalid" : undefined}
          onChange={(event) => setFullName(event.target.value)}
        />
        {errors.fullName ? <small className="field-error">{errors.fullName}</small> : null}
      </label>
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
            autoComplete="new-password"
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
      {formError ? <p className="login-form-error">{formError}</p> : null}
      <button className="primary-btn full login-submit" type="submit" disabled={submitting}>
        {submitting ? t("auth.creating") : t("auth.createUser")}
      </button>
    </form>
  );
}
