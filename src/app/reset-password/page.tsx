import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCurrentUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Reset Password" };

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=invalid_recovery");
  return <main id="main-content" className="grid min-h-screen place-items-center px-4 py-10"><section className="w-full max-w-md border-y border-border py-8"><p className="label-kicker mb-3">Account recovery</p><h1 className="text-2xl font-semibold">Choose a new password</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Update the password for <span className="text-foreground">{user.email}</span>.</p><div className="mt-7"><ResetPasswordForm /></div></section></main>;
}
