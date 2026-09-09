import { localizeName } from "../i18n/localize";
import type { TransactionWithRelations } from "../types/database";
import { formatDate, formatMoney } from "../utils/format";
import { toISODate } from "../utils/dates";
import { useLanguage } from "../hooks/useLanguage";
import { TxKindIcon } from "./Icon";
import { EmptyState } from "./Status";

type ActivityListProps = {
  rows: TransactionWithRelations[];
  onEdit?: (row: TransactionWithRelations) => void;
  onDelete?: (row: TransactionWithRelations) => void;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: { label: string; onClick: () => void };
  onOpen?: (row: TransactionWithRelations) => void;
};

function dayLabel(date: string, locale: string, today: string, yesterday: string, t: (key: "dash.today" | "dash.yesterday") => string) {
  if (date === today) return t("dash.today");
  if (date === yesterday) return t("dash.yesterday");
  return formatDate(date, locale);
}

export function ActivityList({ rows, onEdit, onDelete, emptyTitle, emptyMessage, emptyAction, onOpen }: ActivityListProps) {
  const { t, locale } = useLanguage();
  const today = toISODate(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = toISODate(yesterdayDate);

  if (rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle ?? t("dashboard.emptyTitle")}
        message={emptyMessage ?? t("dashboard.emptyBody")}
        icon="wallet"
        action={emptyAction}
      />
    );
  }

  const groups: { date: string; items: TransactionWithRelations[] }[] = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.date === row.transaction_date) last.items.push(row);
    else groups.push({ date: row.transaction_date, items: [row] });
  }

  return (
    <div className="activity-list">
      {groups.map((group) => {
        const dayTotal = group.items.reduce(
          (sum, row) => sum + (row.type === "income" ? row.amount : -row.amount),
          0,
        );
        return (
          <section className="activity-group" key={group.date}>
            <header className="activity-day">
              <span>{dayLabel(group.date, locale, today, yesterday, t)}</span>
              <strong className={dayTotal >= 0 ? "amount-income" : "amount-expense"}>
                {dayTotal >= 0 ? "+" : "-"}
                {formatMoney(Math.abs(dayTotal))}
              </strong>
            </header>
            {group.items.map((row) => (
              <article
                className={onOpen ? "activity-row is-clickable" : "activity-row"}
                key={row.id}
                onClick={onOpen ? () => onOpen(row) : undefined}
                onKeyDown={onOpen ? (event) => { if (event.key === "Enter") onOpen(row); } : undefined}
                role={onOpen ? "button" : undefined}
                tabIndex={onOpen ? 0 : undefined}
              >
                <div className={`tx-icon ${row.type}`}><TxKindIcon type={row.type} symbol={row.category?.icon} /></div>
                <div className="activity-copy">
                  <strong>{localizeName(row.title, t)}</strong>
                  <span>
                    {localizeName(row.category?.name, t) || t("common.uncategorized")}
                    {" · "}
                    {localizeName(row.account?.name, t) || "—"}
                    {" · "}
                    {formatDate(row.transaction_date, locale)}
                  </span>
                </div>
                <div className="activity-meta">
                  <strong className={row.type === "income" ? "amount-income" : "amount-expense"}>
                    {row.type === "income" ? "+" : "-"}
                    {formatMoney(row.amount)}
                  </strong>
                  {onEdit || onDelete ? (
                    <div className="row-actions">
                      {onEdit ? <button className="ghost-btn" onClick={(event) => { event.stopPropagation(); onEdit(row); }}>{t("common.edit")}</button> : null}
                      {onDelete ? <button className="ghost-btn danger" onClick={(event) => { event.stopPropagation(); onDelete(row); }}>{t("common.delete")}</button> : null}
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}
