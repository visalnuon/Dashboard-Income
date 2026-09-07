import { supabase } from "../lib/supabase";
import { friendlyError } from "../utils/validation";
import type { Profile } from "../types/database";

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendlyError(error, "Unable to sign in."));
  return data;
}

export async function signUp(fullName: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
  if (error) throw new Error(friendlyError(error, "Unable to create your account."));
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(friendlyError(error, "Unable to sign out."));
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(friendlyError(error, "Unable to load profile."));
  return data;
}

export async function updateProfile(userId: string, values: { full_name: string }) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: values.full_name })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw new Error(friendlyError(error, "Unable to update profile."));
  return data;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(friendlyError(error, "Unable to update password."));
}

export async function ensureProfile(userId: string, email?: string | null, fullName?: string | null) {
  const existing = await fetchProfile(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      email: email ?? null,
      full_name: fullName ?? null,
    })
    .select("*")
    .single();

  if (error) return null;
  return data;
}
