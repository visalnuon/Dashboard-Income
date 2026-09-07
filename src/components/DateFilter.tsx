import type { DatePreset, DateRange } from "../types/database";
import { DATE_PRESETS } from "../utils/dates";
import { useLanguage } from "../hooks/useLanguage";

type DateFilterProps = {
  preset: DatePreset;
  custom: DateRange;
  onPreset: (preset: DatePreset) => void;
  onCustom: (range: DateRange) => void;
};

export function DateFilter({ preset, custom, onPreset, onCustom }: DateFilterProps) {
  const { t } = useLanguage();
  return (
    <div className="date-filter">
      <select value={preset} onChange={(event) => onPreset(event.target.value as DatePreset)}>
        {DATE_PRESETS.map((option) => (
          <option key={option.value} value={option.value}>{t(option.labelKey)}</option>
        ))}
      </select>
      {preset === "custom" ? (
        <div className="custom-range">
          <input
            type="date"
            value={custom.from}
            onChange={(event) => onCustom({ ...custom, from: event.target.value })}
          />
          <span>{t("common.to")}</span>
          <input
            type="date"
            value={custom.to}
            onChange={(event) => onCustom({ ...custom, to: event.target.value })}
          />
        </div>
      ) : null}
    </div>
  );
}
