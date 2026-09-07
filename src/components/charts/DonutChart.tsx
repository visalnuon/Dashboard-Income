import { useLanguage } from "../../hooks/useLanguage";

const CLASSES = ["cat-blue", "cat-purple", "cat-orange", "cat-green", "cat-gray"] as const;

export type BreakdownItem = {
  name: string;
  value: number;
};

export function getCategoryClass(index: number) {
  return CLASSES[index % CLASSES.length];
}

export function DonutChart({ items, totalLabel }: { items: BreakdownItem[]; totalLabel?: string }) {
  const { t } = useLanguage();
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) {
    return <div className="chart-empty compact">{t("chart.noExpenses")}</div>;
  }

  let offset = 0;
  const circumference = 2 * Math.PI * 44;

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 120 120" className="donut">
        <circle cx="60" cy="60" r="44" className="donut-track" />
        {items.map((item, index) => {
          const pct = item.value / total;
          const dash = pct * circumference;
          const currentOffset = -offset;
          offset += dash;
          return (
            <circle
              key={item.name}
              cx="60"
              cy="60"
              r="44"
              className={`donut-segment ${getCategoryClass(index)}`}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={currentOffset}
            />
          );
        })}
      </svg>
      <div className="donut-center">
        <strong>${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}</strong>
        <span>{totalLabel ?? t("chart.expenses")}</span>
      </div>
    </div>
  );
}
