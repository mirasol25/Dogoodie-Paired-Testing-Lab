import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getProfileByUserId, type AppRole, type CurrentProfile } from "@/lib/data/profiles";
import { getSafeNextPath } from "@/lib/auth/safe-next-path";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export interface CurrentIdentity {
  user: User;
  profile: CurrentProfile;
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHENTICATED" | "ACCOUNT_INACTIVE" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

function loginPath(nextPath: string, error?: string): string {
  const params = new URLSearchParams({ next: getSafeNextPath(nextPath) });
  if (error) params.set("error", error);
  return `/login?${params.toString()}`;
}

export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims?.sub) return null;

  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const user = await getCurrentUser();
  return user ? getProfileByUserId(user.id) : null;
}

export async function getCurrentIdentity(): Promise<CurrentIdentity | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const profile = await getProfileByUserId(user.id);
  return profile ? { user, profile } : null;
}

export async function requireUser(nextPath = "/paired-testing-demo"): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath(nextPath));
  return user;
}

export async function requireActiveUser(nextPath = "/paired-testing-demo"): Promise<CurrentIdentity> {
  if (!isSupabaseConfigured()) redirect(loginPath(nextPath, "configuration"));

  const identity = await getCurrentIdentity();
  if (!identity) redirect(loginPath(nextPath));
  if (identity.user.user_metadata.password_setup_required === true) {
    redirect("/set-password");
  }
  if (identity.profile.accountStatus !== "active") {
    redirect(loginPath(nextPath, `account_${identity.profile.accountStatus}`));
  }

  return identity;
}

export async function requireRole(
  requiredRoles: AppRole | AppRole[],
  nextPath = "/paired-testing-demo",
): Promise<CurrentIdentity> {
  const identity = await requireActiveUser(nextPath);
  const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  if (identity.profile.role !== "admin" && !allowedRoles.includes(identity.profile.role)) {
    throw new AuthorizationError("You do not have the required application role.", "FORBIDDEN");
  }
  return identity;
}

export async function requireStudyMembership(
  studyId: string,
  requiredRoles?: AppRole[],
): Promise<CurrentIdentity> {
  const identity = await requireActiveUser();
  if (identity.profile.role === "admin") return identity;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_members")
    .select("study_role,membership_status")
    .eq("study_id", studyId)
    .eq("user_id", identity.user.id)
    .eq("membership_status", "active")
    .maybeSingle();

  const roleMatches = data && data.study_role === identity.profile.role;
  if (
    error
    || !data
    || !roleMatches
    || (requiredRoles && !requiredRoles.includes(data.study_role))
  ) {
    throw new AuthorizationError("You are not authorized for this study.", "FORBIDDEN");
  }

  return identity;
}
