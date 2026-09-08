import { supabase } from "../lib/supabase";
import { throwCloudRpc } from "./cloudUsers";

export async function cloudLoadFinance(token: string) {
  const { data, error } = await supabase.rpc("load_app_finance", { p_token: token });
  if (error) throwCloudRpc(error);
  return data;
}

export async function cloudSaveFinance(token: string, payload: object) {
  const { error } = await supabase.rpc("save_app_finance", {
    p_token: token,
    p_payload: payload as Record<string, unknown>,
  });
  if (error) throwCloudRpc(error);
}
