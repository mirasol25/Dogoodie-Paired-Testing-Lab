"use server";

import { headers } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema } from "@/lib/validation/auth-schemas";

export interface ForgotPasswordState {
  message?: string;
  sent?: boolean;
  fieldErrors?: { email?: string[] };
}

function applicationOrigin(requestHeaders: Headers) {
  if (process.env.NEXT_PUBLIC_SITE_URL) return new URL(process.env.NEXT_PUBLIC_SITE_URL).origin;
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") || "http";
  if (!host) throw new Error("The application URL is not configured.");
  return new URL(`${protocol}://${host}`).origin;
}

export async function requestPasswordResetAction(
  _previousState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { message: "Enter a valid email address.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  if (!isSupabaseConfigured()) return { message: "Password recovery is not configured. Contact an administrator." };

  try {
    const requestHeaders = await headers();
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${applicationOrigin(requestHeaders)}/auth/confirm?type=recovery`,
    });
  } catch {
    return { message: "The reset request could not be completed. Try again later." };
  }

  return {
    sent: true,
    message: "If an active account uses this email address, a password-reset link has been sent.",
  };
}
