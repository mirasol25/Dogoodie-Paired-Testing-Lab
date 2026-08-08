"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { updateDeviceProfileAction } from "@/app/paired-testing-demo/device-profile/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deviceProfileSchema, type DeviceProfileInput } from "@/lib/validation/device-profile-schemas";

export function DeviceProfileForm({ initial, countryName, countryCode }: { initial: DeviceProfileInput; countryName: string | null; countryCode: string | null }) {
  const [values, setValues] = useState(initial);
  const [savedValues, setSavedValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof DeviceProfileInput, string>>>({});
  const [pending, startTransition] = useTransition();
  const changed = Object.keys(savedValues).some((key) => values[key as keyof DeviceProfileInput] !== savedValues[key as keyof DeviceProfileInput]);

  function update(field: keyof DeviceProfileInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
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
      }
      else toast.error(result.message);
    });
  }

  return <div className="space-y-6">
    <Alert><AlertTitle>Future assignment defaults</AlertTitle><AlertDescription>Changes here prefill new assignments. Existing and future submission records keep their own device snapshot for audit and validation.</AlertDescription></Alert>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Network type" value={values.networkType} onChange={(value) => update("networkType", value)} error={errors.networkType} />
      <Field label="Device type" value={values.deviceType} onChange={(value) => update("deviceType", value)} error={errors.deviceType} />
      <Field label="Operating system" value={values.operatingSystem} onChange={(value) => update("operatingSystem", value)} error={errors.operatingSystem} />
      <Field label="OS version" value={values.operatingSystemVersion} onChange={(value) => update("operatingSystemVersion", value)} error={errors.operatingSystemVersion} />
      <Field label="App version" value={values.appVersion} onChange={(value) => update("appVersion", value)} error={errors.appVersion} />
    </div>
    <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="verified-country">Verified country</Label><Input id="verified-country" value={countryName || "Not verified"} readOnly disabled /></div>
      <div className="space-y-2"><Label htmlFor="verified-country-code">Country code</Label><Input id="verified-country-code" value={countryCode || "—"} readOnly disabled /></div>
      <p className="text-xs leading-5 text-muted-foreground sm:col-span-2">Your verified country is locked. Contact an administrator if it needs review.</p>
    </div>
    <div className="flex justify-end border-t border-border pt-5"><Button onClick={save} disabled={pending || !changed}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{pending ? "Saving..." : "Save device profile"}</Button></div>
  </div>;
}

function Field({ label, value, onChange, error }: { label: string; value: string; onChange: (value: string) => void; error?: string }) {
  const id = `profile-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} value={value} onChange={(event) => onChange(event.target.value)} maxLength={120} aria-invalid={Boolean(error)} />{error ? <p className="text-xs text-destructive">{error}</p> : null}</div>;
}
