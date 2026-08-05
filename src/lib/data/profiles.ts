import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type AccountStatus = Database["public"]["Enums"]["account_status"];

export interface CurrentProfile {
  id: string;
  email: string;
  displayName: string | null;
  accountStatus: AccountStatus;
  role: AppRole;
}

export interface ManagedAccount extends CurrentProfile {
  createdAt: string;
  updatedAt: string;
}

export async function listManagedAccounts(
  suppliedClient?: SupabaseClient<Database>,
): Promise<ManagedAccount[]> {
  const supabase = suppliedClient ?? await createClient();
  const [profilesResult, rolesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,display_name,account_status,created_at,updated_at")
      .order("created_at", { ascending: false }),
    supabase.from("user_roles").select("user_id,role"),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (rolesResult.error) throw rolesResult.error;

  const roles = new Map(rolesResult.data.map((entry) => [entry.user_id, entry.role]));
  return profilesResult.data.flatMap((profile) => {
    const role = roles.get(profile.id);
    if (!role) return [];
    return [{
      id: profile.id,
      email: profile.email,
      displayName: profile.display_name,
      accountStatus: profile.account_status,
      role,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    }];
  });
}

export async function getProfileByUserId(
  userId: string,
  suppliedClient?: SupabaseClient<Database>,
): Promise<CurrentProfile | null> {
  const supabase = suppliedClient ?? await createClient();
  const [profileResult, roleResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,display_name,account_status")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  if (profileResult.error || roleResult.error || !profileResult.data || !roleResult.data) {
    return null;
  }

  return {
    id: profileResult.data.id,
    email: profileResult.data.email,
    displayName: profileResult.data.display_name,
    accountStatus: profileResult.data.account_status,
    role: roleResult.data.role,
  };
}
