import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { Account, AccountInsert } from "../types/database";
import { toNumber } from "../utils/format";
import { friendlyError } from "../utils/validation";
import {
  localCreateAccount,
  localDeleteAccount,
  localListAccounts,
  localUpdateAccount,
} from "./localFinance";

function normalize(row: Account): Account {
  return { ...row, balance: toNumber(row.balance) };
}

export async function listAccounts() {
  if (!isSupabaseConfigured) return localListAccounts();
  const { data, error } = await supabase.from("accounts").select("*").order("name", { ascending: true });
  if (error) throw new Error(friendlyError(error, "Unable to load accounts."));
  return ((data ?? []) as Account[]).map(normalize);
}

export async function createAccount(values: AccountInsert) {
  if (!isSupabaseConfigured) return localCreateAccount(values);
  const { data, error } = await supabase.from("accounts").insert(values).select("*").single();
  if (error) throw new Error(friendlyError(error, "Unable to create account."));
  return normalize(data as Account);
}

export async function updateAccount(id: string, values: { name: string; type: AccountInsert["type"] }) {
  if (!isSupabaseConfigured) return localUpdateAccount(id, values);
  const { data, error } = await supabase
    .from("accounts")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(friendlyError(error, "Unable to update account."));
  return normalize(data as Account);
}

export async function deleteAccount(id: string) {
  if (!isSupabaseConfigured) {
    localDeleteAccount(id);
    return;
  }
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw new Error(friendlyError(error, "Unable to delete account."));
}
