import { useEffect, useState } from "react";
import { SavingsGoals } from "../../components/SavingsGoals";
import { ErrorState, LoadingState } from "../../components/Status";
import { useGoals } from "../../hooks/useGoals";
import { useHiddenBalance } from "../../hooks/useHiddenBalance";
import { useLanguage } from "../../hooks/useLanguage";

export function MobileGoalsPage() {
  const { t } = useLanguage();
  const { hidden } = useHiddenBalance();
  const { data: goals, loading, error, reload } = useGoals();
  const [openSignal, setOpenSignal] = useState(0);

  useEffect(() => {
    // allow deep-link create via query ?new=1
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") setOpenSignal(1);
  }, []);

  if (loading) return <LoadingState message={t("common.loading")} />;
  if (error) return <ErrorState title={t("error.retryTitle")} message={error} action={{ label: t("common.tryAgain"), onClick: reload }} />;

  return (
    <div className="mobile-stack">
      <header className="mobile-page-head">
        <h1>{t("goal.title")}</h1>
      </header>
      <SavingsGoals goals={goals} hidden={hidden} onChange={reload} openSignal={openSignal} />
    </div>
  );
}
