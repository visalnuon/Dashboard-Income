import { useMemo, useState } from "react";
import { ActivityList } from "../../components/ActivityList";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { Icon } from "../../components/Icon";
import { Modal } from "../../components/Modal";
import { TransactionDetail } from "../../components/TransactionDetail";
import { TransactionForm } from "../../components/forms/TransactionForm";
import { ErrorState, LoadingState } from "../../components/Status";
import { useAccounts } from "../../hooks/useAccounts";
import { useCategories } from "../../hooks/useCategories";
import { useLanguage } from "../../hooks/useLanguage";
import { useAllTransactions } from "../../hooks/useTransactions";
import { useTransactionMutations } from "../../hooks/useTransactionMutations";
import type { TransactionType, TransactionWithRelations } from "../../types/database";

export function MobileActivityPage() {
  const { t } = useLanguage();
  const [filter, setFilter] = useState<"all" | TransactionType>("all");
  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<TransactionWithRelations | null>(null);
  const [editing, setEditing] = useState<TransactionWithRelations | null>(null);
  const [deleting, setDeleting] = useState<TransactionWithRelations | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<TransactionType>("expense");

  const { data: allTx, loading, error, reload } = useAllTransactions({ search });
  const { data: categories } = useCategories();
  const { data: accounts, reload: reloadAccounts } = useAccounts();
  const { save, remove, submitting } = useTransactionMutations(() => {
    reload();
    reloadAccounts();
  });

  const rows = useMemo(() => {
    const filtered = filter === "all" ? allTx : allTx.filter((row) => row.type === filter);
    return [...filtered].sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at));
  }, [allTx, filter]);

  return (
    <div className="mobile-stack">
      <header className="mobile-page-head">
        <h1>{t("nav.activity")}</h1>
        <button
          type="button"
          className="primary-btn"
          onClick={() => {
            setEditing(null);
            setFormType("expense");
            setShowForm(true);
          }}
        >
          <Icon name="plus" />
          {t("dashboard.add")}
        </button>
      </header>

      <label className="search mobile-search">
        <Icon name="search" />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("nav.search")} />
      </label>

      <div className="mobile-filter-tabs" role="tablist">
        {(["all", "income", "expense"] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
          >
            {item === "all" ? t("common.all") : item === "income" ? t("common.income") : t("common.expense")}
          </button>
        ))}
      </div>

      {loading ? <LoadingState message={t("tx.loading")} /> : null}
      {error ? <ErrorState title={t("error.retryTitle")} message={error} action={{ label: t("common.tryAgain"), onClick: reload }} /> : null}
      {!loading && !error ? (
        <ActivityList
          rows={rows}
          emptyTitle={t("dashboard.emptyTitle")}
          emptyMessage={t("dashboard.emptyBody")}
          emptyAction={{ label: t("dashboard.add"), onClick: () => { setShowForm(true); setFormType("expense"); } }}
          onOpen={setViewing}
          onEdit={(row) => {
            setEditing(row);
            setFormType(row.type);
            setShowForm(true);
          }}
          onDelete={setDeleting}
        />
      ) : null}

      {viewing ? (
        <Modal title={t("tx.detail")} onClose={() => setViewing(null)}>
          <TransactionDetail
            row={viewing}
            onEdit={() => {
              setEditing(viewing);
              setFormType(viewing.type);
              setViewing(null);
              setShowForm(true);
            }}
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
          onClose={() => setShowForm(false)}
        >
          <TransactionForm
            accounts={accounts}
            categories={categories}
            initial={editing}
            defaultType={formType}
            lockType={!editing}
            submitting={submitting}
            onCancel={() => setShowForm(false)}
            onSubmit={async (values) => {
              const ok = await save({ ...values, type: editing?.type ?? formType }, editing?.id);
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
