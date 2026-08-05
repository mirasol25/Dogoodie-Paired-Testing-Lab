"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { startTestAction } from "@/app/paired-testing-demo/assignments/[assignmentId]/actions";
import { Button } from "@/components/ui/button";
import type { AssignmentSummary, AssignmentTesterSummary } from "@/lib/data/assignments";

export function TesterStart({ assignment, ownSlot, partnerSlot }: { assignment: AssignmentSummary; ownSlot: AssignmentTesterSummary; partnerSlot?: AssignmentTesterSummary }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState<Date | null>(null);
  const [started, setStarted] = useState(ownSlot.status === "in_progress");
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    const initial = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (countdown === null || countdown === 0) return;
    const timer = window.setTimeout(() => setCountdown((value) => value === null ? null : value - 1), 1_000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (countdown !== 0) return;
    const timer = window.setTimeout(() => router.refresh(), 1_200);
    return () => window.clearTimeout(timer);
  }, [countdown, router]);

  const partnerCleared = partnerSlot?.status === "ready" || partnerSlot?.status === "in_progress";
  if (!started && (ownSlot.status !== "ready" || !partnerCleared)) return null;
  const start = assignment.scheduled_start ? new Date(assignment.scheduled_start) : null;
  const end = assignment.scheduled_end ? new Date(assignment.scheduled_end) : null;
  const beforeWindow = Boolean(now && start && now < start);
  const afterWindow = Boolean(now && end && now > end);

  function begin() {
    startTransition(async () => {
      const result = await startTestAction(assignment.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setStarted(true);
      setCountdown(3);
    });
  }

  if (countdown !== null) return <section className="flex min-h-44 items-center justify-center rounded-md border border-primary/30 bg-primary/[0.025] p-6 text-center">{countdown > 0 ? <div><p className="numeric text-6xl font-semibold text-primary">{countdown}</p><p className="mt-3 text-xs text-muted-foreground">Prepare to request the quote</p></div> : <div><p className="text-xl font-semibold text-primary">Start</p><p className="mt-2 text-sm">Request and capture the assigned quote now.</p><p className="mt-2 text-xs text-muted-foreground">The assignment-specific submission form is the next workflow step.</p></div>}</section>;

  if (started) return <section className="rounded-md border border-primary/25 bg-primary/[0.025] p-4"><p className="text-sm font-semibold text-primary">Testing session in progress</p><p className="mt-1 text-xs text-muted-foreground">Request and capture the assigned quote. The submission workflow will open here next.</p></section>;

  return <section className="space-y-4 rounded-md border border-primary/25 bg-primary/[0.025] p-4"><div><p className="text-[10px] uppercase text-muted-foreground">Synchronized start</p><h2 className="mt-1.5 text-base font-semibold">Both testers are ready</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Use the approved call or chat cue, then start the local countdown.</p></div><Button onClick={begin} disabled={!now || beforeWindow || afterWindow || pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : null}{pending ? "Starting..." : beforeWindow ? "Testing window has not opened" : afterWindow ? "Testing window has closed" : "Start test"}</Button></section>;
}
