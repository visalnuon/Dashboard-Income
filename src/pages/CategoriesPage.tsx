import { useMemo, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CategoryForm } from "../components/forms/CategoryForm";
import { Modal } from "../components/Modal";
import { EmptyState, ErrorState, LoadingState } from "../components/Status";
import { useCategories } from "../hooks/useCategories";
import { useLanguage } from "../hooks/useLanguage";
import { useToast } from "../hooks/useToast";
import { createCategory, deleteCategory, updateCategory } from "../services/categories";
import type { Category, TransactionType } from "../types/database";
import { localizeName } from "../i18n/localize";

export function CategoriesPage() {
  const { data, loading, error, reload } = useCategories();
  const { notify } = useToast();
  const { t } = useLanguage();
  const [typeFilter, setTypeFilter] = useState<TransactionType | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const rows = useMemo(
    () => (typeFilter ? data.filter((item) => item.type === typeFilter) : data),
    [data, typeFilter],
  );

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{t("cat.title")}</h2>
            <p>{t("cat.body")}</p>
          </div>
          <button className="primary-btn" onClick={() => { setEditing(null); setShowForm(true); }}>{t("cat.add")}</button>
        </div>
        <div className="chip-row">
          {(["", "income", "expense"] as const).map((value) => (
            <button
              key={value || "all"}
              className={typeFilter === value ? "chip active" : "chip"}
              onClick={() => setTypeFilter(value)}
            >
              {value ? t(value === "income" ? "common.income" : "common.expense") : t("common.all")}
            </button>
          ))}
        </div>

        {loading ? <LoadingState message={t("cat.loading")} /> : null}
        {error ? <ErrorState title={t("cat.loadError")} message={error} action={{ label: t("common.tryAgain"), onClick: reload }} /> : null}
        {!loading && !error && rows.length === 0 ? (
          <EmptyState title={t("cat.emptyTitle")} message={t("cat.emptyBody")} action={{ label: t("cat.add"), onClick: () => setShowForm(true) }} />
        ) : null}

        <div className="card-grid">
          {rows.map((category) => (
            <article className="entity-card" key={category.id}>
              <div className="entity-icon">{category.icon}</div>
              <div>
                <strong>{localizeName(category.name, t)}</strong>
                <span className={`type-pill ${category.type}`}>{category.type === "income" ? t("common.income") : t("common.expense")}</span>
              </div>
              <div className="row-actions">
                <button className="ghost-btn" onClick={() => { setEditing(category); setShowForm(true); }}>{t("common.rename")}</button>
                <button className="ghost-btn danger" onClick={() => setDeleting(category)}>{t("common.delete")}</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {showForm ? (
        <Modal
          title={editing ? t("cat.edit") : t("cat.create")}
          subtitle={t("cat.subtitle")}
          onClose={() => setShowForm(false)}
        >
          <CategoryForm
            initial={editing}
            submitting={submitting}
            onCancel={() => setShowForm(false)}
            onSubmit={async (values) => {
              setSubmitting(true);
              try {
                if (editing) {
                  await updateCategory(editing.id, values);
                  notify(t("toast.catUpdated"));
                } else {
                  await createCategory(values);
                  notify(t("toast.catCreated"));
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
          title={t("cat.deleteTitle")}
          message={t("cat.deleteMsg", { name: localizeName(deleting.name, t) })}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            try {
              await deleteCategory(deleting.id);
              notify(t("toast.catDeleted"));
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
