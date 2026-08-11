"use client";

import { useState, useTransition } from "react";
import { Ban, Check, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { saveProtocolExclusionsAction } from "@/app/paired-testing-demo/protocol/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useProtocolDraftNavigation } from "@/components/paired-testing/protocol/protocol-draft-navigation";
import { ProtocolInfoTooltip } from "@/components/paired-testing/protocol/protocol-info-tooltip";
import type { Json } from "@/types/database.types";

type OptionalExclusion = "outside_assignment_window" | "declared_protocol_deviation" | "evidence_timestamp_mismatch" | "duplicate_evidence";

const optionalRules: Array<{ code: OptionalExclusion; label: string }> = [
  { code: "outside_assignment_window", label: "Observation outside assignment window" },
  { code: "declared_protocol_deviation", label: "Tester declared a protocol deviation" },
  { code: "evidence_timestamp_mismatch", label: "Evidence timestamp does not match observation" },
  { code: "duplicate_evidence", label: "Duplicate evidence submitted" },
];

function entries(value: Json): Array<{ code: string; label: string; required: boolean }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const code = "code" in entry && typeof entry.code === "string" ? entry.code : null;
    const label = "label" in entry && typeof entry.label === "string" ? entry.label : null;
    if (!code || !label) return [];
    return [{ code, label, required: "required" in entry && entry.required === true }];
  });
}

function observationFields(configuration: Json): Json {
  return configuration && typeof configuration === "object" && !Array.isArray(configuration) ? configuration.observation_fields ?? null : null;
}

export function ExclusionConditionsForm({ studyId, protocolId, fixedControls, evidenceRequirements, validationConfiguration, exclusionConditions, hasComparison = false }: { studyId: string; protocolId: string; fixedControls: Json; evidenceRequirements: Json; validationConfiguration: Json; exclusionConditions: Json; hasComparison?: boolean }) {
  const existingCodes = new Set(entries(exclusionConditions).map((entry) => entry.code));
  const initialOptional = optionalRules.filter((rule) => existingCodes.has(rule.code)).map((rule) => rule.code);
  const [selected, setSelected] = useState<OptionalExclusion[]>(initialOptional);
  const [saved, setSaved] = useState<OptionalExclusion[]>(initialOptional);
  const [configured, setConfigured] = useState(entries(exclusionConditions).length > 0);
  const [pending, startTransition] = useTransition();
  const navigation = useProtocolDraftNavigation();
  const dirty = !configured || [...selected].sort().join(",") !== [...saved].sort().join(",");
  const automaticRules = [
    ...entries(fixedControls).map((entry) => `${entry.label} does not match`),
    "Maximum request-time gap exceeded",
    "Maximum location-distance gap exceeded",
    ...entries(evidenceRequirements).filter((entry) => entry.required).map((entry) => `Missing ${entry.label.toLowerCase()}`),
    ...entries(observationFields(validationConfiguration)).filter((entry) => entry.required).map((entry) => `Missing ${entry.label.toLowerCase()}`),
  ];

  function toggle(code: OptionalExclusion, checked: boolean) {
    setSelected((current) => checked ? [...current, code] : current.filter((item) => item !== code));
  }

  function save() {
    startTransition(async () => {
      const result = await saveProtocolExclusionsAction({ studyId, protocolId, optionalExclusions: selected });
      if (result.ok) {
        setSaved(selected);
        setConfigured(true);
        toast.success(result.message);
        navigation?.goToWorkspace(hasComparison ? "changes" : "review");
      } else toast.error(result.message);
    });
  }

  return (
    <section className="space-y-6 border-t border-border pt-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="label-kicker">Protocol configuration</p><div className="mt-1.5 flex items-center gap-1"><h2 className="text-lg font-semibold">Exclusion conditions</h2><ProtocolInfoTooltip label="About exclusion conditions">These conditions create technical findings or can disqualify a pair. The expert reviewer decides whether to accept with exception or reject a completed pair.</ProtocolInfoTooltip></div></div><Badge variant={dirty ? "outline" : "secondary"}>{dirty ? "Unsaved changes" : <><Check className="size-3" />Saved</>}</Badge></div>

      <div className="space-y-3"><h3 className="text-sm font-semibold">Automatic failure rules</h3><div className="grid gap-x-5 gap-y-2 border-y border-border py-4 md:grid-cols-2">{automaticRules.map((rule) => <div key={rule} className="flex items-start gap-2 text-xs"><Ban className="mt-0.5 size-3.5 shrink-0 text-destructive" /><span>{rule}</span></div>)}</div></div>

      <div className="space-y-3"><h3 className="text-sm font-semibold">Additional operational exclusions</h3><div className="grid gap-2 md:grid-cols-2">{optionalRules.map((rule) => <label key={rule.code} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-md border p-3 ${selected.includes(rule.code) ? "border-destructive/50 bg-destructive/5" : "border-border hover:bg-secondary"}`}><Checkbox checked={selected.includes(rule.code)} onCheckedChange={(checked) => toggle(rule.code, checked === true)} /><span className="flex-1 text-sm">{rule.label}</span><Badge variant="outline">Fail</Badge></label>)}</div></div>

      <div className="flex justify-end"><Button type="button" onClick={save} disabled={pending || !dirty}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{pending ? "Saving..." : hasComparison ? "Save and view changes" : "Save and review"}</Button></div>
    </section>
  );
}
