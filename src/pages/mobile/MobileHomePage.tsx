import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { BrandLogo } from "../../components/BrandLogo";
import { CountMoney } from "../../components/CountMoney";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { FinancialHealthCard } from "../../components/FinancialHealthCard";
import { Icon, type IconName } from "../../components/Icon";
import { Modal } from "../../components/Modal";
import { TransactionDetail } from "../../components/TransactionDetail";
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
import type { TranslationKey } from "../../i18n/translations";
import { createTransfer } from "../../services/ledger";
import type { AccountType, TransactionType, TransactionWithRelations } from "../../types/database";
import { currentMonthYear, monthBounds, monthLabel, monthName } from "../../utils/dates";
import { formatMoney, savingsRate, toNumber } from "../../utils/format";
import { buildInsights, financialHealth, percentChange } from "../../utils/insights";
import { dismissWelcome, hasDismissedWelcome } from "../../utils/welcome";

function accountIcon(type: AccountType): IconName {
  if (type === "card") return "card";
  if (type === "bank") return "accounts";
  return "wallet";
}

const SERVICES: { to: string; icon: IconName; title: TranslationKey; body: TranslationKey }[] = [
  { to: "/mobile/accounts", icon: "accounts", title: "mhome.svcAccounts", body: "mhome.svcAccountsBody" },
  { to: "/mobile/budget", icon: "budgets", title: "mhome.svcBudget", body: "mhome.svcBudgetBody" },
  { to: "/more", icon: "compare", title: "mhome.svcAnalytics", body: "mhome.svcAnalyticsBody" },
  { to: "/mobile/goals", icon: "target", title: "mhome.svcGoals", body: "mhome.svcGoalsBody" },
  { to: "/mobile/activity", icon: "expense", title: "mhome.svcTx", body: "mhome.svcTxBody" },
  { to: "/more", icon: "file", title: "mhome.svcReports", body: "mhome.svcReportsBody" },
];

export function MobileHomePage() {
  const { t, locale } = useLanguage();
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
  const [viewing, setViewing] = useState<TransactionWithRelations | null>(null);
  const [editing, setEditing] = useState<TransactionWithRelations | null>(null);
  const [deleting, setDeleting] = useState<TransactionWithRelations | null>(null);

  const { data: allTx, loading, error, reload } = useAllTransactions({});
  const { data: categories } = useCategories();
  const { data: accounts, reload: reloadAccounts } = useAccounts();
  const { data: budgets, reload: reloadBudgets } = useBudgets(now.month, now.year);
  const { data: goals } = useGoals();
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

  const bounds = monthBounds(now.month, now.year);
  const previous = { month: now.month === 1 ? 12 : now.month - 1, year: now.month === 1 ? now.year - 1 : now.year };
  const prev = monthBounds(previous.month, previous.year);
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
  const prevNet = prevIncome - prevExpenses;
  const rate = savingsRate(income, expenses);
  const budgetTotal = budgets.reduce((sum, row) => sum + row.amount, 0);
  const budgetPct = budgetTotal > 0 ? (expenses / budgetTotal) * 100 : 0;
  const displayName = profile?.full_name?.trim() || user?.email?.split("@")[0] || t("dash.friend");
  const monthTitle = monthLabel(now.month, now.year, locale);
  const savingsDelta = percentChange(net, prevNet);

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
    savedDelta: net - prevNet,
    goalOnTrack: goals.some((goal) => goal.target_amount > 0 && goal.current_amount / goal.target_amount >= 0.25 && goal.current_amount < goal.target_amount),
  });
  const topInsight = insights[0];

  const recent = useMemo(
    () => [...allTx].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at)).slice(0, 5),
    [allTx],
  );

  const tipKey: TranslationKey =
    budgetTotal > 0 && budgetPct >= 80
      ? "mhome.tipBudget"
      : income > 0 && rate < 20
        ? "mhome.tipSave"
        : "mhome.tipSpend";

  function openCreate(type: TransactionType) {
    setEditing(null);
    setFormType(type);
    setShowForm(true);
  }

  function openEdit(row: TransactionWithRelations) {
    setViewing(null);
    setEditing(row);
    setFormType(row.type);
    setShowForm(true);
  }

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return <ErrorState title={t("error.retryTitle")} message={error} action={{ label: t("common.tryAgain"), onClick: reload }} />;
  }

  return (
    <div className="mobile-stack mhome">
      <header className="mhome-header">
        <BrandLogo className="mobile-logo" />
        <div className="mhome-header-tools">
          <button type="button" className="icon-btn nav-icon" onClick={() => navigate("/mobile/activity")} aria-label={t("nav.activity")}>
            <Icon name="bell" />
          </button>
          <button type="button" className="icon-btn nav-icon" onClick={() => navigate("/settings")} aria-label={t("nav.settings")}>
            <Icon name="user" />
          </button>
        </div>
      </header>

      <section className="mhome-greet-block mhome-anim">
        <p className="mhome-hello">{t("mhome.hello", { name: displayName })}</p>
        <span className="mhome-subtitle">{t("mhome.subtitle")}</span>
      </section>

      <section className="mhome-balance-card mhome-anim delay-1">
        <div className="mhome-balance-top">
          <div>
            <span className="mhome-kicker">{t("mhome.totalBalance")}</span>
            <h1><CountMoney value={available} hidden={hidden} /></h1>
            <small>{t("dash.available")}</small>
          </div>
          <button type="button" className="eye-btn light" onClick={toggle} aria-label={hidden ? t("dash.showBalance") : t("dash.hideBalance")}>
            <Icon name={hidden ? "eyeOff" : "eye"} />
          </button>
        </div>
        <div className="mhome-balance-split">
          <div>
            <span><Icon name="in" />{t("snap.income")}</span>
            <strong>+{hidden ? "••••" : formatMoney(income)}</strong>
          </div>
          <div>
            <span><Icon name="out" />{t("snap.expenses")}</span>
            <strong>-{hidden ? "••••" : formatMoney(expenses)}</strong>
          </div>
        </div>
      </section>

      <section className="mhome-quick mhome-anim delay-2" aria-label={t("quick.title")}>
        <button type="button" onClick={() => openCreate("income")}>
          <span className="mhome-quick-ico"><Icon name="income" /></span>
          <strong>{t("quick.income")}</strong>
          <em>{t("mhome.quickIncomeHint")}</em>
        </button>
        <button type="button" onClick={() => openCreate("expense")}>
          <span className="mhome-quick-ico"><Icon name="expense" /></span>
          <strong>{t("quick.expense")}</strong>
          <em>{t("mhome.quickExpenseHint")}</em>
        </button>
        <button type="button" onClick={() => setShowTransfer(true)}>
          <span className="mhome-quick-ico"><Icon name="transfer" /></span>
          <strong>{t("quick.transfer")}</strong>
          <em>{t("mhome.quickTransferHint")}</em>
        </button>
        <button type="button" onClick={() => navigate("/mobile/goals")}>
          <span className="mhome-quick-ico"><Icon name="target" /></span>
          <strong>{t("quick.goal")}</strong>
          <em>{t("mhome.quickGoalHint")}</em>
        </button>
      </section>

      <section className="mhome-services mhome-anim delay-3">
        <div className="mhome-section-head">
          <h2>{t("mhome.services")}</h2>
        </div>
        <div className="mhome-service-grid">
          {SERVICES.map((item) => (
            <Link key={item.title} to={item.to} className="mhome-service-card">
              <span className="mhome-service-ico"><Icon name={item.icon} /></span>
              <strong>{t(item.title)}</strong>
              <em>{t(item.body)}</em>
            </Link>
          ))}
        </div>
      </section>

      <div className="mhome-anim delay-3">
        <FinancialHealthCard health={health} />
      </div>

      <section className="mhome-accounts-row mhome-anim delay-4">
        <div className="mhome-section-head">
          <h2>{t("nav.accounts")}</h2>
          <Link to="/mobile/accounts">{t("dashboard.viewAll")}</Link>
        </div>
        {accounts.length === 0 ? (
          <EmptyState title={t("acc.emptyTitle")} message={t("acc.emptyBody")} icon="accounts" />
        ) : (
          <div className="mhome-account-scroller">
            {accounts.map((account) => (
              <article key={account.id} className="mhome-account-chip">
                <span className="mhome-account-ico"><Icon name={accountIcon(account.type)} /></span>
                <div>
                  <strong>{localizeName(account.name, t)}</strong>
                  <b><CountMoney value={account.balance} hidden={hidden} /></b>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="panel mhome-month-card mhome-anim delay-4">
        <div className="mhome-section-head">
          <h2>{monthTitle}</h2>
        </div>
        <div className="mhome-month-grid">
          <div><span>{t("snap.income")}</span><strong className="up"><CountMoney value={income} hidden={hidden} /></strong></div>
          <div><span>{t("snap.expenses")}</span><strong className="down"><CountMoney value={expenses} hidden={hidden} /></strong></div>
          <div><span>{t("snap.saved")}</span><strong className={net >= 0 ? "up" : "down"}><CountMoney value={net} hidden={hidden} signed /></strong></div>
          <div><span>{t("dashboard.savings")}</span><strong>{income > 0 ? `${rate.toFixed(1)}%` : "—"}</strong></div>
        </div>
        {savingsDelta != null ? (
          <p className={savingsDelta >= 0 ? "up mhome-compare" : "down mhome-compare"}>
            <Icon name={savingsDelta >= 0 ? "in" : "out"} />
            {t("mhome.vsPrev", {
              pct: Math.abs(savingsDelta).toFixed(0),
              month: monthName(previous.month, locale),
            })}
          </p>
        ) : (
          <p className="muted mhome-compare">{t("snap.noPrev")}</p>
        )}
      </section>

      {topInsight ? (
        <article className="mhome-insight-card mhome-anim delay-5">
          <span className="mhome-kicker"><Icon name={topInsight.icon} />{t("insight.title")}</span>
          <strong>{t(topInsight.titleKey)}</strong>
          <p>{t(topInsight.bodyKey, topInsight.vars)}</p>
        </article>
      ) : null}

      <section className="mhome-banner mhome-anim delay-5">
        <div>
          <span className="mhome-kicker"><Icon name="spark" />{t("brand.name")}</span>
          <strong>{t("mhome.bannerTitle")}</strong>
          <p>{t("mhome.bannerBody")}</p>
        </div>
        <span className="mhome-banner-mark" aria-hidden="true"><Icon name="keep" /></span>
      </section>

      <article className="mhome-tip-card mhome-anim delay-5">
        <span className="mhome-kicker"><Icon name="pace" />{t("mhome.tipTitle")}</span>
        <p>{t(tipKey)}</p>
      </article>

      <section className="panel mhome-recent mhome-anim delay-5">
        <div className="mhome-section-head">
          <h2>{t("dashboard.recentTitle")}</h2>
          <Link to="/mobile/activity">{t("dashboard.viewAll")}</Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            title={t("dashboard.emptyTitle")}
            message={t("dashboard.emptyBody")}
            icon="wallet"
            action={{ label: t("dashboard.add"), onClick: () => openCreate("expense") }}
          />
        ) : (
          <ul className="mhome-recent-list">
            {recent.map((row) => (
              <li key={row.id}>
                <button type="button" className="mhome-recent-row" onClick={() => setViewing(row)}>
                  <span className={`tx-icon ${row.type}`}><Icon name={row.type === "income" ? "income" : "expense"} /></span>
                  <div>
                    <strong>{localizeName(row.title, t)}</strong>
                    <em>
                      {localizeName(row.category?.name, t) || t("common.uncategorized")}
                      {" · "}
                      {localizeName(row.account?.name, t) || "—"}
                    </em>
                  </div>
                  <b className={row.type === "income" ? "amount-income" : "amount-expense"}>
                    {row.type === "income" ? "+" : "-"}
                    {formatMoney(row.amount)}
                  </b>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

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
          title={editing ? t("dashboard.editTx") : formType === "income" ? t("tx.addIncomeTitle") : t("tx.addExpenseTitle")}
          subtitle={formType === "income" ? t("tx.incomeSubtitle") : t("tx.expenseSubtitle")}
          onClose={() => setShowForm(false)}
        >
          <TransactionForm
            accounts={accounts}
            categories={categories}
            initial={editing}
            defaultType={formType ?? "expense"}
            lockType={!editing}
            submitting={submitting}
            onCancel={() => setShowForm(false)}
            onSubmit={async (values) => {
              const ok = await save({ ...values, type: editing?.type ?? formType ?? "expense" }, editing?.id);
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
    </div>
  );
}
