"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock3, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { confirmReadyAction } from "@/app/paired-testing-demo/assignments/[assignmentId]/actions";
import { Button } from "@/components/ui/button";
import type { AssignmentSummary, AssignmentTesterSummary } from "@/lib/data/assignments";
import { createClient } from "@/lib/supabase/client";

function countdownLabel(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
}

export function TesterReadiness({ assignment, ownSlot, partnerSlot }: { assignment: AssignmentSummary; ownSlot: AssignmentTesterSummary; partnerSlot?: AssignmentTesterSummary }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState<number | null>(null);
  const startsAt = new Date(ownSlot.scheduledStart ?? assignment.scheduled_start ?? 0).getTime();
  const endsAt = new Date(ownSlot.scheduledEnd ?? assignment.scheduled_end ?? 0).getTime();

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!["assigned", "ready"].includes(ownSlot.status)) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`assignment-readiness:${assignment.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "assignment_testers",
        filter: `assignment_id=eq.${assignment.id}`,
      }, () => router.refresh())
      .subscribe();
    const fallback = window.setInterval(() => router.refresh(), 30_000);
    return () => {
      window.clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [assignment.id, ownSlot.status, router]);

  if (ownSlot.status === "in_progress" || ownSlot.status === "submitted") return null;
  const beforeWindow = now === null || !Number.isFinite(startsAt) || now < startsAt;
  const afterWindow = now !== null && Number.isFinite(endsAt) && now > endsAt;

  if (beforeWindow) return <section className="rounded-md border border-border bg-card/20 p-5 text-center">
    <Clock3 className="mx-auto size-5 text-primary" />
    <p className="mt-3 text-[10px] uppercase text-muted-foreground">Testing starts in</p>
    <p className="numeric mt-1 text-3xl font-semibold text-primary">{now === null || !Number.isFinite(startsAt) ? "--:--:--" : countdownLabel(startsAt - now)}</p>
    <p className="mt-3 text-sm font-medium">The testing window has not opened</p>
    <p className="mt-1 text-xs text-muted-foreground">Review your route, assigned service, and partner details above. Readiness and evidence controls will appear automatically.</p>
  </section>;

  if (ownSlot.status === "ready") return <section className="rounded-md border border-primary/30 bg-primary/[0.04] p-5">
    <div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Check className="size-4" /></div><div><h2 className="text-base font-semibold">You are ready</h2><p className="mt-1 text-sm text-muted-foreground">Your partner has been notified.</p><p className="mt-3 text-xs font-medium text-primary">Waiting for {partnerSlot?.displayName ?? "your partner"}...</p></div></div>
  </section>;

  if (afterWindow) return <section className="rounded-md border border-red-400/35 bg-red-400/[0.04] p-5"><h2 className="text-sm font-semibold">Testing window closed</h2><p className="mt-1 text-xs text-muted-foreground">Contact the study coordinator to reschedule this assignment.</p></section>;

  function notifyPartner() {
    startTransition(async () => {
      const result = await confirmReadyAction(assignment.id);
      if (!result.ok) { toast.error(result.message); return; }
      toast.success("You are marked as ready.");
      router.refresh();
    });
  }

  const partnerReady = partnerSlot?.status === "ready" || partnerSlot?.status === "in_progress" || partnerSlot?.status === "submitted";
  const partnerLabel = partnerSlot?.slot === "tester_a" ? "Tester A" : partnerSlot?.slot === "tester_b" ? "Tester B" : "Your partner";
  return <section className="rounded-md border border-primary/30 bg-primary/[0.035] p-5"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] uppercase text-primary">Testing window open</p><h2 className="mt-1.5 text-lg font-semibold">Ready to begin?</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Confirm that you are at the assigned pickup location, have the correct ride service available, and can begin now.</p>{partnerReady ? <p className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-primary"><Check className="size-3.5" />{partnerLabel} is ready</p> : <p className="mt-3 text-xs text-muted-foreground">{partnerLabel} has not marked themselves ready yet.</p>}</div><Button className="w-full sm:w-auto" onClick={notifyPartner} disabled={pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? "Marking ready..." : "I'm ready"}</Button></div></section>;
}
