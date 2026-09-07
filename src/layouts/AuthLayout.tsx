import { Navigate, Outlet } from "react-router-dom";
import { LanguageToggle } from "../components/LanguageToggle";
import { LoadingState } from "../components/Status";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { readPostAuthPath } from "../services/localAuth";

export function AuthLayout() {
  const { isAuthed, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="login-page">
        <LoadingState message={t("auth.checkingSession")} />
      </div>
    );
  }
  if (isAuthed) return <Navigate to={readPostAuthPath()} replace />;
  return (
    <div className="auth-frame">
      <div className="auth-lang"><LanguageToggle /></div>
      <Outlet />
    </div>
  );
}
