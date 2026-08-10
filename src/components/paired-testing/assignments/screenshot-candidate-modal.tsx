"use client";

import { useMemo, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Crosshair, LoaderCircle, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { confirmScreenshotCandidatesAction, detectScreenshotTimeRegionAction } from "@/app/paired-testing-demo/assignments/[assignmentId]/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { NormalizedBounds, ScreenshotCandidate, ScreenshotCandidateSelections, ScreenshotCandidateType, ScreenshotValidationResult } from "@/lib/screenshot-ocr/schemas";

type RequiredType = Exclude<ScreenshotCandidateType, "battery">;

const fields: Array<{ type: RequiredType; title: string; color: string; fill: string }> = [
  { type: "ride_card", title: "Selected ride", color: "text-lime-300", fill: "text-lime-400/20" },
  { type: "fare", title: "Displayed fare", color: "text-cyan-300", fill: "text-cyan-400/20" },
  { type: "time", title: "Screenshot time", color: "text-amber-300", fill: "text-amber-400/20" },
];

function selectionKey(type: RequiredType): keyof ScreenshotCandidateSelections {
  return type === "ride_card" ? "rideCardCandidateId" : type === "fare" ? "fareCandidateId" : "timeCandidateId";
}

function fareIsInsideRide(fare: ScreenshotCandidate, ride: ScreenshotCandidate) {
  const center = { x: fare.bounds.x + fare.bounds.width / 2, y: fare.bounds.y + fare.bounds.height / 2 };
  return center.x >= ride.bounds.x - 0.03 && center.x <= ride.bounds.x + ride.bounds.width + 0.03
    && center.y >= ride.bounds.y - 0.03 && center.y <= ride.bounds.y + ride.bounds.height + 0.03;
}

function suggestedSelections(validation: ScreenshotValidationResult): Partial<ScreenshotCandidateSelections> {
  const saved = validation.selectedCandidates ?? {};
  const ride = validation.candidates.find((candidate) => candidate.id === saved.rideCardCandidateId)
    ?? validation.candidates.find((candidate) => candidate.type === "ride_card" && candidate.platformServiceId === validation.expectedPlatformServiceId);
  const fare = validation.candidates.find((candidate) => candidate.id === saved.fareCandidateId)
    ?? validation.candidates.find((candidate) => candidate.type === "fare" && ride && fareIsInsideRide(candidate, ride));
  const time = validation.candidates.find((candidate) => candidate.id === saved.timeCandidateId)
    ?? validation.candidates.find((candidate) => candidate.type === "time" && candidate.validationStatus !== "invalid");
  return {
    rideCardCandidateId: ride?.id,
    fareCandidateId: fare?.id,
    timeCandidateId: time?.id,
  };
}

export function ScreenshotCandidateModal({ open, onOpenChange, imageUrl, validation, expectedService, onConfirmed }: { open: boolean; onOpenChange: (open: boolean) => void; imageUrl: string; validation: ScreenshotValidationResult; expectedService: string; onConfirmed: (result: ScreenshotValidationResult) => void }) {
  const suggested = useMemo(() => suggestedSelections(validation), [validation]);
  const [candidates, setCandidates] = useState(validation.candidates);
  const [selections, setSelections] = useState<Partial<ScreenshotCandidateSelections>>(suggested);
  const [editing, setEditing] = useState<RequiredType | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawBounds, setDrawBounds] = useState<NormalizedBounds | null>(null);
  const [pending, startTransition] = useTransition();
  const [detecting, startDetection] = useTransition();

  const selected = useMemo(() => fields.map((field) => ({
    ...field,
    candidate: candidates.find((candidate) => candidate.id === selections[selectionKey(field.type)] && candidate.type === field.type),
  })), [candidates, selections]);
  const selectedRide = selected.find((field) => field.type === "ride_card")?.candidate;
  const choices = editing ? candidates.filter((candidate) => candidate.type === editing) : [];

  function isInvalid(candidate: ScreenshotCandidate) {
    if (candidate.type === "ride_card") return candidate.platformServiceId !== validation.expectedPlatformServiceId;
    if (candidate.type === "fare") return !selectedRide || !fareIsInsideRide(candidate, selectedRide);
    return candidate.type === "time" && candidate.validationStatus === "invalid";
  }

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen) {
      setSelections(suggested);
      setCandidates(validation.candidates);
      setEditing(null);
      setDrawing(false);
      setDrawBounds(null);
    }
    onOpenChange(nextOpen);
  }

  function choose(candidate: ScreenshotCandidate) {
    if (!editing || candidate.type !== editing || isInvalid(candidate)) return;
    setSelections((current) => {
      const next = { ...current, [selectionKey(editing)]: candidate.id };
      if (editing === "ride_card") {
        const currentFare = candidates.find((item) => item.id === current.fareCandidateId && item.type === "fare");
        if (!currentFare || !fareIsInsideRide(currentFare, candidate)) {
          next.fareCandidateId = candidates.find((item) => item.type === "fare" && fareIsInsideRide(item, candidate))?.id;
        }
      }
      return next;
    });
    setEditing(null);
  }

  function point(event: ReactPointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  }

  function beginDraw(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drawing || detecting) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = point(event);
    setDrawStart(start);
    setDrawBounds({ ...start, width: 0, height: 0 });
  }

  function continueDraw(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drawing || !drawStart) return;
    const current = point(event);
    setDrawBounds({ x: Math.min(drawStart.x, current.x), y: Math.min(drawStart.y, current.y), width: Math.abs(current.x - drawStart.x), height: Math.abs(current.y - drawStart.y) });
  }

  function finishDraw(event: ReactPointerEvent<SVGSVGElement>) {
    if (!drawing || !drawStart || !drawBounds) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDrawStart(null);
    if (drawBounds.width < 0.02 || drawBounds.height < 0.01) return toast.error("Draw a box around the complete status-bar time.");
    startDetection(async () => {
      const result = await detectScreenshotTimeRegionAction(validation.validationId, drawBounds);
      if (!result.ok || !result.candidate) { toast.error(result.message); return; }
      setCandidates((current) => [...current, result.candidate]);
      if (result.candidate.validationStatus === "invalid") {
        toast.error(result.candidate.validationMessage || "The highlighted time is outside this test attempt.");
        return;
      }
      setSelections((current) => ({ ...current, timeCandidateId: result.candidate.id }));
      setDrawing(false);
      setDrawBounds(null);
      setEditing(null);
      toast.success("Screenshot time detected from the highlighted area.");
    });
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

  const complete = selected.every((field) => field.candidate && !isInvalid(field.candidate));
  const editingField = fields.find((field) => field.type === editing);

  return <Dialog open={open} onOpenChange={pending ? undefined : changeOpen}>
    <DialogContent className="flex max-h-[96dvh] flex-col overflow-hidden p-0 sm:max-w-5xl">
      <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-12 sm:px-6 sm:py-4">
        <DialogTitle>Confirm screenshot details</DialogTitle>
        <DialogDescription>Compare the highlighted screenshot with the detected values below. Change only an incorrect value.</DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(220px,38dvh)_auto] overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)] lg:grid-rows-1 lg:overflow-hidden">
        <div className="relative min-h-0 overflow-auto border-b border-border bg-black/45 p-2 sm:p-3 lg:border-b-0 lg:border-r">
          <p className="sticky top-0 z-10 mx-auto mb-2 w-fit rounded-full border border-white/15 bg-black/80 px-3 py-1 text-[10px] text-white/80 lg:hidden">Scroll to inspect the full screenshot</p>
          <div className="relative mx-auto w-full max-w-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Uploaded quote screenshot with highlighted detected values" className="block h-auto w-full" />
            <svg className={`absolute inset-0 size-full touch-none ${drawing ? "cursor-crosshair" : ""}`} viewBox="0 0 1 1" preserveAspectRatio="none" aria-label="Detected screenshot values" onPointerDown={beginDraw} onPointerMove={continueDraw} onPointerUp={finishDraw}>
              {selected.flatMap((field) => field.candidate ? [<rect key={field.type} x={field.candidate.bounds.x} y={field.candidate.bounds.y} width={field.candidate.bounds.width} height={field.candidate.bounds.height} className={`pointer-events-none fill-current stroke-current [vector-effect:non-scaling-stroke] ${field.fill}`} strokeWidth={4} />] : [])}
              {editing ? choices.map((candidate) => <rect key={candidate.id} x={candidate.bounds.x} y={candidate.bounds.y} width={candidate.bounds.width} height={candidate.bounds.height} onClick={() => choose(candidate)} className={`cursor-pointer fill-current stroke-current [vector-effect:non-scaling-stroke] ${isInvalid(candidate) ? "text-red-400/10" : "text-white/10 hover:text-white/25"}`} strokeWidth={2} />) : null}
              {drawBounds ? <rect x={drawBounds.x} y={drawBounds.y} width={drawBounds.width} height={drawBounds.height} className="pointer-events-none fill-amber-300/15 stroke-amber-300 [vector-effect:non-scaling-stroke]" strokeWidth={3} /> : null}
            </svg>
          </div>
        </div>

        <div className="space-y-3 p-3 sm:p-4 lg:overflow-y-auto lg:p-5">
          <div className="rounded-md border border-primary/30 bg-primary/[0.05] px-3 py-2.5 text-xs leading-5">
            <p className="font-semibold text-primary">Detected from your screenshot</p>
            <p className="mt-0.5 text-muted-foreground">Each confirmed value stays linked to its highlighted OCR region.</p>
          </div>

          <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
            {selected.map((field) => <div key={field.type} className="grid grid-cols-[1fr_auto] items-center gap-3 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><span className={`size-2 shrink-0 rounded-full bg-current ${field.color}`} /><p className="text-[10px] uppercase text-muted-foreground">{field.title}</p></div>
                <p className="mt-1 break-words text-sm font-semibold">{field.candidate?.displayValue ?? "Not detected"}</p>
                {field.type === "ride_card" ? <p className="mt-1 text-[11px] text-muted-foreground">Required: {expectedService}</p> : null}
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(field.type)}><Pencil className="size-3.5" />Change</Button>
            </div>)}
          </div>

          {editing ? <div className="space-y-3 rounded-md border border-border p-3">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">Change {editingField?.title.toLowerCase()}</p><p className="mt-1 text-xs text-muted-foreground">Select a detected value below or tap its box in the screenshot.</p></div><Button type="button" size="icon-sm" variant="ghost" title="Cancel change" onClick={() => setEditing(null)}><RotateCcw className="size-4" /></Button></div>
            <div className="space-y-2">{choices.map((candidate) => { const invalid = isInvalid(candidate); return <button key={candidate.id} type="button" disabled={invalid} onClick={() => choose(candidate)} className="flex min-h-10 w-full items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-left text-xs enabled:hover:border-primary/60 disabled:cursor-not-allowed disabled:opacity-60"><span className="min-w-0"><span className="block truncate">{candidate.displayValue}</span>{invalid && candidate.validationMessage ? <span className="mt-1 block text-[10px] leading-4 text-red-200">{candidate.validationMessage}</span> : null}</span><span className="shrink-0 pt-0.5 text-muted-foreground">{invalid ? "Unavailable" : "Select"}</span></button>; })}</div>
            {!choices.length ? <p className="text-xs leading-5 text-amber-200">No value was detected. Replace the screenshot with a clearer full-screen image.</p> : choices.every(isInvalid) ? <p className="text-xs leading-5 text-amber-200">A value was detected, but it is outside the valid test attempt. Use a screenshot captured during the assigned window and upload it promptly.</p> : null}
            {editing === "time" ? <Button type="button" variant={drawing ? "default" : "outline"} className="w-full" disabled={detecting} onClick={() => { setDrawing((value) => !value); setDrawBounds(null); }}>{detecting ? <LoaderCircle className="size-4 animate-spin" /> : <Crosshair className="size-4" />}{detecting ? "Reading highlighted area..." : drawing ? "Drag over the time above" : "Highlight time on screenshot"}</Button> : null}
          </div> : null}

          {!complete ? <div className="rounded-md border border-amber-400/35 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-100"><p className="font-semibold">Some required values need attention</p><p className="mt-1">Choose a valid detected value. If none is available, close this review and replace the screenshot.</p></div> : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-background px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Button type="button" variant="outline" disabled={pending} onClick={() => changeOpen(false)}>Upload different screenshot</Button>
        <Button type="button" disabled={!complete || pending || editing !== null} onClick={confirm}>{pending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}{pending ? "Confirming..." : "Confirm detected values"}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
