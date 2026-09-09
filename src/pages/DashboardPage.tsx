import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { ActivityList } from "../components/ActivityList";
import { CountMoney } from "../components/CountMoney";
import { FinancialHealthCard } from "../components/FinancialHealthCard";
import { FinancialSnapshot } from "../components/FinancialSnapshot";
import { Icon, type IconName } from "../components/Icon";
import { DonutChart, getCategoryClass } from "../components/charts/DonutChart";
import { LineChart } from "../components/charts/LineChart";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { MonthSwitcher } from "../components/MonthSwitcher";
import { ProgressBar } from "../components/ProgressBar";
import { QuickActions } from "../components/QuickActions";
import { SavingsGoals } from "../components/SavingsGoals";
import { SmartInsights } from "../components/SmartInsights";
import { TransactionDetail } from "../components/TransactionDetail";
import { TransactionForm } from "../components/forms/TransactionForm";
import { TransferForm } from "../components/forms/TransferForm";
import { TransactionTable } from "../components/TransactionTable";
import { WelcomeModal } from "../components/WelcomeModal";
import { DashboardSkeleton, EmptyState, ErrorState } from "../components/Status";
import { useAccounts } from "../hooks/useAccounts";
import { useAuth } from "../hooks/useAuth";
import { useAllTransactions } from "../hooks/useTransactions";
import { useBudgets } from "../hooks/useBudgets";
import { useCategories } from "../hooks/useCategories";
import { useGoals } from "../hooks/useGoals";
import { useHiddenBalance } from "../hooks/useHiddenBalance";
import { useLanguage } from "../hooks/useLanguage";
import { useToast } from "../hooks/useToast";
import { useTransactionMutations } from "../hooks/useTransactionMutations";
import { localizeName } from "../i18n/localize";
import type { AppOutletContext } from "../layouts/AppLayout";
import { createTransfer } from "../services/ledger";
import type { AccountType, TransactionType, TransactionWithRelations } from "../types/database";
import {
  currentMonthYear,
  daysInMonth,
  isSameMonth,
  monthBounds,
  monthLabel,
  monthShortLabel,
  shiftMonth,
} from "../utils/dates";
import { clampPercent, formatMoney, savingsRate, toNumber } from "../utils/format";
import { budgetAlertKey, buildInsights, financialHealth, percentChange, snapshotAreas } from "../utils/insights";
import { dismissWelcome, hasDismissedWelcome } from "../utils/welcome";

function accountIcon(type: AccountType): IconName {
  if (type === "card") return "card";
  if (type === "bank") return "accounts";
  return "wallet";
}

function Delta({ value, invert }: { value: number | null; invert?: boolean }) {
  const { t } = useLanguage();
  if (value == null) return <small>{t("compare.noPrev")}</small>;
  const up = value > 0.5;
  const down = value < -0.5;
  const positive = invert ? !up : !down;
  return (
    <small className={positive ? "up" : "down"}>
      <Icon name={up ? "in" : down ? "out" : "compare"} />
      {value > 0 ? "+" : ""}
      {value.toFixed(0)}%
    </small>
  );
}

export function DashboardPage() {
  const { t, locale } = useLanguage();
  const { notify } = useToast();
  const { profile, user } = useAuth();
  const { search } = useOutletContext<AppOutletContext>();
  const { hidden, toggle } = useHiddenBalance();
  const location = useLocation();
  const navigate = useNavigate();
  const now = currentMonthYear();
  const [selected, setSelected] = useState(now);
  const [formType, setFormType] = useState<TransactionType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [editing, setEditing] = useState<TransactionWithRelations | null>(null);
  const [deleting, setDeleting] = useState<TransactionWithRelations | null>(null);
  const [viewing, setViewing] = useState<TransactionWithRelations | null>(null);
  const [goalSignal, setGoalSignal] = useState(0);
  const [showWelcome, setShowWelcome] = useState(() => !hasDismissedWelcome());

  const { data: allTx, loading, error, reload } = useAllTransactions({ search });
  const { data: categories } = useCategories();
  const { data: accounts, reload: reloadAccounts } = useAccounts();
  const { data: budgets, reload: reloadBudgets } = useBudgets(selected.month, selected.year);
  const { data: goals, reload: reloadGoals } = useGoals();
  const { save, remove, submitting } = useTransactionMutations(() => {
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

  const bounds = monthBounds(selected.month, selected.year);
  const previous = shiftMonth(selected.month, selected.year, -1);
  const prevBounds = monthBounds(previous.month, previous.year);
  const inMonth = (row: TransactionWithRelations, from: string, to: string) =>
    row.transaction_date >= from && row.transaction_date <= to;

  const monthTx = useMemo(
    () => allTx.filter((row) => inMonth(row, bounds.from, bounds.to)),
    [allTx, bounds.from, bounds.to],
  );
  const prevTx = useMemo(
    () => allTx.filter((row) => inMonth(row, prevBounds.from, prevBounds.to)),
    [allTx, prevBounds.from, prevBounds.to],
  );

  const income = useMemo(
    () => monthTx.filter((row) => row.type === "income").reduce((sum, row) => sum + toNumber(row.amount), 0),
    [monthTx],
  );
  const expenses = useMemo(
    () => monthTx.filter((row) => row.type === "expense").reduce((sum, row) => sum + toNumber(row.amount), 0),
    [monthTx],
  );
  const prevIncome = useMemo(
    () => prevTx.filter((row) => row.type === "income").reduce((sum, row) => sum + toNumber(row.amount), 0),
    [prevTx],
  );
  const prevExpenses = useMemo(
    () => prevTx.filter((row) => row.type === "expense").reduce((sum, row) => sum + toNumber(row.amount), 0),
    [prevTx],
  );

  const available = accounts.reduce((sum, account) => sum + account.balance, 0);
  const net = income - expenses;
  const prevNet = prevIncome - prevExpenses;
  const rate = savingsRate(income, expenses);
  const current = isSameMonth(selected.month, selected.year);
  const dim = daysInMonth(selected.month, selected.year);
  const elapsed = current ? new Date().getDate() : dim;
  const dailyAvg = elapsed > 0 ? expenses / elapsed : 0;
  const projected = current ? dailyAvg * dim : expenses;
  const expenseDelta = percentChange(expenses, prevExpenses);
  const incomeDelta = percentChange(income, prevIncome);
  const savingsDelta = percentChange(net, prevNet);
  const availableDelta = percentChange(net, prevNet);

  const history = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const point = shiftMonth(now.month, now.year, index - 5);
      const range = monthBounds(point.month, point.year);
      const rows = allTx.filter((row) => inMonth(row, range.from, range.to));
      const monthIncome = rows.filter((row) => row.type === "income").reduce((sum, row) => sum + row.amount, 0);
      const monthExpense = rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.amount, 0);
      return {
        ...point,
        key: `${point.year}-${String(point.month).padStart(2, "0")}`,
        label: monthShortLabel(`${point.year}-${String(point.month).padStart(2, "0")}`, locale),
        income: monthIncome,
        expense: monthExpense,
        net: monthIncome - monthExpense,
      };
    });
  }, [allTx, locale, now.month, now.year]);

  const monthly = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const point = shiftMonth(now.month, now.year, index - 11);
      const range = monthBounds(point.month, point.year);
      const rows = allTx.filter((row) => inMonth(row, range.from, range.to));
      const monthIncome = rows.filter((row) => row.type === "income").reduce((sum, row) => sum + row.amount, 0);
      const monthExpense = rows.filter((row) => row.type === "expense").reduce((sum, row) => sum + row.amount, 0);
      return {
        month: monthShortLabel(`${point.year}-${String(point.month).padStart(2, "0")}`, locale),
        income: monthIncome,
        expense: monthExpense,
      };
    });
  }, [allTx, locale, now.month, now.year]);

  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of monthTx.filter((item) => item.type === "expense")) {
      const name = localizeName(row.category?.name, t) || t("common.other");
      map.set(name, (map.get(name) ?? 0) + row.amount);
    }
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthTx, t]);

  const budgetTotal = budgets.reduce((sum, row) => sum + row.amount, 0);
  const budgetPct = budgetTotal > 0 ? (expenses / budgetTotal) * 100 : 0;
  const remaining = budgetTotal - expenses;
  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || t("dash.friend");
  const areas = snapshotAreas(breakdown);
  const health = financialHealth({
    income,
    expenses,
    prevExpenses,
    budgetTotal,
    budgetPct,
    txCount: monthTx.length,
  });

  const categoryAlert = useMemo(() => {
    let best: { name: string; pct: number } | null = null;
    for (const budget of budgets) {
      if (budget.amount <= 0) continue;
      const spent = monthTx
        .filter((row) => row.type === "expense" && row.category_id === budget.category_id)
        .reduce((sum, row) => sum + toNumber(row.amount), 0);
      const pct = (spent / budget.amount) * 100;
      if (pct < 80) continue;
      const name = localizeName(budget.category?.name, t) || t("common.other");
      if (!best || pct > best.pct) best = { name, pct };
    }
    return best;
  }, [budgets, monthTx, t]);

  const goalOnTrack = goals.some((goal) => {
    if (goal.target_amount <= 0) return false;
    const pct = (goal.current_amount / goal.target_amount) * 100;
    return pct >= 25 && pct < 100;
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
    savedDelta: net - prevNet,
    goalOnTrack,
    categoryAlert,
  });

  function greetingKey() {
    const hour = new Date().getHours();
    if (hour < 12) return "dash.morning" as const;
    if (hour < 18) return "dash.afternoon" as const;
    return "dash.evening" as const;
  }

  function openCreate(type?: TransactionType) {
    setEditing(null);
    setViewing(null);
    setFormType(type ?? null);
    setShowForm(true);
  }

  function openEdit(row: TransactionWithRelations) {
    setViewing(null);
    setEditing(row);
    setFormType(row.type);
    setShowForm(true);
  }

  function closeWelcome(persist: boolean) {
    if (persist) dismissWelcome();
    setShowWelcome(false);
  }

  async function copyMonth() {
    const text = [
      monthLabel(selected.month, selected.year, locale),
      `${t("dash.available")}: ${formatMoney(available)}`,
      `${t("dash.monthIn")}: ${formatMoney(income)}`,
      `${t("dash.monthOut")}: ${formatMoney(expenses)}`,
      `${t("dash.monthNet")}: ${formatMoney(net, { signed: true })}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      notify(t("dash.copied"));
    } catch {
      notify(t("dash.copyFailed"), "error");
    }
  }

  const emptyAction = { label: t("dashboard.add"), onClick: () => openCreate() };
  const monthTitle = monthLabel(selected.month, selected.year, locale);

  return (
    <>
      {loading ? <DashboardSkeleton /> : null}
      {error ? (
        <div className="page-wrap">
          <ErrorState
            title={t("error.retryTitle")}
            message={error}
            action={{ label: t("common.tryAgain"), onClick: reload }}
          />
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="page-wrap dashboard-stack">
          <section className="aba-hero pop-card">
            <div className="aba-hero-top">
              <div className="welcome-person">
                <div className="welcome-avatar" aria-hidden="true">
                  <Icon name="wave" className="wave-icon" />
                </div>
                <div>
                  <p className="welcome-greet">
                    <Icon name={greetingKey() === "dash.evening" ? "moon" : "sun"} />
                    {t(greetingKey())}
                  </p>
                  <strong className="welcome-name">{displayName}</strong>
                  <em className="welcome-pop">{monthTitle}</em>
                </div>
              </div>
              <div className="hero-tools">
                <button type="button" className="ghost-btn bordered about-btn" onClick={() => setShowWelcome(true)}>
                  <Icon name="help" />
                  {t("welcome.about")}
                </button>
                <button type="button" className="eye-btn" onClick={toggle} aria-label={hidden ? t("dash.showBalance") : t("dash.hideBalance")}>
                  <Icon name={hidden ? "eyeOff" : "eye"} />
                </button>
              </div>
            </div>
            <div className="balance-pop">
              <span className="aba-hero-label">
                <Icon name="wallet" />
                {t("dash.available")}
              </span>
              <h2>
                <CountMoney value={available} hidden={hidden} />
              </h2>
              {availableDelta != null ? (
                <small className={availableDelta >= 0 ? "up hero-delta" : "down hero-delta"}>
                  <Icon name={availableDelta >= 0 ? "in" : "out"} />
                  {availableDelta >= 0 ? "↑ " : "↓ "}
                  {t("hero.fromLast", { pct: Math.abs(availableDelta).toFixed(1) })}
                </small>
              ) : null}
            </div>
            <div className="aba-hero-flow four">
              <div className="flow-tile delay-1">
                <small><Icon name="in" />{t("dash.monthIn")}</small>
                <b className="up"><CountMoney value={income} hidden={hidden} /></b>
              </div>
              <div className="flow-tile delay-2">
                <small><Icon name="out" />{t("dash.monthOut")}</small>
                <b className="down"><CountMoney value={expenses} hidden={hidden} /></b>
              </div>
              <div className="flow-tile delay-3">
                <small><Icon name="keep" />{t("snap.saved")}</small>
                <b className={net >= 0 ? "up" : "down"}><CountMoney value={net} hidden={hidden} signed /></b>
              </div>
              <div className="flow-tile delay-4">
                <small><Icon name="budgets" />{t("dashboard.savings")}</small>
                <b>{income > 0 ? `${rate.toFixed(1)}%` : "—"}</b>
              </div>
            </div>
          </section>

          <QuickActions
            onIncome={() => openCreate("income")}
            onExpense={() => openCreate("expense")}
            onTransfer={() => setShowTransfer(true)}
            onGoal={() => setGoalSignal((value) => value + 1)}
          />

          <section className="panel month-panel pop-card delay-2">
            <div className="panel-head">
              <div className="month-title">
                <span className="title-icon"><Icon name="compare" /></span>
                <div>
                  <h2>{t("compare.title")}</h2>
                  <p>{t("compare.body")}</p>
                </div>
              </div>
              <button type="button" className="ghost-btn bordered copy-btn" onClick={() => void copyMonth()}>
                <Icon name="copy" />
                {t("dash.copyMonth")}
              </button>
            </div>
            <MonthSwitcher month={selected.month} year={selected.year} onChange={(month, year) => setSelected({ month, year })} />
            <div className="month-chips">
              {history.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={item.month === selected.month && item.year === selected.year ? "month-chip active" : "month-chip"}
                  onClick={() => setSelected({ month: item.month, year: item.year })}
                >
                  <span>{item.label}</span>
                  <strong className={item.net >= 0 ? "up" : "down"}>{hidden ? "••" : formatMoney(item.net, { signed: true })}</strong>
                </button>
              ))}
            </div>
            <div className="stat-grid">
              <article className="stat-card delay-1">
                <span><Icon name="income" />{t("snap.income")}</span>
                <strong className="up"><CountMoney value={income} hidden={hidden} /></strong>
                <Delta value={incomeDelta} />
              </article>
              <article className="stat-card delay-2">
                <span><Icon name="expense" />{t("snap.expenses")}</span>
                <strong className="down"><CountMoney value={expenses} hidden={hidden} /></strong>
                <Delta value={expenseDelta} invert />
              </article>
              <article className="stat-card delay-3">
                <span><Icon name="keep" />{t("snap.saved")}</span>
                <strong className={net >= 0 ? "up" : "down"}><CountMoney value={net} hidden={hidden} signed /></strong>
                <Delta value={savingsDelta} />
              </article>
              <article className="stat-card delay-4">
                <span><Icon name="budgets" />{t("dashboard.budgetTitle")}</span>
                <strong>{budgetTotal > 0 ? `${Math.round(clampPercent(budgetPct))}%` : "—"}</strong>
                <small>{budgetTotal > 0 ? t("dashboard.spentOf", { amount: formatMoney(budgetTotal) }) : t("dashboard.noBudgets")}</small>
              </article>
            </div>
          </section>

          <section className="account-summary">
            {accounts.length === 0 ? (
              <div className="panel">
                <EmptyState title={t("acc.emptyTitle")} message={t("acc.emptyBody")} icon="accounts" />
              </div>
            ) : (
              <>
                <div className="account-strip">
                  {accounts.map((account) => (
                    <article className="aba-account-card" key={account.id}>
                      <span><Icon name={accountIcon(account.type)} />{localizeName(account.name, t)}</span>
                      <strong><CountMoney value={account.balance} hidden={hidden} /></strong>
                      <small>
                        {account.type === "cash"
                          ? t("acc.cash")
                          : account.type === "bank"
                            ? t("acc.bank")
                            : account.type === "card"
                              ? t("acc.card")
                              : t("acc.wallet")}
                      </small>
                    </article>
                  ))}
                </div>
                <article className="account-total">
                  <span><Icon name="wallet" />{t("acc.totalAvailable")}</span>
                  <strong><CountMoney value={available} hidden={hidden} /></strong>
                </article>
              </>
            )}
          </section>

          <FinancialHealthCard health={health} />

          <FinancialSnapshot
            month={selected.month}
            year={selected.year}
            prevMonth={previous.month}
            income={income}
            expenses={expenses}
            net={net}
            rate={rate}
            incomeDelta={incomeDelta}
            expenseDelta={expenseDelta}
            savingsDelta={savingsDelta}
            strongest={areas.strongest}
            watch={areas.watch}
            hidden={hidden}
          />

          <div className="dashboard-analytics">
            <section className="panel chart-panel">
              <div className="panel-head">
                <div>
                  <h2>{t("dashboard.trendTitle")}</h2>
                  <p>{t("dash.trend6")}</p>
                </div>
              </div>
              <div className="legend">
                <span><i className="dot income-dot"></i>{t("common.income")}</span>
                <span><i className="dot expense-dot"></i>{t("common.expense")}</span>
              </div>
              {monthly.every((item) => item.income === 0 && item.expense === 0) ? (
                <EmptyState title={t("empty.chartTitle")} message={t("empty.chartBody")} icon="spark" action={emptyAction} />
              ) : (
                <LineChart data={monthly} />
              )}
            </section>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>{t("dashboard.breakdownTitle")}</h2>
                  <p>{monthTitle}</p>
                </div>
                <Link className="ghost-btn" to="/expenses">{t("dashboard.viewAll")}</Link>
              </div>
              <div className="breakdown">
                <DonutChart items={breakdown} />
                <div className="category-list">
                  {breakdown.length === 0 ? <p className="muted">{t("empty.chartBody")}</p> : null}
                  {breakdown.map((item, index) => (
                    <div className="category-row" key={item.name}>
                      <div><i className={`dot ${getCategoryClass(index)}`}></i><span>{item.name}</span></div>
                      <div className="category-vals">
                        <strong>{formatMoney(item.value)}</strong>
                        <small>{expenses > 0 ? Math.round((item.value / expenses) * 100) : 0}%</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <SavingsGoals goals={goals} hidden={hidden} onChange={reloadGoals} openSignal={goalSignal} />
          <SmartInsights items={insights} />

          <section className="bottom-grid">
            <div className="panel budget-panel">
              <div className="panel-head">
                <div>
                  <h2>{t("dashboard.budgetTitle")}</h2>
                  <p>{monthTitle}</p>
                </div>
                <span className="budget-percent">{budgetTotal > 0 ? `${Math.round(clampPercent(budgetPct))}%` : "—"}</span>
              </div>
              <div className="budget-total">
                <strong><CountMoney value={expenses} hidden={hidden} /></strong>
                <span>{budgetTotal > 0 ? t("dashboard.spentOf", { amount: formatMoney(budgetTotal) }) : t("dashboard.noBudgetSpent")}</span>
              </div>
              <ProgressBar value={budgetPct} tone={budgetPct >= 100 ? "over" : budgetPct >= 80 ? "warn" : "ok"} />
              <div className="budget-note">
                <span><Icon name={budgetPct >= 100 ? "out" : budgetPct >= 80 ? "pace" : "keep"} /></span>
                <div>
                  <strong>
                    {budgetTotal <= 0
                      ? t("dashboard.noBudgets")
                      : remaining >= 0
                        ? t("dashboard.remaining", { amount: formatMoney(remaining) })
                        : t("dashboard.overBudget", { amount: formatMoney(Math.abs(remaining)) })}
                  </strong>
                  <p>
                    {budgetTotal <= 0
                      ? t("dashboard.budgetCreate")
                      : current && projected > budgetTotal && budgetTotal > 0
                        ? t("dash.paceHigh")
                        : t(budgetAlertKey(budgetTotal, budgetPct))}
                  </p>
                </div>
              </div>
              <button className="primary-btn full" onClick={() => openCreate("expense")}>{t("dash.quickExpense")}</button>
            </div>

            <div className="panel transactions-panel">
              <div className="panel-head">
                <div>
                  <h2>{t("dashboard.recentTitle")}</h2>
                  <p>{t("dashboard.recentBody")}</p>
                </div>
                <Link className="ghost-btn" to="/expenses">{t("dashboard.viewAll")}</Link>
              </div>
              <div className="tx-desktop">
                <TransactionTable
                  rows={monthTx}
                  emptyTitle={t("dash.noMonthTx")}
                  emptyMessage={t("dash.noMonthTxBody")}
                  emptyAction={emptyAction}
                  onEdit={openEdit}
                  onDelete={setDeleting}
                  onOpen={setViewing}
                />
              </div>
              <div className="tx-mobile">
                <ActivityList
                  rows={monthTx}
                  emptyTitle={t("dash.noMonthTx")}
                  emptyMessage={t("dash.noMonthTxBody")}
                  emptyAction={emptyAction}
                  onEdit={openEdit}
                  onDelete={setDeleting}
                  onOpen={setViewing}
                />
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {showWelcome ? (
        <WelcomeModal onStart={() => closeWelcome(true)} onDontShow={() => closeWelcome(true)} />
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
                reload();
              } catch (err) {
                notify(err instanceof Error ? err.message : t("error.retryBody"), "error");
              } finally {
                setTransferring(false);
              }
            }}
          />
        </Modal>
      ) : null}

      {viewing ? (
        <Modal title={t("tx.detail")} onClose={() => setViewing(null)}>
          <TransactionDetail
            row={viewing}
            onEdit={() => openEdit(viewing)}
            onDelete={() => {
              setDeleting(viewing);
              setViewing(null);
            }}
          />
        </Modal>
      ) : null}

      {showForm ? (
        <Modal
          title={editing ? t("dashboard.editTx") : formType === "income" ? t("tx.addIncomeTitle") : formType === "expense" ? t("tx.addExpenseTitle") : t("dashboard.addTx")}
          subtitle={formType === "income" ? t("tx.incomeSubtitle") : formType === "expense" ? t("tx.expenseSubtitle") : t("dashboard.txSubtitle")}
          onClose={() => setShowForm(false)}
        >
          <TransactionForm
            accounts={accounts}
            categories={categories}
            initial={editing}
            defaultType={formType ?? "expense"}
            lockType={Boolean(formType)}
            submitting={submitting}
            onCancel={() => setShowForm(false)}
            onSubmit={async (values) => {
              const ok = await save(formType ? { ...values, type: formType } : values, editing?.id);
              if (ok) setShowForm(false);
            }}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t("dashboard.deleteTitle")}
          message={t("dashboard.deleteMsg", { title: deleting.title })}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await remove(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </>
  );
}
