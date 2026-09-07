import { en, km, type TranslationKey } from "../i18n/translations";
import type { DatePreset, DateRange } from "../types/database";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isKhmerLocale(locale: string) {
  return locale.toLowerCase().startsWith("km");
}

function catalog(locale: string) {
  return isKhmerLocale(locale) ? km : en;
}

export function monthName(month: number, locale = "en-US", short = false) {
  const key = `${short ? "month.short." : "month."}${month}` as TranslationKey;
  return catalog(locale)[key] ?? String(month);
}

export function toISODate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, date.getDate());
}

export function getDateRange(preset: DatePreset, custom?: DateRange): DateRange {
  const today = new Date();
  const todayIso = toISODate(today);

  switch (preset) {
    case "this_month":
      return { from: toISODate(startOfMonth(today)), to: todayIso };
    case "last_month": {
      const last = addMonths(startOfMonth(today), -1);
      return { from: toISODate(last), to: toISODate(endOfMonth(last)) };
    }
    case "last_3_months":
      return { from: toISODate(startOfMonth(addMonths(today, -2))), to: todayIso };
    case "last_6_months":
      return { from: toISODate(startOfMonth(addMonths(today, -5))), to: todayIso };
    case "this_year":
      return { from: `${today.getFullYear()}-01-01`, to: todayIso };
    case "custom":
      return {
        from: custom?.from || toISODate(startOfMonth(today)),
        to: custom?.to || todayIso,
      };
    default:
      return { from: toISODate(startOfMonth(today)), to: todayIso };
  }
}

export function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export function monthLabel(month: number, year: number, locale = "en-US") {
  return `${monthName(month, locale)} ${year}`;
}

export function monthKey(date: string) {
  return date.slice(0, 7);
}

export function monthShortLabel(key: string, locale = "en-US") {
  const [, month] = key.split("-").map(Number);
  return monthName(month, locale, true);
}

export function monthsInRange(from: string, to: string) {
  const start = new Date(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, 1);
  const end = new Date(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, 1);
  const keys: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    keys.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return keys;
}

export function shiftMonth(month: number, year: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

export function monthBounds(month: number, year: number) {
  const start = new Date(year, month - 1, 1);
  return { from: toISODate(start), to: toISODate(endOfMonth(start)) };
}

export function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

export function isSameMonth(month: number, year: number, date = new Date()) {
  return month === date.getMonth() + 1 && year === date.getFullYear();
}

export function isFutureMonth(month: number, year: number) {
  const now = currentMonthYear();
  return year > now.year || (year === now.year && month > now.month);
}

export const DATE_PRESETS: { value: DatePreset; labelKey: "date.thisMonth" | "date.lastMonth" | "date.last3" | "date.last6" | "date.thisYear" | "date.custom" }[] = [
  { value: "this_month", labelKey: "date.thisMonth" },
  { value: "last_month", labelKey: "date.lastMonth" },
  { value: "last_3_months", labelKey: "date.last3" },
  { value: "last_6_months", labelKey: "date.last6" },
  { value: "this_year", labelKey: "date.thisYear" },
  { value: "custom", labelKey: "date.custom" },
];
