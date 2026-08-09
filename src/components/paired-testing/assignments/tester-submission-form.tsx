"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { Check, CheckCircle2, Circle, LocateFixed, LoaderCircle, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { saveSubmissionDraftAction, submitObservationAction } from "@/app/paired-testing-demo/assignments/[assignmentId]/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AssignmentSummary, AssignmentTesterSummary, EvidenceRow, SubmissionRow } from "@/lib/data/assignments";
import type { Study } from "@/lib/data/studies";
import { submissionDraftClientSchema } from "@/lib/validation/submission-schemas";
import { EvidenceUploader } from "@/components/paired-testing/assignments/evidence-uploader";
import type { ScreenshotValidationResult } from "@/lib/screenshot-ocr/schemas";

interface Values { displayedFare: string; quoteTimestamp: string; latitude: string; longitude: string; networkType: string; appVersion: string; batteryPercentage: string; notes: string }

function storedDraftIsComplete(submission: SubmissionRow | null) {
  return Boolean(submission?.displayed_fare !== null && submission?.quote_timestamp && submission.latitude !== null && submission.longitude !== null
    && submission.network_type && submission.app_version && submission.battery_percentage !== null);
}

export function TesterSubmissionForm({ study, assignment, ownSlot, submission, technicalProfile, evidence, initialScreenshotValidation, screenshotPreviewUrl, timezone }: { study: Study; assignment: AssignmentSummary; ownSlot: AssignmentTesterSummary; submission: SubmissionRow | null; technicalProfile: Pick<SubmissionRow, "device_type" | "operating_system" | "operating_system_version" | "app_version"> | null; evidence: EvidenceRow[]; initialScreenshotValidation: ScreenshotValidationResult | null; screenshotPreviewUrl: string; timezone: string }) {
  const router = useRouter();
  const [savingDraft, startSaveDraft] = useTransition();
  const [submittingObservation, startSubmitObservation] = useTransition();
  const [locating, setLocating] = useState(false);
  const [saved, setSaved] = useState(() => storedDraftIsComplete(submission));
  const [submissionId, setSubmissionId] = useState<string | null>(submission?.id ?? null);
  const [submitReviewOpen, setSubmitReviewOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [evidenceState, setEvidenceState] = useState({ requiredComplete: false, mismatched: false });
  const [values, setValues] = useState<Values>({
    displayedFare: submission?.displayed_fare?.toString() ?? (initialScreenshotValidation?.selectionStatus === "confirmed" && initialScreenshotValidation.fare ? initialScreenshotValidation.fare.min.toFixed(2) : ""),
    quoteTimestamp: submission?.quote_timestamp ? formatInTimeZone(submission.quote_timestamp, timezone, "yyyy-MM-dd'T'HH:mm:ss") : initialScreenshotValidation?.selectionStatus === "confirmed" && initialScreenshotValidation.quoteTime.resolvedTimestamp ? formatInTimeZone(initialScreenshotValidation.quoteTime.resolvedTimestamp, timezone, "yyyy-MM-dd'T'HH:mm:ss") : "",
    latitude: submission?.latitude?.toString() ?? "",
    longitude: submission?.longitude?.toString() ?? "",
    networkType: submission?.network_type ?? "",
    appVersion: submission?.app_version ?? technicalProfile?.app_version ?? "",
    batteryPercentage: submission?.battery_percentage?.toString() ?? "",
    notes: submission?.notes ?? "",
  });
  const update = (field: keyof Values, value: string) => { setValues((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: "" })); setSaved(false); };

  function useLocation() {
    if (!navigator.geolocation) return toast.error("Location access is not available in this browser.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition((position) => {
      update("latitude", position.coords.latitude.toFixed(6));
      update("longitude", position.coords.longitude.toFixed(6));
      setLocating(false);
    }, () => { setLocating(false); toast.error("The current location could not be read."); }, { enableHighAccuracy: true, timeout: 10_000 });
  }

  function applyOCR(result: ScreenshotValidationResult) {
    setValues((current) => ({
      ...current,
      displayedFare: result.fare ? result.fare.min.toFixed(2) : current.displayedFare,
      quoteTimestamp: result.quoteTime.resolvedTimestamp ? formatInTimeZone(result.quoteTime.resolvedTimestamp, timezone, "yyyy-MM-dd'T'HH:mm:ss") : current.quoteTimestamp,
    }));
    setSaved(false);
  }

  const handleEvidenceState = useCallback((next: { requiredComplete: boolean; mismatched: boolean }) => setEvidenceState(next), []);

  function save() {
    const numberValue = (value: string) => value.trim() ? Number(value) : Number.NaN;
    const input = {
      assignmentId: assignment.id,
      latitude: numberValue(values.latitude), longitude: numberValue(values.longitude), networkType: values.networkType,
      appVersion: values.appVersion, batteryPercentage: numberValue(values.batteryPercentage), notes: values.notes,
    };
    const parsed = submissionDraftClientSchema.safeParse(input);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => { next[String(issue.path[0])] ??= issue.message; });
      setErrors(next);
      return;
    }
    startSaveDraft(async () => {
      const result = await saveSubmissionDraftAction(parsed.data);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setSaved(true);
      setSubmissionId(result.submissionId ?? submissionId);
      toast.success(result.message);
    });
  }

  function submit() {
    if (!submissionId || !saved || !evidenceState.requiredComplete || evidenceState.mismatched) return;
    startSubmitObservation(async () => {
      const result = await submitObservationAction(assignment.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setSubmitReviewOpen(false);
      router.refresh();
    });
  }

  const appVersionHint = technicalProfile?.operating_system?.toLowerCase() === "ios"
    ? `Open the App Store, search for ${ownSlot.platformName ?? "the ride-hailing app"}, open its page, and check the version under What's New or Version History.`
    : technicalProfile?.operating_system?.toLowerCase() === "android"
      ? `Open Google Play, search for ${ownSlot.platformName ?? "the ride-hailing app"}, open its page, then check About this app > App info > Version.`
      : `Find the current version on the app's App Store or Google Play page.`;
  const detailsComplete = Boolean(values.displayedFare && values.quoteTimestamp && values.latitude && values.longitude && values.networkType && values.appVersion && values.batteryPercentage);
  const hasScreenshot = evidence.some((item) => item.evidence_type === "screenshot");
  const currentStep = !hasScreenshot ? 1 : !values.displayedFare || !values.quoteTimestamp ? 2 : !detailsComplete ? 3 : !saved ? 4 : 5;
  const progressSteps = ["Evidence", "Screenshot", "Details", "Save", "Submit"];
  const submissionReady = Boolean(submissionId && saved && evidenceState.requiredComplete && !evidenceState.mismatched);

  return <section className="space-y-6 border-t border-border pt-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] uppercase text-muted-foreground">Tester submission</p><h2 className="mt-1.5 text-lg font-semibold">Complete your quote observation</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{ownSlot.platformName} - {ownSlot.serviceName}<span className="mx-1.5">|</span>{assignment.pickup_location} to {assignment.destination_location}</p></div>{saved ? <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"><Check className="size-3.5" />Draft saved</span> : <span className="rounded-full border border-amber-400/30 bg-amber-400/5 px-2.5 py-1 text-xs font-medium text-amber-200">Unsaved changes</span>}</div>
    <ol className="grid grid-cols-5 border-y border-border" aria-label={`Submission step ${currentStep} of 5`}>{progressSteps.map((label, index) => { const number = index + 1; const complete = number < currentStep; const active = number === currentStep; return <li key={label} className={`relative min-w-0 border-r border-border px-1 py-3 text-center last:border-r-0 ${active ? "bg-primary/[0.08] text-primary" : complete ? "text-foreground" : "text-muted-foreground"}`} aria-current={active ? "step" : undefined}><span className="mx-auto flex size-5 items-center justify-center">{complete ? <CheckCircle2 className="size-4 text-primary" /> : active ? <span className="grid size-5 place-items-center rounded-full border border-primary text-[10px] font-semibold">{number}</span> : <Circle className="size-3.5" />}</span><span className="mt-1 block truncate text-[10px] font-medium sm:text-xs">{label}</span></li>; })}</ol>
    <EvidenceUploader assignment={assignment} ownSlot={ownSlot} submissionId={submissionId} observationSaved={saved} initialEvidence={evidence} initialValidation={initialScreenshotValidation} initialScreenshotUrl={screenshotPreviewUrl} onOCRResult={applyOCR} onEvidenceStateChange={handleEvidenceState} showFinalSubmission={false} />
    <div className="border-t border-border pt-6"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase text-muted-foreground">Step 3 of 5</p><h2 className="mt-1.5 text-base font-semibold">Complete session details</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Confirm the locked screenshot values, capture your current location, then enter the technical details used for this observation.</p></div>{detailsComplete ? <CheckCircle2 className="mt-1 size-5 shrink-0 text-primary" aria-label="Session details complete" /> : null}</div></div>
    {!submission && technicalProfile ? <div className="flex items-start gap-3 rounded-md border border-primary/25 bg-primary/[0.025] px-4 py-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /><div><p className="text-xs font-medium">Saved technical details applied</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Your device details{technicalProfile.app_version ? " and previously used app version" : ""} were applied. Confirm that the app version is still current and enter the network used for this session.</p></div></div> : null}
    <div className="space-y-6"><fieldset><legend className="mb-3 text-xs font-semibold">From the confirmed screenshot</legend><div className="grid gap-4 sm:grid-cols-2"><Field label={`Fare (${study.default_currency ?? "Currency"})`} value={values.displayedFare} onChange={() => undefined} type="number" step="0.01" readOnly placeholder="Confirm screenshot boxes first" /><Field label={`Quote timestamp (${timezone})`} value={values.quoteTimestamp} onChange={() => undefined} type="datetime-local" step="1" readOnly placeholder="Confirm screenshot boxes first" /></div></fieldset><fieldset className="border-t border-border pt-5"><legend className="px-1 text-xs font-semibold">Current session location</legend><div className="mt-3 grid gap-4 sm:grid-cols-[1fr_1fr_auto]"><Field label="Latitude" value={values.latitude} onChange={(value) => update("latitude", value)} type="number" step="0.000001" error={errors.latitude} /><Field label="Longitude" value={values.longitude} onChange={(value) => update("longitude", value)} type="number" step="0.000001" error={errors.longitude} /><div className="flex items-end"><Button type="button" className="w-full sm:w-auto" variant="outline" onClick={useLocation} disabled={locating}>{locating ? <LoaderCircle className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}{locating ? "Locating..." : "Use my location"}</Button></div></div></fieldset><fieldset className="border-t border-border pt-5"><legend className="px-1 text-xs font-semibold">Technical details at quote time</legend><div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Battery percentage" value={values.batteryPercentage} onChange={(value) => update("batteryPercentage", value)} type="number" min="0" max="100" step="1" placeholder="0 to 100" error={errors.batteryPercentage} /><ChoiceField label="Network" value={values.networkType} onChange={(value) => update("networkType", value)} options={["Wi-Fi", "4G/LTE", "5G"]} error={errors.networkType} /><Field label={`${ownSlot.platformName} app version`} value={values.appVersion} onChange={(value) => update("appVersion", value)} placeholder="For example, 5.355.0" hint={appVersionHint} error={errors.appVersion} /></div></fieldset></div>
    <div className="space-y-2"><Label htmlFor="submission-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id="submission-notes" rows={3} maxLength={1000} value={values.notes} onChange={(event) => update("notes", event.target.value)} /></div>
    <div className="border-t border-border pt-5"><div className="grid gap-4 lg:grid-cols-[1fr_auto]"><div><p className="text-[10px] uppercase text-muted-foreground">Steps 4 and 5</p><h2 className="mt-1.5 text-sm font-semibold">Save, review, and submit</h2><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs"><Requirement complete={evidenceState.requiredComplete && !evidenceState.mismatched} label="Evidence confirmed" /><Requirement complete={detailsComplete} label="Session details complete" /><Requirement complete={saved} label="Latest changes saved" /></div><p className={`mt-3 text-xs leading-5 ${submissionReady ? "text-primary" : "text-muted-foreground"}`}>{evidenceState.mismatched ? "The screenshot does not match the assigned ride. Replace and confirm it before submitting." : !detailsComplete ? "Complete all required session details before saving." : !saved ? "Save the latest details before final submission." : !evidenceState.requiredComplete ? "Upload and confirm all required evidence before submitting." : "Ready for final review. Submission will lock this observation."}</p></div><div className="flex flex-col gap-2 sm:flex-row lg:items-end"><Button variant="outline" onClick={save} disabled={savingDraft || submittingObservation || !detailsComplete}>{savingDraft ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{savingDraft ? "Saving..." : saved ? "Save again" : "Save draft"}</Button><Button onClick={() => setSubmitReviewOpen(true)} disabled={!submissionReady || savingDraft || submittingObservation}><Send className="size-4" />Review and submit</Button></div></div></div>
    <Dialog open={submitReviewOpen} onOpenChange={submittingObservation ? undefined : setSubmitReviewOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Submit and lock this observation?</DialogTitle><DialogDescription>After submission, you cannot edit the form or replace its evidence unless an authorized reviewer reopens it.</DialogDescription></DialogHeader><div className="rounded-md border border-border p-3 text-xs leading-5"><p className="font-semibold">Before continuing, confirm that:</p><ul className="mt-2 space-y-1 text-muted-foreground"><li>- The selected ride and fare are correct.</li><li>- The full screen recording is uploaded.</li><li>- Battery, location, network, and app version are accurate.</li><li>- The latest draft is saved.</li></ul></div><DialogFooter><Button variant="outline" onClick={() => setSubmitReviewOpen(false)} disabled={submittingObservation}>Go back and review</Button><Button onClick={submit} disabled={submittingObservation}>{submittingObservation ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}{submittingObservation ? "Submitting..." : "Submit and lock"}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}

function Requirement({ complete, label }: { complete: boolean; label: string }) {
  return <span className={`inline-flex items-center gap-1.5 ${complete ? "text-primary" : "text-muted-foreground"}`}>{complete ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}{label}</span>;
}

function Field({ label, value, onChange, error, action, hint, ...props }: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & { label: string; value: string; onChange: (value: string) => void; error?: string; action?: React.ReactNode; hint?: string }) {
  const id = `submission-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return <div className="min-w-0 space-y-2"><div className="flex min-h-8 items-center justify-between gap-2"><Label htmlFor={id}>{label}</Label>{action}</div><Input id={id} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} {...props} />{hint ? <p className="text-[10px] leading-4 text-muted-foreground">{hint}</p> : null}{error ? <p className="text-xs text-red-300">{error}</p> : null}</div>;
}

function ChoiceField({ label, value, onChange, options, error }: { label: string; value: string; onChange: (value: string) => void; options: string[]; error?: string }) {
  const id = `submission-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return <div className="min-w-0 space-y-2"><div className="flex min-h-8 items-center"><Label htmlFor={id}>{label}</Label></div><Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="w-full" aria-invalid={Boolean(error)}><SelectValue placeholder="Select network" /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>{error ? <p className="text-xs text-red-300">{error}</p> : null}</div>;
}
