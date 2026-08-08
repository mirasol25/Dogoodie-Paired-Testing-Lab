import { redirect } from "next/navigation";
import { SetPasswordForm } from "@/components/auth/set-password-form";
import { getCurrentUser } from "@/lib/auth/server";
import { getProfileByUserId } from "@/lib/data/profiles";

export default async function SetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=invalid_invitation");
  const profile = await getProfileByUserId(user.id);
  if (user.user_metadata.password_setup_required !== true) {
    if (profile?.accountStatus === "active") redirect("/paired-testing-demo");
    redirect("/login?error=invalid_invitation");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-2xl border-y border-border py-8">
        <p className="label-kicker mb-3">Account invitation</p>
        <h1 className="text-2xl font-semibold text-foreground">Create your password</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Finish setting up <span className="text-foreground">{user.email}</span> to access the Paired Testing Lab.
        </p>
        <div className="mt-7"><SetPasswordForm /></div>
      </section>
    </main>
  );
}
