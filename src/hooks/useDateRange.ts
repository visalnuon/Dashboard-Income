import { useMemo, useState } from "react";
import type { DatePreset, DateRange } from "../types/database";
import { getDateRange, toISODate } from "../utils/dates";

export function useDateRange(initial: DatePreset = "this_month") {
  const [preset, setPreset] = useState<DatePreset>(initial);
  const today = toISODate(new Date());
  const [custom, setCustom] = useState<DateRange>({ from: today, to: today });

  const range = useMemo(() => getDateRange(preset, custom), [preset, custom]);

  return { preset, setPreset, custom, setCustom, range };
}
