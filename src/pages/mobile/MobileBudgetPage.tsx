import { useMemo } from "react";
import { CountMoney } from "../../components/CountMoney";
import { ProgressBar } from "../../components/ProgressBar";
import { ErrorState, LoadingState } from "../../components/Status";
import { useBudgets } from "../../hooks/useBudgets";
import { useHiddenBalance } from "../../hooks/useHiddenBalance";
import { useLanguage } from "../../hooks/useLanguage";
import { useAllTransactions } from "../../hooks/useTransactions";
import { localizeName } from "../../i18n/localize";
import { currentMonthYear, monthBounds, monthLabel } from "../../utils/dates";
import { clampPercent, formatMoney, toNumber } from "../../utils/format";
import { budgetAlertKey } from "../../utils/insights";

export function MobileBudgetPage() {
  const { t, locale } = useLanguage();
  const { hidden } = useHiddenBalance();
  const now = currentMonthYear();
  const { data: budgets, loading: budgetsLoading, error: budgetsError, reload: reloadBudgets } = useBudgets(now.month, now.year);
  const { data: allTx, loading: txLoading, error: txError, reload: reloadTx } = useAllTransactions({});
  const bounds = monthBounds(now.month, now.year);
  const monthTx = useMemo(
    () => allTx.filter((row) => row.transaction_date >= bounds.from && row.transaction_date <= bounds.to && row.type === "expense"),
    [allTx, bounds.from, bounds.to],
  );
  const expenses = monthTx.reduce((sum, row) => sum + toNumber(row.amount), 0);
  const budgetTotal = budgets.reduce((sum, row) => sum + row.amount, 0);
  const budgetPct = budgetTotal > 0 ? (expenses / budgetTotal) * 100 : 0;
  const remaining = budgetTotal - expenses;
  const loading = budgetsLoading || txLoading;
  const error = budgetsError || txError;

  if (loading) return <LoadingState message={t("common.loading")} />;
  if (error) {
    return (
      <ErrorState
        title={t("error.retryTitle")}
        message={error}
        action={{ label: t("common.tryAgain"), onClick: () => { reloadBudgets(); reloadTx(); } }}
      />
    );
  }

  return (
    <div className="mobile-stack">
      <header className="mobile-page-head">
        <div>
          <h1>{t("dashboard.budgetTitle")}</h1>
          <p className="muted">{monthLabel(now.month, now.year, locale)}</p>
        </div>
      </header>

      <section className="panel mobile-budget-card">
        <div className="budget-total">
          <strong><CountMoney value={expenses} hidden={hidden} /></strong>
          <span>{budgetTotal > 0 ? t("dashboard.spentOf", { amount: formatMoney(budgetTotal) }) : t("dashboard.noBudgetSpent")}</span>
        </div>
        <div className="budget-percent big">{budgetTotal > 0 ? `${Math.round(clampPercent(budgetPct))}%` : "—"}</div>
        <ProgressBar value={budgetPct} tone={budgetPct >= 100 ? "over" : budgetPct >= 80 ? "warn" : "ok"} />
        <p>
          {budgetTotal <= 0
            ? t("dashboard.budgetCreate")
            : remaining >= 0
              ? t("dashboard.remaining", { amount: formatMoney(remaining) })
              : t("dashboard.overBudget", { amount: formatMoney(Math.abs(remaining)) })}
        </p>
        <p className="muted">{t(budgetAlertKey(budgetTotal, budgetPct))}</p>
      </section>

      <ul className="mobile-budget-list">
        {budgets.map((budget) => {
          const spent = monthTx
            .filter((row) => row.category_id === budget.category_id)
            .reduce((sum, row) => sum + toNumber(row.amount), 0);
          const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
          return (
            <li key={budget.id} className="panel">
              <div className="panel-head">
                <strong>{localizeName(budget.category?.name, t) || t("common.other")}</strong>
                <span>{Math.round(clampPercent(pct))}%</span>
              </div>
              <p>
                <CountMoney value={spent} hidden={hidden} />
                {" / "}
                <CountMoney value={budget.amount} hidden={hidden} />
              </p>
              <ProgressBar value={pct} tone={pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok"} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
