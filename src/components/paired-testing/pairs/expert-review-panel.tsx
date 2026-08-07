"use client";

import { AlertTriangle, CheckCircle2, LoaderCircle, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveExpertReviewAction } from "@/app/paired-testing-demo/pairs/[pairId]/actions";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ExpertReview } from "@/lib/data/matched-pairs";

type Decision = "accepted" | "exception" | "rejected";

const reasonOptions: Record<Decision, string[]> = {
  accepted: ["Controls satisfied", "Technical warning reviewed", "Exclusion condition reviewed", "Other methodology basis"],
  exception: ["Technical validation exception", "Location exception", "Timing exception", "Evidence exception", "Other documented exception"],
  rejected: ["Insufficient evidence", "Required control failed", "Location requirement failed", "Timing requirement failed", "Evidence integrity concern", "Other exclusion basis"],
};

const decisionCopy: Record<Decision, { title: string; description: string; button: string; icon: typeof CheckCircle2; className: string }> = {
  accepted: { title: "Accept", description: "The pair will count toward the study target when its required evidence is complete.", button: "Accept pair", icon: CheckCircle2, className: "border-primary/45 bg-primary/[0.08] text-primary" },
  exception: { title: "Exception", description: "The pair will count with a documented technical exception and complete required evidence.", button: "Accept with technical exception", icon: AlertTriangle, className: "border-amber-400/45 bg-amber-400/[0.08] text-amber-200" },
  rejected: { title: "Reject", description: "The pair is excluded from the target and a replacement paired test is needed.", button: "Reject pair", icon: XCircle, className: "border-red-400/45 bg-red-400/[0.08] text-red-200" },
};

function currentDecision(review: ExpertReview | null): Decision | null {
  if (!review || review.status === "pending") return null;
  return review.status === "rejected" ? "rejected" : review.technical_exception ? "exception" : "accepted";
}

export function ExpertReviewPanel({ pairId, review, canReview, technicalStatus, evidenceStatus }: { pairId: string; review: ExpertReview | null; canReview: boolean; technicalStatus: string; evidenceStatus: string }) {
  const [reason, setReason] = useState(review?.reason ?? "");
  const [note, setNote] = useState(review?.note ?? "");
  const [decision, setDecision] = useState<Decision | null>(() => currentDecision(review));
  const [pending, startTransition] = useTransition();
  const selected = decision ? decisionCopy[decision] : null;
  const requiresNote = decision === "exception" || decision === "rejected";
  const normalAcceptBlocked = technicalStatus === "invalid";
  const availableReasons = decision ? [...reasonOptions[decision], ...(reason && !reasonOptions[decision].includes(reason) ? [reason] : [])] : [];

  function choose(next: Decision) {
    if (next === "accepted" && normalAcceptBlocked) return;
    setDecision(next);
    setReason((current) => reasonOptions[next].includes(current) ? current : "");
  }

  function saveDecision() {
    if (!decision) return toast.error("Choose an expert review outcome.");
    if (!reason) return toast.error("Select a decision reason.");
    if (decision === "rejected" && note.trim().length < 10) return toast.error("Rejected decisions require a reviewer note of at least 10 characters.");
    if (decision === "exception" && note.trim().length < 20) return toast.error("Accepting with a technical exception requires a detailed reviewer note of at least 20 characters.");
    const status = decision === "rejected" ? "rejected" : "accepted";
    startTransition(async () => {
      const result = await saveExpertReviewAction(pairId, status, reason, note, decision === "exception");
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  function clearDecision() {
    startTransition(async () => {
      const result = await saveExpertReviewAction(pairId, "pending", "", "");
      if (result.ok) {
        setDecision(null);
        setReason("");
        setNote("");
        toast.success(result.message);
      } else toast.error(result.message);
    });
  }

  return <section className="overflow-hidden rounded-md border border-border bg-card/25">
    <div className="border-b border-border bg-card/35 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[10px] uppercase text-muted-foreground">Human assessment</p><h2 className="mt-1 text-sm font-semibold">Expert review</h2></div>
        <StatusBadge status={review?.technical_exception ? "technical exception" : review?.status ?? "pending"} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
        <ReviewFact label="Technical" status={technicalStatus} />
        <ReviewFact label="Evidence" status={evidenceStatus} />
      </div>
    </div>
    {canReview ? <div className="p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)] lg:items-start">
        <div>
          <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-medium">Review outcome</p><p className="mt-1 text-[11px] text-muted-foreground">Choose the final handling for this pair.</p></div><span className="text-[10px] text-muted-foreground">Step 1 of 2</span></div>
          <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Review outcome">
            {(Object.keys(decisionCopy) as Decision[]).map((item) => {
              const option = decisionCopy[item];
              const Icon = option.icon;
              const active = decision === item;
              const disabled = pending || (item === "accepted" && normalAcceptBlocked);
              return <button key={item} type="button" onClick={() => choose(item)} disabled={disabled} aria-pressed={active} aria-describedby={item === "accepted" && normalAcceptBlocked ? "normal-accept-disabled" : undefined} className={`flex h-16 flex-col items-center justify-center gap-1 rounded-md border text-center transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${active ? option.className : "border-border bg-background/20 text-foreground hover:bg-secondary/45"}`}><Icon className={`size-4 ${active ? "" : "text-muted-foreground"}`} /><span className="text-[11px] font-semibold">{option.title}</span></button>;
            })}
          </div>
          {normalAcceptBlocked ? <p id="normal-accept-disabled" className="mt-2 text-[10px] leading-4 text-amber-300">Normal acceptance is unavailable because technical validation is invalid. Use a documented exception or reject this pair.</p> : null}
          {selected ? <SelectedOutcome option={selected} /> : <p className="mt-2 text-[10px] leading-4 text-muted-foreground">Select an outcome to configure its decision details.</p>}
        </div>
        <div className="rounded-md border border-border bg-background/[0.14] p-4">
          <div className="flex items-center justify-between gap-3"><p className="text-xs font-medium">Decision details</p><span className="text-[10px] text-muted-foreground">Step 2 of 2</span></div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><label className="text-xs font-medium">Decision reason <span className="text-primary">Required</span></label><Select value={reason} onValueChange={setReason} disabled={pending || !decision}><SelectTrigger className="mt-2 h-10 w-full bg-background/55"><SelectValue placeholder={decision ? `Select a reason for ${decision === "exception" ? "the exception" : decision}` : "Choose an outcome first"} /></SelectTrigger><SelectContent>{availableReasons.map((item) => <SelectItem key={item} value={item}>{item}{decision && !reasonOptions[decision].includes(item) ? " (previously recorded)" : ""}</SelectItem>)}</SelectContent></Select><p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">{decision ? `Reasons available for ${decision === "exception" ? "accepting with a technical exception" : decision}.` : "Select an outcome before choosing its reason."}</p></div>
            <div><div className="flex items-center justify-between gap-3"><label htmlFor="review-note" className="text-xs font-medium">Reviewer note {requiresNote ? <span className="text-primary">Required</span> : <span className="text-muted-foreground">Optional</span>}</label><span className="text-[10px] text-muted-foreground">{note.length}/2000</span></div><Textarea id="review-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder={decision === "exception" ? "Explain the technical issue and why this pair remains usable..." : decision === "rejected" ? "Explain why this pair cannot be used and requires replacement..." : "Optional methodology context..."} className="mt-2 min-h-24 resize-y bg-background/55" maxLength={2000} disabled={pending} /><p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">{decision === "exception" ? "At least 20 characters. The exception is retained with this review." : decision === "rejected" ? "At least 10 characters. This pair will not count toward the target." : "A note is optional for a standard acceptance."}</p></div>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-4"><Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearDecision} disabled={pending || !review || review.status === "pending"}>{pending ? <LoaderCircle className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}Clear decision</Button><Button className="min-w-48" onClick={saveDecision} disabled={pending || !selected || (decision === "accepted" && normalAcceptBlocked)}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : selected ? <selected.icon className="size-4" /> : <ShieldCheck className="size-4" />}{selected ? selected.button : "Choose outcome"}</Button></div>
    </div> : review ? <div className="space-y-4 p-4 text-xs"><div><p className="text-muted-foreground">Decision reason</p><p className="mt-1.5 font-medium">{review.reason}</p></div>{review.note ? <div className="border-t border-border pt-4"><p className="text-muted-foreground">Reviewer note</p><p className="mt-1.5 whitespace-pre-wrap leading-5">{review.note}</p></div> : null}</div> : <p className="p-4 text-xs leading-5 text-muted-foreground">This pair has not been reviewed yet.</p>}
  </section>;
}

function SelectedOutcome({ option }: { option: typeof decisionCopy[Decision] }) {
  const Icon = option.icon;
  return <div className={`mt-2 flex gap-2 rounded-md border px-3 py-2 ${option.className}`}><Icon className="mt-0.5 size-3.5 shrink-0" /><p className="text-[10px] leading-4">{option.description}</p></div>;
}

function ReviewFact({ label, status }: { label: string; status: string }) {
  return <div className="flex items-center gap-1.5"><span className="text-[9px] uppercase text-muted-foreground">{label}</span><StatusBadge status={status} className="px-1.5 py-0.5 text-[9px]" /></div>;
}
