import { localizeName } from "../i18n/localize";
import type { TransactionWithRelations } from "../types/database";
import { formatDate, formatDateTime, formatMoney } from "../utils/format";
import { useLanguage } from "../hooks/useLanguage";
import { Icon, TxKindIcon } from "./Icon";

type TransactionDetailProps = {
  row: TransactionWithRelations;
  onEdit: () => void;
  onDelete: () => void;
};

export function TransactionDetail({ row, onEdit, onDelete }: TransactionDetailProps) {
  const { t, locale } = useLanguage();
  return (
    <div className="tx-detail">
      <div className={`tx-detail-hero ${row.type}`}>
        <div className={`tx-icon ${row.type}`}><TxKindIcon type={row.type} symbol={row.category?.icon} /></div>
        <span>{row.type === "income" ? t("common.income") : t("common.expense")}</span>
        <strong className={row.type === "income" ? "amount-income" : "amount-expense"}>
          {row.type === "income" ? "+" : "-"}
          {formatMoney(row.amount)}
        </strong>
      </div>
      <dl className="tx-detail-list">
        <div><dt>{t("tx.colCategory")}</dt><dd>{localizeName(row.category?.name, t) || t("common.uncategorized")}</dd></div>
        <div><dt>{t("form.title")}</dt><dd>{localizeName(row.title, t)}</dd></div>
        <div><dt>{t("form.description")}</dt><dd>{row.description || "—"}</dd></div>
        <div><dt>{t("tx.colAccount")}</dt><dd>{localizeName(row.account?.name, t) || "—"}</dd></div>
        <div><dt>{t("tx.colDate")}</dt><dd>{formatDate(row.transaction_date, locale)}</dd></div>
        <div><dt>{t("tx.created")}</dt><dd>{formatDateTime(row.created_at, locale)}</dd></div>
      </dl>
      <div className="modal-actions">
        <button type="button" className="ghost-btn danger bordered" onClick={onDelete}>
          <Icon name="close" />
          {t("common.delete")}
        </button>
        <button type="button" className="primary-btn" onClick={onEdit}>
          {t("common.edit")}
        </button>
      </div>
    </div>
  );
}
