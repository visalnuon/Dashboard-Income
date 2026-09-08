import { isSupabaseConfigured } from "./supabase";
import { readLocalSession } from "../services/localAuth";

export function hasAppCloudSession() {
  return isSupabaseConfigured && Boolean(readLocalSession()?.token);
}

export function usesSupabaseAuthTables() {
  return isSupabaseConfigured && !readLocalSession();
}
