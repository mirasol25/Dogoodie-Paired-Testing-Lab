"use server";

import { redirect } from "next/navigation";
import { getSafeNextPath } from "@/lib/auth/safe-next-path";
import { getProfileByUserId } from "@/lib/data/profiles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/auth-schemas";

export interface LoginActionState {
  message?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
}

export async function signInAction(
  _previousState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      message: "Check the highlighted fields and try again.",
      fieldErrors: { email: errors.email, password: errors.password },
    };
  }

  if (!isSupabaseConfigured()) {
    return { message: "Authentication is not configured yet. Ask an administrator to complete Supabase setup." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { message: "The email or password is incorrect, or this internal account is unavailable." };
  }

  const profile = await getProfileByUserId(data.user.id, supabase);
  if (!profile) {
    await supabase.auth.signOut({ scope: "local" });
    return { message: "Your internal profile is unavailable. Ask an administrator to verify the account setup." };
  }

  if (profile.accountStatus !== "active") {
    await supabase.auth.signOut({ scope: "local" });
    const label = profile.accountStatus === "pending" ? "awaiting password setup" : "disabled";
    return { message: `Your internal account is ${label}. Use your invitation link or contact an administrator.` };
  }

  if (data.user.user_metadata.password_setup_required === true) {
    redirect("/set-password");
  }

  redirect(getSafeNextPath(parsed.data.next));
}

export async function signOutAction(): Promise<never> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  }
  redirect("/login");
}
