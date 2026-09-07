import { useEffect, useState, type FormEvent } from "react";
import { LanguageToggle } from "../components/LanguageToggle";
import { UsersAdmin } from "../components/UsersAdmin";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";
import { TextField } from "../components/Field";

export function SettingsPage() {
  const { user, profile, updateName, changePassword, signOut, isAdmin } = useAuth();
  const { dark, toggle } = useTheme();
  const { notify } = useToast();
  const { t } = useLanguage();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile]);
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleName(event: FormEvent) {
    event.preventDefault();
    if (!fullName.trim()) {
      notify(t("toast.needName"), "error");
      return;
    }
    setSavingName(true);
    try {
      await updateName(fullName.trim());
      notify(t("toast.profileUpdated"));
    } catch (error) {
      notify(error instanceof Error ? error.message : t("toast.generic"), "error");
    } finally {
      setSavingName(false);
    }
  }

  async function handlePassword(event: FormEvent) {
    event.preventDefault();
    if (password.length < 6) {
      notify(t("toast.needPassword"), "error");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(password);
      setPassword("");
      notify(t("toast.passwordUpdated"));
    } catch (error) {
      notify(error instanceof Error ? error.message : t("toast.generic"), "error");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="settings-grid">
      {isAdmin ? <UsersAdmin /> : null}

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t("settings.profile")}</h2>
            <p>{t("settings.profileBody")}</p>
          </div>
        </div>
        <form onSubmit={handleName} className="form-stack">
          <TextField label={t("auth.fullName")} value={fullName} onChange={(event) => setFullName(event.target.value)} />
          <TextField label={t("auth.email")} value={profile?.email || user?.email || ""} readOnly />
          <button className="primary-btn" type="submit" disabled={savingName}>
            {savingName ? t("common.saving") : t("settings.saveProfile")}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t("settings.security")}</h2>
            <p>{t("settings.securityBody")}</p>
          </div>
        </div>
        <form onSubmit={handlePassword} className="form-stack">
          <TextField label={t("settings.newPassword")} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button className="primary-btn" type="submit" disabled={savingPassword}>
            {savingPassword ? t("settings.updating") : t("settings.updatePassword")}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t("settings.appearance")}</h2>
            <p>{t("settings.appearanceBody")}</p>
          </div>
        </div>
        <button className="ghost-btn bordered" onClick={toggle}>
          {dark ? t("settings.light") : t("settings.dark")}
        </button>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t("settings.language")}</h2>
            <p>{t("settings.languageBody")}</p>
          </div>
        </div>
        <LanguageToggle />
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t("settings.session")}</h2>
            <p>{t("settings.sessionBody")}</p>
          </div>
        </div>
        <button className="primary-btn danger-btn" onClick={() => void signOut()}>{t("nav.signOut")}</button>
      </section>
    </div>
  );
}
