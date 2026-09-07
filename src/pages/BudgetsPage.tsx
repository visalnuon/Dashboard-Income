import { useMemo, useState } from "react";
import { BudgetForm } from "../components/forms/BudgetForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { ProgressBar } from "../components/ProgressBar";
import { EmptyState, ErrorState, LoadingState } from "../components/Status";
import { useAllTransactions } from "../hooks/useTransactions";
import { useBudgets } from "../hooks/useBudgets";
import { useCategories } from "../hooks/useCategories";
import { useLanguage } from "../hooks/useLanguage";
import { useToast } from "../hooks/useToast";
import { createBudget, deleteBudget, updateBudget } from "../services/budgets";
import type { BudgetWithCategory } from "../types/database";
import { localizeName } from "../i18n/localize";
import { currentMonthYear, monthLabel, monthName } from "../utils/dates";
import { formatMoney, formatPercent } from "../utils/format";

export function BudgetsPage() {
  const { t, locale } = useLanguage();
  const now = currentMonthYear();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  const { data, loading, error, reload } = useBudgets(month, year);
  const { data: categories } = useCategories("expense");
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = new Date(year, month, 0).toISOString().slice(0, 10);
  const { data: transactions } = useAllTransactions({ type: "expense", from: start, to: end });
  const { notify } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BudgetWithCategory | null>(null);
  const [deleting, setDeleting] = useState<BudgetWithCategory | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of transactions) {
      map.set(row.category_id, (map.get(row.category_id) ?? 0) + row.amount);
    }
    return map;
  }, [transactions]);

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{monthLabel(month, year, locale)}</h2>
            <p>{t("budget.body")}</p>
          </div>
          <div className="toolbar-inline">
            <select value={month} onChange={(event) => setMonth(Number(event.target.value))}>
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {monthName(index + 1, locale)}
                </option>
              ))}
            </select>
            <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {[now.year - 1, now.year, now.year + 1].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
            <button className="primary-btn" onClick={() => { setEditing(null); setShowForm(true); }}>{t("budget.add")}</button>
          </div>
        </div>

        {loading ? <LoadingState message={t("budget.loading")} /> : null}
        {error ? <ErrorState title={t("budget.loadError")} message={error} action={{ label: t("common.tryAgain"), onClick: reload }} /> : null}
        {!loading && !error && data.length === 0 ? (
          <EmptyState
            title={t("budget.emptyTitle")}
            message={t("budget.emptyBody")}
            action={{ label: t("budget.add"), onClick: () => setShowForm(true) }}
          />
        ) : null}

        <div className="budget-list">
          {data.map((budget) => {
            const spent = spentByCategory.get(budget.category_id) ?? 0;
            const remaining = budget.amount - spent;
            const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            const tone = pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok";
            return (
              <article className={`budget-card ${tone}`} key={budget.id}>
                <div className="budget-card-head">
                  <div>
                    <strong>{budget.category?.icon} {localizeName(budget.category?.name, t) || t("budget.category")}</strong>
                    <p>{formatMoney(spent)} / {formatMoney(budget.amount)}</p>
                  </div>
                  <span>{formatPercent(pct)}</span>
                </div>
                <ProgressBar value={pct} tone={tone} />
                <div className="budget-card-foot">
                  <small>
                    {pct >= 100
                      ? t("budget.overBy", { amount: formatMoney(Math.abs(remaining)) })
                      : pct >= 80
                        ? t("budget.leftWarn", { amount: formatMoney(remaining) })
                        : t("budget.remaining", { amount: formatMoney(remaining) })}
                  </small>
                  <div className="row-actions">
                    <button className="ghost-btn" onClick={() => { setEditing(budget); setShowForm(true); }}>{t("common.edit")}</button>
                    <button className="ghost-btn danger" onClick={() => setDeleting(budget)}>{t("common.delete")}</button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {showForm ? (
        <Modal
          title={editing ? t("budget.edit") : t("budget.create")}
          subtitle={t("budget.subtitle")}
          onClose={() => setShowForm(false)}
        >
          <BudgetForm
            categories={categories}
            initial={editing}
            submitting={submitting}
            onCancel={() => setShowForm(false)}
            onSubmit={async (values) => {
              setSubmitting(true);
              try {
                if (editing) {
                  await updateBudget(editing.id, values);
                  notify(t("toast.budgetUpdated"));
                } else {
                  await createBudget(values);
                  notify(t("toast.budgetCreated"));
                }
                reload();
                setShowForm(false);
              } catch (err) {
                notify(err instanceof Error ? err.message : t("toast.generic"), "error");
              } finally {
                setSubmitting(false);
              }
            }}
          />
        </Modal>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t("budget.deleteTitle")}
          message={t("budget.deleteMsg", { name: localizeName(deleting.category?.name, t) || t("budget.category") })}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteBudget(deleting.id);
              notify(t("toast.budgetDeleted"));
              reload();
            } catch (err) {
              notify(err instanceof Error ? err.message : t("toast.generic"), "error");
            } finally {
              setDeleting(null);
            }
          }}
        />
      ) : null}
    </>
  );
}
