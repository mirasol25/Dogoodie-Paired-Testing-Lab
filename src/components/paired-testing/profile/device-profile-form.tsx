"use client";

import { useState, useTransition } from "react";
import { Info, LoaderCircle, Save, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { updateDeviceProfileAction } from "@/app/paired-testing-demo/device-profile/actions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deviceProfileSchema, type DeviceProfileInput } from "@/lib/validation/device-profile-schemas";

const operatingSystemVersions = {
  iOS: ["iOS 26", "iOS 18", "iOS 17", "iOS 16", "iOS 15", "iOS 14", "iOS 13", "iOS 12", "iOS 11", "iOS 10"],
  Android: ["Android 16", "Android 15", "Android 14", "Android 13", "Android 12", "Android 11", "Android 10"],
} as const;

function normalizeProfile(initial: DeviceProfileInput): DeviceProfileInput {
  const operatingSystem = initial.operatingSystem.toLowerCase() === "ios"
    ? "iOS"
    : initial.operatingSystem.toLowerCase() === "android" ? "Android" : initial.operatingSystem;
  const rawVersion = initial.operatingSystemVersion.trim();
  const operatingSystemVersion = operatingSystem && rawVersion && !rawVersion.toLowerCase().startsWith(operatingSystem.toLowerCase())
    ? `${operatingSystem} ${rawVersion}`
    : rawVersion;
  const network = initial.networkType.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
  const networkType = network === "wifi"
    ? "Wi-Fi"
    : network === "4g" || network === "4glte" || network === "lte" ? "4G/LTE" : network === "5g" ? "5G" : initial.networkType;
  return { ...initial, networkType, operatingSystem, operatingSystemVersion };
}

export function DeviceProfileForm({ initial, countryName, countryCode }: { initial: DeviceProfileInput; countryName: string | null; countryCode: string | null }) {
  const normalizedInitial = normalizeProfile(initial);
  const [values, setValues] = useState(normalizedInitial);
  const [savedValues, setSavedValues] = useState(normalizedInitial);
  const [errors, setErrors] = useState<Partial<Record<keyof DeviceProfileInput, string>>>({});
  const [pending, startTransition] = useTransition();
  const changed = Object.keys(savedValues).some((key) => values[key as keyof DeviceProfileInput] !== savedValues[key as keyof DeviceProfileInput]);

  function update(field: keyof DeviceProfileInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function changeOperatingSystem(value: string) {
    setValues((current) => ({ ...current, operatingSystem: value, operatingSystemVersion: "" }));
    setErrors((current) => ({ ...current, operatingSystem: undefined, operatingSystemVersion: undefined }));
  }

  function save() {
    const parsed = deviceProfileSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof DeviceProfileInput, string>> = {};
      parsed.error.issues.forEach((issue) => { next[issue.path[0] as keyof DeviceProfileInput] ??= issue.message; });
      setErrors(next);
      return;
    }
    startTransition(async () => {
      const result = await updateDeviceProfileAction(parsed.data);
      if (result.ok) {
        setValues(parsed.data);
        setSavedValues(parsed.data);
        toast.success(result.message);
      } else toast.error(result.message);
    });
  }

  const versionOptions = values.operatingSystem in operatingSystemVersions
    ? [...operatingSystemVersions[values.operatingSystem as keyof typeof operatingSystemVersions]]
    : [];

  return <div className="space-y-6">
    <Alert><AlertTitle>Future assignment defaults</AlertTitle><AlertDescription>Changes here prefill new submissions. Every submitted observation keeps its own device snapshot for audit and validation.</AlertDescription></Alert>
    <section className="overflow-hidden rounded-md border border-border bg-card/35" aria-labelledby="profile-device-information-heading">
      <div className="flex gap-3 border-b border-border px-4 py-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary"><Smartphone className="size-4" /></span><div><h2 id="profile-device-information-heading" className="text-sm font-semibold">Device information</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">These defaults help identify device, software, app-version, or network differences that could affect paired fare results. Confirm the current values before every submission.</p></div></div>
      <Accordion type="single" collapsible><AccordionItem value="device-guide" className="border-0 px-4"><AccordionTrigger className="py-3 text-sm"><span className="flex items-center gap-2"><Info className="size-4 text-primary" />Where to find these details</span></AccordionTrigger><AccordionContent className="pb-4 text-xs leading-5">
        {values.operatingSystem === "Android" ? <div><p className="font-semibold text-foreground">Android</p><p className="mt-1 text-muted-foreground">Find the device model and Android version under Settings &gt; About phone. Find the ride-hailing app version under Settings &gt; Apps &gt; select the app.</p></div> : <div><p className="font-semibold text-foreground">iPhone</p><p className="mt-1 text-muted-foreground">Find Model Name and iOS Version under Settings &gt; General &gt; About. Find the ride-hailing app version in its About screen or under Settings &gt; General &gt; iPhone Storage.</p></div>}
        <p className="mt-3 text-muted-foreground">Check the status bar or network settings for the connection currently used during testing.</p>
      </AccordionContent></AccordionItem></Accordion>
    </section>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ChoiceField label="Default network" value={values.networkType} onChange={(value) => update("networkType", value)} options={["Wi-Fi", "4G/LTE", "5G"]} placeholder="Select network" error={errors.networkType} />
      <Field label="Device model" placeholder={values.operatingSystem === "Android" ? "Samsung Galaxy A55" : "iPhone 15"} value={values.deviceType} onChange={(value) => update("deviceType", value)} error={errors.deviceType} />
      <ChoiceField label="Operating system" value={values.operatingSystem} onChange={changeOperatingSystem} options={["iOS", "Android"]} placeholder="Select operating system" error={errors.operatingSystem} />
      <ChoiceField label="OS version" value={values.operatingSystemVersion} onChange={(value) => update("operatingSystemVersion", value)} options={versionOptions} placeholder={values.operatingSystem ? `Select ${values.operatingSystem} version` : "Select an operating system first"} disabled={!values.operatingSystem} error={errors.operatingSystemVersion} />
      <Field label="Ride-hailing app version" placeholder="For example, 5.355.0" value={values.appVersion} onChange={(value) => update("appVersion", value)} error={errors.appVersion} />
    </div>
    <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="verified-country">Verified country</Label><Input id="verified-country" value={countryName || "Not verified"} readOnly disabled /></div>
      <div className="space-y-2"><Label htmlFor="verified-country-code">Country code</Label><Input id="verified-country-code" value={countryCode || "--"} readOnly disabled /></div>
      <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">Your verified country is locked. Contact an administrator if it needs review.</p>
    </div>
    <div className="flex justify-end border-t border-border pt-5"><Button onClick={save} disabled={pending || !changed}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{pending ? "Saving..." : "Save device profile"}</Button></div>
  </div>;
}

function Field({ label, value, onChange, placeholder, error }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; error?: string }) {
  const id = `profile-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} maxLength={120} aria-invalid={Boolean(error)} />{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>;
}

function ChoiceField({ label, value, onChange, options, placeholder, disabled = false, error }: { label: string; value: string; onChange: (value: string) => void; options: string[]; placeholder: string; disabled?: boolean; error?: string }) {
  const id = `profile-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger id={id} className="w-full" aria-invalid={Boolean(error)}><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>;
}
