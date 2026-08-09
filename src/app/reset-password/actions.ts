"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resetPasswordSchema } from "@/lib/validation/auth-schemas";

export interface ResetPasswordState {
  message?: string;
  fieldErrors?: Partial<Record<"password" | "confirmPassword", string[]>>;
}

export async function resetPasswordAction(
  _previousState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const parsed = resetPasswordSchema.safeParse({ password: formData.get("password"), confirmPassword: formData.get("confirmPassword") });
  if (!parsed.success) return { message: "Check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { message: "This password-reset link is invalid or has expired. Request a new link." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { message: error.message || "The password could not be updated." };
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?error=password_reset");
}
