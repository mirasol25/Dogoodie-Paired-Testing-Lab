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

  const asynchronousTesting = ownSlot.testingSynchronization === "asynchronous";
  const partnerCleared = asynchronousTesting || partnerSlot?.status === "ready" || partnerSlot?.status === "in_progress" || partnerSlot?.status === "submitted";
  if (!started && (ownSlot.status !== "ready" || !partnerCleared)) return null;
  const start = ownSlot.scheduledStart ? new Date(ownSlot.scheduledStart) : assignment.scheduled_start ? new Date(assignment.scheduled_start) : null;
  const end = ownSlot.scheduledEnd ? new Date(ownSlot.scheduledEnd) : assignment.scheduled_end ? new Date(assignment.scheduled_end) : null;
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

  if (countdown !== null) return <section className="flex min-h-52 items-center justify-center rounded-md border border-primary/30 bg-primary/[0.025] p-6 text-center">{countdown > 0 ? <div><p className="numeric text-6xl font-semibold text-primary">{countdown}</p><p className="mt-3 text-base font-semibold">Start screen recording now</p><p className="mt-2 text-xs text-muted-foreground">Keep recording while you request and capture the quote.</p></div> : <div><p className="text-xl font-semibold text-primary">Request the quote now</p><p className="mt-2 text-sm">Keep the assigned ride tier selected, then take a full-screen screenshot showing its fare and the status-bar time.</p><p className="mt-2 text-xs text-muted-foreground">Do not book the ride. Stop and save the recording after capturing the screenshot.</p></div>}</section>;

  if (started) return <section className="rounded-md border border-primary/25 bg-primary/[0.025] p-4"><p className="text-sm font-semibold text-primary">Testing session in progress</p><p className="mt-1 text-xs text-muted-foreground">Request and capture the assigned quote. The submission workflow will open here next.</p></section>;

  return <section className="space-y-4 rounded-md border border-primary/25 bg-primary/[0.025] p-4"><div><p className="text-[10px] uppercase text-muted-foreground">{asynchronousTesting ? "Independent start" : "Synchronized start"}</p><h2 className="mt-1.5 text-base font-semibold">Required evidence</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">After starting the test, capture both required evidence files and keep them ready for upload.</p></div><div className="flex justify-end"><Button onClick={begin} disabled={!now || beforeWindow || afterWindow || pending}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : null}{pending ? "Starting..." : beforeWindow ? "Testing window has not opened" : afterWindow ? "Testing window has closed" : "Start test"}</Button></div></section>;
}
