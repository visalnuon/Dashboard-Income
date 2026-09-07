import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ActivityList } from "../components/ActivityList";
import { CountMoney } from "../components/CountMoney";
import { Icon } from "../components/Icon";
import { DonutChart, getCategoryClass } from "../components/charts/DonutChart";
import { LineChart } from "../components/charts/LineChart";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { MonthSwitcher } from "../components/MonthSwitcher";
import { ProgressBar } from "../components/ProgressBar";
import { TransactionForm } from "../components/forms/TransactionForm";
import { ErrorState, LoadingState } from "../components/Status";
import { useAccounts } from "../hooks/useAccounts";
import { useAuth } from "../hooks/useAuth";
import { useAllTransactions } from "../hooks/useTransactions";
import { useBudgets } from "../hooks/useBudgets";
import { useCategories } from "../hooks/useCategories";
import { useHiddenBalance } from "../hooks/useHiddenBalance";
import { useLanguage } from "../hooks/useLanguage";
import { useToast } from "../hooks/useToast";
import { useTransactionMutations } from "../hooks/useTransactionMutations";
import { localizeName } from "../i18n/localize";
import type { AppOutletContext } from "../layouts/AppLayout";
import type { TransactionType, TransactionWithRelations } from "../types/database";
import {
  currentMonthYear,
  daysInMonth,
  isSameMonth,
  monthBounds,
  monthLabel,
  monthShortLabel,
  shiftMonth,
} from "../utils/dates";
import { clampPercent, formatMoney, formatPercent, savingsRate, toNumber } from "../utils/format";

export function DashboardPage() {
  const { t, locale } = useLanguage();
  const { notify } = useToast();
  const { profile, user } = useAuth();
  const { search } = useOutletContext<AppOutletContext>();
  const { hidden, toggle } = useHiddenBalance();
  const now = currentMonthYear();
  const [selected, setSelected] = useState(now);
  const [formType, setFormType] = useState<TransactionType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TransactionWithRelations | null>(null);
  const [deleting, setDeleting] = useState<TransactionWithRelations | null>(null);

  const { data: allTx, loading, error, reload } = useAllTransactions({ search });
  const { data: categories } = useCategories();
  const { data: accounts, reload: reloadAccounts } = useAccounts();
  const { data: budgets, reload: reloadBudgets } = useBudgets(selected.month, selected.year);
  const { save, remove, submitting } = useTransactionMutations(() => {
    reload();
    reloadAccounts();
    reloadBudgets();
  });

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
  const rate = savingsRate(income, expenses);
  const current = isSameMonth(selected.month, selected.year);
  const dim = daysInMonth(selected.month, selected.year);
  const elapsed = current ? new Date().getDate() : dim;
  const daysLeft = current ? Math.max(0, dim - elapsed) : 0;
  const dailyAvg = elapsed > 0 ? expenses / elapsed : 0;
  const projected = current ? dailyAvg * dim : expenses;
  const expenseDelta = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : null;
  const incomeDelta = prevIncome > 0 ? ((income - prevIncome) / prevIncome) * 100 : null;

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

  function greetingKey() {
    const hour = new Date().getHours();
    if (hour < 12) return "dash.morning" as const;
    if (hour < 18) return "dash.afternoon" as const;
    return "dash.evening" as const;
  }

  function openCreate(type?: TransactionType) {
    setEditing(null);
    setFormType(type ?? null);
    setShowForm(true);
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

  return (
    <>
      {loading ? <div className="page-wrap"><LoadingState message={t("dashboard.loading")} /></div> : null}
      {error ? <div className="page-wrap"><ErrorState title={t("dashboard.loadError")} message={error} action={{ label: t("common.tryAgain"), onClick: reload }} /></div> : null}

      {!loading && !error ? (
        <>
          <section className="bank-services">
            <button type="button" onClick={() => openCreate("income")}>
              <span className="svc-icon"><Icon name="income" /></span>
              {t("dash.quickIncome")}
            </button>
            <button type="button" onClick={() => openCreate("expense")}>
              <span className="svc-icon"><Icon name="expense" /></span>
              {t("dash.quickExpense")}
            </button>
            <Link to="/accounts">
              <span className="svc-icon"><Icon name="accounts" /></span>
              {t("dash.quickAccounts")}
            </Link>
            <Link to="/budgets">
              <span className="svc-icon"><Icon name="budgets" /></span>
              {t("dash.quickBudgets")}
            </Link>
            <Link to="/categories">
              <span className="svc-icon"><Icon name="categories" /></span>
              {t("service.categories")}
            </Link>
            <Link to="/help">
              <span className="svc-icon"><Icon name="help" /></span>
              {t("service.help")}
            </Link>
          </section>

          <div className="page-wrap">
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
                  <em className="welcome-pop">{t("dash.welcomePop")}</em>
                </div>
              </div>
              <button type="button" className="eye-btn" onClick={toggle} aria-label={hidden ? t("dash.showBalance") : t("dash.hideBalance")}>
                <Icon name={hidden ? "eyeOff" : "eye"} />
              </button>
            </div>
            <div className="balance-pop">
              <span className="aba-hero-label">
                <Icon name="wallet" />
                {t("dash.available")}
              </span>
              <h2>
                <CountMoney value={available} hidden={hidden} />
              </h2>
            </div>
            <div className="aba-hero-flow">
              <div className="flow-tile delay-1">
                <small><Icon name="in" />{t("dash.monthIn")}</small>
                <b className="up"><CountMoney value={income} hidden={hidden} /></b>
              </div>
              <div className="flow-tile delay-2">
                <small><Icon name="out" />{t("dash.monthOut")}</small>
                <b className="down"><CountMoney value={expenses} hidden={hidden} /></b>
              </div>
              <div className="flow-tile delay-3">
                <small><Icon name="keep" />{t("dash.monthNet")}</small>
                <b className={net >= 0 ? "up" : "down"}><CountMoney value={net} hidden={hidden} signed /></b>
              </div>
            </div>
          </section>

          <section className="panel month-panel pop-card delay-2">
            <div className="panel-head">
              <div className="month-title">
                <span className="title-icon"><Icon name="spark" /></span>
                <div>
                  <h2>{t("dash.monthCount")}</h2>
                  <p>{t("dash.monthCountBody")}</p>
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
                <span><Icon name="daily" />{t("dash.dailyAvg")}</span>
                <strong><CountMoney value={dailyAvg} hidden={hidden} /></strong>
                <small>{t("dash.perDay")}</small>
              </article>
              <article className="stat-card delay-2">
                <span><Icon name="keep" />{t("dash.kept")}</span>
                <strong className={net >= 0 ? "up" : "down"}><CountMoney value={net} hidden={hidden} signed /></strong>
                <small>{income > 0 ? formatPercent(rate) : t("dashboard.savingsNeed")}</small>
              </article>
              <article className="stat-card delay-3">
                <span><Icon name="pace" />{current ? t("dash.projected") : t("dash.monthOut")}</span>
                <strong><CountMoney value={projected} hidden={hidden} /></strong>
                <small>{current ? t("dash.daysLeft", { days: daysLeft }) : t("dash.fullMonth")}</small>
              </article>
              <article className="stat-card delay-4">
                <span><Icon name="compare" />{t("dash.vsLast")}</span>
                <strong className={(expenseDelta ?? 0) > 0 ? "down" : "up"}>
                  {expenseDelta == null ? "—" : `${expenseDelta > 0 ? "+" : ""}${expenseDelta.toFixed(0)}%`}
                </strong>
                <small>
                  {expenseDelta == null
                    ? t("dash.noLastMonth")
                    : expenseDelta > 0
                      ? t("dash.vsLastUp")
                      : t("dash.vsLastDown")}
                </small>
              </article>
            </div>
            {incomeDelta != null ? (
              <p className="month-note">
                {t("dash.incomeVsLast", {
                  amount: formatMoney(Math.abs(income - prevIncome)),
                  direction: income >= prevIncome ? t("dash.more") : t("dash.less"),
                })}
              </p>
            ) : null}
          </section>

          {accounts.length > 0 ? (
            <section className="account-strip">
              {accounts.map((account) => (
                <article className="aba-account-card" key={account.id}>
                  <span><Icon name="card" />{localizeName(account.name, t)}</span>
                  <strong><CountMoney value={account.balance} hidden={hidden} /></strong>
                  <small>{account.type === "cash" ? t("acc.cash") : account.type === "bank" ? t("acc.bank") : account.type === "card" ? t("acc.card") : t("acc.wallet")}</small>
                </article>
              ))}
            </section>
          ) : null}

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
            <LineChart data={monthly} />
          </section>

          <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>{t("dashboard.breakdownTitle")}</h2>
                  <p>{monthLabel(selected.month, selected.year, locale)}</p>
                </div>
                <Link className="ghost-btn" to="/expenses">{t("dashboard.viewAll")}</Link>
              </div>
              <div className="breakdown">
                <DonutChart items={breakdown} />
                <div className="category-list">
                  {breakdown.length === 0 ? <p className="muted">{t("dashboard.noCategories")}</p> : null}
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

          <section className="bottom-grid">
            <div className="panel transactions-panel">
              <div className="panel-head">
                <div>
                  <h2>{t("dash.statement")}</h2>
                  <p>{t("dash.statementBody")}</p>
                </div>
                <Link className="ghost-btn" to="/expenses">{t("dashboard.viewAllArrow")}</Link>
              </div>
              <ActivityList
                rows={monthTx}
                emptyTitle={t("dash.noMonthTx")}
                emptyMessage={t("dash.noMonthTxBody")}
                onEdit={(row) => {
                  setEditing(row);
                  setFormType(row.type);
                  setShowForm(true);
                }}
                onDelete={setDeleting}
              />
            </div>
            <div className="panel budget-panel">
              <div className="panel-head">
                <div>
                  <h2>{t("dashboard.budgetTitle")}</h2>
                  <p>{monthLabel(selected.month, selected.year, locale)}</p>
                </div>
                <span className="budget-percent">{budgetTotal > 0 ? `${Math.round(clampPercent(budgetPct))}%` : "—"}</span>
              </div>
              <div className="budget-total">
                <strong><CountMoney value={expenses} hidden={hidden} /></strong>
                <span>{budgetTotal > 0 ? t("dashboard.spentOf", { amount: formatMoney(budgetTotal) }) : t("dashboard.noBudgetSpent")}</span>
              </div>
              <ProgressBar value={budgetPct} tone={budgetPct >= 100 ? "over" : budgetPct >= 80 ? "warn" : "ok"} />
              <div className="budget-note">
                <span>{budgetPct >= 100 ? "!" : "✓"}</span>
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
                      : budgetPct >= 100
                        ? t("dashboard.budgetOver")
                        : current && projected > budgetTotal && budgetTotal > 0
                          ? t("dash.paceHigh")
                          : budgetPct >= 80
                            ? t("dashboard.budgetWarn")
                            : t("dashboard.budgetOk")}
                  </p>
                </div>
              </div>
              <button className="primary-btn full" onClick={() => openCreate("expense")}>{t("dash.quickExpense")}</button>
            </div>
          </section>
          </div>
        </>
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
