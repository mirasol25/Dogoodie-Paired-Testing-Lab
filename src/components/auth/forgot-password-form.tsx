"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, LoaderCircle, Mail } from "lucide-react";
import { requestPasswordResetAction, type ForgotPasswordState } from "@/app/forgot-password/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ForgotPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" className="w-full" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Mail className="size-4" />}{pending ? "Sending..." : "Send reset link"}</Button>;
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, initialState);
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message ? <Alert variant={state.sent ? "default" : "destructive"}><AlertDescription>{state.message}</AlertDescription></Alert> : null}
      {!state.sent ? <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required aria-invalid={Boolean(state.fieldErrors?.email)} aria-describedby={state.fieldErrors?.email ? "email-error" : undefined} />{state.fieldErrors?.email ? <p id="email-error" className="text-xs text-destructive">{state.fieldErrors.email[0]}</p> : null}</div> : null}
      {!state.sent ? <SubmitButton /> : null}
      <Button asChild type="button" variant="ghost" className="w-full"><Link href="/login"><ArrowLeft className="size-4" />Back to sign in</Link></Button>
    </form>
  );
}
