"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { confirmScreenshotCandidatesAction } from "@/app/paired-testing-demo/assignments/[assignmentId]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ScreenshotCandidate, ScreenshotCandidateSelections, ScreenshotCandidateType, ScreenshotValidationResult } from "@/lib/screenshot-ocr/schemas";

type RequiredScreenshotCandidateType = Exclude<ScreenshotCandidateType, "battery">;

const steps: Array<{ type: RequiredScreenshotCandidateType; title: string; instruction: string }> = [
  { type: "ride_card", title: "Selected ride", instruction: "Choose the complete ride card that is visibly selected in the app. Do not choose another ride tier shown above or below it." },
  { type: "fare", title: "Displayed fare", instruction: "Choose the fare inside the ride card selected in Step 1. Do not choose another ride's fare, a promotion, wallet balance, or fee." },
  { type: "time", title: "Screenshot time", instruction: "Choose the phone time in the top status bar. Do not choose an arrival estimate such as “7 minutes away.”" },
];

function selectionKey(type: RequiredScreenshotCandidateType): keyof ScreenshotCandidateSelections {
  return type === "ride_card" ? "rideCardCandidateId" : type === "fare" ? "fareCandidateId" : "timeCandidateId";
}

function fareIsInsideRide(fare: ScreenshotCandidate, ride: ScreenshotCandidate) {
  const center = { x: fare.bounds.x + fare.bounds.width / 2, y: fare.bounds.y + fare.bounds.height / 2 };
  return center.x >= ride.bounds.x - 0.03 && center.x <= ride.bounds.x + ride.bounds.width + 0.03
    && center.y >= ride.bounds.y - 0.03 && center.y <= ride.bounds.y + ride.bounds.height + 0.03;
}

export function ScreenshotCandidateModal({ open, onOpenChange, imageUrl, validation, expectedService, onConfirmed }: { open: boolean; onOpenChange: (open: boolean) => void; imageUrl: string; validation: ScreenshotValidationResult; expectedService: string; onConfirmed: (result: ScreenshotValidationResult) => void }) {
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Partial<ScreenshotCandidateSelections>>(validation.selectedCandidates ?? {});
  const [pending, startTransition] = useTransition();
  // The review screen uses step === steps.length, so always keep a valid
  // active selection step for the preview and memoized candidate list.
  const current = steps[Math.min(step, steps.length - 1)];
  const candidates = useMemo(() => validation.candidates.filter((candidate) => candidate.type === current.type), [current.type, validation.candidates]);
  const selectedId = selections[selectionKey(current.type)];
  const selectedCandidate = candidates.find((candidate) => candidate.id === selectedId);
  const selectedRide = validation.candidates.find((candidate) => candidate.id === selections.rideCardCandidateId && candidate.type === "ride_card");
  function candidateIsInvalid(candidate: ScreenshotCandidate) {
    if (current.type === "ride_card") return Boolean(candidate.platformServiceId && candidate.platformServiceId !== validation.expectedPlatformServiceId);
    if (current.type === "fare") return Boolean(selectedRide && !fareIsInsideRide(candidate, selectedRide));
    return candidate.validationStatus === "invalid";
  }
  const selectedInvalid = selectedCandidate ? candidateIsInvalid(selectedCandidate) : false;
  const selectedInvalidMessage = current.type === "ride_card"
    ? `Detected ${selectedCandidate?.displayValue ?? "ride"}, but this assignment requires ${expectedService}.`
    : current.type === "fare"
      ? "This fare is not inside the selected ride card and may belong to another ride or screen element."
      : selectedCandidate?.validationMessage || "This screenshot time is outside the current test attempt.";

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) {
      setStep(0);
      setSelections(validation.selectedCandidates ?? {});
    }
    onOpenChange(nextOpen);
  }

  function choose(candidate: ScreenshotCandidate) {
    setSelections((value) => ({ ...value, [selectionKey(current.type)]: candidate.id }));
  }

  function confirm() {
    if (!selections.rideCardCandidateId || !selections.fareCandidateId || !selections.timeCandidateId) return;
    startTransition(async () => {
      const result = await confirmScreenshotCandidatesAction(validation.validationId, selections as ScreenshotCandidateSelections);
      if (!result.ok || !result.validation) { toast.error(result.message); return; }
      onConfirmed(result.validation);
      changeOpen(false);
    });
  }

  const summary = steps.map((item) => ({ ...item, candidate: validation.candidates.find((candidate) => candidate.id === selections[selectionKey(item.type)]) }));
  return <Dialog open={open} onOpenChange={pending ? undefined : changeOpen}>
    <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-5xl">
      <DialogHeader className="pr-8"><DialogTitle>Step 2 of 5 · Confirm screenshot details</DialogTitle><DialogDescription>The system detected possible values from your screenshot. You must identify the correct evidence before continuing.</DialogDescription></DialogHeader>
      <div className="rounded-md border border-primary/30 bg-primary/[0.05] p-3 text-xs leading-5"><p className="font-semibold text-primary">How to select a value</p><p className="mt-1 text-muted-foreground">Click a highlighted box directly on the screenshot, or click its detected value on the right. Confirm one value for each step. OCR values cannot be typed or edited.</p></div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)]">
        <div className="max-h-[68vh] overflow-auto rounded-md border border-border bg-black/30 p-2">
          <div className="relative mx-auto w-full max-w-xl">
            {/* The uploaded file remains local in this modal; the stored evidence is the authoritative copy. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Uploaded quote screenshot with selectable OCR boxes" className="block h-auto w-full" />
            <svg className="absolute inset-0 size-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label={`Selectable ${current.title.toLowerCase()} boxes`}>
              {candidates.map((candidate) => <rect key={candidate.id} x={candidate.bounds.x} y={candidate.bounds.y} width={candidate.bounds.width} height={candidate.bounds.height} onClick={() => choose(candidate)} role="button" tabIndex={0} className={`cursor-pointer fill-current stroke-current [vector-effect:non-scaling-stroke] ${selectedId === candidate.id ? candidateIsInvalid(candidate) ? "text-red-400/25" : "text-primary/25" : "text-sky-400/10 hover:text-sky-300/20"}`} strokeWidth={selectedId === candidate.id ? 4 : 2} />)}
            </svg>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">{steps.map((item, index) => <Badge key={item.type} variant={index === step ? "default" : index < step ? "secondary" : "outline"}>{index + 1}. {item.title}</Badge>)}</div>
          {step < steps.length ? <>
            <div><p className="text-sm font-semibold">{current.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{current.instruction}</p>{current.type === "ride_card" ? <p className="mt-2 text-xs">Required by assignment: <span className="font-medium text-primary">{expectedService}</span></p> : null}</div>
            <div className="space-y-2">{candidates.map((candidate) => { const invalid = candidateIsInvalid(candidate); return <button key={candidate.id} type="button" onClick={() => choose(candidate)} className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs ${selectedId === candidate.id ? invalid ? "border-red-400 bg-red-400/10" : "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}><span className="min-w-0 truncate">{candidate.displayValue}</span>{selectedId === candidate.id ? <span className={`flex items-center gap-1 font-medium ${invalid ? "text-red-300" : "text-primary"}`}><Check className="size-4 shrink-0" />{invalid ? "Invalid" : "Selected"}</span> : <span className="text-muted-foreground">Choose</span>}</button>; })}</div>
            {selectedInvalid ? <div className="rounded-md border border-red-400/40 bg-red-400/[0.06] p-3 text-xs text-red-200"><p className="font-semibold">Invalid {current.title.toLowerCase()}</p><p className="mt-1 leading-5">{selectedInvalidMessage} Choose another valid detected value. If none is correct, repeat the test and replace both the screenshot and screen recording.</p></div> : null}
            {!candidates.length ? <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200"><p className="font-semibold">Required evidence was not detected</p><p className="mt-1 leading-5">The correct {current.title.toLowerCase()} is missing or unreadable. Close this review, repeat the test, and replace both the screenshot and screen recording. Required values cannot be entered manually.</p></div> : null}
            <div className="rounded-md border border-border p-3 text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">None of the choices is correct?</span> Close this review, repeat the test, and replace both the screenshot and screen recording.</div>
            <div className="flex justify-between border-t border-border pt-4"><Button variant="outline" onClick={() => step === 0 ? changeOpen(false) : setStep((value) => value - 1)}>{step === 0 ? "Close review" : "Back"}</Button><Button disabled={!selectedId || selectedInvalid} onClick={() => step === steps.length - 1 ? setStep(steps.length) : setStep((value) => value + 1)}>{step === 0 ? "Confirm selected ride" : step === 1 ? "Confirm fare" : "Confirm screenshot time"}</Button></div>
          </> : <>
            <div><p className="text-sm font-semibold">Review selections</p><p className="mt-1 text-xs text-muted-foreground">These values come only from the selected OCR boxes.</p></div>
            <div className="divide-y divide-border rounded-md border border-border">{summary.map((item) => <div key={item.type} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"><span className="text-muted-foreground">{item.title}</span><span className="font-medium">{item.candidate?.displayValue ?? "Missing"}</span></div>)}</div>
            <div className="flex justify-between border-t border-border pt-4"><Button variant="outline" disabled={pending} onClick={() => setStep(steps.length - 1)}>Back</Button><Button disabled={pending} onClick={confirm}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? "Confirming..." : "Confirm screenshot"}</Button></div>
          </>}
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
