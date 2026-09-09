import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BrandLogo } from "../../components/BrandLogo";
import { CountMoney } from "../../components/CountMoney";
import { FinancialHealthCard } from "../../components/FinancialHealthCard";
import { Icon, type IconName } from "../../components/Icon";
import { Modal } from "../../components/Modal";
import { ProgressBar } from "../../components/ProgressBar";
import { QuickActions } from "../../components/QuickActions";
import { SmartInsights } from "../../components/SmartInsights";
import { TransactionForm } from "../../components/forms/TransactionForm";
import { TransferForm } from "../../components/forms/TransferForm";
import { WelcomeModal } from "../../components/WelcomeModal";
import { DashboardSkeleton, EmptyState, ErrorState } from "../../components/Status";
import { useAccounts } from "../../hooks/useAccounts";
import { useAuth } from "../../hooks/useAuth";
import { useBudgets } from "../../hooks/useBudgets";
import { useCategories } from "../../hooks/useCategories";
import { useGoals } from "../../hooks/useGoals";
import { useHiddenBalance } from "../../hooks/useHiddenBalance";
import { useLanguage } from "../../hooks/useLanguage";
import { useToast } from "../../hooks/useToast";
import { useAllTransactions } from "../../hooks/useTransactions";
import { useTransactionMutations } from "../../hooks/useTransactionMutations";
import { localizeName } from "../../i18n/localize";
import { createTransfer } from "../../services/ledger";
import type { AccountType, TransactionType } from "../../types/database";
import { currentMonthYear, monthBounds } from "../../utils/dates";
import { clampPercent, formatMoney, savingsRate, toNumber } from "../../utils/format";
import { budgetAlertKey, buildInsights, financialHealth, percentChange } from "../../utils/insights";
import { dismissWelcome, hasDismissedWelcome } from "../../utils/welcome";

function accountIcon(type: AccountType): IconName {
  if (type === "card") return "card";
  if (type === "bank") return "accounts";
  return "wallet";
}

export function MobileHomePage() {
  const { t } = useLanguage();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, user } = useAuth();
  const { hidden, toggle } = useHiddenBalance();
  const now = currentMonthYear();
  const [formType, setFormType] = useState<TransactionType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => !hasDismissedWelcome());

  const { data: allTx, loading, error, reload } = useAllTransactions({});
  const { data: categories } = useCategories();
  const { data: accounts, reload: reloadAccounts } = useAccounts();
  const { data: budgets, reload: reloadBudgets } = useBudgets(now.month, now.year);
  const { data: goals } = useGoals();
  const { save, submitting } = useTransactionMutations(() => {
    reload();
    reloadAccounts();
    reloadBudgets();
  });

  useEffect(() => {
    const state = location.state as { openWelcome?: boolean } | null;
    if (!state?.openWelcome) return;
    setShowWelcome(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.pathname, location.state, navigate]);

  const bounds = monthBounds(now.month, now.year);
  const prev = monthBounds(now.month === 1 ? 12 : now.month - 1, now.month === 1 ? now.year - 1 : now.year);
  const monthTx = useMemo(
    () => allTx.filter((row) => row.transaction_date >= bounds.from && row.transaction_date <= bounds.to),
    [allTx, bounds.from, bounds.to],
  );
  const prevTx = useMemo(
    () => allTx.filter((row) => row.transaction_date >= prev.from && row.transaction_date <= prev.to),
    [allTx, prev.from, prev.to],
  );

  const income = monthTx.filter((row) => row.type === "income").reduce((sum, row) => sum + toNumber(row.amount), 0);
  const expenses = monthTx.filter((row) => row.type === "expense").reduce((sum, row) => sum + toNumber(row.amount), 0);
  const prevIncome = prevTx.filter((row) => row.type === "income").reduce((sum, row) => sum + toNumber(row.amount), 0);
  const prevExpenses = prevTx.filter((row) => row.type === "expense").reduce((sum, row) => sum + toNumber(row.amount), 0);
  const available = accounts.reduce((sum, account) => sum + account.balance, 0);
  const net = income - expenses;
  const rate = savingsRate(income, expenses);
  const budgetTotal = budgets.reduce((sum, row) => sum + row.amount, 0);
  const budgetPct = budgetTotal > 0 ? (expenses / budgetTotal) * 100 : 0;
  const remaining = budgetTotal - expenses;
  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || t("dash.friend");

  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of monthTx.filter((item) => item.type === "expense")) {
      const name = localizeName(row.category?.name, t) || t("common.other");
      map.set(name, (map.get(name) ?? 0) + row.amount);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthTx, t]);

  const health = financialHealth({
    income,
    expenses,
    prevExpenses,
    budgetTotal,
    budgetPct,
    txCount: monthTx.length,
  });

  const insights = buildInsights({
    income,
    expenses,
    prevIncome,
    prevExpenses,
    budgetTotal,
    budgetPct,
    txCount: monthTx.length,
    topCategory: breakdown[0]?.name,
    savedDelta: net - (prevIncome - prevExpenses),
    goalOnTrack: goals.some((goal) => goal.target_amount > 0 && goal.current_amount / goal.target_amount >= 0.25 && goal.current_amount < goal.target_amount),
  });

  const savedDeltaPct = percentChange(net, prevIncome - prevExpenses);

  function greetingKey() {
    const hour = new Date().getHours();
    if (hour < 12) return "dash.morning" as const;
    if (hour < 18) return "dash.afternoon" as const;
    return "dash.evening" as const;
  }

  function openCreate(type: TransactionType) {
    setFormType(type);
    setShowForm(true);
  }

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return <ErrorState title={t("error.retryTitle")} message={error} action={{ label: t("common.tryAgain"), onClick: reload }} />;
  }

  return (
    <div className="mobile-stack">
      <header className="mobile-top">
        <BrandLogo className="mobile-logo" />
        <button type="button" className="eye-btn" onClick={toggle} aria-label={hidden ? t("dash.showBalance") : t("dash.hideBalance")}>
          <Icon name={hidden ? "eyeOff" : "eye"} />
        </button>
      </header>

      <section className="mobile-hero">
        <p className="mobile-greet">
          <Icon name={greetingKey() === "dash.evening" ? "moon" : "sun"} />
          {t(greetingKey())}
        </p>
        <strong className="mobile-name">{displayName}</strong>
        <span className="mobile-balance-label">{t("dash.available")}</span>
        <h1 className="mobile-balance"><CountMoney value={available} hidden={hidden} /></h1>
        {savedDeltaPct != null ? (
          <small className={savedDeltaPct >= 0 ? "up" : "down"}>
            {savedDeltaPct >= 0 ? "↑ " : "↓ "}
            {t("hero.fromLast", { pct: Math.abs(savedDeltaPct).toFixed(1) })}
          </small>
        ) : null}
      </section>

      <section className="mobile-metrics">
        <article>
          <span>{t("snap.income")}</span>
          <strong className="up"><CountMoney value={income} hidden={hidden} /></strong>
        </article>
        <article>
          <span>{t("snap.expenses")}</span>
          <strong className="down"><CountMoney value={expenses} hidden={hidden} /></strong>
        </article>
        <article>
          <span>{t("snap.saved")}</span>
          <strong className={net >= 0 ? "up" : "down"}><CountMoney value={net} hidden={hidden} signed /></strong>
        </article>
      </section>

      <QuickActions
        onIncome={() => openCreate("income")}
        onExpense={() => openCreate("expense")}
        onTransfer={() => setShowTransfer(true)}
        onGoal={() => navigate("/mobile/goals")}
      />

      <section className="mobile-accounts">
        {accounts.length === 0 ? (
          <EmptyState title={t("acc.emptyTitle")} message={t("acc.emptyBody")} icon="accounts" />
        ) : (
          <>
            {accounts.map((account) => (
              <article key={account.id}>
                <span><Icon name={accountIcon(account.type)} />{localizeName(account.name, t)}</span>
                <strong><CountMoney value={account.balance} hidden={hidden} /></strong>
              </article>
            ))}
            <div className="mobile-accounts-total">
              <span>{t("acc.totalAvailable")}</span>
              <strong><CountMoney value={available} hidden={hidden} /></strong>
            </div>
          </>
        )}
      </section>

      <FinancialHealthCard health={health} />
      <SmartInsights items={insights} />

      <section className="panel mobile-budget-card">
        <div className="panel-head">
          <div>
            <h2>{t("dashboard.budgetTitle")}</h2>
            <p>{income > 0 ? t("snap.rateLabel", { pct: rate.toFixed(1) }) : t("dashboard.noBudgets")}</p>
          </div>
          <span className="budget-percent">{budgetTotal > 0 ? `${Math.round(clampPercent(budgetPct))}%` : "—"}</span>
        </div>
        <div className="budget-total">
          <strong><CountMoney value={expenses} hidden={hidden} /></strong>
          <span>{budgetTotal > 0 ? t("dashboard.spentOf", { amount: formatMoney(budgetTotal) }) : t("dashboard.noBudgetSpent")}</span>
        </div>
        <ProgressBar value={budgetPct} tone={budgetPct >= 100 ? "over" : budgetPct >= 80 ? "warn" : "ok"} />
        <p className="muted">
          {budgetTotal <= 0
            ? t("dashboard.budgetCreate")
            : remaining >= 0
              ? t("dashboard.remaining", { amount: formatMoney(remaining) })
              : t("dashboard.overBudget", { amount: formatMoney(Math.abs(remaining)) })}
          {" · "}
          {t(budgetAlertKey(budgetTotal, budgetPct))}
        </p>
      </section>

      <button type="button" className="primary-btn mobile-fab-add" onClick={() => openCreate("expense")}>
        <Icon name="plus" />
        {t("dashboard.add")}
      </button>

      {showWelcome ? (
        <WelcomeModal onStart={() => { dismissWelcome(); setShowWelcome(false); }} onDontShow={() => { dismissWelcome(); setShowWelcome(false); }} />
      ) : null}

      {showTransfer ? (
        <Modal title={t("transfer.title")} subtitle={t("transfer.body")} onClose={() => setShowTransfer(false)}>
          <TransferForm
            accounts={accounts}
            submitting={transferring}
            onCancel={() => setShowTransfer(false)}
            onSubmit={async (values) => {
              setTransferring(true);
              try {
                await createTransfer(values);
                notify(t("toast.transferDone"));
                setShowTransfer(false);
                reloadAccounts();
              } catch (err) {
                notify(err instanceof Error ? err.message : t("error.retryBody"), "error");
              } finally {
                setTransferring(false);
              }
            }}
          />
        </Modal>
      ) : null}

      {showForm ? (
        <Modal
          title={formType === "income" ? t("tx.addIncomeTitle") : t("tx.addExpenseTitle")}
          subtitle={formType === "income" ? t("tx.incomeSubtitle") : t("tx.expenseSubtitle")}
          onClose={() => setShowForm(false)}
        >
          <TransactionForm
            accounts={accounts}
            categories={categories}
            defaultType={formType ?? "expense"}
            lockType
            submitting={submitting}
            onCancel={() => setShowForm(false)}
            onSubmit={async (values) => {
              const ok = await save({ ...values, type: formType ?? "expense" });
              if (ok) setShowForm(false);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}
