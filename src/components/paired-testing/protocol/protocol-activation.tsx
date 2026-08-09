"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, LoaderCircle, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { activateProtocolAction } from "@/app/paired-testing-demo/protocol/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Json } from "@/types/database.types";

function arrayCodes(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => entry && typeof entry === "object" && !Array.isArray(entry) && "code" in entry && typeof entry.code === "string" ? [entry.code] : []);
}

function objectHas(value: Json, key: string): boolean {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && key in value);
}

function requiredObservationCount(configuration: Json): number {
  if (!configuration || typeof configuration !== "object" || Array.isArray(configuration)) return 0;
  const fields = configuration.observation_fields;
  if (!Array.isArray(fields)) return 0;
  return fields.filter((field) => Boolean(field && typeof field === "object" && !Array.isArray(field) && "required" in field && field.required === true)).length;
}

export function ProtocolActivation({ studyId, protocol }: { studyId: string; protocol: { id: string; title: string; protocolCode: string; version: string; studyQuestion: string; isolatedVariable: string | null; testerAValue: string | null; testerBValue: string | null; fixedControls: Json; evidenceRequirements: Json; validationConfiguration: Json; exclusionConditions: Json } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const requiredControlCodes = ["provider", "ride_tier", "pickup_location", "destination_location", "currency"];
  const controlCodes = new Set(arrayCodes(protocol.fixedControls));
  const checks = [
    { label: "A. Study question", href: "#protocol-section-question", complete: protocol.title.trim().length >= 3 && protocol.studyQuestion.trim().length >= 10, missing: "Add a valid title and study question." },
    { label: "B. Fixed conditions", href: "#protocol-section-conditions", complete: requiredControlCodes.every((code) => controlCodes.has(code)), missing: "Save all five required matching controls." },
    { label: "C. Isolated variable", href: "#protocol-section-variable", complete: Boolean(protocol.isolatedVariable?.trim()) && Boolean(protocol.testerAValue?.trim()) && Boolean(protocol.testerBValue?.trim()) && protocol.testerAValue?.trim().toLocaleLowerCase() !== protocol.testerBValue?.trim().toLocaleLowerCase(), missing: "Enter different values for Tester A and Tester B." },
    { label: "D. Required evidence", href: "#protocol-section-evidence", complete: arrayCodes(protocol.evidenceRequirements).includes("screenshot") && arrayCodes(protocol.evidenceRequirements).includes("screen_recording") && requiredObservationCount(protocol.validationConfiguration) >= 9, missing: "Save the required screenshot, screen recording, and observation fields." },
    { label: "E. Validation thresholds", href: "#protocol-section-thresholds", complete: objectHas(protocol.validationConfiguration, "request_time_gap") && objectHas(protocol.validationConfiguration, "location_gap"), missing: "Save both time and location thresholds." },
    { label: "F. Exclusion conditions", href: "#protocol-section-exclusions", complete: Array.isArray(protocol.exclusionConditions) && protocol.exclusionConditions.length > 0, missing: "Save the derived exclusion rules." },
  ];
  const complete = checks.every((check) => check.complete);

  function activate() {
    startTransition(async () => {
      const result = await activateProtocolAction({ studyId, protocolId: protocol.id });
      if (result.ok) {
        setOpen(false);
        toast.success(result.message);
        router.push("/paired-testing-demo/assignments");
        router.refresh();
      } else toast.error(result.message);
    });
  }

  return (
    <section className="space-y-5 border-y border-border py-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="label-kicker">Final review</p><h2 className="mt-1.5 text-lg font-semibold">Protocol readiness</h2></div><Badge variant={complete ? "secondary" : "outline"}>{complete ? <><Check className="size-3" />Ready to activate</> : <><CircleAlert className="size-3" />Incomplete</>}</Badge></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{checks.map((check) => <a key={check.label} href={check.href} className={`flex min-h-16 items-start gap-2 rounded-md border px-3 py-3 text-xs transition-colors hover:bg-secondary ${check.complete ? "border-primary/30 bg-primary/5" : "border-border"}`}>{check.complete ? <Check className="mt-0.5 size-4 shrink-0 text-primary" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />}<span><span className="block font-medium">{check.label}</span><span className="mt-1 block leading-4 text-muted-foreground">{check.complete ? "Complete" : check.missing}</span></span></a>)}</div>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button type="button" disabled={!complete}><LockKeyhole className="size-4" />Activate and continue</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Activate {protocol.version}?</DialogTitle><DialogDescription>You reviewed the complete A-F preview above. {protocol.protocolCode} will become active and this exact version will be locked from further editing. You will continue to assignment scheduling.</DialogDescription></DialogHeader><div className="rounded-md border border-border bg-secondary/25 p-3 text-xs"><p className="font-medium">{protocol.title}</p><p className="mt-1 text-muted-foreground">{protocol.isolatedVariable}: {protocol.testerAValue} compared with {protocol.testerBValue}</p></div><DialogFooter><DialogClose asChild><Button variant="outline" disabled={pending}>Cancel</Button></DialogClose><Button type="button" onClick={activate} disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <LockKeyhole className="size-4" />}{pending ? "Activating..." : "Activate and open assignments"}</Button></DialogFooter></DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
