import { useState } from "react";
import { AccountForm } from "../components/forms/AccountForm";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Modal } from "../components/Modal";
import { EmptyState, ErrorState, LoadingState } from "../components/Status";
import { useAccounts } from "../hooks/useAccounts";
import { useLanguage } from "../hooks/useLanguage";
import { useToast } from "../hooks/useToast";
import { createAccount, deleteAccount, updateAccount } from "../services/accounts";
import type { Account, AccountType } from "../types/database";
import { localizeName } from "../i18n/localize";
import { formatMoney } from "../utils/format";

export function AccountsPage() {
  const { data, loading, error, reload } = useAccounts();
  const { notify } = useToast();
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const total = data.reduce((sum, account) => sum + account.balance, 0);
  const typeLabels: Record<AccountType, string> = {
    cash: t("acc.cash"),
    bank: t("acc.bank"),
    card: t("acc.card"),
    wallet: t("acc.wallet"),
  };

  return (
    <>
      <section className="summary-grid compact">
        <div className="summary-card">
          <div className="summary-head"><span>{t("acc.total")}</span></div>
          <strong>{formatMoney(total)}</strong>
          <div className="trend">{data.length === 1 ? t("acc.across", { count: data.length }) : t("acc.acrossPlural", { count: data.length })}</div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t("acc.title")}</h2>
            <p>{t("acc.body")}</p>
          </div>
          <button className="primary-btn" onClick={() => { setEditing(null); setShowForm(true); }}>{t("acc.add")}</button>
        </div>

        {loading ? <LoadingState message={t("acc.loading")} /> : null}
        {error ? <ErrorState title={t("acc.loadError")} message={error} action={{ label: t("common.tryAgain"), onClick: reload }} /> : null}
        {!loading && !error && data.length === 0 ? (
          <EmptyState
            title={t("acc.emptyTitle")}
            message={t("acc.emptyBody")}
            action={{ label: t("acc.add"), onClick: () => setShowForm(true) }}
          />
        ) : null}

        <div className="card-grid">
          {data.map((account) => (
            <article className="entity-card" key={account.id}>
              <div className="entity-icon">{account.type === "cash" ? "◎" : account.type === "bank" ? "▣" : account.type === "card" ? "▤" : "◈"}</div>
              <div>
                <strong>{localizeName(account.name, t)}</strong>
                <span className="type-pill">{typeLabels[account.type]}</span>
                <p className="balance-line">{formatMoney(account.balance)}</p>
              </div>
              <div className="row-actions">
                <button className="ghost-btn" onClick={() => { setEditing(account); setShowForm(true); }}>{t("common.edit")}</button>
                <button className="ghost-btn danger" onClick={() => setDeleting(account)}>{t("common.delete")}</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {showForm ? (
        <Modal
          title={editing ? t("acc.edit") : t("acc.create")}
          subtitle={t("acc.subtitle")}
          onClose={() => setShowForm(false)}
        >
          <AccountForm
            initial={editing}
            submitting={submitting}
            onCancel={() => setShowForm(false)}
            onSubmit={async (values) => {
              setSubmitting(true);
              try {
                if (editing) {
                  await updateAccount(editing.id, { name: values.name, type: values.type });
                  notify(t("toast.accUpdated"));
                } else {
                  await createAccount(values);
                  notify(t("toast.accCreated"));
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
          title={t("acc.deleteTitle")}
          message={t("acc.deleteMsg", { name: localizeName(deleting.name, t) })}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteAccount(deleting.id);
              notify(t("toast.accDeleted"));
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
