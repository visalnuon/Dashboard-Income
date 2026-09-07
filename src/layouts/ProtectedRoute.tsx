import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useLanguage } from "../hooks/useLanguage";
import { LoadingState } from "../components/Status";

export function ProtectedRoute() {
  const { isAuthed, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="app">
        <main className="main full-main">
          <LoadingState message={t("auth.loadingWorkspace")} />
        </main>
      </div>
    );
  }
  if (!isAuthed) return <Navigate to="/login" replace />;
  return <Outlet />;
}
