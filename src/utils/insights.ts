import type { IconName } from "../components/Icon";
import type { BreakdownItem } from "../components/charts/DonutChart";
import type { TranslationKey } from "../i18n/translations";
import { savingsRate } from "./format";

export type HealthStatus = "excellent" | "good" | "fair" | "attention";

export type HealthResult = {
  score: number;
  status: HealthStatus;
  statusKey: TranslationKey;
  explainKey: TranslationKey;
  ready: boolean;
};

export type InsightItem = {
  icon: IconName;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  vars?: Record<string, string | number>;
};

export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function budgetAlertKey(budgetTotal: number, pct: number): TranslationKey {
  if (budgetTotal <= 0) return "dashboard.budgetCreate";
  if (pct < 50) return "alert.budgetLow";
  if (pct < 80) return "alert.budgetHalf";
  if (pct <= 100) return "alert.budgetClose";
  return "alert.budgetOver";
}

export function financialHealth(input: {
  income: number;
  expenses: number;
  prevExpenses: number;
  budgetTotal: number;
  budgetPct: number;
  txCount: number;
}): HealthResult {
  const { income, expenses, prevExpenses, budgetTotal, budgetPct, txCount } = input;
  if (txCount < 1) {
    return {
      score: 0,
      status: "fair",
      statusKey: "health.fair",
      explainKey: "health.explainEmpty",
      ready: false,
    };
  }
  const rate = savingsRate(income, expenses);
  const expenseDelta = percentChange(expenses, prevExpenses);

  let savingsPts = 10;
  if (income > 0) savingsPts = Math.min(35, Math.max(0, (Math.min(rate, 50) / 50) * 35));
  else if (expenses > 0) savingsPts = 5;

  let budgetPts = 15;
  if (budgetTotal > 0) {
    if (budgetPct < 50) budgetPts = 25;
    else if (budgetPct < 80) budgetPts = 20;
    else if (budgetPct <= 100) budgetPts = 12;
    else budgetPts = 4;
  }

  let trendPts = 15;
  if (expenseDelta != null) {
    if (expenseDelta < -2) trendPts = 25;
    else if (expenseDelta <= 5) trendPts = 18;
    else trendPts = 8;
  }

  const consistencyPts = txCount >= 6 ? 15 : txCount >= 3 ? 10 : txCount >= 1 ? 6 : 0;
  const score = Math.round(Math.min(100, savingsPts + budgetPts + trendPts + consistencyPts));

  const status: HealthStatus = score >= 85 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "fair" : "attention";
  const statusKey: TranslationKey =
    status === "excellent"
      ? "health.excellent"
      : status === "good"
        ? "health.good"
        : status === "fair"
          ? "health.fair"
          : "health.attention";

  let explainKey: TranslationKey = "health.explainFair";
  if (txCount === 0) explainKey = "health.explainEmpty";
  else if (budgetTotal > 0 && budgetPct > 100) explainKey = "health.explainBudget";
  else if (expenseDelta != null && expenseDelta < -2 && (budgetTotal <= 0 || budgetPct <= 100)) {
    explainKey = "health.explainBetter";
  } else if (income > 0 && rate >= 20) explainKey = "health.explainSaved";
  else if (expenseDelta != null && expenseDelta > 8) explainKey = "health.explainUp";

  return { score, status, statusKey, explainKey, ready: true };
}

export function buildInsights(input: {
  income: number;
  expenses: number;
  prevIncome: number;
  prevExpenses: number;
  budgetTotal: number;
  budgetPct: number;
  txCount: number;
  topCategory?: string;
  savedDelta?: number | null;
  goalOnTrack?: boolean;
  categoryAlert?: { name: string; pct: number } | null;
}): InsightItem[] {
  const {
    income,
    expenses,
    prevIncome,
    prevExpenses,
    budgetTotal,
    budgetPct,
    txCount,
    topCategory,
    savedDelta,
    goalOnTrack,
    categoryAlert,
  } = input;
  if (txCount === 0) {
    return [{ icon: "spark", titleKey: "insight.emptyTitle", bodyKey: "insight.emptyBody" }];
  }

  const items: InsightItem[] = [];
  const expenseDelta = percentChange(expenses, prevExpenses);
  const incomeDelta = percentChange(income, prevIncome);
  const rate = savingsRate(income, expenses);

  if (expenseDelta != null && Math.abs(expenseDelta) >= 1) {
    const pct = Math.abs(Math.round(expenseDelta));
    if (expenseDelta > 0) {
      items.push({ icon: "out", titleKey: "insight.expUpTitle", bodyKey: "insight.expUpBody", vars: { pct } });
    } else {
      items.push({ icon: "in", titleKey: "insight.expDownTitle", bodyKey: "insight.expDownBody", vars: { pct } });
    }
  }

  if (savedDelta != null && Math.abs(savedDelta) >= 1) {
    items.push({
      icon: "keep",
      titleKey: savedDelta > 0 ? "insight.savedMoreTitle" : "insight.saveTitle",
      bodyKey: savedDelta > 0 ? "insight.savedMoreBody" : "insight.saveBody",
      vars: savedDelta > 0 ? { amount: savedDelta.toFixed(0) } : { pct: Math.round(rate) },
    });
  }

  if (topCategory) {
    items.push({
      icon: "categories",
      titleKey: "insight.topCatTitle",
      bodyKey: "insight.topCatBody",
      vars: { category: topCategory },
    });
  }

  if (categoryAlert) {
    items.push({
      icon: "budgets",
      titleKey: "insight.catBudgetTitle",
      bodyKey: "insight.catBudgetBody",
      vars: { category: categoryAlert.name, pct: Math.round(categoryAlert.pct) },
    });
  } else if (budgetTotal > 0) {
    items.push({
      icon: "budgets",
      titleKey: "insight.budgetTitle",
      bodyKey: "insight.budgetBody",
      vars: { pct: Math.round(budgetPct) },
    });
  }

  if (goalOnTrack) {
    items.push({ icon: "target", titleKey: "insight.goalTitle", bodyKey: "insight.goalBody" });
  }

  if (income > 0 && !items.some((item) => item.titleKey === "insight.saveTitle" || item.titleKey === "insight.savedMoreTitle")) {
    items.push({
      icon: "keep",
      titleKey: "insight.saveTitle",
      bodyKey: "insight.saveBody",
      vars: { pct: Math.round(rate) },
    });
  } else if (incomeDelta != null && incomeDelta > 2) {
    items.push({
      icon: "income",
      titleKey: "insight.incUpTitle",
      bodyKey: "insight.incUpBody",
      vars: { pct: Math.round(incomeDelta) },
    });
  }

  return items.slice(0, 4);
}

export function snapshotAreas(breakdown: BreakdownItem[]) {
  if (breakdown.length === 0) return { strongest: null as string | null, watch: null as string | null };
  const watch = breakdown[0]?.name ?? null;
  const strongest = breakdown[breakdown.length - 1]?.name ?? watch;
  return { strongest, watch };
}
