"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, Info, KeyRound, LoaderCircle, LocateFixed, Smartphone } from "lucide-react";
import { setPasswordAction, type SetPasswordState } from "@/app/set-password/actions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState: SetPasswordState = {};
const operatingSystemVersions = {
  iOS: ["iOS 26", "iOS 18", "iOS 17", "iOS 16", "iOS 15", "iOS 14", "iOS 13", "iOS 12", "iOS 11", "iOS 10"],
  Android: ["Android 16", "Android 15", "Android 14", "Android 13", "Android 12", "Android 11", "Android 10"],
} as const;

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
  const [step, setStep] = useState(1);
  const [location, setLocation] = useState<{ latitude: string; longitude: string } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [networkType, setNetworkType] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [operatingSystem, setOperatingSystem] = useState("");
  const [operatingSystemVersion, setOperatingSystemVersion] = useState("");
  const [appVersion, setAppVersion] = useState("");
  const [clientError, setClientError] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
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

  function continueFromLocation() {
    if (locationStatus !== "ready" && locationStatus !== "error") {
      setClientError("Verify your location before continuing.");
      return;
    }
    setClientError("");
    setStep(2);
  }

  function continueFromDevice() {
    if (!networkType || !deviceType.trim() || !operatingSystem || !operatingSystemVersion.trim() || !appVersion.trim()) {
      setClientError("Complete all five device details before continuing.");
      return;
    }
    setClientError("");
    setStep(3);
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      {state.message ? <Alert variant="destructive"><AlertDescription>{state.message}</AlertDescription></Alert> : null}
      {clientError ? <Alert variant="destructive"><AlertDescription>{clientError}</AlertDescription></Alert> : null}
      <div className="grid grid-cols-3 overflow-hidden rounded-md border border-border" aria-label={`Account setup step ${step} of 3`}>
        {["Location", "Device", "Password"].map((label, index) => {
          const number = index + 1;
          return <div key={label} className={`border-r border-border px-2 py-2.5 text-center last:border-r-0 ${number === step ? "bg-primary/10 text-primary" : number < step ? "text-foreground" : "text-muted-foreground"}`}><span className="block text-[10px] uppercase">Step {number}</span><span className="mt-0.5 block text-xs font-semibold">{label}</span></div>;
        })}
      </div>
      <input type="hidden" name="latitude" value={location?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={location?.longitude ?? ""} />
      <input ref={languageRef} type="hidden" name="browserLanguage" />
      <input ref={timezoneRef} type="hidden" name="browserTimezone" />
      <input ref={screenSizeRef} type="hidden" name="screenSize" />
      <input ref={userAgentRef} type="hidden" name="userAgent" />
      <div className={`space-y-4 ${step === 1 ? "" : "hidden"}`}>
        <div><h2 className="text-base font-semibold">Verify your testing country</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Tester assignments are limited to studies in your verified country.</p></div>
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
        <Button type="button" className="w-full" onClick={continueFromLocation}>Continue to device information</Button>
      </div>
      <div className={`space-y-4 ${step === 2 ? "" : "hidden"}`}>
        <div><h2 className="text-base font-semibold">Set up your device profile</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Enter the phone, software, app, and network you will use during testing.</p></div>
      <section className="overflow-hidden rounded-md border border-border bg-card/35" aria-labelledby="device-information-heading">
        <div className="flex gap-3 border-b border-border px-4 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary"><Smartphone className="size-4" /></span>
          <div>
            <h2 id="device-information-heading" className="text-sm font-semibold">Device information</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">These details help the protocol identify device, software, app-version, or network differences that could affect a paired fare comparison. They are saved to your tester profile and prefilled in future submissions.</p>
          </div>
        </div>
        <Accordion type="single" collapsible>
          <AccordionItem value="device-guide" className="border-0 px-4">
            <AccordionTrigger className="py-3 text-sm"><span className="flex items-center gap-2"><Info className="size-4 text-primary" />Where to find these details</span></AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="text-xs leading-5">
                {operatingSystem === "iOS" || !operatingSystem ? <div>
                  <p className="font-semibold text-foreground">iPhone</p>
                  <p className="mt-1 text-muted-foreground"><span className="text-foreground">Device and iOS:</span> Settings &gt; General &gt; About. Use Model Name and iOS Version.</p>
                  <p className="mt-2 text-muted-foreground"><span className="text-foreground">App version:</span> Open the ride-hailing app and check its Settings, About, or Help screen. If unavailable, check Settings &gt; General &gt; iPhone Storage &gt; the app.</p>
                </div> : null}
                {operatingSystem === "Android" ? <div>
                  <p className="font-semibold text-foreground">Android</p>
                  <p className="mt-1 text-muted-foreground"><span className="text-foreground">Device and Android:</span> Settings &gt; About phone. Open Software information when needed.</p>
                  <p className="mt-2 text-muted-foreground"><span className="text-foreground">App version:</span> Settings &gt; Apps &gt; select the ride-hailing app. The version is usually shown in App details or at the bottom.</p>
                </div> : null}
                <p className="mt-3 text-muted-foreground"><span className="text-foreground">Network type:</span> Enter the connection you will use during testing. Check the status bar or network settings.</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <ChoiceField name="networkType" label="Network type" value={networkType} onChange={setNetworkType} placeholder="Select network" options={["Wi-Fi", "4G/LTE", "5G"]} error={state.fieldErrors?.networkType?.[0]} />
        <DeviceField name="deviceType" label="Device model" placeholder={operatingSystem === "Android" ? "Samsung Galaxy A55" : "iPhone 15"} value={deviceType} onChange={setDeviceType} error={state.fieldErrors?.deviceType?.[0]} />
        <ChoiceField name="operatingSystem" label="Operating system" value={operatingSystem} onChange={(value) => { setOperatingSystem(value); setOperatingSystemVersion(""); }} placeholder="Select operating system" options={["iOS", "Android"]} error={state.fieldErrors?.operatingSystem?.[0]} />
        <ChoiceField name="operatingSystemVersion" label="OS version" value={operatingSystemVersion} onChange={setOperatingSystemVersion} placeholder={operatingSystem ? `Select ${operatingSystem} version` : "Select an operating system first"} options={operatingSystem ? [...operatingSystemVersions[operatingSystem as keyof typeof operatingSystemVersions]] : []} disabled={!operatingSystem} error={state.fieldErrors?.operatingSystemVersion?.[0]} />
        <DeviceField name="appVersion" label="Ride-hailing app version" placeholder="For example, 5.355.0" value={appVersion} onChange={setAppVersion} error={state.fieldErrors?.appVersion?.[0]} />
      </div>
      <div className="flex gap-2"><Button type="button" variant="outline" className="flex-1" onClick={() => { setClientError(""); setStep(1); }}>Back</Button><Button type="button" className="flex-1" onClick={continueFromDevice}>Review and create password</Button></div>
      </div>
      <div className={`space-y-5 ${step === 3 ? "" : "hidden"}`}>
      <div><h2 className="text-base font-semibold">Create your password</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Review your tester profile, then secure your account.</p></div>
      <div className="grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
        {[['Location', locationStatus === 'ready' ? 'Current location verified' : 'IP-country fallback'], ['Device', deviceType || 'Not entered'], ['Software', [operatingSystem, operatingSystemVersion].filter(Boolean).join(' ') || 'Not entered'], ['Network', networkType || 'Not entered'], ['Ride app version', appVersion || 'Not entered']].map(([label, value]) => <div key={label} className="bg-card px-3 py-2.5"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>)}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" name="password" visible={showPasswords} onVisibilityChange={() => setShowPasswords((current) => !current)} invalid={Boolean(state.fieldErrors?.password)} />
        <p className="text-xs text-muted-foreground">Use at least 12 characters.</p>
        {state.fieldErrors?.password ? <p className="text-xs text-destructive">{state.fieldErrors.password[0]}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <PasswordInput id="confirmPassword" name="confirmPassword" visible={showPasswords} onVisibilityChange={() => setShowPasswords((current) => !current)} invalid={Boolean(state.fieldErrors?.confirmPassword)} />
        {state.fieldErrors?.confirmPassword ? <p className="text-xs text-destructive">{state.fieldErrors.confirmPassword[0]}</p> : null}
      </div>
      <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => { setClientError(""); setStep(2); }}>Back</Button><div className="flex-1"><SubmitButton /></div></div>
      <p className="text-xs leading-5 text-muted-foreground">By creating your account, you consent to storing your verified country, registration IP, browser, language, timezone, screen size, and the five device details above for future studies.</p>
      </div>
    </form>
  );
}

function DeviceField({ name, label, placeholder, value, onChange, error }: { name: string; label: string; placeholder: string; value: string; onChange: (value: string) => void; error?: string }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} maxLength={100} required aria-invalid={Boolean(error)} />{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>;
}

function PasswordInput({ id, name, visible, onVisibilityChange, invalid }: { id: string; name: string; visible: boolean; onVisibilityChange: () => void; invalid: boolean }) {
  const label = visible ? "Hide passwords" : "Show passwords";
  return <div className="relative h-9"><Input id={id} name={name} type={visible ? "text" : "password"} className="h-9 pr-11" autoComplete="new-password" minLength={12} required aria-invalid={invalid} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 z-10 size-7 -translate-y-1/2" onMouseDown={(event) => event.preventDefault()} onClick={onVisibilityChange} aria-label={label} title={label} aria-pressed={visible}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button></div>;
}

function ChoiceField({ name, label, value, onChange, placeholder, options, disabled = false, error }: { name: string; label: string; value: string; onChange: (value: string) => void; placeholder: string; options: string[]; disabled?: boolean; error?: string }) {
  return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Select name={name} value={value} onValueChange={onChange} required disabled={disabled}><SelectTrigger id={name} className="w-full" aria-invalid={Boolean(error)}><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>;
}
