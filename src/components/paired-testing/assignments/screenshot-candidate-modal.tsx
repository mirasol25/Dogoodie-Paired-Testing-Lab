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
  { type: "ride_card", title: "Selected ride", instruction: "Choose the box containing the ride card selected in the app." },
  { type: "fare", title: "Displayed fare", instruction: "Choose the fare shown inside that selected ride card." },
  { type: "time", title: "Screenshot time", instruction: "Choose the time displayed in the phone status bar." },
];

function selectionKey(type: RequiredScreenshotCandidateType): keyof ScreenshotCandidateSelections {
  return type === "ride_card" ? "rideCardCandidateId" : type === "fare" ? "fareCandidateId" : "timeCandidateId";
}

export function ScreenshotCandidateModal({ open, onOpenChange, imageUrl, validation, expectedService, onConfirmed }: { open: boolean; onOpenChange: (open: boolean) => void; imageUrl: string; validation: ScreenshotValidationResult; expectedService: string; onConfirmed: (result: ScreenshotValidationResult) => void }) {
  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<Partial<ScreenshotCandidateSelections>>({});
  const [pending, startTransition] = useTransition();
  // The review screen uses step === steps.length, so always keep a valid
  // active selection step for the preview and memoized candidate list.
  const current = steps[Math.min(step, steps.length - 1)];
  const candidates = useMemo(() => validation.candidates.filter((candidate) => candidate.type === current.type), [current.type, validation.candidates]);
  const selectedId = selections[selectionKey(current.type)];

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) {
      setStep(0);
      setSelections({});
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
      <DialogHeader className="pr-8"><DialogTitle>Confirm detected screenshot details</DialogTitle><DialogDescription>Select the OCR box that contains each required value. Values cannot be typed or edited.</DialogDescription></DialogHeader>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)]">
        <div className="max-h-[68vh] overflow-auto rounded-md border border-border bg-black/30 p-2">
          <div className="relative mx-auto w-full max-w-xl">
            {/* The uploaded file remains local in this modal; the stored evidence is the authoritative copy. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Uploaded quote screenshot with selectable OCR boxes" className="block h-auto w-full" />
            <svg className="absolute inset-0 size-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-label={`Selectable ${current.title.toLowerCase()} boxes`}>
              {candidates.map((candidate) => <rect key={candidate.id} x={candidate.bounds.x} y={candidate.bounds.y} width={candidate.bounds.width} height={candidate.bounds.height} onClick={() => choose(candidate)} role="button" tabIndex={0} className={`cursor-pointer fill-current stroke-current [vector-effect:non-scaling-stroke] ${selectedId === candidate.id ? "text-primary/25" : "text-sky-400/10 hover:text-sky-300/20"}`} strokeWidth={selectedId === candidate.id ? 4 : 2} />)}
            </svg>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">{steps.map((item, index) => <Badge key={item.type} variant={index === step ? "default" : index < step ? "secondary" : "outline"}>{index + 1}. {item.title}</Badge>)}</div>
          {step < steps.length ? <>
            <div><p className="text-sm font-semibold">{current.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{current.instruction}</p>{current.type === "ride_card" ? <p className="mt-2 text-xs">Required by assignment: <span className="font-medium text-primary">{expectedService}</span></p> : null}</div>
            <div className="space-y-2">{candidates.map((candidate) => <button key={candidate.id} type="button" onClick={() => choose(candidate)} className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-xs ${selectedId === candidate.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}><span className="min-w-0 truncate">{candidate.displayValue}</span>{selectedId === candidate.id ? <Check className="size-4 shrink-0 text-primary" /> : null}</button>)}</div>
            {!candidates.length ? <div className="rounded-md border border-amber-400/30 bg-amber-400/5 p-3 text-xs text-amber-200">No usable box was detected for this value. Close this review and upload a clearer full-screen screenshot.</div> : null}
            <div className="flex justify-between border-t border-border pt-4"><Button variant="outline" onClick={() => step === 0 ? changeOpen(false) : setStep((value) => value - 1)}>{step === 0 ? "Close" : "Back"}</Button><Button disabled={!selectedId} onClick={() => step === steps.length - 1 ? setStep(steps.length) : setStep((value) => value + 1)}>Continue</Button></div>
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
