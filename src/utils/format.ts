import { monthName } from "./dates";

export function formatMoney(value: number, options?: { signed?: boolean; hidden?: boolean }) {
  if (options?.hidden) return "$••••••";
  const amount = Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  if (!options?.signed) return formatted;
  if (amount === 0) return formatted;
  return `${amount > 0 ? "+" : "-"}${formatted}`;
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(1)}%`;
}

export function formatDate(value: string, locale = "en-US") {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  if (locale.toLowerCase().startsWith("km")) {
    return `${date.getDate()} ${monthName(date.getMonth() + 1, locale)} ${date.getFullYear()}`;
  }
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string, locale = "en-US") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "U";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function savingsRate(income: number, expenses: number) {
  if (income <= 0) return 0;
  return ((income - expenses) / income) * 100;
}

export function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}
