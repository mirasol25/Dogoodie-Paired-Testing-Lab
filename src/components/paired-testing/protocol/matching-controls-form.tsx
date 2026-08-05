"use client";

import { useState, useTransition } from "react";
import { Check, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { saveMatchingControlsAction } from "@/app/paired-testing-demo/protocol/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useProtocolDraftNavigation } from "@/components/paired-testing/protocol/protocol-draft-navigation";
import type { Json } from "@/types/database.types";

type OptionalControlCode = "operating_system_family" | "app_version" | "device_model" | "network_category";

const requiredControls = [
  ["Provider", "The same rideshare provider"],
  ["Exact ride tier", "The same branded passenger tier"],
  ["Pickup location", "The assignment's standardized pickup"],
  ["Destination location", "The assignment's standardized destination"],
  ["Currency", "The study's ISO currency"],
] as const;

const optionalControls: Array<{ code: OptionalControlCode; label: string; detail: string }> = [
  { code: "operating_system_family", label: "Operating-system family", detail: "For example, both testers use iOS" },
  { code: "app_version", label: "App version", detail: "Require the same provider-app version" },
  { code: "device_model", label: "Device model", detail: "Require matching device models" },
  { code: "network_category", label: "Network category", detail: "Require the same Wi-Fi or mobile-data category" },
];

function readOptionalControls(value: Json): OptionalControlCode[] {
  if (!Array.isArray(value)) return [];
  const supported = new Set(optionalControls.map((control) => control.code));
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const code = "code" in entry ? entry.code : null;
    return typeof code === "string" && supported.has(code as OptionalControlCode) ? [code as OptionalControlCode] : [];
  });
}

function hasCanonicalControls(value: Json): boolean {
  return Array.isArray(value) && value.some((entry) => Boolean(entry && typeof entry === "object" && !Array.isArray(entry) && "code" in entry && entry.code === "provider"));
}

export function MatchingControlsForm({ studyId, protocolId, fixedControls }: { studyId: string; protocolId: string; fixedControls: Json }) {
  const initialControls = readOptionalControls(fixedControls);
  const [selected, setSelected] = useState<OptionalControlCode[]>(initialControls);
  const [saved, setSaved] = useState<OptionalControlCode[]>(initialControls);
  const [configured, setConfigured] = useState(hasCanonicalControls(fixedControls));
  const [pending, startTransition] = useTransition();
  const navigation = useProtocolDraftNavigation();
  const dirty = !configured || [...selected].sort().join(",") !== [...saved].sort().join(",");

  function toggle(code: OptionalControlCode, checked: boolean) {
    setSelected((current) => checked ? [...current, code] : current.filter((item) => item !== code));
  }

  function save() {
    startTransition(async () => {
      const result = await saveMatchingControlsAction({ studyId, protocolId, optionalControls: selected });
      if (result.ok) {
        setSaved(selected);
        setConfigured(true);
        toast.success(result.message);
        navigation?.goToStep("thresholds");
      } else toast.error(result.message);
    });
  }

  return (
    <section className="space-y-5 border-t border-border pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="label-kicker">Protocol configuration</p><h2 className="mt-1.5 text-lg font-semibold">Matching controls</h2></div><Badge variant={dirty ? "outline" : "secondary"}>{dirty ? "Unsaved changes" : <><Check className="size-3" />Saved</>}</Badge></div>

      <div className="space-y-2"><h3 className="text-sm font-semibold">Required exact matches</h3><div className="divide-y divide-border rounded-md border border-border">{requiredControls.map(([label, detail]) => <div key={label} className="flex min-h-14 items-center gap-3 px-4 py-3"><Checkbox checked disabled /><ShieldCheck className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{detail}</span></span><Badge variant="outline">Exact</Badge></div>)}</div></div>

      <div className="space-y-2"><h3 className="text-sm font-semibold">Optional technical matches</h3><div className="grid gap-2 md:grid-cols-2">{optionalControls.map((control) => <label key={control.code} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-md border p-3 ${selected.includes(control.code) ? "border-primary bg-primary/5" : "border-border hover:bg-secondary"}`}><Checkbox checked={selected.includes(control.code)} onCheckedChange={(checked) => toggle(control.code, checked === true)} /><span className="min-w-0"><span className="block text-sm font-medium">{control.label}</span><span className="block text-xs text-muted-foreground">{control.detail}</span></span></label>)}</div></div>

      <div className="flex justify-end"><Button type="button" onClick={save} disabled={pending || !dirty}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{pending ? "Saving..." : "Save and continue"}</Button></div>
    </section>
  );
}
