"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { createAdminClient, isSupabaseAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { setPasswordSchema } from "@/lib/validation/account-schemas";

export interface SetPasswordState {
  message?: string;
  fieldErrors?: { password?: string[]; confirmPassword?: string[] };
}

export async function setPasswordAction(
  _previousState: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  const parsed = setPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return { message: "Check the highlighted fields.", fieldErrors: errors };
  }

  const user = await getCurrentUser();
  if (!user) return { message: "This invitation is invalid or has expired. Ask an administrator for a new invitation." };
  if (!isSupabaseAdminConfigured()) return { message: "Account activation is not configured. Contact an administrator." };
  if (user.user_metadata.password_setup_required !== true) redirect("/paired-testing-demo");

  const admin = createAdminClient();
  const { data: currentProfile, error: currentProfileError } = await admin
    .from("profiles")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (currentProfileError || !currentProfile) {
    return { message: "The invited profile is unavailable. Contact an administrator." };
  }
  if (currentProfile.account_status === "disabled") {
    return { message: "This account cannot be activated from an invitation. Contact an administrator." };
  }

  const supabase = await createClient();
  const { error: passwordError } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (passwordError) return { message: passwordError.message || "The password could not be created." };

  await admin
    .from("profiles")
    .update({ account_status: "active" })
    .eq("id", user.id)
    .eq("account_status", "pending");

  // PostgREST may report an update-response error after the database has
  // committed the change. The persisted profile state is authoritative.
  const { data: finalProfile, error: finalProfileError } = await admin
    .from("profiles")
    .select("account_status")
    .eq("id", user.id)
    .maybeSingle();
  if (finalProfileError || finalProfile?.account_status !== "active") {
    return { message: "Your password was saved, but the account could not be activated. Contact an administrator." };
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      password_setup_required: false,
      password_setup_completed_at: new Date().toISOString(),
    },
  });
  if (metadataError) {
    return { message: "Your password was saved, but setup could not be completed. Try again." };
  }

  redirect("/paired-testing-demo");
}
