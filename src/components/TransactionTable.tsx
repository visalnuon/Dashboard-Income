import { localizeName } from "../i18n/localize";
import type { TransactionWithRelations } from "../types/database";
import { formatDate, formatMoney } from "../utils/format";
import { useLanguage } from "../hooks/useLanguage";
import { EmptyState, ErrorState, LoadingState } from "./Status";

type TransactionTableProps = {
  rows: TransactionWithRelations[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onEdit?: (row: TransactionWithRelations) => void;
  onDelete?: (row: TransactionWithRelations) => void;
  emptyTitle?: string;
  emptyMessage?: string;
  showAccount?: boolean;
};

export function TransactionTable({
  rows,
  loading,
  error,
  onRetry,
  onEdit,
  onDelete,
  emptyTitle,
  emptyMessage,
  showAccount = true,
}: TransactionTableProps) {
  const { t, locale } = useLanguage();
  if (loading) return <LoadingState message={t("tx.loading")} />;
  if (error) {
    return <ErrorState title={t("tx.loadError")} message={error} action={onRetry ? { label: t("common.tryAgain"), onClick: onRetry } : undefined} />;
  }
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle ?? t("dashboard.emptyTitle")} message={emptyMessage ?? t("dashboard.emptyBody")} icon="▤" />;
  }

  return (
    <div className={`table ${showAccount ? "with-account" : ""} ${onEdit || onDelete ? "with-actions" : ""}`}>
      <div className="table-row table-header">
        <span>{t("tx.colTransaction")}</span>
        <span>{t("tx.colCategory")}</span>
        {showAccount ? <span>{t("tx.colAccount")}</span> : null}
        <span>{t("tx.colDate")}</span>
        <span>{t("tx.colAmount")}</span>
        {onEdit || onDelete ? <span /> : null}
      </div>
      {rows.map((row) => (
        <div className="table-row" key={row.id}>
          <div className="transaction-name">
            <div className={`tx-icon ${row.type}`}>{row.category?.icon || (row.type === "income" ? "↗" : "↘")}</div>
            <div>
              <strong>{localizeName(row.title, t)}</strong>
              {row.description ? <em className="row-desc">{row.description}</em> : null}
            </div>
          </div>
          <span className="category-pill">{localizeName(row.category?.name, t) || t("common.uncategorized")}</span>
          {showAccount ? <span className="muted">{localizeName(row.account?.name, t) || "—"}</span> : null}
          <span className="muted">{formatDate(row.transaction_date, locale)}</span>
          <strong className={row.type === "income" ? "amount-income" : "amount-expense"}>
            {row.type === "income" ? "+" : "-"}{formatMoney(row.amount)}
          </strong>
          {onEdit || onDelete ? (
            <div className="row-actions">
              {onEdit ? <button className="ghost-btn" onClick={() => onEdit(row)}>{t("common.edit")}</button> : null}
              {onDelete ? <button className="ghost-btn danger" onClick={() => onDelete(row)}>{t("common.delete")}</button> : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
