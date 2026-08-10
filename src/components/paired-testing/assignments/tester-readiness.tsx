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
    return [
      `I am using ${ownSlot.platformName ?? "the assigned provider"} - ${ownSlot.serviceName ?? "the assigned ride tier"}.`,
      `My assigned condition is ${ownSlot.protocolValue ?? "the condition shown above"}.`,
      `My route is ${assignment.pickup_location} to ${assignment.destination_location}.`,
      ...technicalControls.map((label) => `${label} matches the assignment requirements.`),
      "I will wait for the coordinated start cue before requesting the quote.",
    ];
  }, [assignment, ownSlot]);
  const [checked, setChecked] = useState<string[]>([]);
  const ready = ownSlot.status === "ready";
  const bothReady = ready && (partnerSlot?.status === "ready" || partnerSlot?.status === "in_progress");

  if (ready) return <section className="rounded-md border border-primary/25 bg-primary/[0.025] p-4"><div className="flex items-start gap-3"><div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><Check className="size-4" /></div><div><h2 className="text-sm font-semibold">{bothReady ? "Both testers are ready" : "You are ready"}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{bothReady ? "The synchronized start control is available below." : "Waiting for the partner tester to confirm readiness."}</p></div></div></section>;

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

  return <section className="space-y-5 border-y border-border py-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] uppercase text-primary">Your next action</p><h2 className="mt-1.5 text-lg font-semibold">Confirm your assignment</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">Verify each condition before the testing window. Screenshot and screen-recording preparation happens immediately before you start.</p></div><div className="min-w-24 text-right"><p className="numeric text-2xl font-semibold text-primary">{checked.length}/{checklist.length}</p><p className="text-[10px] uppercase text-muted-foreground">Confirmed</p></div></div><div className="divide-y divide-border overflow-hidden rounded-md border border-border">{checklist.map((item) => { const selected = checked.includes(item); return <label key={item} className={`flex min-h-14 cursor-pointer items-start gap-3 px-4 py-4 text-sm leading-6 transition-colors ${selected ? "bg-primary/[0.055]" : "hover:bg-secondary/30"}`}><Checkbox className="mt-0.5" checked={selected} onCheckedChange={(value) => setChecked((current) => value === true ? [...current, item] : current.filter((entry) => entry !== item))} /><span className={selected ? "text-foreground" : "text-muted-foreground"}>{item}</span></label>; })}</div><div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-md border border-border bg-background/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-muted-foreground">{complete ? "All conditions are confirmed. Continue when you are ready." : `${checklist.length - checked.length} condition${checklist.length - checked.length === 1 ? "" : "s"} remaining.`}</p><Button className="w-full sm:w-auto" onClick={confirm} disabled={!complete || pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? "Confirming..." : "Confirm ready"}</Button></div></section>;
}
