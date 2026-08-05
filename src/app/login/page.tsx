import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentIdentity } from "@/lib/auth/server";
import { getSafeNextPath } from "@/lib/auth/safe-next-path";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { title: "Internal Sign In" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function statusMessage(error: string | undefined): string | null {
  if (error === "configuration") return "Authentication has not been configured for this deployment yet.";
  if (error === "account_pending") return "Your account is awaiting administrator activation.";
  if (error === "account_disabled") return "Your account is disabled. Contact an administrator.";
  if (error === "invalid_invitation") return "This invitation link is invalid or has expired. Ask an administrator for a new invitation.";
  return null;
}

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextPath = getSafeNextPath(first(params.next));
  const identity = await getCurrentIdentity();
  if (identity?.profile.accountStatus === "active") redirect(nextPath);

  const message = statusMessage(first(params.error));
  const configured = isSupabaseConfigured();

  return (
    <main id="main-content" className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <ShieldCheck className="size-6" strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">DoGoodie</p>
            <p className="text-base font-semibold">Paired Testing Lab</p>
          </div>
        </div>

        <Card className="border-border/90 bg-card/95 shadow-2xl shadow-black/20">
          <CardHeader>
            <p className="label-kicker">Authorized users only</p>
            <CardTitle className="text-2xl">Internal sign in</CardTitle>
            <CardDescription>
              Use the email and password issued by the project administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {message ? (
              <Alert variant="destructive"><AlertDescription>{message}</AlertDescription></Alert>
            ) : null}
            {!configured ? (
              <Alert><AlertDescription>Supabase environment variables are required before sign-in can succeed.</AlertDescription></Alert>
            ) : null}
            <LoginForm nextPath={nextPath} />
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Internal pilot · Authorized accounts only
        </p>
      </div>
    </main>
  );
}
