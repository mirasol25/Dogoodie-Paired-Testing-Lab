"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, LoaderCircle } from "lucide-react";
import { setPasswordAction, type SetPasswordState } from "@/app/set-password/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState: SetPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
      {pending ? "Creating password..." : "Create password"}
    </Button>
  );
}

export function SetPasswordForm() {
  const [state, action] = useActionState(setPasswordAction, initialState);
  const [testerCountryCode, setTesterCountryCode] = useState("");
  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message ? <Alert variant="destructive"><AlertDescription>{state.message}</AlertDescription></Alert> : null}
      <div className="space-y-2"><Label htmlFor="testerCountryCode">Tester location</Label><input type="hidden" name="testerCountryCode" value={testerCountryCode} /><Select value={testerCountryCode} onValueChange={setTesterCountryCode}><SelectTrigger id="testerCountryCode" aria-invalid={Boolean(state.fieldErrors?.testerCountryCode)}><SelectValue placeholder="Select location" /></SelectTrigger><SelectContent><SelectItem value="PH">PH (Philippines)</SelectItem><SelectItem value="US">US (United States)</SelectItem></SelectContent></Select>{state.fieldErrors?.testerCountryCode ? <p className="text-xs text-destructive">{state.fieldErrors.testerCountryCode[0]}</p> : null}</div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required aria-invalid={Boolean(state.fieldErrors?.password)} />
        <p className="text-xs text-muted-foreground">Use at least 12 characters.</p>
        {state.fieldErrors?.password ? <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required aria-invalid={Boolean(state.fieldErrors?.confirmPassword)} />
        {state.fieldErrors?.confirmPassword ? <p className="text-xs text-destructive">{state.fieldErrors.confirmPassword[0]}</p> : null}
      </div>
      <SubmitButton />
    </form>
  );
}
