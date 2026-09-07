import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type {
  TransactionFilters,
  TransactionInsert,
  TransactionUpdate,
  TransactionWithRelations,
} from "../types/database";
import { toNumber } from "../utils/format";
import { friendlyError } from "../utils/validation";
import {
  localCreateTransaction,
  localDeleteTransaction,
  localListAllTransactions,
  localListTransactions,
  localUpdateTransaction,
} from "./localFinance";

const SELECT = "*, category:categories(id, name, icon, type), account:accounts(id, name, type)";

function matchesSearch(row: TransactionWithRelations, search?: string) {
  if (!search?.trim()) return true;
  const term = search.toLowerCase().trim();
  return [row.title, row.description ?? "", row.category?.name ?? "", row.account?.name ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

function normalizeTransaction(row: TransactionWithRelations): TransactionWithRelations {
  return {
    ...row,
    amount: toNumber(row.amount),
  };
}

async function fetchTransactions(filters: Omit<TransactionFilters, "page" | "pageSize">) {
  let query = supabase
    .from("transactions")
    .select(SELECT)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.type) query = query.eq("type", filters.type);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.accountId) query = query.eq("account_id", filters.accountId);
  if (filters.from) query = query.gte("transaction_date", filters.from);
  if (filters.to) query = query.lte("transaction_date", filters.to);

  const { data, error } = await query.limit(2000);
  if (error) throw new Error(friendlyError(error, "Unable to load transactions."));

  return ((data ?? []) as TransactionWithRelations[])
    .map(normalizeTransaction)
    .filter((row) => matchesSearch(row, filters.search));
}

export async function listTransactions(filters: TransactionFilters = {}) {
  if (!isSupabaseConfigured) return localListTransactions(filters);
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 10;
  const rows = await fetchTransactions(filters);
  const start = (page - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    count: rows.length,
    all: rows,
  };
}

export async function listAllTransactions(filters: Omit<TransactionFilters, "page" | "pageSize"> = {}) {
  if (!isSupabaseConfigured) return localListAllTransactions(filters);
  return fetchTransactions(filters);
}

export async function createTransaction(values: TransactionInsert) {
  if (!isSupabaseConfigured) return localCreateTransaction(values);
  const { data, error } = await supabase
    .from("transactions")
    .insert(values)
    .select(SELECT)
    .single();

  if (error) throw new Error(friendlyError(error, "Unable to add transaction."));
  return normalizeTransaction(data as TransactionWithRelations);
}

export async function updateTransaction(id: string, values: TransactionUpdate) {
  if (!isSupabaseConfigured) return localUpdateTransaction(id, values);
  const { data, error } = await supabase
    .from("transactions")
    .update(values)
    .eq("id", id)
    .select(SELECT)
    .single();

  if (error) throw new Error(friendlyError(error, "Unable to update transaction."));
  return normalizeTransaction(data as TransactionWithRelations);
}

export async function deleteTransaction(id: string) {
  if (!isSupabaseConfigured) {
    localDeleteTransaction(id);
    return;
  }
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error(friendlyError(error, "Unable to delete transaction."));
}
