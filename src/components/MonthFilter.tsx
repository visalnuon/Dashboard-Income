import { MonthSwitcher } from "./MonthSwitcher";
import { useLanguage } from "../hooks/useLanguage";
import { currentMonthYear, isSameMonth, monthShortLabel, shiftMonth } from "../utils/dates";

export type MonthValue = { month: number; year: number };

type MonthFilterProps = {
  value: MonthValue | null;
  onChange: (value: MonthValue | null) => void;
};

export function MonthFilter({ value, onChange }: MonthFilterProps) {
  const { t, locale } = useLanguage();
  const now = currentMonthYear();
  const selected = value ?? now;
  const months = Array.from({ length: 6 }, (_, index) => shiftMonth(now.month, now.year, index - 5));

  return (
    <div className="tx-month-filter">
      <div className="tx-month-filter-head">
        <button
          type="button"
          className={value ? "month-pill" : "month-pill active"}
          onClick={() => onChange(null)}
        >
          {t("filter.allMonths")}
        </button>
        <MonthSwitcher
          month={selected.month}
          year={selected.year}
          onChange={(month, year) => onChange({ month, year })}
        />
      </div>
      <div className="tx-month-chips" role="group" aria-label={t("filter.month")}>
        {months.map((item) => {
          const key = `${item.year}-${String(item.month).padStart(2, "0")}`;
          const active = Boolean(value) && item.month === value?.month && item.year === value?.year;
          return (
            <button
              key={key}
              type="button"
              className={active ? "month-chip active" : "month-chip"}
              onClick={() => onChange({ month: item.month, year: item.year })}
            >
              <span>{monthShortLabel(key, locale)}</span>
              <strong>{isSameMonth(item.month, item.year) ? t("dash.thisMonth") : item.year}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}
