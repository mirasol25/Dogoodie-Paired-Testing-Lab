"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, KeyRound, LoaderCircle } from "lucide-react";
import { resetPasswordAction, type ResetPasswordState } from "@/app/reset-password/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ResetPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" className="w-full" disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}{pending ? "Updating..." : "Update password"}</Button>;
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, initialState);
  const [visible, setVisible] = useState(false);
  return <form action={action} className="space-y-5" noValidate>{state.message ? <Alert variant="destructive"><AlertDescription>{state.message}</AlertDescription></Alert> : null}<PasswordField id="password" label="New password" visible={visible} toggle={() => setVisible((current) => !current)} error={state.fieldErrors?.password?.[0]} /><PasswordField id="confirmPassword" label="Confirm new password" visible={visible} toggle={() => setVisible((current) => !current)} error={state.fieldErrors?.confirmPassword?.[0]} /><p className="text-xs text-muted-foreground">Use at least 12 characters.</p><SubmitButton /></form>;
}

function PasswordField({ id, label, visible, toggle, error }: { id: string; label: string; visible: boolean; toggle: () => void; error?: string }) {
  const visibilityLabel = visible ? "Hide passwords" : "Show passwords";
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><div className="relative"><Input id={id} name={id} type={visible ? "text" : "password"} className="pr-11" autoComplete="new-password" minLength={12} required aria-invalid={Boolean(error)} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 size-7 -translate-y-1/2" onMouseDown={(event) => event.preventDefault()} onClick={toggle} aria-label={visibilityLabel} title={visibilityLabel} aria-pressed={visible}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button></div>{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>;
}
