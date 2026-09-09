import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { ManagedUser, UserRole } from "./localAuth";

export type CloudAuthUser = {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
  token: string;
};

function asRecord(value: unknown) {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function toCloudUser(value: unknown): CloudAuthUser {
  const row = asRecord(value);
  if (!row) throw new Error("Unable to create your account.");
  return {
    id: readString(row.id),
    username: readString(row.username),
    fullName: readString(row.fullName),
    role: row.role === "admin" ? "admin" : "user",
    createdAt: readString(row.createdAt),
    token: readString(row.token),
  };
}

function toManagedUser(value: unknown): ManagedUser {
  const row = asRecord(value);
  if (!row) throw new Error("User not found.");
  return {
    id: readString(row.id),
    username: readString(row.username),
    fullName: readString(row.fullName),
    role: row.role === "admin" ? "admin" : "user",
    createdAt: readString(row.createdAt),
    builtIn: Boolean(row.builtIn),
  };
}

export function throwCloudRpc(error: { message?: string } | null): never {
  const message = error?.message ?? "Something went wrong";
  if (message.includes("already taken")) throw new Error("That username is already taken.");
  if (message.includes("Incorrect username")) throw new Error("Incorrect username or password.");
  if (message.includes("Only an admin")) throw new Error("Only an admin can manage users.");
  if (message.includes("cannot delete your own")) throw new Error("You cannot delete your own account.");
  if (message.includes("User not found")) throw new Error("User not found.");
  if (message.includes("Full name")) throw new Error("Full name is required.");
  if (message.includes("at least 3")) throw new Error("Username must be at least 3 characters.");
  if (message.includes("at least 6")) throw new Error("Password must be at least 6 characters.");
  if (message.includes("signed in")) throw new Error("You need to be signed in.");
  if (message.includes("Unable to save")) throw new Error("Unable to save your data.");
  if (message.includes("gen_salt") || message.includes("crypt(") || message.includes("pgcrypto")) {
    throw new Error("Unable to create your account.");
  }
  throw new Error(message);
}

export function canUseCloudUsers() {
  return isSupabaseConfigured;
}

export async function cloudLogin(username: string, password: string) {
  const { data, error } = await supabase.rpc("login_app_user", {
    p_username: username,
    p_password: password,
  });
  if (error) throwCloudRpc(error);
  return toCloudUser(data);
}

export async function cloudRegister(values: {
  fullName: string;
  username: string;
  password: string;
  role?: UserRole;
  adminToken?: string | null;
}) {
  const { data, error } = await supabase.rpc("register_app_user", {
    p_full_name: values.fullName,
    p_username: values.username,
    p_password: values.password,
    p_role: values.role ?? "user",
    p_admin_token: values.adminToken ?? null,
  });
  if (error) throwCloudRpc(error);
  return toCloudUser(data);
}

export async function cloudListUsers(token: string) {
  const { data, error } = await supabase.rpc("admin_list_app_users", { p_token: token });
  if (error) throwCloudRpc(error);
  return Array.isArray(data) ? data.map(toManagedUser) : [];
}

export async function cloudUpdateUserRole(token: string, userId: string, role: UserRole) {
  const { data, error } = await supabase.rpc("admin_update_app_user_role", {
    p_token: token,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throwCloudRpc(error);
  return toManagedUser(data);
}

export async function cloudDeleteUser(token: string, userId: string) {
  const { error } = await supabase.rpc("admin_delete_app_user", {
    p_token: token,
    p_user_id: userId,
  });
  if (error) throwCloudRpc(error);
}

export async function cloudUpdateName(token: string, fullName: string) {
  const { data, error } = await supabase.rpc("update_app_user_name", {
    p_token: token,
    p_full_name: fullName,
  });
  if (error) throwCloudRpc(error);
  const row = asRecord(data);
  return {
    id: readString(row?.id),
    username: readString(row?.username),
    fullName: readString(row?.fullName),
    role: row?.role === "admin" ? "admin" as const : "user" as const,
  };
}

export async function cloudUpdatePassword(token: string, password: string) {
  const { error } = await supabase.rpc("update_app_user_password", {
    p_token: token,
    p_password: password,
  });
  if (error) throwCloudRpc(error);
}
