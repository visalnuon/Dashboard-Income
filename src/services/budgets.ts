import { usesSupabaseAuthTables } from "../lib/dataMode";
import { supabase } from "../lib/supabase";
import type { BudgetInsert, BudgetWithCategory } from "../types/database";
import { toNumber } from "../utils/format";
import { friendlyError } from "../utils/validation";
import {
  localCreateBudget,
  localDeleteBudget,
  localListBudgets,
  localUpdateBudget,
} from "./localFinance";

const SELECT = "*, category:categories(id, name, icon, type)";

function normalize(row: BudgetWithCategory): BudgetWithCategory {
  return { ...row, amount: toNumber(row.amount) };
}

export async function listBudgets(month?: number, year?: number) {
  if (!usesSupabaseAuthTables()) return localListBudgets(month, year);
  let query = supabase.from("budgets").select(SELECT).order("created_at", { ascending: false });
  if (month) query = query.eq("month", month);
  if (year) query = query.eq("year", year);
  const { data, error } = await query;
  if (error) throw new Error(friendlyError(error, "Unable to load budgets."));
  return ((data ?? []) as BudgetWithCategory[]).map(normalize);
}

export async function createBudget(values: BudgetInsert) {
  if (!usesSupabaseAuthTables()) return localCreateBudget(values);
  const { data, error } = await supabase.from("budgets").insert(values).select(SELECT).single();
  if (error) throw new Error(friendlyError(error, "Unable to create budget."));
  return normalize(data as BudgetWithCategory);
}

export async function updateBudget(id: string, values: Partial<BudgetInsert>) {
  if (!usesSupabaseAuthTables()) return localUpdateBudget(id, values);
  const { data, error } = await supabase
    .from("budgets")
    .update(values)
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw new Error(friendlyError(error, "Unable to update budget."));
  return normalize(data as BudgetWithCategory);
}

export async function deleteBudget(id: string) {
  if (!usesSupabaseAuthTables()) {
    await localDeleteBudget(id);
    return;
  }
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) throw new Error(friendlyError(error, "Unable to delete budget."));
}
