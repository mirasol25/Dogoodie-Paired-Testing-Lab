"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { confirmReadyAction } from "@/app/paired-testing-demo/assignments/[assignmentId]/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { AssignmentSummary, AssignmentTesterSummary } from "@/lib/data/assignments";
import type { Json } from "@/types/database.types";

function labelsFromJson(value: Json): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => entry && typeof entry === "object" && !Array.isArray(entry) && typeof entry.label === "string" ? [entry.label] : []);
}

export function TesterReadiness({ assignment, ownSlot, partnerSlot }: { assignment: AssignmentSummary; ownSlot: AssignmentTesterSummary; partnerSlot?: AssignmentTesterSummary }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const checklist = useMemo(() => {
    const technicalControls = labelsFromJson(assignment.protocolFixedControls).filter((label) => !["Provider", "Exact ride tier", "Pickup location", "Destination location"].includes(label));
    const evidence = labelsFromJson(assignment.protocolEvidenceRequirements);
    return [
      `I am using ${ownSlot.platformName ?? "the assigned provider"} - ${ownSlot.serviceName ?? "the assigned ride tier"}.`,
      `My assigned condition is ${ownSlot.protocolValue ?? "the condition shown above"}.`,
      `My route is ${assignment.pickup_location} to ${assignment.destination_location}.`,
      ...technicalControls.map((label) => `${label} matches the assignment requirements.`),
      ...evidence.map((label) => `${label} capture is ready.`),
      "I will wait for the coordinated start cue before requesting the quote.",
    ];
  }, [assignment, ownSlot]);
  const [checked, setChecked] = useState<string[]>([]);
  const ready = ownSlot.status === "ready";
  const bothReady = ready && (partnerSlot?.status === "ready" || partnerSlot?.status === "in_progress");

  if (ready) return <section className="rounded-md border border-primary/25 bg-primary/[0.025] p-4"><div className="flex items-start gap-3"><div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Check className="size-4" /></div><div><h2 className="text-sm font-semibold">{bothReady ? "Both testers are ready" : "You are ready"}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{bothReady ? "The synchronized start control is available below." : `Waiting for ${partnerSlot?.displayName ?? "the partner tester"} to confirm readiness.`}</p></div></div></section>;

  if (ownSlot.status !== "assigned" || assignment.status !== "not_started") return null;
  const complete = checked.length === checklist.length;

  function confirm() {
    if (!complete) return;
    startTransition(async () => {
      const result = await confirmReadyAction(assignment.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return <section className="space-y-4 border-t border-border pt-5"><div><p className="text-[10px] uppercase text-muted-foreground">Tester readiness</p><h2 className="mt-1.5 text-base font-semibold">Pre-test checklist</h2></div><div className="divide-y divide-border overflow-hidden rounded-md border border-border">{checklist.map((item) => <label key={item} className="flex min-h-12 cursor-pointer items-start gap-3 px-4 py-3 text-xs leading-5 hover:bg-secondary/30"><Checkbox className="mt-0.5" checked={checked.includes(item)} onCheckedChange={(value) => setChecked((current) => value === true ? [...current, item] : current.filter((entry) => entry !== item))} /><span>{item}</span></label>)}</div><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{checked.length} of {checklist.length} confirmed</p><Button onClick={confirm} disabled={!complete || pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : null}{pending ? "Confirming..." : "Confirm ready"}</Button></div></section>;
}
