import type { TranslationKey } from "../i18n/translations";
import type { IconName } from "../components/Icon";
import type { SavingsGoal } from "../types/database";
import { savingsRate } from "./format";

export type Achievement = {
  icon: IconName;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
};

export function buildAchievements(input: {
  goals: SavingsGoal[];
  budgetTotal: number;
  budgetPct: number;
  income: number;
  expenses: number;
  monthNet: number;
  monthlyNets: number[];
  txDates: string[];
}): Achievement[] {
  const items: Achievement[] = [];
  if (input.goals.length > 0) {
    items.push({ icon: "target", titleKey: "badge.goalTitle", bodyKey: "badge.goalBody" });
  }
  if (input.budgetTotal > 0 && input.budgetPct < 100) {
    items.push({ icon: "budgets", titleKey: "badge.budgetTitle", bodyKey: "badge.budgetBody" });
  }
  if (input.income > 0 && savingsRate(input.income, input.expenses) >= 20) {
    items.push({ icon: "keep", titleKey: "badge.saveTitle", bodyKey: "badge.saveBody" });
  }
  const best = Math.max(0, ...input.monthlyNets);
  if (input.monthNet > 0 && input.monthNet >= best && best > 0) {
    items.push({ icon: "spark", titleKey: "badge.bestTitle", bodyKey: "badge.bestBody" });
  }
  const uniqueDays = new Set(input.txDates).size;
  if (uniqueDays >= 7) {
    items.push({ icon: "calendar", titleKey: "badge.daysTitle", bodyKey: "badge.daysBody" });
  }
  return items.slice(0, 4);
}
