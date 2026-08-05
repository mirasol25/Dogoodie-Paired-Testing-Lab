"use client";

import { CheckCircle2, Flag, LoaderCircle, RotateCcw, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveExpertReviewAction } from "@/app/paired-testing-demo/pairs/[pairId]/actions";
import { StatusBadge } from "@/components/paired-testing/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ExpertReview } from "@/lib/data/matched-pairs";

const reasons = ["Controls satisfied", "Technical warning reviewed", "Follow-up required", "Exclusion condition met", "Insufficient evidence", "Other methodology concern"];

export function ExpertReviewPanel({ pairId, review, canReview }: { pairId: string; review: ExpertReview | null; canReview: boolean }) {
  const [reason, setReason] = useState(review?.reason ?? "");
  const [note, setNote] = useState(review?.note ?? "");
  const [pending, startTransition] = useTransition();

  function decide(status: "pending" | "accepted" | "flagged" | "rejected") {
    if (status !== "pending" && !reason) return toast.error("Select a decision reason.");
    if (["flagged", "rejected"].includes(status) && note.trim().length < 10) return toast.error("Flagged and rejected decisions require a reviewer note of at least 10 characters.");
    startTransition(async () => {
      const result = await saveExpertReviewAction(pairId, status, reason, note);
      if (result.ok) {
        toast.success(result.message);
        if (status === "pending") { setReason(""); setNote(""); }
      } else toast.error(result.message);
    });
  }

  return <section className="h-full overflow-hidden rounded-md border border-border bg-card/25">
    <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border bg-card/35 px-4 py-3"><div><p className="text-[10px] uppercase text-muted-foreground">Human assessment</p><h2 className="mt-1 text-sm font-semibold">Expert review</h2></div><StatusBadge status={review?.status ?? "pending"} /></div>
    {canReview ? <div className="space-y-4 p-4">
      <div><label className="text-xs font-medium">Decision reason <span className="text-primary">Required</span></label><Select value={reason} onValueChange={setReason} disabled={pending}><SelectTrigger className="mt-2 h-10 w-full bg-background/40"><SelectValue placeholder="Select the primary reason" /></SelectTrigger><SelectContent>{reasons.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      <div><div className="flex items-center justify-between gap-3"><label htmlFor="review-note" className="text-xs font-medium">Reviewer note</label><span className="text-[10px] text-muted-foreground">{note.length}/2000</span></div><Textarea id="review-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add methodology context or follow-up requirements..." className="mt-2 min-h-24 resize-y bg-background/40" maxLength={2000} disabled={pending} /><p className="mt-1.5 text-[10px] leading-4 text-muted-foreground">Required when flagging or rejecting a pair.</p></div>
      <div className="space-y-2 border-t border-border pt-4">
        <Button className="w-full" onClick={() => decide("accepted")} disabled={pending}><CheckCircle2 className="size-4" />Accept pair</Button>
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" className="border-amber-400/35 text-amber-300 hover:bg-amber-400/10 hover:text-amber-200" onClick={() => decide("flagged")} disabled={pending}><Flag className="size-4" />Flag</Button><Button variant="outline" className="border-red-400/30 text-red-300 hover:bg-red-400/10 hover:text-red-200" onClick={() => decide("rejected")} disabled={pending}><XCircle className="size-4" />Reject</Button></div>
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => decide("pending")} disabled={pending || !review || review.status === "pending"}>{pending ? <LoaderCircle className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}Clear decision</Button>
      </div>
    </div> : review ? <div className="space-y-4 p-4 text-xs"><div><p className="text-muted-foreground">Decision reason</p><p className="mt-1.5 font-medium">{review.reason}</p></div>{review.note ? <div className="border-t border-border pt-4"><p className="text-muted-foreground">Reviewer note</p><p className="mt-1.5 whitespace-pre-wrap leading-5">{review.note}</p></div> : null}</div> : <p className="p-4 text-xs leading-5 text-muted-foreground">This pair has not been reviewed yet.</p>}
  </section>;
}
