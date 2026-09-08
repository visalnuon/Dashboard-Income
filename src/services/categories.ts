import { usesSupabaseAuthTables } from "../lib/dataMode";
import { supabase } from "../lib/supabase";
import type { Category, CategoryInsert, TransactionType } from "../types/database";
import { friendlyError } from "../utils/validation";
import {
  localCreateCategory,
  localDeleteCategory,
  localListCategories,
  localUpdateCategory,
} from "./localFinance";

export async function listCategories(type?: TransactionType) {
  if (!usesSupabaseAuthTables()) return localListCategories(type);
  let query = supabase.from("categories").select("*").order("name", { ascending: true });
  if (type) query = query.eq("type", type);
  const { data, error } = await query;
  if (error) throw new Error(friendlyError(error, "Unable to load categories."));
  return (data ?? []) as Category[];
}

export async function createCategory(values: CategoryInsert) {
  if (!usesSupabaseAuthTables()) return localCreateCategory(values);
  const { data, error } = await supabase.from("categories").insert(values).select("*").single();
  if (error) throw new Error(friendlyError(error, "Unable to create category."));
  return data as Category;
}

export async function updateCategory(id: string, values: Partial<CategoryInsert>) {
  if (!usesSupabaseAuthTables()) return localUpdateCategory(id, values);
  const { data, error } = await supabase
    .from("categories")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(friendlyError(error, "Unable to update category."));
  return data as Category;
}

export async function deleteCategory(id: string) {
  if (!usesSupabaseAuthTables()) {
    await localDeleteCategory(id);
    return;
  }
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(friendlyError(error, "Unable to delete category."));
}
