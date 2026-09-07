import { Icon } from "./Icon";
import { isFutureMonth, isSameMonth, monthLabel, shiftMonth } from "../utils/dates";
import { useLanguage } from "../hooks/useLanguage";

type MonthSwitcherProps = {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
};

export function MonthSwitcher({ month, year, onChange }: MonthSwitcherProps) {
  const { t, locale } = useLanguage();
  const previous = shiftMonth(month, year, -1);
  const next = shiftMonth(month, year, 1);
  const now = { month: new Date().getMonth() + 1, year: new Date().getFullYear() };

  return (
    <div className="month-switcher">
      <button
        type="button"
        className="month-arrow"
        onClick={() => onChange(previous.month, previous.year)}
        aria-label={t("dash.prevMonth")}
      >
        <Icon name="chevronLeft" />
      </button>
      <div className="month-switcher-label">
        <strong><Icon name="calendar" />{monthLabel(month, year, locale)}</strong>
        {isSameMonth(month, year) ? <span>{t("dash.thisMonth")}</span> : null}
      </div>
      <button
        type="button"
        className="month-arrow"
        disabled={isFutureMonth(next.month, next.year)}
        onClick={() => onChange(next.month, next.year)}
        aria-label={t("dash.nextMonth")}
      >
        <Icon name="chevronRight" />
      </button>
      {!isSameMonth(month, year) ? (
        <button type="button" className="ghost-btn month-now" onClick={() => onChange(now.month, now.year)}>
          {t("dash.thisMonth")}
        </button>
      ) : null}
    </div>
  );
}
