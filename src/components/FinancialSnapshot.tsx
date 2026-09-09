import { CountMoney } from "./CountMoney";
import { Icon } from "./Icon";
import { useLanguage } from "../hooks/useLanguage";
import { monthName } from "../utils/dates";

function fmtDelta(value: number | null) {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(0)}%`;
}

type SnapshotProps = {
  month: number;
  year: number;
  prevMonth: number;
  income: number;
  expenses: number;
  net: number;
  rate: number;
  incomeDelta: number | null;
  expenseDelta: number | null;
  savingsDelta: number | null;
  strongest: string | null;
  watch: string | null;
  hidden: boolean;
};

export function FinancialSnapshot({
  month,
  year,
  prevMonth,
  income,
  expenses,
  net,
  rate,
  incomeDelta,
  expenseDelta,
  savingsDelta,
  strongest,
  watch,
  hidden,
}: SnapshotProps) {
  const { t, locale } = useLanguage();
  const label = `${monthName(month, locale)} ${year}`;
  const prevLabel = monthName(prevMonth, locale);

  return (
    <section className="panel snapshot-panel">
      <div className="panel-head">
        <div>
          <h2>{t("snap.heading")}</h2>
          <p>{t("snap.title", { month: label })}</p>
        </div>
      </div>
      <div className="snapshot-metrics four">
        <div>
          <span>{t("snap.income")}</span>
          <strong className="up"><CountMoney value={income} hidden={hidden} /></strong>
        </div>
        <div>
          <span>{t("snap.expenses")}</span>
          <strong className="down"><CountMoney value={expenses} hidden={hidden} /></strong>
        </div>
        <div>
          <span>{t("snap.net")}</span>
          <strong className={net >= 0 ? "up" : "down"}><CountMoney value={net} hidden={hidden} signed /></strong>
        </div>
        <div>
          <span>{t("dashboard.savings")}</span>
          <strong>{income > 0 ? `${rate.toFixed(1)}%` : "—"}</strong>
        </div>
      </div>
      <div className="snapshot-compare">
        <span>{t("snap.vs", { month: prevLabel })}</span>
        <div>
          <em className={(incomeDelta ?? 0) >= 0 ? "up" : "down"}>{t("snap.income")} {fmtDelta(incomeDelta)}</em>
          <em className={(expenseDelta ?? 0) <= 0 ? "up" : "down"}>{t("snap.expenses")} {fmtDelta(expenseDelta)}</em>
          <em className={(savingsDelta ?? 0) >= 0 ? "up" : "down"}>{t("snap.net")} {fmtDelta(savingsDelta)}</em>
        </div>
      </div>
      <div className="snapshot-areas">
        <article>
          <span><Icon name="in" />{t("snap.strongest")}</span>
          <strong>{strongest ?? t("snap.none")}</strong>
        </article>
        <article>
          <span><Icon name="out" />{t("snap.watch")}</span>
          <strong>{watch ?? t("snap.none")}</strong>
        </article>
      </div>
    </section>
  );
}
