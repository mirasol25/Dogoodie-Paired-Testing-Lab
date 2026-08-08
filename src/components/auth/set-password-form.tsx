"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, LoaderCircle, LocateFixed } from "lucide-react";
import { setPasswordAction, type SetPasswordState } from "@/app/set-password/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [location, setLocation] = useState<{ latitude: string; longitude: string } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const languageRef = useRef<HTMLInputElement>(null);
  const timezoneRef = useRef<HTMLInputElement>(null);
  const screenSizeRef = useRef<HTMLInputElement>(null);
  const userAgentRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (languageRef.current) languageRef.current.value = navigator.language || "";
    if (timezoneRef.current) timezoneRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (screenSizeRef.current) screenSizeRef.current.value = `${window.screen.width}x${window.screen.height}`;
    if (userAgentRef.current) userAgentRef.current.value = navigator.userAgent;
  }, []);

  function verifyLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ latitude: String(position.coords.latitude), longitude: String(position.coords.longitude) });
        setLocationStatus("ready");
      },
      () => setLocationStatus("error"),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message ? <Alert variant="destructive"><AlertDescription>{state.message}</AlertDescription></Alert> : null}
      <input type="hidden" name="latitude" value={location?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={location?.longitude ?? ""} />
      <input ref={languageRef} type="hidden" name="browserLanguage" />
      <input ref={timezoneRef} type="hidden" name="browserTimezone" />
      <input ref={screenSizeRef} type="hidden" name="screenSize" />
      <input ref={userAgentRef} type="hidden" name="userAgent" />
      <div className="space-y-2">
        <Label>Location verification</Label>
        <Button type="button" variant="outline" className="w-full" onClick={verifyLocation} disabled={locationStatus === "loading"}>
          {locationStatus === "loading" ? <LoaderCircle className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
          {locationStatus === "ready" ? "Location verified" : locationStatus === "loading" ? "Verifying location..." : "Verify my location"}
        </Button>
        <p className="text-xs text-muted-foreground">Your country is detected from your current location and locked to your tester profile.</p>
        {locationStatus === "error" ? <p className="text-xs text-muted-foreground">Location was unavailable. Your server-detected IP country will be used as a fallback.</p> : null}
        {state.fieldErrors?.latitude || state.fieldErrors?.longitude ? <p className="text-xs text-destructive">The location coordinates are invalid. Verify again.</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <DeviceField name="networkType" label="Network type" placeholder="5G" error={state.fieldErrors?.networkType?.[0]} />
        <DeviceField name="deviceType" label="Device type" placeholder="iPhone 15" error={state.fieldErrors?.deviceType?.[0]} />
        <DeviceField name="operatingSystem" label="Operating system" placeholder="iOS" error={state.fieldErrors?.operatingSystem?.[0]} />
        <DeviceField name="operatingSystemVersion" label="OS version" placeholder="26" error={state.fieldErrors?.operatingSystemVersion?.[0]} />
        <DeviceField name="appVersion" label="App version" placeholder="1.1" error={state.fieldErrors?.appVersion?.[0]} />
      </div>
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
      <p className="text-xs leading-5 text-muted-foreground">By creating your account, you consent to storing your verified country, registration IP, browser, language, timezone, screen size, and the five device details above for future studies.</p>
    </form>
  );
}

function DeviceField({ name, label, placeholder, error }: { name: string; label: string; placeholder: string; error?: string }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} placeholder={placeholder} maxLength={100} required aria-invalid={Boolean(error)} />{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>;
}
