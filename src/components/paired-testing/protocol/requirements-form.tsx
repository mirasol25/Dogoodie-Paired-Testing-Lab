"use client";

import { useState, useTransition } from "react";
import { Camera, Check, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { saveProtocolRequirementsAction } from "@/app/paired-testing-demo/protocol/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useProtocolDraftNavigation } from "@/components/paired-testing/protocol/protocol-draft-navigation";
import type { Json } from "@/types/database.types";

type EvidenceCode = "screen_recording" | "gps_coordinates";
type ObservationCode = "estimated_arrival_time" | "availability" | "price_breakdown" | "tester_notes" | "app_version" | "device_model" | "operating_system_family" | "network_category" | "account_age_membership";

const evidenceOptions: Array<{ code: EvidenceCode; label: string }> = [
  { code: "screen_recording", label: "Screen recording" },
  { code: "gps_coordinates", label: "Observed GPS coordinates" },
];

const requiredObservationFields = [
  "Provider", "Normalized service category", "Displayed price", "Currency", "Pickup and destination",
  "Request timestamp", "Tester side", "Controlled attribute", "Submission timestamp",
];

const observationOptions: Array<{ code: ObservationCode; label: string }> = [
  { code: "estimated_arrival_time", label: "Estimated arrival time" },
  { code: "availability", label: "Ride availability" },
  { code: "price_breakdown", label: "Price breakdown" },
  { code: "tester_notes", label: "Tester notes" },
  { code: "app_version", label: "App version" },
  { code: "device_model", label: "Device model" },
  { code: "operating_system_family", label: "Operating-system family" },
  { code: "network_category", label: "Network category" },
  { code: "account_age_membership", label: "Account age or membership status" },
];

function codesFromArray(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => entry && typeof entry === "object" && !Array.isArray(entry) && "code" in entry && typeof entry.code === "string" ? [entry.code] : []);
}

function observationConfiguration(configuration: Json): Json {
  return configuration && typeof configuration === "object" && !Array.isArray(configuration) ? configuration.observation_fields ?? null : null;
}

export function RequirementsForm({ studyId, protocolId, evidenceRequirements, validationConfiguration, fixedControls }: { studyId: string; protocolId: string; evidenceRequirements: Json; validationConfiguration: Json; fixedControls: Json }) {
  const forcedTechnical = new Set(codesFromArray(fixedControls).filter((code) => observationOptions.some((option) => option.code === code)) as ObservationCode[]);
  const existingEvidence = codesFromArray(evidenceRequirements).filter((code) => evidenceOptions.some((option) => option.code === code)) as EvidenceCode[];
  const existingObservations = codesFromArray(observationConfiguration(validationConfiguration)).filter((code) => observationOptions.some((option) => option.code === code) && !forcedTechnical.has(code as ObservationCode)) as ObservationCode[];
  const initiallyConfigured = codesFromArray(evidenceRequirements).includes("screenshot") && Array.isArray(observationConfiguration(validationConfiguration));
  const [evidence, setEvidence] = useState(existingEvidence);
  const [observations, setObservations] = useState(existingObservations);
  const [savedEvidence, setSavedEvidence] = useState(existingEvidence);
  const [savedObservations, setSavedObservations] = useState(existingObservations);
  const [configured, setConfigured] = useState(initiallyConfigured);
  const [pending, startTransition] = useTransition();
  const navigation = useProtocolDraftNavigation();
  const dirty = !configured || [...evidence].sort().join(",") !== [...savedEvidence].sort().join(",") || [...observations].sort().join(",") !== [...savedObservations].sort().join(",");

  function toggleEvidence(code: EvidenceCode, checked: boolean) {
    setEvidence((current) => checked ? [...current, code] : current.filter((item) => item !== code));
  }

  function toggleObservation(code: ObservationCode, checked: boolean) {
    setObservations((current) => checked ? [...current, code] : current.filter((item) => item !== code));
  }

  function save() {
    startTransition(async () => {
      const result = await saveProtocolRequirementsAction({ studyId, protocolId, optionalEvidence: evidence, optionalObservationFields: observations });
      if (result.ok) {
        setSavedEvidence(evidence);
        setSavedObservations(observations);
        setConfigured(true);
        toast.success(result.message);
        navigation?.goToStep("exclusions");
      } else toast.error(result.message);
    });
  }

  return (
    <section className="space-y-6 border-t border-border pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="label-kicker">Protocol configuration</p><h2 className="mt-1.5 text-lg font-semibold">Evidence and observation requirements</h2></div><Badge variant={dirty ? "outline" : "secondary"}>{dirty ? "Unsaved changes" : <><Check className="size-3" />Saved</>}</Badge></div>

      <div className="space-y-3"><h3 className="text-sm font-semibold">Evidence</h3><div className="divide-y divide-border rounded-md border border-border"><div className="flex min-h-14 items-center gap-3 px-4 py-3"><Checkbox checked disabled /><Camera className="size-4 text-primary" /><span className="flex-1 text-sm font-medium">Quote screenshot</span><Badge variant="outline">Required</Badge></div>{evidenceOptions.map((option) => <label key={option.code} className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 hover:bg-secondary"><Checkbox checked={evidence.includes(option.code)} onCheckedChange={(checked) => toggleEvidence(option.code, checked === true)} /><span className="flex-1 text-sm">{option.label}</span><Badge variant="secondary">Optional</Badge></label>)}</div></div>

      <div className="space-y-3"><h3 className="text-sm font-semibold">Required observation data</h3><div className="grid gap-x-5 gap-y-2 border-y border-border py-4 sm:grid-cols-2 lg:grid-cols-3">{requiredObservationFields.map((field) => <div key={field} className="flex items-center gap-2 text-xs"><Check className="size-3.5 text-primary" /><span>{field}</span></div>)}</div></div>

      <div className="space-y-3"><h3 className="text-sm font-semibold">Additional observation data</h3><div className="grid gap-2 md:grid-cols-2">{observationOptions.map((option) => {
        const forced = forcedTechnical.has(option.code);
        const checked = forced || observations.includes(option.code);
        return <label key={option.code} className={`flex min-h-14 items-center gap-3 rounded-md border p-3 ${forced ? "cursor-not-allowed border-primary/40 bg-primary/5" : checked ? "cursor-pointer border-primary bg-primary/5" : "cursor-pointer border-border hover:bg-secondary"}`}><Checkbox checked={checked} disabled={forced} onCheckedChange={(value) => toggleObservation(option.code, value === true)} /><span className="flex-1 text-sm">{option.label}</span><Badge variant={forced ? "outline" : "secondary"}>{forced ? "Required by control" : "Optional"}</Badge></label>;
      })}</div></div>

      <div className="flex justify-end"><Button type="button" onClick={save} disabled={pending || !dirty}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{pending ? "Saving..." : "Save and continue"}</Button></div>
    </section>
  );
}
