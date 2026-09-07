import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { MonthFilter, type MonthValue } from "../components/MonthFilter";
import { Pagination } from "../components/Pagination";
import { SelectField, TextField } from "../components/Field";
import { TransactionForm } from "../components/forms/TransactionForm";
import { TransactionTable } from "../components/TransactionTable";
import { useAccounts } from "../hooks/useAccounts";
import { useCategories } from "../hooks/useCategories";
import { useLanguage } from "../hooks/useLanguage";
import { useTransactionMutations } from "../hooks/useTransactionMutations";
import { useTransactions } from "../hooks/useTransactions";
import type { AppOutletContext } from "../layouts/AppLayout";
import type { TransactionType, TransactionWithRelations } from "../types/database";
import { localizeName } from "../i18n/localize";
import { currentMonthYear, monthBounds, monthLabel } from "../utils/dates";
import { formatMoney } from "../utils/format";

const PAGE_SIZE = 10;

export function TransactionsPage({ type }: { type: TransactionType }) {
  const { t, locale } = useLanguage();
  const { search } = useOutletContext<AppOutletContext>();
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<MonthValue | null>(null);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TransactionWithRelations | null>(null);
  const [deleting, setDeleting] = useState<TransactionWithRelations | null>(null);

  const monthRange = selectedMonth ? monthBounds(selectedMonth.month, selectedMonth.year) : null;
  const filters = {
    type,
    search,
    categoryId,
    accountId,
    from: monthRange?.from ?? from,
    to: monthRange?.to ?? to,
    page,
    pageSize: PAGE_SIZE,
  };

  const { data, all, count, loading, error, reload } = useTransactions(filters);
  const { data: categories } = useCategories(type);
  const { data: accounts, reload: reloadAccounts } = useAccounts();
  const { save, remove, submitting } = useTransactionMutations(() => {
    reload();
    reloadAccounts();
  });

  const now = currentMonthYear();
  const monthPrefix = selectedMonth
    ? `${selectedMonth.year}-${String(selectedMonth.month).padStart(2, "0")}`
    : `${now.year}-${String(now.month).padStart(2, "0")}`;
  const yearPrefix = `${(selectedMonth?.year ?? now.year)}-`;
  const selectedLabel = selectedMonth ? monthLabel(selectedMonth.month, selectedMonth.year, locale) : "";

  const total = useMemo(() => all.reduce((sum, row) => sum + row.amount, 0), [all]);
  const thisMonth = useMemo(
    () => all.filter((row) => row.transaction_date.startsWith(monthPrefix)).reduce((sum, row) => sum + row.amount, 0),
    [all, monthPrefix],
  );
  const thisYear = useMemo(
    () => all.filter((row) => row.transaction_date.startsWith(yearPrefix)).reduce((sum, row) => sum + row.amount, 0),
    [all, yearPrefix],
  );
  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of all) {
      const name = localizeName(row.category?.name, t) || t("common.other");
      map.set(name, (map.get(name) ?? 0) + row.amount);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [all, t]);

  const isIncome = type === "income";
  const noun = isIncome ? t("tx.nounIncome") : t("tx.nounExpense");

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  function changeMonth(next: MonthValue | null) {
    setSelectedMonth(next);
    if (next) {
      const bounds = monthBounds(next.month, next.year);
      setFrom(bounds.from);
      setTo(bounds.to);
    } else {
      setFrom("");
      setTo("");
    }
    setPage(1);
  }

  return (
    <>
      <section className="summary-grid compact">
        <div className="summary-card">
          <div className="summary-head"><span>{isIncome ? t("tx.totalIncome") : t("tx.totalExpenses")}</span></div>
          <strong>{formatMoney(total)}</strong>
          <div className="trend">
            {selectedMonth
              ? selectedLabel
              : search || from || to || categoryId || accountId
                ? t("tx.matching")
                : t("tx.allRecords")}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-head">
            <span>
              {selectedMonth
                ? t(isIncome ? "tx.incomeInMonth" : "tx.expenseInMonth", { month: selectedLabel })
                : (isIncome ? t("tx.incomeMonth") : t("tx.expenseMonth"))}
            </span>
          </div>
          <strong>{formatMoney(thisMonth)}</strong>
        </div>
        <div className="summary-card">
          <div className="summary-head"><span>{isIncome ? t("tx.incomeYear") : t("tx.thisYear")}</span></div>
          <strong>{formatMoney(thisYear)}</strong>
        </div>
        <div className="summary-card">
          <div className="summary-head"><span>{isIncome ? t("tx.incomeSources") : t("tx.expenseCategories")}</span></div>
          <div className="mini-list">
            {grouped.length === 0 ? <p className="muted">{t("tx.noneYet", { noun })}</p> : null}
            {grouped.map(([name, value]) => (
              <div key={name}><span>{name}</span><strong>{formatMoney(value)}</strong></div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{isIncome ? t("tx.incomeTable") : t("tx.expenseTable")}</h2>
            <p>{t("tx.tableBody", { noun })}</p>
          </div>
          <button className="primary-btn" onClick={() => { setEditing(null); setShowForm(true); }}>
            {isIncome ? t("tx.addIncome") : t("tx.addExpense")}
          </button>
        </div>

        <MonthFilter value={selectedMonth} onChange={changeMonth} />

        <div className="filter-bar">
          <SelectField label={t("filter.category")} value={categoryId} onChange={(event) => resetPage(setCategoryId)(event.target.value)}>
            <option value="">{t("filter.allCategories")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{localizeName(category.name, t)}</option>
            ))}
          </SelectField>
          <SelectField label={t("filter.account")} value={accountId} onChange={(event) => resetPage(setAccountId)(event.target.value)}>
            <option value="">{t("filter.allAccounts")}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{localizeName(account.name, t)}</option>
            ))}
          </SelectField>
          <TextField
            label={t("filter.from")}
            type="date"
            value={from}
            onChange={(event) => {
              setSelectedMonth(null);
              resetPage(setFrom)(event.target.value);
            }}
          />
          <TextField
            label={t("filter.to")}
            type="date"
            value={to}
            onChange={(event) => {
              setSelectedMonth(null);
              resetPage(setTo)(event.target.value);
            }}
          />
        </div>

        <TransactionTable
          rows={data}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyTitle={t("tx.emptyTitle", { noun })}
          emptyMessage={t("tx.emptyBody", { noun })}
          onEdit={(row) => {
            setEditing(row);
            setShowForm(true);
          }}
          onDelete={setDeleting}
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={count} onPage={setPage} />
      </section>

      {showForm ? (
        <Modal
          title={editing
            ? (isIncome ? t("tx.editIncome") : t("tx.editExpense"))
            : (isIncome ? t("tx.addIncomeTitle") : t("tx.addExpenseTitle"))}
          subtitle={isIncome ? t("tx.incomeSubtitle") : t("tx.expenseSubtitle")}
          onClose={() => setShowForm(false)}
        >
          <TransactionForm
            accounts={accounts}
            categories={categories}
            initial={editing}
            defaultType={type}
            lockType
            submitting={submitting}
            onCancel={() => setShowForm(false)}
            onSubmit={async (values) => {
              const ok = await save({ ...values, type }, editing?.id);
              if (ok) setShowForm(false);
            }}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t("tx.deleteTitle", { noun })}
          message={t("tx.deleteMsg", { title: deleting.title })}
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

export function IncomePage() {
  return <TransactionsPage type="income" />;
}

export function ExpensesPage() {
  return <TransactionsPage type="expense" />;
}
