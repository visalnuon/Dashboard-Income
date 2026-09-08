import { isSupabaseConfigured } from "./supabase";
import { readLocalSession } from "../services/localAuth";

export function hasAppCloudSession() {
  return isSupabaseConfigured && Boolean(readLocalSession()?.token);
}

export function usesSupabaseAuthTables() {
  // Username / admin login stores money in the app finance store.
  // Do not use Auth RLS tables (profiles/categories/accounts/transactions/budgets)
  // for this app — that path fails on Vercel when env keys are set but there is
  // no Supabase Auth user.
  return false;
}
